/**
 * Notification service — abstract SMS/WhatsApp provider layer.
 * Currently logs to notification_log table.
 * Swap in real providers (NetGSM, Twilio, Meta WhatsApp) via env vars.
 */

import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key);
}

export type NotificationPayload = {
  restaurantId: string;
  customerId?: string;
  orderId?: string;
  type: "order_ready" | "loyalty_reward" | "campaign" | "welcome";
  channel: "sms" | "whatsapp";
  phone: string;
  message: string;
};

/**
 * Send a notification and log it.
 * In production, this would call the actual SMS/WhatsApp API.
 */
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();

  // Log the notification attempt
  const logEntry = {
    restaurant_id: payload.restaurantId,
    customer_id: payload.customerId || null,
    order_id: payload.orderId || null,
    type: payload.type,
    channel: payload.channel,
    phone: payload.phone,
    message: payload.message,
    status: "pending" as const,
  };

  const { data: log, error: logErr } = await supabase
    .from("notification_log")
    .insert(logEntry)
    .select("id")
    .single();

  if (logErr || !log) {
    return { success: false, error: "Bildirim kaydı oluşturulamadı" };
  }

  try {
    // ── Provider dispatch ──
    let sent = false;

    if (payload.channel === "sms") {
      sent = await sendSMS(payload.phone, payload.message);
    } else {
      sent = await sendWhatsApp(payload.phone, payload.message);
    }

    // Update log status
    await supabase
      .from("notification_log")
      .update({ status: sent ? "sent" : "failed" })
      .eq("id", log.id);

    return { success: sent };
  } catch {
    await supabase
      .from("notification_log")
      .update({ status: "failed" })
      .eq("id", log.id);

    return { success: false, error: "Bildirim gönderilemedi" };
  }
}

/**
 * Render a message template with variable substitution.
 * Supported: {{name}}, {{phone}}, {{threshold}}, {{reward}}, {{order_no}}
 */
export function renderTemplate(
  template: string,
  vars: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }
  return result;
}

// ── SMS Provider (stub — replace with NetGSM/Twilio) ──

async function sendSMS(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.warn("[notifications] SMS_API_KEY not set — skipping SMS to", phone);
    console.log("[notifications] SMS content:", message);
    // Return true in dev so the flow isn't blocked
    return process.env.NODE_ENV !== "production";
  }

  // TODO: Replace with actual NetGSM/Twilio API call
  // Example NetGSM:
  // const res = await fetch("https://api.netgsm.com.tr/sms/send/get", { ... });
  console.log(`[notifications] SMS sent to ${phone}: ${message}`);
  return true;
}

// ── WhatsApp Provider (stub — replace with Meta Cloud API) ──

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiKey) {
    console.warn("[notifications] WHATSAPP_API_KEY not set — skipping WA to", phone);
    console.log("[notifications] WhatsApp content:", message);
    return process.env.NODE_ENV !== "production";
  }

  // TODO: Replace with Meta WhatsApp Business API call
  // const res = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, { ... });
  console.log(`[notifications] WhatsApp sent to ${phone}: ${message}`);
  return true;
}
