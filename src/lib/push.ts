/**
 * Push notification sender — server-only.
 * Looks up FCM token from push_tokens table and sends via Firebase Admin SDK.
 * Non-blocking: errors are logged but never thrown.
 */

import { createClient } from "@supabase/supabase-js";
import { getAdminMessaging } from "./firebase-admin";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Send a push notification to a customer by their customer_key.
 * Returns true if sent successfully, false otherwise.
 */
export async function sendPush(
  customerKey: string,
  restaurantId: string,
  payload: PushPayload
): Promise<boolean> {
  try {
    const supabase = getServiceClient();

    // Look up FCM token
    let { data: tokenRow } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("customer_key", customerKey)
      .eq("restaurant_id", restaurantId)
      .single();

    if (!tokenRow?.token) {
      // Race condition: token may still be registering (SW + FCM + POST ≈ 2-6s).
      // Wait 5s and retry once before giving up.
      await new Promise((r) => setTimeout(r, 5000));
      const { data: retryRow } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("customer_key", customerKey)
        .eq("restaurant_id", restaurantId)
        .single();
      if (!retryRow?.token) {
        return false; // No token after retry — user declined or never visited
      }
      tokenRow = retryRow;
    }

    const messaging = getAdminMessaging();

    await messaging.send({
      token: tokenRow.token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      webpush: {
        notification: {
          icon: payload.icon || "/favicon.svg",
          badge: "/favicon.svg",
          tag: payload.tag || "loyalty-notification",
        },
        fcmOptions: {
          link: payload.url || "/",
        },
        // data keys must match what firebase-messaging-sw.js reads
        // (title/body duplicated so SW background handler can render them
        // without relying on notification object in all browser versions)
        data: {
          title: payload.title,
          body: payload.body,
          url: payload.url || "/",
          tag: payload.tag || "loyalty-notification",
        },
      },
    });

    return true;
  } catch (err: unknown) {
    // Handle expired/invalid tokens — clean up from DB
    const errorCode =
      err instanceof Error && "code" in err
        ? (err as { code: string }).code
        : "";
    if (
      errorCode === "messaging/registration-token-not-registered" ||
      errorCode === "messaging/invalid-registration-token"
    ) {
      console.warn("[push] Stale token for", customerKey, "— removing");
      const supabase = getServiceClient();
      await supabase
        .from("push_tokens")
        .delete()
        .eq("customer_key", customerKey)
        .eq("restaurant_id", restaurantId);
    } else {
      console.error("[push] Failed to send push:", err);
    }
    return false;
  }
}
