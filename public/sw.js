// Legacy service worker — replaced by firebase-messaging-sw.js.
// This thin stub ensures any cached registrations are cleanly superseded.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
