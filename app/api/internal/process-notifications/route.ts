/**
 * @deprecated This endpoint has been replaced by /api/cron-job
 * which runs all background jobs (notifications, stale orders, loyalty cleanup)
 * through a unified external cron system.
 *
 * This file can be safely deleted.
 */
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Moved to /api/cron-job" },
    { status: 410 }
  );
}
