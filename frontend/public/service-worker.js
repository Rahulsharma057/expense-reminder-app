// ==========================================================
// SERVICE WORKER
// ==========================================================

const DB_NAME = "push-notification-db";
const DB_VERSION = 1;
const STORE_NAME = "chat-notifications";

// ==========================================================
// INDEXED DB
// Used to remember grouped chat messages
// ==========================================================

const openDB = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          STORE_NAME
        )
      ) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "taskId",
        });
      }
    };

    request.onsuccess = () =>
      resolve(request.result);

    request.onerror = () =>
      reject(request.error);
  });

const getChatNotification = async (taskId) => {
  if (!taskId) return null;

  try {
    const db = await openDB();

    return await new Promise(
      (resolve, reject) => {
        const transaction = db.transaction(
          STORE_NAME,
          "readonly"
        );

        const store =
          transaction.objectStore(
            STORE_NAME
          );

        const request = store.get(
          String(taskId)
        );

        request.onsuccess = () =>
          resolve(request.result || null);

        request.onerror = () =>
          reject(request.error);
      }
    );
  } catch (error) {
    console.error(
      "[SW] IndexedDB read failed:",
      error
    );

    return null;
  }
};

const saveChatNotification = async (data) => {
  try {
    const db = await openDB();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.put(data);

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(transaction.error);
    });
  } catch (error) {
    console.error(
      "[SW] IndexedDB save failed:",
      error
    );
  }
};

const deleteChatNotification = async (
  taskId
) => {
  if (!taskId) return;

  try {
    const db = await openDB();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readwrite"
      );

      const store =
        transaction.objectStore(
          STORE_NAME
        );

      store.delete(String(taskId));

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(transaction.error);
    });
  } catch (error) {
    console.error(
      "[SW] IndexedDB delete failed:",
      error
    );
  }
};

