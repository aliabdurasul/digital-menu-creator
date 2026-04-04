import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotification } from "@/lib/notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** POST /api/campaigns/send — send a draft campaign to all matching recipients */
export async function POST(req: NextRequest) {
  const { campaignId } = await req.json();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  // Fetch campaign
  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (cErr || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be sent" }, { status: 400 });
  }

  // Mark as sending
  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  // Get matching customers (with consent)
  const segment = (campaign.target_segment as { segment?: string })?.segment || "all";

  let query = supabase
    .from("customers")
    .select("id, phone, whatsapp, name")
    .eq("restaurant_id", campaign.restaurant_id)
    .eq("consent_given", true);

  switch (segment) {
    case "new":
      query = query.eq("total_orders", 1);
      break;
    case "loyal":
      query = query.gte("total_orders", 5);
      break;
    case "inactive": {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      query = query.lt("last_visit", thirtyDaysAgo);
      break;
    }
    case "vip":
      query = query.eq("loyalty_tier", "vip");
      break;
  }

  const { data: customers } = await query;
  const recipients = customers || [];

  // Update total_recipients
  await supabase
    .from("campaigns")
    .update({ total_recipients: recipients.length })
    .eq("id", campaignId);

  // Send to each recipient (fire-and-forget for the response, process in background)
  let sentCount = 0;
  let failedCount = 0;

  for (const customer of recipients) {
    const message = campaign.message_template
      .replace(/\{\{name\}\}/g, customer.name || "")
      .replace(/\{\{phone\}\}/g, customer.phone || "");

    const channels: ("sms" | "whatsapp")[] =
      campaign.channel === "both" ? ["sms", "whatsapp"] : [campaign.channel];

    for (const ch of channels) {
      const phone = ch === "whatsapp" ? (customer.whatsapp || customer.phone) : customer.phone;

      // Insert campaign_sends record
      await supabase.from("campaign_sends").insert({
        campaign_id: campaignId,
        customer_id: customer.id,
        channel: ch,
        status: "pending",
      });

      try {
        await sendNotification({
          restaurantId: campaign.restaurant_id,
          customerId: customer.id,
          type: "campaign",
          channel: ch,
          phone,
          message,
        });
        sentCount++;
      } catch {
        failedCount++;
      }
    }
  }

  // Update campaign status to sent
  await supabase
    .from("campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      failed_count: failedCount,
    })
    .eq("id", campaignId);

  return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount });
}
