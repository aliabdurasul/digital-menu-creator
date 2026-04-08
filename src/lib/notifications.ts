/**
 * Notification service — abstract SMS/WhatsApp provider layer.
 * sendNotification() inserts a job into notification_log (insert-only, non-blocking).
 * processNotificationQueue() picks up due jobs and dispatches them with retry.
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
  type: "order_ready" | "loyalty_reward" | "welcome";
  channel: "sms" | "whatsapp";
  phone: string;
  message: string;
};

/**
 * Enqueue a notification job. Does NOT send immediately — just inserts into DB.
 * The queue processor (processNotificationQueue) handles actual delivery.
 */
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("notification_log")
    .insert({
      restaurant_id: payload.restaurantId,
      customer_id: payload.customerId || null,
      order_id: payload.orderId || null,
      type: payload.type,
      channel: payload.channel,
      phone: payload.phone,
      message: payload.message,
      status: "pending",
      attempt_count: 0,
      next_attempt_at: new Date().toISOString(),
    });

  if (error) {
    return { success: false, error: "Bildirim kaydı oluşturulamadı" };
  }

  return { success: true };
}

/** Retry backoff delays in seconds: instant, 60s, 300s, 900s */
const RETRY_DELAYS = [0, 60, 300, 900];

/**
 * Process due notification jobs from the queue.
 * Picks up pending/failed jobs where next_attempt_at <= now and attempt_count < max_attempts.
 */
export async function processNotificationQueue(): Promise<{ processed: number; sent: number; failed: number }> {
  const supabase = getServiceClient();

  const { data: jobs, error } = await supabase
    .from("notification_log")
    .select("*")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .lt("attempt_count", 4)
    .order("next_attempt_at", { ascending: true })
    .limit(50);

  if (error || !jobs) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const attempt = (job.attempt_count || 0) + 1;
    let success = false;

    try {
      if (job.channel === "sms") {
        success = await sendSMS(job.phone, job.message);
      } else {
        success = await sendWhatsApp(job.phone, job.message);
      }
    } catch {
      success = false;
    }

    if (success) {
      await supabase
        .from("notification_log")
        .update({
          status: "sent",
          attempt_count: attempt,
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", job.id);
      sent++;
    } else {
      const maxReached = attempt >= (job.max_attempts || 4);
      const nextDelay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)] || 900;
      const nextAttemptAt = new Date(Date.now() + nextDelay * 1000).toISOString();

      await supabase
        .from("notification_log")
        .update({
          status: maxReached ? "failed" : "pending",
          attempt_count: attempt,
          next_attempt_at: maxReached ? undefined : nextAttemptAt,
          last_error: "Gönderim başarısız",
        })
        .eq("id", job.id);
      failed++;
    }
  }

  return { processed: jobs.length, sent, failed };
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
