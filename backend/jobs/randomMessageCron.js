const cron = require("node-cron");
const NotificationPreference = require("../models/NotificationPreference");
const MessageTemplate = require("../models/MessageTemplate");
const Notification = require("../models/Notification");
const DEFAULT_POOLS = require("../config/messagePools");

let sendPushToUser;
try {
  ({ sendPushToUser } = require("../utils/webPush"));
} catch {
  sendPushToUser = async () => {};
}

const pickRandomMessage = async (categories, ownerId) => {
  const pool = [];
  categories.forEach((cat) => {
    (DEFAULT_POOLS[cat] || []).forEach((text) => pool.push({ text, category: cat }));
  });

  const customTemplates = await MessageTemplate.find({ createdBy: ownerId, category: { $in: categories } });
  customTemplates.forEach((t) => pool.push({ text: t.text, category: t.category }));

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
};

const pickAndSendFor = async (pref) => {
  if (!pref.categories?.length) return;

  const message = await pickRandomMessage(pref.categories, pref.owner);
  if (!message) return;

  await Notification.create({
    recipient: pref.recipientUser,
    type: "RANDOM_MESSAGE",
    title: message.category,
    message: message.text,
  });

  await sendPushToUser(pref.recipientUser, { title: message.category, body: message.text, tag: "random-message" });

  pref.lastSentAt = new Date();
  await pref.save();
};

const startRandomMessageCron = () => {
  // Checks every 5 minutes which preferences are "due" based on their own frequency
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();
      const prefs = await NotificationPreference.find({ active: true });

      for (const pref of prefs) {
        const dueTime = pref.lastSentAt
          ? new Date(pref.lastSentAt.getTime() + pref.frequencyMinutes * 60000)
          : new Date(0); // never sent — send immediately

        if (now >= dueTime) {
          await pickAndSendFor(pref).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Random message cron failed:", err.message);
    }
  });

  console.log("✅ Random message cron scheduled (checks every 5 min)");
};

module.exports = { startRandomMessageCron, pickAndSendFor };