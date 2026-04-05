/**
 * Unified cron job orchestrator.
 * Runs all background jobs in parallel, logs results, enforces idempotency.
 *
 * Called by: GET /api/cron-job?token=CRON_SECRET (external cron service)
 */
import { createClient } from "@supabase/supabase-js";
import { processNotificationQueue } from "@/lib/notifications";
import { processStaleOrders } from "./stale-orders";
import { processLoyaltyCleanup } from "./loyalty-cleanup";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Minimum interval between runs — prevents duplicate execution */
const MIN_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export async function runAllCronJobs(): Promise<{
  skipped: boolean;
  runId?: string;
  results?: Record<string, unknown>;
  durationMs?: number;
}> {
  const supabase = getServiceClient();

  // ── Idempotency: skip if last run was <4 min ago ──
  const { data: lastRun } = await supabase
    .from("cron_runs")
    .select("started_at")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (lastRun) {
    const elapsed = Date.now() - new Date(lastRun.started_at).getTime();
    if (elapsed < MIN_INTERVAL_MS) {
      return { skipped: true };
    }
  }

  // ── Create run log (also acts as a lock) ──
  const startTime = Date.now();
  const { data: run } = await supabase
    .from("cron_runs")
    .insert({ job_name: "all", status: "running" })
    .select("id")
    .single();

  const runId = run?.id;

  // ── Execute all jobs in parallel ──
  const [notifications, staleOrders, loyaltyCleanup] = await Promise.allSettled([
    processNotificationQueue(),
    processStaleOrders(),
    processLoyaltyCleanup(),
  ]);

  const results = {
    notifications:
      notifications.status === "fulfilled"
        ? notifications.value
        : { error: String((notifications as PromiseRejectedResult).reason) },
    staleOrders:
      staleOrders.status === "fulfilled"
        ? staleOrders.value
        : { error: String((staleOrders as PromiseRejectedResult).reason) },
    loyaltyCleanup:
      loyaltyCleanup.status === "fulfilled"
        ? loyaltyCleanup.value
        : { error: String((loyaltyCleanup as PromiseRejectedResult).reason) },
  };

  const durationMs = Date.now() - startTime;

  // ── Update run log ──
  if (runId) {
    await supabase
      .from("cron_runs")
      .update({
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        results,
        status: "completed",
      })
      .eq("id", runId);
  }

  console.log(`[cron] Completed in ${durationMs}ms`, JSON.stringify(results));

  return { skipped: false, runId, results, durationMs };
}
