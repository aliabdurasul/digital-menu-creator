/**
 * Loyalty engine v2 — session-based, customer_key identity.
 *
 * 2-stage progress:
 *   1. addPendingProgress() — called on order CREATE (optimistic, instant dopamine)
 *   2. confirmProgress()    — called on order DELIVERED (finalizes)
 *
 * Supports: dynamic initial progress, happy hour multiplier, reward expiry,
 * phone-based identity merging, smart upsell messages.
 */

import { createClient } from "@supabase/supabase-js";
import { sendNotification, renderTemplate } from "./notifications";
import { sendPush } from "./push";
import type { LoyaltyProgressResponse, DbLoyaltyProgram, DbLoyaltyProgress, DbSecretReward } from "@/types";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/** Resolve restaurant slug for push notification URLs. Falls back to restaurant ID. */
async function getMenuUrl(restaurantId: string): Promise<string> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", restaurantId)
    .single();
  return data?.slug ? `/r/${data.slug}` : `/r/${restaurantId}`;
}

/* ─── Helpers ─── */

/** Check if current time falls within the program's happy hour window. */
export function isHappyHour(program: DbLoyaltyProgram): boolean {
  if (!program.happy_hour_enabled || !program.happy_hour_start || !program.happy_hour_end) {
    return false;
  }

  const now = new Date();
  const day = now.getDay(); // 0=Sun
  if (!program.happy_hour_days.includes(day)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = program.happy_hour_start.split(":").map(Number);
  const [endH, endM] = program.happy_hour_end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  // Handle overnight ranges (e.g., 22:00 → 02:00)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/** Build a human-readable reward label. */
function getRewardLabel(program: DbLoyaltyProgram): string {
  if (program.reward_type === "free_item") return "Bedava ürün";
  if (program.reward_type === "discount_percent") return `%${program.reward_value} indirim`;
  return `₺${program.reward_value} indirim`;
}

/** Calculate effective stamps to add (base=1, happy hour=multiplier, streak bonus, inactivity bonus). */
function calculateStamps(
  program: DbLoyaltyProgram,
  progress?: DbLoyaltyProgress | null
): number {
  let multiplier = 1;

  if (isHappyHour(program)) {
    multiplier = Math.max(multiplier, program.happy_hour_multiplier || 2);
  }

  // Streak bonus — applied when streak >= threshold
  if (
    program.streak_bonus_enabled &&
    progress &&
    progress.streak_count >= program.streak_bonus_threshold
  ) {
    multiplier = Math.max(multiplier, program.streak_bonus_multiplier || 2);
  }

  // Inactivity welcome-back bonus
  if (progress?.inactivity_bonus_active) {
    const expires = progress.inactivity_bonus_expires_at;
    if (!expires || new Date(expires) > new Date()) {
      multiplier = Math.max(multiplier, program.inactivity_bonus_multiplier || 2);
    }
  }

  return Math.floor(1 * multiplier);
}

/** Resolve the reward item details from the menu catalog + admin override. */
async function resolveRewardItem(
  program: DbLoyaltyProgram
): Promise<{ name: string; image?: string; menuItemId?: string } | null> {
  if (program.reward_type !== "free_item") return null;

  const supabase = getServiceClient();

  if (program.reward_item_id) {
    const { data: item } = await supabase
      .from("menu_items")
      .select("id, name, image_url")
      .eq("id", program.reward_item_id)
      .single();

    if (item) {
      return {
        name: program.reward_item_name || item.name,
        image: item.image_url || undefined,
        menuItemId: item.id,
      };
    }
  }

  // No linked item — use override name only
  if (program.reward_item_name) {
    return { name: program.reward_item_name };
  }

  return { name: getRewardLabel(program) };
}

/* ─── Engagement Engine ─── */

/**
 * Update streak for a customer. Rules:
 * - Same calendar day (tenant TZ): no change
 * - Consecutive day: streak_count++
 * - Gap > 1 day: streak resets to 1
 * Called on confirmed order (addPendingProgress).
 */
async function updateStreak(
  supabase: ReturnType<typeof getServiceClient>,
  progress: DbLoyaltyProgress,
  tenantTimezone: string = "Europe/Istanbul"
): Promise<{ streakCount: number; lastVisitDate: string }> {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tenantTimezone }); // YYYY-MM-DD

  if (progress.last_visit_date === todayStr) {
    // Same day — no streak update
    return { streakCount: progress.streak_count, lastVisitDate: todayStr };
  }

  let newStreak: number;

  if (!progress.last_visit_date) {
    // First ever visit
    newStreak = 1;
  } else {
    // Check if consecutive day
    const lastDate = new Date(progress.last_visit_date + "T00:00:00");
    const todayDate = new Date(todayStr + "T00:00:00");
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

    if (diffDays === 1) {
      newStreak = progress.streak_count + 1;
    } else {
      // Gap > 1 day — reset
      newStreak = 1;
    }
  }

  await supabase
    .from("loyalty_progress")
    .update({ streak_count: newStreak, last_visit_date: todayStr })
    .eq("id", progress.id);

  return { streakCount: newStreak, lastVisitDate: todayStr };
}

