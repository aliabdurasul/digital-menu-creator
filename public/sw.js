// Service Worker for loyalty push notifications
// Handles inactivity "we miss you" push notifications

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Seni özledik! ☕";
  const options = {
    body: data.body || "Bugün gel, 2x kahve kazan!",
    icon: data.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: data.tag || "loyalty-inactivity",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    actions: [
      { action: "open", title: "Menüyü Aç" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if available
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new tab
      return clients.openWindow(url);
    })
  );
});
