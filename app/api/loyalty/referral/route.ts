import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET /api/loyalty/referral?customerKey=xxx&restaurantId=xxx
 * Returns the customer's referral code and their referral stats.
 */
export async function GET(req: NextRequest) {
  const customerKey = req.nextUrl.searchParams.get("customerKey");
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (!customerKey || !restaurantId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  if (!UUID_RE.test(restaurantId) || !UUID_RE.test(customerKey)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Check referral is enabled
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("referral_enabled, referral_points, referee_bonus_points")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program?.referral_enabled) {
    return NextResponse.json({ enabled: false });
  }

  // Get or create referral code
  let { data: codeRow } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("customer_key", customerKey)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!codeRow) {
    const code = generateCode();
    const { data: newRow } = await supabase
      .from("referral_codes")
      .insert({ customer_key: customerKey, restaurant_id: restaurantId, code })
      .select("code")
      .single();
    codeRow = newRow;
  }

  // Get referral stats
  const { data: tracks } = await supabase
    .from("referral_tracks")
    .select("id, referee_key, referrer_points, created_at")
    .eq("referrer_key", customerKey)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    enabled: true,
    code: codeRow?.code ?? null,
    referralCount: tracks?.length ?? 0,
    totalEarned: (tracks ?? []).reduce((s, t) => s + t.referrer_points, 0),
    referrerPoints: program.referral_points,
    refereePoints: program.referee_bonus_points,
  });
}

/**
 * POST /api/loyalty/referral
 * Body: { refereeKey, restaurantId, code }
 * Applies a referral code. Awards points to both referrer and referee.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { refereeKey, restaurantId, code } = body as {
    refereeKey?: string;
    restaurantId?: string;
    code?: string;
  };

  if (!refereeKey || !restaurantId || !code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!UUID_RE.test(restaurantId) || !UUID_RE.test(refereeKey)) {
    return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Check referral enabled
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("referral_enabled, referral_points, referee_bonus_points")
    .eq("restaurant_id", restaurantId)
    .single();

  if (!program?.referral_enabled) {
    return NextResponse.json({ error: "Referral not enabled" }, { status: 400 });
  }

  // Lookup referral code
  const { data: codeRow } = await supabase
    .from("referral_codes")
    .select("customer_key")
    .eq("restaurant_id", restaurantId)
    .eq("code", code.toUpperCase().trim())
    .single();

  if (!codeRow) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  // Can't refer yourself
  if (codeRow.customer_key === refereeKey) {
    return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
  }

  const referrerKey = codeRow.customer_key;
  const referrerPoints = program.referral_points ?? 100;
  const refereePoints = program.referee_bonus_points ?? 50;

  // Check if already referred (unique constraint will catch this too)
  const { data: existing } = await supabase
    .from("referral_tracks")
    .select("id")
    .eq("referee_key", refereeKey)
    .eq("restaurant_id", restaurantId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already referred", alreadyReferred: true }, { status: 409 });
  }

  // Create track record
  const { error: trackError } = await supabase
    .from("referral_tracks")
    .insert({
      referrer_key: referrerKey,
      referee_key: refereeKey,
      restaurant_id: restaurantId,
      referrer_points: referrerPoints,
      referee_points: refereePoints,
    });

  if (trackError) {
    return NextResponse.json({ error: "Referral failed" }, { status: 500 });
  }

  // Award points to referrer
  await supabase.from("point_actions").insert({
    customer_key: referrerKey,
    restaurant_id: restaurantId,
    action_type: "referral_bonus",
    points: referrerPoints,
    meta: { referred: refereeKey },
  });

  // Award points to referee
  await supabase.from("point_actions").insert({
    customer_key: refereeKey,
    restaurant_id: restaurantId,
    action_type: "referee_bonus",
    points: refereePoints,
    meta: { referrer: referrerKey },
  });

  return NextResponse.json({
    ok: true,
    referrerPointsAwarded: referrerPoints,
    refereePointsAwarded: refereePoints,
  });
}