/**
 * Check and activate inactivity bonus for a returning customer.
 * If last_visit_date is N+ days ago and bonus not already active → activate.
 */
async function checkInactivity(
  supabase: ReturnType<typeof getServiceClient>,
  program: DbLoyaltyProgram,
  progress: DbLoyaltyProgress,
  tenantTimezone: string = "Europe/Istanbul"
): Promise<boolean> {
  // Already active — skip
  if (progress.inactivity_bonus_active) {
    if (progress.inactivity_bonus_expires_at && new Date(progress.inactivity_bonus_expires_at) > new Date()) {
      return true;
    }
    // Expired — deactivate
    await supabase
      .from("loyalty_progress")
      .update({ inactivity_bonus_active: false, inactivity_bonus_expires_at: null })
      .eq("id", progress.id);
    return false;
  }

  if (!progress.last_visit_date || program.inactivity_trigger_days <= 0) return false;

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tenantTimezone });
  const lastDate = new Date(progress.last_visit_date + "T00:00:00");
  const todayDate = new Date(todayStr + "T00:00:00");
  const daysSinceVisit = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);

  if (daysSinceVisit >= program.inactivity_trigger_days) {
    // Activate bonus — expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("loyalty_progress")
      .update({ inactivity_bonus_active: true, inactivity_bonus_expires_at: expiresAt })
      .eq("id", progress.id);
    return true;
  }

  return false;
}

/**
 * Clear inactivity bonus after it's been used (on order placement).
 */
async function clearInactivityBonus(
  supabase: ReturnType<typeof getServiceClient>,
  progressId: string
): Promise<void> {
  await supabase
    .from("loyalty_progress")
    .update({ inactivity_bonus_active: false, inactivity_bonus_expires_at: null })
    .eq("id", progressId);
}

/**
 * Roll a secret reward based on probability.
 * If won, creates a secret_reward_history row with 7-day expiry.
 */
