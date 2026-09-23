const webpush = require("web-push");

const PushSubscription = require("../models/PushSubscription");

// ==========================================================
// SETUP (one-time)
// ==========================================================

// 1. npm install web-push
//
// 2. Generate a VAPID key pair once:
//      npx web-push generate-vapid-keys
//
// 3. Put them in your .env:
//      VAPID_PUBLIC_KEY=...
//      VAPID_PRIVATE_KEY=...
//      VAPID_CONTACT_EMAIL=mailto:you@example.com
//
// 4. The frontend needs VAPID_PUBLIC_KEY too (it's public by design)
//    to call pushManager.subscribe(). Expose it via
//    GET /api/push/public-key (see pushController.js).

// ==========================================================
// VAPID CONFIG
// ==========================================================

const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_CONTACT_EMAIL = "mailto:admin@example.com",
} = process.env;

let configured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_CONTACT_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  configured = true;
} else {
  console.warn(
    "[webPush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push notifications are disabled."
  );
}

// ==========================================================
// SEND PUSH TO ONE USER
// ==========================================================
// avatarUrl = profile photo of the user who triggered the notification

const sendPushToUser = async (
  userId,
  { title, body, url, tag, avatarUrl }
) => {
  if (!configured || !userId) return;

  const subscriptions = await PushSubscription.find({
    user: userId,
  }).lean();

  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title: title || "New notification",
    body: body || "",
    url: url || "/tasks",
    tag: tag || "task-update",

    // Sender's profile photo
    avatarUrl: avatarUrl || "",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          payload
        );
      } catch (err) {
        // 404/410 = browser/OS says this subscription is dead.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({
            _id: sub._id,
          }).catch(() => {});
        } else {
          console.error(
            "[webPush] send failed:",
            err.statusCode,
            err.message
          );
        }
      }
    })
  );
};

// ==========================================================
// SEND PUSH TO MULTIPLE USERS
// ==========================================================

const sendPushToUsers = async (userIds, payload) => {
  if (!configured) return;

  await Promise.all(
    [...new Set((userIds || []).filter(Boolean).map(String))].map((id) =>
      sendPushToUser(id, payload)
    )
  );
};

module.exports = {
  sendPushToUser,
  sendPushToUsers,
  isPushConfigured: () => configured,
};