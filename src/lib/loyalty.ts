/**
 * Loyalty engine — stamp tracking and reward logic.
 * Called server-side when an order is delivered.
 */

import { createClient } from "@supabase/supabase-js";
import { sendNotification, renderTemplate } from "./notifications";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Process a delivered order for loyalty: add stamp, check reward threshold.
 * Returns true if a reward was earned.
 */
export async function processLoyaltyStamp(
  restaurantId: string,
  customerId: string,
  orderId: string,
  orderTotal: number
): Promise<{ stamped: boolean; rewarded: boolean }> {
  const supabase = getServiceClient();

  // 1. Check loyalty config
  const { data: config } = await supabase
    .from("loyalty_config")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!config || !config.enabled) {
    return { stamped: false, rewarded: false };
  }

  // 2. Get customer, then update stats directly
  const { data: customer } = await supabase
    .from("customers")
    .select("id, total_orders, total_spent, phone, name, loyalty_points")
    .eq("id", customerId)
    .single();

  if (!customer) return { stamped: false, rewarded: false };

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

  // 5. If reward earned, update loyalty points and send notification
  if (isReward) {
    await supabase
      .from("customers")
      .update({
        loyalty_points: (customer.loyalty_points || 0) + 1,
      })
      .eq("id", customerId);

    // Check if restaurant has notifications enabled
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("notification_enabled, notification_channel")
      .eq("id", restaurantId)
      .single();

    if (restaurant?.notification_enabled && customer.phone) {
      const message = renderTemplate(config.message_template, {
        name: customer.name || "Değerli Müşterimiz",
        threshold: config.reward_threshold,
        reward: config.reward_type === "free_item"
          ? "Bedava ürün"
          : config.reward_type === "discount_percent"
            ? `%${config.reward_value} indirim`
            : `₺${config.reward_value} indirim`,
      });

      await sendNotification({
        restaurantId,
        customerId,
        orderId,
        type: "loyalty_reward",
        channel: restaurant.notification_channel === "both" ? "sms" : restaurant.notification_channel,
        phone: customer.phone,
        message,
      });
    }
  }

  return { stamped: true, rewarded: isReward };
}