async function rollSecretReward(
  supabase: ReturnType<typeof getServiceClient>,
  program: DbLoyaltyProgram,
  customerKey: string,
  restaurantId: string
): Promise<DbSecretReward | null> {
  if (!program.secret_reward_enabled) return null;
  if (Math.random() > program.secret_reward_probability) return null;

  // Check if customer already has an unused secret reward
  const { data: existing } = await supabase
    .from("secret_reward_history")
    .select("id")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single();

  if (existing) return null; // Already has an active one

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: reward } = await supabase
    .from("secret_reward_history")
    .insert({
      customer_key: customerKey,
      restaurant_id: restaurantId,
      discount_percent: program.secret_reward_discount_percent,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  return reward as DbSecretReward | null;
}

/**
 * Get active (unused, unexpired) secret reward for a customer.
 */
async function getActiveSecretReward(
  supabase: ReturnType<typeof getServiceClient>,
  customerKey: string,
  restaurantId: string
): Promise<DbSecretReward | null> {
  const { data } = await supabase
    .from("secret_reward_history")
    .select("*")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return (data as DbSecretReward) ?? null;
}

/**
 * Detect the customer's most-ordered item from order history.
 * Falls back to global bestseller if no personal history.
 */
async function detectFavoriteItem(
  supabase: ReturnType<typeof getServiceClient>,
  customerKey: string,
  restaurantId: string
): Promise<{ name: string; image?: string; menuItemId?: string } | null> {
  // 1. Personal favorite: most-ordered item by this customer
  const { data: personalTop } = await supabase
    .rpc("get_customer_favorite_item", {
      p_customer_key: customerKey,
      p_restaurant_id: restaurantId,
    });

  if (personalTop && personalTop.length > 0) {
    const fav = personalTop[0];
    return {
      name: fav.name,
      image: fav.image_url || undefined,
      menuItemId: fav.menu_item_id || undefined,
    };
  }

  // 2. Fallback: global bestseller for this restaurant
  return await getGlobalBestseller(supabase, restaurantId);
}

/**
 * Get the global bestselling item for a restaurant.
 */
async function getGlobalBestseller(
  supabase: ReturnType<typeof getServiceClient>,
  restaurantId: string
): Promise<{ name: string; image?: string; menuItemId?: string } | null> {
  const { data } = await supabase
    .rpc("get_restaurant_bestseller", {
      p_restaurant_id: restaurantId,
    });

  if (data && data.length > 0) {
    return {
      name: data[0].name,
      image: data[0].image_url || undefined,
      menuItemId: data[0].menu_item_id || undefined,
    };
  }

  return null;
}

/** Build a LoyaltyProgressResponse from program + progress data. */
async function buildResponse(
  program: DbLoyaltyProgram,
  progress: DbLoyaltyProgress | null,
  extras: {
    upsellMessage?: string | null;
    upsellItem?: string;
    secretReward?: DbSecretReward | null;
    favoriteItem?: { name: string; image?: string; menuItemId?: string } | null;
  } = {}
): Promise<LoyaltyProgressResponse> {
  const current = progress?.current_count ?? 0;
  const confirmed = progress?.confirmed_count ?? 0;
  const initial = progress?.initial_progress ?? 0;
  const effectiveCurrent = current + initial;
  const target = program.target_count;
  const stampsAway = Math.max(0, target - (effectiveCurrent % target));
  const nearCompletion = stampsAway > 0 && stampsAway <= program.near_completion_threshold;
  const percent = target > 0 ? Math.min(100, Math.round(((effectiveCurrent % target) / target) * 100)) : 0;
  const happyHour = isHappyHour(program);

  const rewardItem = await resolveRewardItem(program);

  // Streak state
  const streakCount = progress?.streak_count ?? 0;
  const streakActive = program.streak_bonus_enabled && streakCount >= program.streak_bonus_threshold;
  const streakMultiplier = streakActive ? (program.streak_bonus_multiplier || 2) : 1;

  // Inactivity bonus state
  const inactivityActive = progress?.inactivity_bonus_active ?? false;
  const inactivityExpires = progress?.inactivity_bonus_expires_at ?? null;
  const inactivityValid = inactivityActive && (!inactivityExpires || new Date(inactivityExpires) > new Date());

  // Effective multiplier (max of all active bonuses)
  let effectiveMultiplier = 1;
  if (happyHour) effectiveMultiplier = Math.max(effectiveMultiplier, program.happy_hour_multiplier);
  if (streakActive) effectiveMultiplier = Math.max(effectiveMultiplier, streakMultiplier);
  if (inactivityValid) effectiveMultiplier = Math.max(effectiveMultiplier, program.inactivity_bonus_multiplier || 2);

  return {
    progress: {
      current: effectiveCurrent,
      confirmed: confirmed + initial,
      target,
      percent,
      initial,
    },
    reward: {
      ready: progress?.reward_ready ?? false,
      type: program.reward_type,
      value: program.reward_value,
      message: progress?.reward_ready ? renderTemplate(program.message_template, {
        threshold: target,
        reward: getRewardLabel(program),
      }) : null,
      expiresAt: progress?.reward_expires_at ?? null,
    },
    bonuses: {
      happyHour,
      multiplier: effectiveMultiplier,
      nearCompletion,
      stampsAway,
    },
    streak: {
      count: streakCount,
      active: streakActive,
      bonusMultiplier: streakMultiplier,
    },
    inactivityBonus: {
      active: inactivityValid,
      multiplier: inactivityValid ? (program.inactivity_bonus_multiplier || 2) : 1,
      expiresAt: inactivityValid ? inactivityExpires : null,
    },
    secretReward: extras.secretReward
      ? {
          won: true,
          discountPercent: extras.secretReward.discount_percent,
          expiresAt: extras.secretReward.expires_at,
          id: extras.secretReward.id,
        }
      : null,
    favoriteItem: extras.favoriteItem ?? null,
    upsell: extras.upsellMessage ? { message: extras.upsellMessage, recommendedItem: extras.upsellItem } : null,
    clubName: program.club_name || "Coffee Club",
    rewardItem,
  };
}

/* ─── Identity ─── */

/**
 * Ensure a customer_aliases row exists for this customer_key at this restaurant.
 * If phone is provided, updates the alias and triggers merge.
 */
export async function ensureCustomerAlias(
  restaurantId: string,
  customerKey: string,
  phone?: string
): Promise<void> {
  const supabase = getServiceClient();

  // Upsert alias
  await supabase
    .from("customer_aliases")
    .upsert(
      {
        customer_key: customerKey,
        restaurant_id: restaurantId,
        ...(phone ? { phone } : {}),
      },
      { onConflict: "customer_key,restaurant_id" }
    );

  // If phone provided, merge progress from other keys with the same phone
  if (phone) {
    await mergeCustomerKeys(restaurantId, phone, customerKey);
  }
}

/**
 * Merge progress from all customer_keys that share the same phone number
 * at a restaurant into the canonical (current) key.
 */
async function mergeCustomerKeys(
  restaurantId: string,
  phone: string,
  canonicalKey: string
): Promise<void> {
  const supabase = getServiceClient();

  // Find all aliases with the same phone at this restaurant
  const { data: aliases } = await supabase
    .from("customer_aliases")
    .select("customer_key")
    .eq("restaurant_id", restaurantId)
    .eq("phone", phone);

  if (!aliases || aliases.length <= 1) return;

  const otherKeys = aliases
    .map((a) => a.customer_key)
    .filter((k) => k !== canonicalKey);

  if (otherKeys.length === 0) return;

  // Get the program for this restaurant
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program) return;

  // Sum progress from other keys into canonical
  for (const otherKey of otherKeys) {
    const { data: otherProgress } = await supabase
      .from("loyalty_progress")
      .select("*")
      .eq("customer_key", otherKey)
      .eq("program_id", program.id)
      .single();

    if (!otherProgress) continue;

    // Add to canonical key's progress
    const { data: canonical } = await supabase
      .from("loyalty_progress")
      .select("*")
      .eq("customer_key", canonicalKey)
      .eq("program_id", program.id)
      .single();

    if (canonical) {
      await supabase
        .from("loyalty_progress")
        .update({
          current_count: canonical.current_count + otherProgress.current_count,
          confirmed_count: canonical.confirmed_count + otherProgress.confirmed_count,
          total_earned_rewards: canonical.total_earned_rewards + otherProgress.total_earned_rewards,
          total_orders: canonical.total_orders + otherProgress.total_orders,
          total_spent: canonical.total_spent + otherProgress.total_spent,
        })
        .eq("id", canonical.id);
    } else {
      // Move the other key's progress to canonical key
      await supabase
        .from("loyalty_progress")
        .update({ customer_key: canonicalKey })
        .eq("id", otherProgress.id);
    }

    // Delete the merged progress row (if it wasn't moved)
    if (canonical) {
      await supabase
        .from("loyalty_progress")
        .delete()
        .eq("customer_key", otherKey)
        .eq("program_id", program.id);
    }
  }
}

