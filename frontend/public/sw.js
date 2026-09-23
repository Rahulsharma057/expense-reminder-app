// public/sw.js
// Must be served from the site root:
// https://yoursite.com/sw.js

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "New notification",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "New notification";

  const options = {
    body: data.body || "",

    // Sender ki profile photo
    // Agar avatar nahi hai to app icon show hoga
    icon: data.avatarUrl || "/icon-192.png",

    // Notification badge
    badge: "/icon-192.png",

    tag: data.tag || "task-update",

    data: {
      url: data.url || "/tasks",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/tasks";

  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});