// ==========================================================
// PUSH EVENT
// ==========================================================

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};

      try {
        data = event.data
          ? event.data.json()
          : {};
      } catch {
        data = {
          title: "Reminder",
          body: event.data
            ? event.data.text()
            : "",
        };
      }

      console.log(
        "🔔 PUSH DATA RECEIVED:",
        data
      );

      // ======================================================
      // RANDOM / GENERAL NOTIFICATION
      // ======================================================

      if (
        data.notificationType !== "chat" &&
        data.notificationType !== "task"
      ) {
        const title = String(
          data.title || "❤️ A Reminder"
        ).trim();

        const body = String(
          data.body || ""
        ).trim();

        const avatarUrl =
          typeof data.avatarUrl ===
            "string" &&
          data.avatarUrl.trim()
            ? data.avatarUrl.trim()
            : "/icon-192.png";

        const notificationOptions = {
          body,

          icon: avatarUrl,

          image: avatarUrl,

          badge: "/icon-192.png",

          // Every random notification is separate
          tag:
            data.tag ||
            `random-${Date.now()}`,

          renotify: false,

          requireInteraction: false,

          data: {
            url: data.url || "/",

            avatarUrl,

            notificationType:
              data.notificationType ||
              "random",
          },
        };

        console.log(
          "📢 RANDOM NOTIFICATION:",
          notificationOptions
        );

        await self.registration.showNotification(
          title,
          notificationOptions
        );

        return;
      }

      // ======================================================
      // CHAT / TASK NOTIFICATION
      // ======================================================

      const taskId = String(
        data.taskId || ""
      ).trim();

      if (!taskId) {
        await self.registration.showNotification(
          data.title ||
            "New notification",
          {
            body: data.body || "",

            icon:
              data.avatarUrl ||
              "/icon-192.png",

            badge: "/icon-192.png",

            data: {
              url: data.url || "/",
            },
          }
        );

        return;
      }

      // ======================================================
      // APP ALREADY OPEN
      //
      // Send data to the web app so the app can show
      // a custom WhatsApp-style notification card.
      //
      // Do NOT show native notification in this case.
      // ======================================================

      if (
        data.notificationType === "chat"
      ) {
        const appClients =
          await clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });

        if (appClients.length > 0) {
          console.log(
            "💬 APP OPEN - SENDING CUSTOM CHAT NOTIFICATION"
          );

          for (const client of appClients) {
            client.postMessage({
              type:
                "CHAT_PUSH_NOTIFICATION",

              payload: {
                ...data,

                taskId,

                notificationType:
                  "chat",
              },
            });
          }

          return;
        }
      }

      // ======================================================
      // APP CLOSED
      //
      // Continue with native grouped notification.
      // ======================================================

      const existing =
        await getChatNotification(
          taskId
        );

      const incomingMessage = String(
        data.body || ""
      ).trim();

      let messages = Array.isArray(
        existing?.messages
      )
        ? existing.messages
        : [];

      // ======================================================
      // ADD LATEST MESSAGE
      // ======================================================

      if (incomingMessage) {
        messages.push({
          text: incomingMessage,

          createdAt:
            new Date().toISOString(),
        });
      }

      // ======================================================
      // KEEP LATEST 5 PREVIEWS
      // ======================================================

      messages = messages.slice(-5);

      // ======================================================
      // SENDER
      // ======================================================

      const senderName =
        data.senderName ||
        existing?.senderName ||
        data.title ||
        "New Message";

      // ======================================================
      // AVATAR
      // ======================================================

      const avatarUrl =
        typeof data.avatarUrl ===
          "string" &&
        data.avatarUrl.trim()
          ? data.avatarUrl.trim()
          : existing?.avatarUrl ||
            "/icon-192.png";

      // ======================================================
      // MESSAGE COUNT
      // ======================================================

      const messageCount =
        messages.length;

      // ======================================================
      // SAVE GROUP
      // ======================================================

      const notificationData = {
        taskId,

        senderName,

        avatarUrl,

        messages,

        url:
          data.url ||
          `/tasks?open=${taskId}`,

        senderId:
          data.senderId ||
          existing?.senderId ||
          "",

        updatedAt:
          new Date().toISOString(),
      };

      await saveChatNotification(
        notificationData
      );

      // ======================================================
      // WHATSAPP STYLE BODY
      // ======================================================

      let body = "";

      if (messageCount === 1) {
        body =
          messages[0]?.text ||
          "New message";
      } else {
        body = `${messageCount} new messages`;
      }

      // ======================================================
      // MESSAGE PREVIEWS
      // ======================================================

      if (messageCount > 1) {
        const previewText = messages
          .slice(-3)
          .map(
            (item) =>
              `• ${item.text}`
          )
          .join("\n");

        body =
          `${messageCount} new messages\n` +
          previewText;
      }

      // ======================================================
      // NATIVE NOTIFICATION
      // ======================================================

      const notificationOptions = {
        body,

        icon: avatarUrl,

        image: avatarUrl,

        badge: "/icon-192.png",

        // Same task = same notification
        tag: `chat-${taskId}`,

        // Update existing notification
        renotify: true,

        requireInteraction: false,

        data: {
          url:
            data.url ||
            `/tasks?open=${taskId}`,

          taskId,

          notificationType:
            "chat",

          senderId:
            data.senderId ||
            existing?.senderId ||
            "",

          senderName,

          avatarUrl,
        },

        // ====================================================
        // ACTION BUTTONS
        // ====================================================

        actions: [
          {
            action: "reply",
            title: "Reply",
          },
          {
            action: "show",
            title: "Show",
          },
          {
            action: "block",
            title: "Block",
          },
        ],
      };

      console.log(
        "📢 GROUPED CHAT NOTIFICATION:",
        notificationOptions
      );

      await self.registration.showNotification(
        senderName,
        notificationOptions
      );
    })()
  );
});

// ==========================================================
// NOTIFICATION CLICK
// ==========================================================

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    event.waitUntil(
      (async () => {
        const notification =
          event.notification;

        const data =
          notification.data || {};

        const action =
          event.action || "show";

        const taskId =
          data.taskId || "";

        let url =
          data.url || "/";

        // ====================================================
        // REPLY
        // ====================================================

        if (action === "reply") {
          if (taskId) {
            url =
              `/tasks?open=${encodeURIComponent(
                taskId
              )}&reply=1`;
          }
        }

        // ====================================================
        // SHOW
        // ====================================================

        else if (action === "show") {
          if (taskId) {
            url =
              `/tasks?open=${encodeURIComponent(
                taskId
              )}`;
          }
        }

        // ====================================================
        // BLOCK
        // ====================================================

        else if (action === "block") {
          if (taskId) {
            url =
              `/tasks?open=${encodeURIComponent(
                taskId
              )}&block=1`;
          }
        }

        // ====================================================
        // OPEN / FOCUS APP
        // ====================================================

        const clientList =
          await clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });

        for (const client of clientList) {
          if ("focus" in client) {
            await client.focus();

            if (
              "navigate" in client
            ) {
              return client.navigate(
                url
              );
            }

            return client;
          }
        }

        // ====================================================
        // NO OPEN WINDOW
        // ====================================================

        if (clients.openWindow) {
          return clients.openWindow(
            url
          );
        }

        return undefined;
      })()
    );
  }
);

// ==========================================================
// NOTIFICATION CLOSE
// ==========================================================

self.addEventListener(
  "notificationclose",
  (event) => {
    const data =
      event.notification?.data || {};

    // We intentionally DO NOT delete
    // grouped chat history here.
    //
    // Next message will continue the
    // same grouped notification.
  }
);