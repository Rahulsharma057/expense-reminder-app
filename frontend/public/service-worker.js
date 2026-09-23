self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Notification",
      body: event.data ? event.data.text() : "",
    };
  }

  console.log("🔔 PUSH DATA:", data);
  console.log("🖼️ AVATAR:", data.avatarUrl);

  const title = data.title || "Reminder";
  const avatarUrl = data.avatarUrl || "/icon-192.png";

  const options = {
    // Notification text
    body: data.body || "",

    // Small notification icon
    icon: avatarUrl,

    // Large image area
    image: avatarUrl,

    // Windows/Chrome notification badge
    badge: "/icon-192.png",

    // Keep notifications grouped
    tag: data.tag || "notification",

    // Allow notification replacement/update
    renotify: true,

    // Keep notification visible until user interacts
    requireInteraction: false,

    // Data used when notification is clicked
    data: {
      url: data.url || "/",
      avatarUrl,
    },

    // Actions are optional but make the notification richer
    actions: [
      {
        action: "open",
        title: "Open",
      },
    ],
  };

  console.log("📢 SHOWING NOTIFICATION:", options);

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});


self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;

  const url =
    event.notification.data?.url || "/";

  // If user clicked the Open action
  if (action === "open" || !action) {
    event.waitUntil(
      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        .then((clientList) => {
          // Try to focus existing tab
          for (const client of clientList) {
            if ("focus" in client) {
              return client.focus().then(() => {
                if ("navigate" in client) {
                  return client.navigate(url);
                }
              });
            }
          }

          // Otherwise open new tab
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});