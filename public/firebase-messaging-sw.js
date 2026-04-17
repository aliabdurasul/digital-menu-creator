// Firebase Cloud Messaging service worker (background message handler).
// This file MUST live at the root of the public/ directory.
// It handles push notifications when the app tab is not focused.

/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Public Firebase config (safe to expose — these are client-side keys)
firebase.initializeApp({
  apiKey: "AIzaSyD04KqRroeIP0pj0AFLhMWpwMenlWxE4rA",
  authDomain: "digital-menu-loyalty.firebaseapp.com",
  projectId: "digital-menu-loyalty",
  storageBucket: "digital-menu-loyalty.firebasestorage.app",
  messagingSenderId: "1016388652386",
  appId: "1:1016388652386:web:f0f24b9c7f27b4d5abb03b",
});

const messaging = firebase.messaging();

// Handle background push messages (tab not focused)
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || data.title || "Seni özledik! ☕";
  const options = {
    body: notification.body || data.body || "Bugün gel, 2x kahve kazan!",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: data.tag || "loyalty-notification",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    actions: [{ action: "open", title: "Menüyü Aç" }],
  };

  return self.registration.showNotification(title, options);
});

// Handle notification clicks — focus existing tab or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        return clients.openWindow(url);
      })
  );
});
