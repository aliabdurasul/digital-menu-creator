/**
 * Inactivity push notification job.
 * Sends "Seni özledik!" push to customers who haven't visited
 * within the program's inactivity_trigger_days threshold.
 *
 * Called by the cron orchestrator (runAllCronJobs).
 */

import { createClient } from "@supabase/supabase-js";
import { emitPushEvent } from "@/lib/push-events";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function processInactivityPush(): Promise<{
  checked: number;
  sent: number;
  failed: number;
}> {
  const supabase = getServiceClient();

  // Get all active loyalty programs with inactivity trigger enabled
  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("id, restaurant_id, inactivity_trigger_days, inactivity_bonus_multiplier, restaurants(slug)")
    .eq("enabled", true)
    .gt("inactivity_trigger_days", 0);

  if (!programs || programs.length === 0) {
    return { checked: 0, sent: 0, failed: 0 };
  }

  let checked = 0;
  let sent = 0;
  let failed = 0;

  for (const program of programs) {
    const cutoffDate = new Date(
      Date.now() - program.inactivity_trigger_days * 86400000
    ).toISOString();

    // Find inactive customers who haven't been push-notified yet
    const { data: staleProgress } = await supabase
      .from("loyalty_progress")
      .select("customer_key")
      .eq("program_id", program.id)
      .eq("inactivity_push_sent", false)
      .lte("last_visit_date", cutoffDate);

    if (!staleProgress || staleProgress.length === 0) continue;

    checked += staleProgress.length;

    for (const row of staleProgress) {
      const bonus = program.inactivity_bonus_multiplier || 2;
      const slug = (program as Record<string, unknown>).restaurants
        ? ((program as Record<string, unknown>).restaurants as { slug?: string })?.slug
        : undefined;
      const menuUrl = slug ? `/r/${slug}` : `/r/${program.restaurant_id}`;
      const result = await emitPushEvent({
        type: "inactivity_comeback",
        customerKey: row.customer_key,
        restaurantId: program.restaurant_id,
        meta: {
          menuUrl,
          bonusText: `Gel, ${bonus}x puan kazan! Bonusun seni bekliyor.`,
        },
      });
      const ok = result.sent;

      if (ok) {
        sent++;
      } else {
        failed++;
      }

      // Mark as sent regardless (prevent spam on next cron run)
      await supabase
        .from("loyalty_progress")
        .update({ inactivity_push_sent: true })
        .eq("customer_key", row.customer_key)
        .eq("program_id", program.id);
    }
  }

  return { checked, sent, failed };
}