/* ─── Progress Management ─── */

/**
 * Get or create a loyalty_progress row for a customer_key.
 * First-time users get dynamic initial_progress (random between min/max).
 */
async function getOrCreateProgress(
  supabase: ReturnType<typeof getServiceClient>,
  customerKey: string,
  program: DbLoyaltyProgram,
  restaurantId: string
): Promise<DbLoyaltyProgress> {
  const { data: existing } = await supabase
    .from("loyalty_progress")
    .select("*")
    .eq("customer_key", customerKey)
    .eq("program_id", program.id)
    .single();

  if (existing) return existing as DbLoyaltyProgress;

  // First-time: grant dynamic initial progress
  const min = program.initial_progress_min || 0;
  const max = program.initial_progress_max || 0;
  const initialProgress = min === max ? min : min + Math.floor(Math.random() * (max - min + 1));

  const { data: created } = await supabase
    .from("loyalty_progress")
    .insert({
      customer_key: customerKey,
      program_id: program.id,
      restaurant_id: restaurantId,
      current_count: 0,
      confirmed_count: 0,
      initial_progress: initialProgress,
      total_earned_rewards: 0,
      total_orders: 0,
      total_spent: 0,
      reward_ready: false,
    })
    .select("*")
    .single();

  return created as DbLoyaltyProgress;
}

