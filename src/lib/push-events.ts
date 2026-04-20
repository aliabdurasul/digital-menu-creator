/**
 * Push Event System — event-driven push notification architecture.
 *
 * Instead of calling sendPush() directly, callers emit typed events via emitPushEvent().
 * The engine decides whether/when/how to actually send based on:
 *   1. Intent mapping (event type → push payload)
 *   2. Throttle guard (max N pushes per customer per day)
 *   3. Trust scoring (avoid Chrome spam classification)
 *   4. Merge rules (combine near-duplicate events)
 *
 * Tables used:
 *   push_events       — raw event log (append-only)
 *   push_user_state   — per-customer throttle/trust state
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendPush, sendPushDirect } from "./push";

function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  Event Types                                                 */
/* ──────────────────────────────────────────────────────────── */

export type PushEventType =
  | "order_ready"
  | "loyalty_near_completion"
  | "loyalty_reward_earned"
  | "loyalty_reward_unlocked"
  | "inactivity_comeback"
  | "welcome"
  | "admin_test";

export interface PushEvent {
  type: PushEventType;
  customerKey: string;
  restaurantId: string;
  /** Optional direct token (for welcome push before DB lookup is possible) */
  token?: string;
  /** Extra data for intent mapping */
  meta?: Record<string, string | number>;
}

/* ──────────────────────────────────────────────────────────── */
/*  Intent Mapping — event type → push payload                  */
/* ──────────────────────────────────────────────────────────── */

interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  /** Priority: "high" bypasses throttle (e.g. order_ready) */
  priority: "high" | "normal";
  /** Merge key: if another event with same mergeKey exists within window, skip */
  mergeKey?: string;
}

/** Bilingual intent strings */
const INTENTS: Record<PushEventType, {
  tr: { title: string; body: string };
  en: { title: string; body: string };
}> = {
  order_ready: {
    tr: { title: "Siparişiniz Hazır! 🎉", body: "Lütfen teslim alın." },
    en: { title: "Your Order is Ready! 🎉", body: "Please pick it up." },
  },
  loyalty_near_completion: {
    tr: { title: "1 Kahve Kaldı! ☕", body: "Bir sonraki kahvende ödülünü kazan!" },
    en: { title: "1 Coffee Left! ☕", body: "Earn your reward on the next coffee!" },
  },
  loyalty_reward_earned: {
    tr: { title: "🔓 Ödül Kilidi Açıldı!", body: "İstediğin zaman kullanabilirsin!" },
    en: { title: "🔓 Reward Unlocked!", body: "Use it whenever you like!" },
  },
  loyalty_reward_unlocked: {
    tr: { title: "🔓 Ödül Kilidi Açıldı!", body: "İstediğin zaman kullanabilirsin!" },
    en: { title: "🔓 Reward Unlocked!", body: "Use it whenever you like!" },
  },
  inactivity_comeback: {
    tr: { title: "Seni Özledik! ☕", body: "Gel, bonus puan kazan!" },
    en: { title: "We Miss You! ☕", body: "Come back and earn bonus points!" },
  },
  welcome: {
    tr: { title: "Bildirimler Açık! 🔔", body: "Siparişin hazır olduğunda seni haberdar edeceğiz." },
    en: { title: "Notifications On! 🔔", body: "We'll let you know when your order is ready." },
  },
  admin_test: {
    tr: { title: "Test Bildirimi", body: "Bu bir test bildirimidir." },
    en: { title: "Test Notification", body: "This is a test notification." },
  },
};

