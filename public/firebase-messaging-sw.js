// Push notification service worker.
// Uses the native Web Push API — no Firebase compat SDK.
//
// WHY: firebase-messaging-compat.js intercepts the native push event via an
// internal opaque handler before any JS code runs. Chrome's spam heuristic
// activates when SW notification rendering is non-transparent, showing:
//   "This site may be sending spam notifications"
// A plain push listener gives Chrome exactly one transparent path:
//   push event → showNotification() → Chrome trusts it.
//
// TOKEN MANAGEMENT: firebase-client.ts calls getToken() from firebase/messaging
// (modular SDK, browser-side only) with serviceWorkerRegistration pointing here.
// The SW itself never needs the Firebase SDK for token management to work.

"use strict";

// Take control of all open tabs immediately on SW update.
// Without this, users stay on the previous SW until they close all tabs.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle background push messages (tab not focused).
// FCM sends data-only webpush payloads; fields are nested under `data`.
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let raw;
  try {
    raw = event.data.json();
  } catch {
    return; // Malformed payload — ignore silently
  }

  // FCM data-only webpush: fields under `data`. Guard `notification` for legacy.
  const d = raw.data || {};
  const n = raw.notification || {};

  const title = d.title || n.title || "Bildirim";
  const options = {
    body: d.body || n.body || "",
    icon: d.icon || "/favicon.svg",
    badge: "/favicon.svg",
    tag: d.tag || "loyalty-notification",
    data: { url: d.url || "/" },
    vibrate: [100, 50, 100],
    actions: [{ action: "open", title: "Menüyü Aç" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — focus existing tab or open new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