/* ─── Core Operations ─── */

/**
 * Called on ORDER CREATION — optimistic progress update.
 * Increments current_count immediately so the customer sees progress instantly.
 * Writes loyalty columns to the order row for Realtime broadcast.
 */
export async function addPendingProgress(
  restaurantId: string,
  customerKey: string,
  orderId: string,
  orderTotal: number
): Promise<LoyaltyProgressResponse | null> {
  const supabase = getServiceClient();

  // 1. Get program
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program || !program.enabled) return null;

  // 2. Get or create progress
  const progress = await getOrCreateProgress(supabase, customerKey, program as DbLoyaltyProgram, restaurantId);

  // 2b. Engagement: check inactivity bonus before stamping
  await checkInactivity(supabase, program as DbLoyaltyProgram, progress);
  // Re-read inactivity state
  const { data: freshProgress } = await supabase
    .from("loyalty_progress")
    .select("*")
    .eq("id", progress.id)
    .single();
  const currentProgress = (freshProgress as DbLoyaltyProgress) ?? progress;

  // 3. Calculate stamps (happy hour, streak, inactivity multipliers)
  const stamps = calculateStamps(program as DbLoyaltyProgram, currentProgress);
  const newCurrent = currentProgress.current_count + stamps;
  const effectiveTotal = newCurrent + currentProgress.initial_progress;
  const target = program.target_count;

  // 4. Check if reward threshold crossed
  const previousEffective = currentProgress.current_count + currentProgress.initial_progress;
  const previousRewards = target > 0 ? Math.floor(previousEffective / target) : 0;
  const newRewards = target > 0 ? Math.floor(effectiveTotal / target) : 0;
  const earnedNewReward = newRewards > previousRewards;

  const rewardReady = earnedNewReward || currentProgress.reward_ready;
  const rewardExpiresAt = earnedNewReward && program.reward_expiry_days > 0
    ? new Date(Date.now() + program.reward_expiry_days * 86400000).toISOString()
    : currentProgress.reward_expires_at;

  // 5. Update progress (optimistic)
  await supabase
    .from("loyalty_progress")
    .update({
      current_count: newCurrent,
      total_earned_rewards: currentProgress.total_earned_rewards + (earnedNewReward ? 1 : 0),
      reward_ready: rewardReady,
      reward_expires_at: rewardExpiresAt,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", currentProgress.id);

  // 5b. Engagement: update streak
  const streakResult = await updateStreak(supabase, currentProgress);

  // 5c. Engagement: clear inactivity bonus (it was used this order)
  if (currentProgress.inactivity_bonus_active) {
    await clearInactivityBonus(supabase, currentProgress.id);
  }

  // 5c2. Reset inactivity push flag (customer is active again)
  await supabase
    .from("loyalty_progress")
    .update({ inactivity_push_sent: false })
    .eq("id", currentProgress.id);

  // 5d. Engagement: roll secret reward
  const secretReward = await rollSecretReward(supabase, program as DbLoyaltyProgram, customerKey, restaurantId);

  // 5e. Engagement: detect favorite item
  const favoriteItem = await detectFavoriteItem(supabase, customerKey, restaurantId);

  // 6. Write loyalty state onto order row — triggers Supabase Realtime
  const stampsAway = Math.max(0, target - (effectiveTotal % target));

  // 6b. Push notification: near completion (1 stamp away)
  if (stampsAway === 1 && !earnedNewReward) {
    getMenuUrl(restaurantId).then((menuUrl) =>
      sendPush(customerKey, restaurantId, {
        title: "1 Kahve Kaldı! ☕",
        body: "Bir sonraki kahvende ödülünü kazan!",
        tag: "loyalty-near-completion",
        url: menuUrl,
      })
    ).catch((err) => console.error("[loyalty] Near-completion push failed:", err));
  }

  await supabase
    .from("orders")
    .update({
      loyalty_stamp_count: effectiveTotal,
      loyalty_stamps_needed: target,
      loyalty_reward_earned: earnedNewReward,
      loyalty_reward_message: earnedNewReward
        ? renderTemplate(program.message_template, {
            threshold: target,
            reward: getRewardLabel(program as DbLoyaltyProgram),
          })
        : null,
    })
    .eq("id", orderId);

  // 7. Build response
  const updatedProgress: DbLoyaltyProgress = {
    ...currentProgress,
    current_count: newCurrent,
    total_earned_rewards: currentProgress.total_earned_rewards + (earnedNewReward ? 1 : 0),
    reward_ready: rewardReady,
    reward_expires_at: rewardExpiresAt || null,
    streak_count: streakResult.streakCount,
    last_visit_date: streakResult.lastVisitDate,
    inactivity_bonus_active: false,
    inactivity_bonus_expires_at: null,
  };

  const upsell = program.upsell_enabled
    ? await getUpsellMessage(program as DbLoyaltyProgram, updatedProgress, restaurantId)
    : null;

  return await buildResponse(program as DbLoyaltyProgram, updatedProgress, {
    upsellMessage: upsell?.message,
    upsellItem: upsell?.item,
    secretReward,
    favoriteItem,
  });
}

/**
 * Called on ORDER DELIVERED — confirms the optimistic progress.
 * Updates confirmed_count, total_orders, total_spent.
 * Sends SMS notification if reward was earned.
 */
export async function confirmProgress(
  restaurantId: string,
  customerKey: string,
  orderId: string,
  orderTotal: number
): Promise<LoyaltyProgressResponse | null> {
  const supabase = getServiceClient();

  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program || !program.enabled) return null;

  const { data: progress } = await supabase
    .from("loyalty_progress")
    .select("*")
    .eq("customer_key", customerKey)
    .eq("program_id", program.id)
    .single();

  if (!progress) return null;

  // Promote current → confirmed, update stats
  await supabase
    .from("loyalty_progress")
    .update({
      confirmed_count: progress.current_count,
      total_orders: progress.total_orders + 1,
      total_spent: progress.total_spent + orderTotal,
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", progress.id);

  // Send SMS if reward was earned and phone is available
  if (progress.reward_ready) {
    const { data: alias } = await supabase
      .from("customer_aliases")
      .select("phone")
      .eq("customer_key", customerKey)
      .eq("restaurant_id", restaurantId)
      .single();

    if (alias?.phone) {
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("notification_enabled, notification_channel")
        .eq("id", restaurantId)
        .single();

      if (restaurant?.notification_enabled) {
        const rewardMessage = renderTemplate(program.message_template, {
          threshold: program.target_count,
          reward: getRewardLabel(program as DbLoyaltyProgram),
        });

        await sendNotification({
          restaurantId,
          orderId,
          type: "loyalty_reward",
          channel: restaurant.notification_channel === "both" ? "sms" : restaurant.notification_channel,
          phone: alias.phone,
          message: rewardMessage,
        });
      }
    }

    // Push notification: reward earned
    getMenuUrl(restaurantId).then((menuUrl) =>
      sendPush(customerKey, restaurantId, {
        title: "Ödülünüz Hazır! 🎁",
        body: renderTemplate(program.message_template, {
          threshold: program.target_count,
          reward: getRewardLabel(program as DbLoyaltyProgram),
        }),
        tag: "loyalty-reward",
        url: menuUrl,
      })
    ).catch((err) => console.error("[loyalty] Reward push failed:", err));
  }

  // Update order columns for Realtime
  const effectiveTotal = progress.current_count + progress.initial_progress;
  await supabase
    .from("orders")
    .update({
      loyalty_stamp_count: effectiveTotal,
      loyalty_stamps_needed: program.target_count,
      loyalty_reward_earned: progress.reward_ready,
      loyalty_reward_message: progress.reward_ready
        ? renderTemplate(program.message_template, {
            threshold: program.target_count,
            reward: getRewardLabel(program as DbLoyaltyProgram),
          })
        : null,
    })
    .eq("id", orderId);

  const updated: DbLoyaltyProgress = {
    ...(progress as DbLoyaltyProgress),
    confirmed_count: progress.current_count,
    total_orders: progress.total_orders + 1,
    total_spent: progress.total_spent + orderTotal,
  };

  return await buildResponse(program as DbLoyaltyProgram, updated, {});
}

/**
 * Read-only snapshot — used by page load and polling.
 * Clears expired rewards automatically.
 */
export async function getLoyaltySnapshot(
  restaurantId: string,
  customerKey: string
): Promise<LoyaltyProgressResponse | null> {
  const supabase = getServiceClient();

  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program || !program.enabled) return null;

  const { data: progress } = await supabase
    .from("loyalty_progress")
    .select("*")
    .eq("customer_key", customerKey)
    .eq("program_id", program.id)
    .single();

  // Clear expired rewards
  if (progress?.reward_ready && progress.reward_expires_at) {
    if (new Date(progress.reward_expires_at) < new Date()) {
      await supabase
        .from("loyalty_progress")
        .update({ reward_ready: false, reward_expires_at: null })
        .eq("id", progress.id);
      progress.reward_ready = false;
      progress.reward_expires_at = null;
    }
  }

  // For first-time visitors with no progress row, show initial progress preview
  if (!progress) {
    const min = program.initial_progress_min || 0;
    const max = program.initial_progress_max || 0;
    const previewInitial = Math.max(min, max); // show max for enticement
    const fakeProgress: DbLoyaltyProgress = {
      id: "",
      customer_key: customerKey,
      program_id: program.id,
      restaurant_id: restaurantId,
      current_count: 0,
      confirmed_count: 0,
      total_earned_rewards: 0,
      total_orders: 0,
      total_spent: 0,
      initial_progress: previewInitial,
      reward_ready: false,
      reward_expires_at: null,
      last_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      streak_count: 0,
      last_visit_date: null,
      favorite_item_id: null,
      inactivity_bonus_active: false,
      inactivity_bonus_expires_at: null,
    };

    const upsell = program.upsell_enabled
      ? await getUpsellMessage(program as DbLoyaltyProgram, fakeProgress, restaurantId)
      : null;

    return await buildResponse(program as DbLoyaltyProgram, fakeProgress, {
      upsellMessage: upsell?.message,
      upsellItem: upsell?.item,
    });
  }

  // Check inactivity bonus for returning visitors
  await checkInactivity(supabase, program as DbLoyaltyProgram, progress as DbLoyaltyProgress);

  // Re-read progress after potential inactivity update
  const { data: freshProgress } = await supabase
    .from("loyalty_progress")
    .select("*")
    .eq("id", progress.id)
    .single();
  const currentProgress = (freshProgress as DbLoyaltyProgress) ?? (progress as DbLoyaltyProgress);

  // Get engagement data
  const secretReward = await getActiveSecretReward(supabase, customerKey, restaurantId);
  const favoriteItem = await detectFavoriteItem(supabase, customerKey, restaurantId);

  const upsell = program.upsell_enabled
    ? await getUpsellMessage(program as DbLoyaltyProgram, currentProgress, restaurantId)
    : null;

  return await buildResponse(program as DbLoyaltyProgram, currentProgress, {
    upsellMessage: upsell?.message,
    upsellItem: upsell?.item,
    secretReward,
    favoriteItem,
  });
}

/* ─── Upsell ─── */

async function getUpsellMessage(
  program: DbLoyaltyProgram,
  progress: DbLoyaltyProgress,
  restaurantId: string
): Promise<{ message: string; item?: string } | null> {
  const effectiveCurrent = progress.current_count + progress.initial_progress;
  const target = program.target_count;
  const stampsAway = target - (effectiveCurrent % target);

  if (stampsAway <= 0 || stampsAway > program.near_completion_threshold + 1) return null;

  const supabase = getServiceClient();

  // Get cheapest available item for recommendation
  const { data: cheapestItem } = await supabase
    .from("menu_items")
    .select("name, price")
    .eq("restaurant_id", restaurantId)
    .eq("is_available", true)
    .order("price", { ascending: true })
    .limit(1)
    .single();

  const itemName = cheapestItem?.name;
  const rewardLabel = getRewardLabel(program);

  if (stampsAway === 1) {
    return {
      message: `1 sipariş daha → ${rewardLabel} kazanın! 🎁`,
      item: itemName,
    };
  }

  return {
    message: `${stampsAway} sipariş sonra ${rewardLabel}! ☕`,
    item: itemName,
  };
}

/* ─── Reward Consumption ─── */

/**
 * Consume a customer's earned reward. Called when an order containing
 * a loyalty_reward item is placed.
 * Returns true if a reward was successfully consumed.
 */
export async function consumeReward(
  restaurantId: string,
  customerKey: string
): Promise<boolean> {
  const supabase = getServiceClient();

  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("enabled", true)
    .single();

  if (!program) return false;

  const { data: progress } = await supabase
    .from("loyalty_progress")
    .select("id, reward_ready")
    .eq("customer_key", customerKey)
    .eq("program_id", program.id)
    .single();

  if (!progress?.reward_ready) return false;

  await supabase
    .from("loyalty_progress")
    .update({
      reward_ready: false,
      reward_expires_at: null,
      total_earned_rewards: progress.id ? undefined : 0, // keep existing
    })
    .eq("id", progress.id);

  // Increment total_earned_rewards separately to avoid race condition
  const { data: current } = await supabase
    .from("loyalty_progress")
    .select("total_earned_rewards")
    .eq("id", progress.id)
    .single();

  if (current) {
    await supabase
      .from("loyalty_progress")
      .update({ total_earned_rewards: (current.total_earned_rewards || 0) + 1 })
      .eq("id", progress.id);
  }

  return true;
}

/* ─── Legacy bridge ─── */

/**
 * Legacy processLoyaltyStamp — kept for backward compatibility with orders
 * that have customer_id but no customer_key. Calls through to old logic.
 */
export async function processLoyaltyStamp(
  restaurantId: string,
  customerId: string,
  orderId: string,
  orderTotal: number
): Promise<{ stamped: boolean; rewarded: boolean; stampCount: number; stampsNeeded: number; rewardMessage?: string }> {
  const NOT_STAMPED = { stamped: false, rewarded: false, stampCount: 0, stampsNeeded: 0 };
  const supabase = getServiceClient();

  const { data: config } = await supabase
    .from("loyalty_config")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!config || !config.enabled) return NOT_STAMPED;

  const { data: customer } = await supabase
    .from("customers")
    .select("id, total_orders, total_spent, phone, name, loyalty_points")
    .eq("id", customerId)
    .single();

  if (!customer) return NOT_STAMPED;

  await supabase
    .from("customers")
    .update({
      total_orders: (customer.total_orders || 0) + 1,
      total_spent: (customer.total_spent || 0) + orderTotal,
      last_visit: new Date().toISOString(),
    })
    .eq("id", customerId);

  const { count } = await supabase
    .from("loyalty_stamps")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId);

  const stampNumber = (count || 0) + 1;
  const isReward = stampNumber % config.reward_threshold === 0;

  await supabase.from("loyalty_stamps").insert({
    customer_id: customerId,
    order_id: orderId,
    restaurant_id: restaurantId,
    stamp_number: stampNumber,
    is_reward: isReward,
  });

  const rewardLabel = config.reward_type === "free_item"
    ? "Bedava ürün"
    : config.reward_type === "discount_percent"
      ? `%${config.reward_value} indirim`
      : `₺${config.reward_value} indirim`;

  let rewardMessage: string | undefined;

  if (isReward) {
    rewardMessage = renderTemplate(config.message_template, {
      name: customer.name || "Değerli Müşterimiz",
      threshold: config.reward_threshold,
      reward: rewardLabel,
    });
  }

  await supabase
    .from("orders")
    .update({
      loyalty_stamp_count: stampNumber,
      loyalty_stamps_needed: config.reward_threshold,
      loyalty_reward_earned: isReward,
      loyalty_reward_message: rewardMessage || null,
    })
    .eq("id", orderId);

  return {
    stamped: true,
    rewarded: isReward,
    stampCount: stampNumber,
    stampsNeeded: config.reward_threshold,
    rewardMessage,
  };
}