function mapIntent(event: PushEvent, language: "tr" | "en" = "tr"): PushPayload {
  const meta = event.meta || {};
  const menuUrl = (meta.menuUrl as string) || "/";
  const lang = language === "en" ? "en" : "tr";
  const intent = INTENTS[event.type];

  switch (event.type) {
    case "order_ready":
      return {
        title: intent[lang].title,
        body: intent[lang].body,
        tag: "order-ready",
        url: menuUrl,
        priority: "high",
      };

    case "loyalty_near_completion":
      return {
        title: intent[lang].title,
        body: intent[lang].body,
        tag: "loyalty-near-completion",
        url: menuUrl,
        priority: "normal",
        mergeKey: "loyalty-progress",
      };

    case "loyalty_reward_earned":
    case "loyalty_reward_unlocked":
      return {
        title: intent[lang].title,
        body: (meta.rewardMessage as string) || intent[lang].body,
        tag: "loyalty-reward",
        url: menuUrl,
        priority: "normal",
        mergeKey: "loyalty-reward",
      };

    case "inactivity_comeback":
      return {
        title: intent[lang].title,
        body: (meta.bonusText as string) || intent[lang].body,
        tag: "loyalty-inactivity",
        url: menuUrl,
        priority: "normal",
        mergeKey: "inactivity",
      };

    case "welcome":
      return {
        title: (meta.title as string) || intent[lang].title,
        body: (meta.body as string) || intent[lang].body,
        tag: "push-welcome",
        url: menuUrl,
        priority: "normal",
      };

    case "admin_test":
      return {
        title: (meta.title as string) || intent[lang].title,
        body: (meta.body as string) || intent[lang].body,
        tag: "admin-test",
        url: menuUrl,
        priority: "high",
      };

    default:
      return {
        title: "Bildirim",
        body: "",
        tag: "generic",
        url: "/",
        priority: "normal",
      };
  }
}

/* ──────────────────────────────────────────────────────────── */
/*  Throttle & Trust Engine                                     */
/* ──────────────────────────────────────────────────────────── */

/** Maximum normal-priority pushes per customer per day */
const MAX_DAILY_PUSHES = 3;

/** Merge window: skip duplicate mergeKey within this window (ms) */
const MERGE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

interface UserPushState {
  id?: string;
  customer_key: string;
  restaurant_id: string;
  daily_count: number;
  daily_reset_at: string;
  last_event_keys: Record<string, string>; // mergeKey → ISO timestamp
}

async function getUserPushState(
  supabase: SupabaseClient,
  customerKey: string,
  restaurantId: string
): Promise<UserPushState> {
  const { data } = await supabase
    .from("push_user_state")
    .select("*")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId)
    .single();

  if (data) {
    // Reset daily counter if past reset time
    const resetAt = new Date(data.daily_reset_at).getTime();
    if (Date.now() > resetAt) {
      const nextReset = getNextMidnight();
      await supabase
        .from("push_user_state")
        .update({ daily_count: 0, daily_reset_at: nextReset })
        .eq("id", data.id);
      return { ...data, daily_count: 0, daily_reset_at: nextReset };
    }
    return data;
  }

  // Create new state row
  const newState: Omit<UserPushState, "id"> = {
    customer_key: customerKey,
    restaurant_id: restaurantId,
    daily_count: 0,
    daily_reset_at: getNextMidnight(),
    last_event_keys: {},
  };

  const { data: inserted } = await supabase
    .from("push_user_state")
    .upsert(newState, { onConflict: "customer_key,restaurant_id" })
    .select()
    .single();

  return inserted || (newState as UserPushState);
}

