/**
 * Loyalty engine — stamp tracking and reward logic.
 * Called server-side when an order is delivered.
 */

import { createClient } from "@supabase/supabase-js";
import { sendNotification, renderTemplate } from "./notifications";
import type { LoyaltyResult } from "@/types";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const NOT_STAMPED: LoyaltyResult = { stamped: false, rewarded: false, stampCount: 0, stampsNeeded: 0 };

/**
 * Process a delivered order for loyalty: add stamp, check reward threshold.
 * Writes loyalty state onto the order row so Supabase Realtime broadcasts it
 * to both admin (via postgres_changes subscription) and customer (via polling).
 */
export async function processLoyaltyStamp(
  restaurantId: string,
  customerId: string,
  orderId: string,
  orderTotal: number
): Promise<LoyaltyResult> {
  const supabase = getServiceClient();

  // 1. Check loyalty config
  const { data: config } = await supabase
    .from("loyalty_config")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!config || !config.enabled) {
    return NOT_STAMPED;
  }

  // 2. Get customer, then update stats directly
  const { data: customer } = await supabase
    .from("customers")
    .select("id, total_orders, total_spent, phone, name, loyalty_points")
    .eq("id", customerId)
    .single();

  if (!customer) return NOT_STAMPED;

  const newTotalOrders = (customer.total_orders || 0) + 1;
  const newTotalSpent = (customer.total_spent || 0) + orderTotal;

  await supabase
    .from("customers")
    .update({
      total_orders: newTotalOrders,
      total_spent: newTotalSpent,
      last_visit: new Date().toISOString(),
    })
    .eq("id", customerId);

  // 3. Count existing stamps for this customer at this restaurant
  const { count } = await supabase
    .from("loyalty_stamps")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId);

  const stampNumber = (count || 0) + 1;
  const isReward = stampNumber % config.reward_threshold === 0;

  // 4. Insert stamp
  await supabase.from("loyalty_stamps").insert({
    customer_id: customerId,
    order_id: orderId,
    restaurant_id: restaurantId,
    stamp_number: stampNumber,
    is_reward: isReward,
  });

  // 5. Build reward message (used for both SMS and in-app)
  const rewardLabel = config.reward_type === "free_item"
    ? "Bedava ürün"
    : config.reward_type === "discount_percent"
      ? `%${config.reward_value} indirim`
      : `₺${config.reward_value} indirim`;

  let rewardMessage: string | undefined;

  if (isReward) {
    await supabase
      .from("customers")
      .update({
        loyalty_points: (customer.loyalty_points || 0) + 1,
      })
      .eq("id", customerId);

    rewardMessage = renderTemplate(config.message_template, {
      name: customer.name || "Değerli Müşterimiz",
      threshold: config.reward_threshold,
      reward: rewardLabel,
    });

    // Send SMS notification as backup channel
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("notification_enabled, notification_channel")
      .eq("id", restaurantId)
      .single();

    if (restaurant?.notification_enabled && customer.phone) {
      await sendNotification({
        restaurantId,
        customerId,
        orderId,
        type: "loyalty_reward",
        channel: restaurant.notification_channel === "both" ? "sms" : restaurant.notification_channel,
        phone: customer.phone,
        message: rewardMessage,
      });
    }
  }

  // 6. Write loyalty state onto the order row — triggers Supabase Realtime
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
