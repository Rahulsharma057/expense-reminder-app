const webpush = require("../config/webpush");
const PushSubscription = require("../models/PushSubscription");

// Sends a push notification to every device a given user has subscribed
// from. Silently removes subscriptions that have expired/been revoked.
const sendPushToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ user: userId });
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          body
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error("Push send failed:", error.message);
        }
      }
    })
  );
};

module.exports = { sendPushToUser };