function getNextMidnight(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

interface ThrottleResult {
  allowed: boolean;
  reason?: "daily_limit" | "merge_duplicate" | "no_token";
}

async function checkThrottle(
  supabase: SupabaseClient,
  event: PushEvent,
  payload: PushPayload
): Promise<ThrottleResult> {
  // High priority always allowed (order_ready, admin_test)
  if (payload.priority === "high") return { allowed: true };

  const state = await getUserPushState(supabase, event.customerKey, event.restaurantId);

  // Daily limit check
  if (state.daily_count >= MAX_DAILY_PUSHES) {
    return { allowed: false, reason: "daily_limit" };
  }

  // Merge duplicate check
  if (payload.mergeKey && state.last_event_keys) {
    const lastTime = state.last_event_keys[payload.mergeKey];
    if (lastTime && Date.now() - new Date(lastTime).getTime() < MERGE_WINDOW_MS) {
      return { allowed: false, reason: "merge_duplicate" };
    }
  }

  return { allowed: true };
}

async function incrementDailyCount(
  supabase: SupabaseClient,
  customerKey: string,
  restaurantId: string,
  mergeKey?: string
): Promise<void> {
  const state = await getUserPushState(supabase, customerKey, restaurantId);

  const updates: Record<string, unknown> = {
    daily_count: (state.daily_count || 0) + 1,
  };

  if (mergeKey) {
    const keys = { ...(state.last_event_keys || {}), [mergeKey]: new Date().toISOString() };
    updates.last_event_keys = keys;
  }

  await supabase
    .from("push_user_state")
    .update(updates)
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId);
}

/* ──────────────────────────────────────────────────────────── */
/*  Event Log                                                   */
/* ──────────────────────────────────────────────────────────── */

async function logEvent(
  supabase: SupabaseClient,
  event: PushEvent,
  status: "sent" | "throttled" | "failed",
  reason?: string
): Promise<void> {
  try {
    await supabase.from("push_events").insert({
      event_type: event.type,
      customer_key: event.customerKey,
      restaurant_id: event.restaurantId,
      status,
      reason: reason || null,
      meta: event.meta || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[push-events] Failed to log event:", err);
  }
}

/* ──────────────────────────────────────────────────────────── */
/*  Main Entry Point                                            */
/* ──────────────────────────────────────────────────────────── */

/**
 * Emit a push event. The engine decides whether to actually send.
 * Non-blocking: never throws.
 */
export async function emitPushEvent(event: PushEvent): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const supabase = getServiceClient();

  try {
    // Look up the user's preferred language from push_tokens
    let language: "tr" | "en" = "tr";
    if (event.meta?.language === "en") {
      language = "en";
    } else {
      try {
        const { data: tokenRow } = await supabase
          .from("push_tokens")
          .select("language")
          .eq("customer_key", event.customerKey)
          .eq("restaurant_id", event.restaurantId)
          .single();
        if (tokenRow?.language === "en") language = "en";
      } catch {
        // non-critical — default to 'tr'
      }
    }

    const payload = mapIntent(event, language);

    // Throttle check
    const throttle = await checkThrottle(supabase, event, payload);
    if (!throttle.allowed) {
      await logEvent(supabase, event, "throttled", throttle.reason);
      return { sent: false, reason: throttle.reason };
    }

    // Dispatch
    let sent: boolean;
    if (event.token) {
      sent = await sendPushDirect(event.token, {
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        url: payload.url,
      });
    } else {
      sent = await sendPush(event.customerKey, event.restaurantId, {
        title: payload.title,
        body: payload.body,
        tag: payload.tag,
        url: payload.url,
      });
    }

    if (sent) {
      await incrementDailyCount(supabase, event.customerKey, event.restaurantId, payload.mergeKey);
      await logEvent(supabase, event, "sent");
      return { sent: true };
    } else {
      await logEvent(supabase, event, "failed", "send_failed");
      return { sent: false, reason: "send_failed" };
    }
  } catch (err) {
    console.error("[push-events] emitPushEvent error:", err);
    await logEvent(supabase, event, "failed", "exception").catch(() => {});
    return { sent: false, reason: "exception" };
  }
}

/**
 * Convenience: get the menu URL for a restaurant (by slug).
 */
export async function getRestaurantMenuUrl(restaurantId: string): Promise<string> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from("restaurants")
      .select("slug")
      .eq("id", restaurantId)
      .single();
    return data?.slug ? `/r/${data.slug}` : "/";
  } catch {
    return "/";
  }
}
