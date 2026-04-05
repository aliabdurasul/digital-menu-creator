import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { runAllCronJobs } from "@/lib/services/cron-jobs";

/**
 * Resolve the cron secret: use explicit CRON_SECRET env if set,
 * otherwise derive one automatically from SUPABASE_SERVICE_ROLE_KEY.
 */
function getCronSecret(): string | null {
  if (process.env.CRON_SECRET) return process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  return createHash("sha256").update(serviceKey).digest("base64");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const cronSecret = getCronSecret();

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runAllCronJobs();

  if (result.skipped) {
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    ...result,
    timestamp: new Date().toISOString(),
  });
}
