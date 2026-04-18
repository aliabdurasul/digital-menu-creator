/**
 * Firebase client SDK — browser-only module.
 * Initializes Firebase app and provides FCM token management.
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Get or create the Firebase app instance (singleton). */
function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/** Get Messaging instance. Must be called in browser context only. */
function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  try {
    return getMessaging(getFirebaseApp());
  } catch {
    console.warn("[firebase-client] Messaging not supported in this browser");
    return null;
  }
}

/**
 * Get FCM token WITHOUT requesting permission.
 * Assumes Notification.permission === "granted" has already been verified.
 * Use this after calling Notification.requestPermission() directly in the gesture handler
 * to avoid the dynamic-import async gap breaking the browser's user-gesture chain.
 */
export async function getMessagingToken(
  swRegistration?: ServiceWorkerRegistration
): Promise<string | null> {
  try {
    const messaging = getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn("[firebase-client] VAPID key not set");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });

    return token || null;
  } catch (err) {
    console.error("[firebase-client] Failed to get FCM token:", err);
    return null;
  }
}

/**
 * Request notification permission AND get FCM token.
 * Returns token string on success, null on failure/denial.
 * NOTE: Call from a user-gesture handler OR when permission is already "granted".
 */
export async function requestNotificationPermission(
  swRegistration?: ServiceWorkerRegistration
): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[firebase-client] Notification permission denied");
      return null;
    }
    return getMessagingToken(swRegistration);
  } catch (err) {
    console.error("[firebase-client] Failed to get FCM token:", err);
    return null;
  }
}
