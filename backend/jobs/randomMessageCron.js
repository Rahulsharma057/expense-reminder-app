
const cron = require("node-cron");
const NotificationPreference = require("../models/NotificationPreference");
const MessageTemplate = require("../models/MessageTemplate");
const User = require("../models/User");
const Notification = require("../models/Notification");
const DEFAULT_POOLS = require("../config/messagePools");

let sendPushToUser;

try {
  ({ sendPushToUser } = require("../utils/webPush"));
} catch {
  sendPushToUser = async () => {};
}

// =============================================================
// RANDOM NOTIFICATION TITLES
// =============================================================
const NOTIFICATION_TITLES = [
  "❤️ A Reminder",
  "💭 Suno Na...",
  "🥰 Ek Baat Kahoon?",
  "💌 Just For You",
  "✨ Pata Hai?",
  "❤️ Hey You!",
  "😊 Ek Chhoti Si Baat",
  "💕 Bas Tumhare Liye",
  "😘 Suno Na, Ek Baat Hai",
  "🌸 Aaj Tumhari Yaad Aayi",
  "💖 Tumhare Liye",
  "🫶 Ek Reminder",
  "💫 Guess What?",
  "😍 Pata Hai Tum Kitne Special Ho?",
  "💌 Bas Yunhi...",
  "❤️ Thoda Sa Time Hai?",
  "🥹 Ek Baat Yaad Rakhna",
  "✨ Just A Little Reminder",
  "💭 Kuch Kehna Tha...",
  "💕 This One Is For You",
  "😊 Smile Please!",
  "❤️ Dil Se...",
  "🌷 Aaj Ke Liye Ek Baat",
  "💫 Random Thought",
  "🥰 You Should Know This",
  "💌 A Little Message For You",
  "❤️ Bas Tumhare Liye...",
  "😉 Oye Suno!",
  "💖 Ek Cute Sa Reminder",
  "✨ Before You Forget...",
];

// Pick a random notification heading
const pickRandomTitle = () => {
  return NOTIFICATION_TITLES[
    Math.floor(Math.random() * NOTIFICATION_TITLES.length)
  ];
};

// =============================================================
// PICK RANDOM MESSAGE
// =============================================================
const pickRandomMessage = async (categories, ownerId) => {
  const pool = [];

  categories.forEach((cat) => {
    (DEFAULT_POOLS[cat] || []).forEach((text) => {
      pool.push({
        text,
        category: cat,
      });
    });
  });

  const customTemplates = await MessageTemplate.find({
    createdBy: ownerId,
    category: { $in: categories },
  });

  customTemplates.forEach((t) => {
    pool.push({
      text: t.text,
      category: t.category,
    });
  });

  if (!pool.length) return null;

  return pool[Math.floor(Math.random() * pool.length)];
};

// =============================================================
// SEND MESSAGE FOR ONE PREFERENCE
// =============================================================
const pickAndSendFor = async (pref) => {
  if (!pref.categories?.length) return;

  const message = await pickRandomMessage(
    pref.categories,
    pref.owner
  );

  if (!message) return;

  // ===========================================================
  // GET RECIPIENT NAME + AVATAR
  // ===========================================================
  const recipient = await User.findById(pref.recipientUser)
    .select("name avatarUrl")
    .lean();

  if (!recipient) {
    console.error(
      `Recipient user not found: ${pref.recipientUser}`
    );
    return;
  }

  // ===========================================================
  // ONLY FIRST NAME
  // Example:
  // "Bhumika Sharma" -> "Bhumika"
  // "Rahul Kumar"     -> "Rahul"
  // ===========================================================
  const userName = recipient.name
    ? recipient.name.trim().split(/\s+/)[0]
    : "You";

  const avatarUrl = recipient.avatarUrl || "";

  // ===========================================================
  // RANDOM NOTIFICATION TITLE
  // ===========================================================
  const notificationTitle = pickRandomTitle();

  // ===========================================================
  // NAME ONLY AT START OF BODY
  // ===========================================================
  const notificationBody = `${userName}, ${message.text}`;

  // ===========================================================
  // SAVE NOTIFICATION IN DATABASE
  // ===========================================================
  await Notification.create({
    recipient: pref.recipientUser,
    type: "RANDOM_MESSAGE",
    title: notificationTitle,
    message: notificationBody,
  });

  // ===========================================================
  // SEND PUSH NOTIFICATION
  // ===========================================================
  await sendPushToUser(pref.recipientUser, {
    title: notificationTitle,
    body: notificationBody,
    tag: "random-message",
    avatarUrl,
  });

  // ===========================================================
  // UPDATE LAST SENT TIME
  // ===========================================================
  pref.lastSentAt = new Date();
  await pref.save();
};

// =============================================================
// RANDOM MESSAGE CRON
// =============================================================
const startRandomMessageCron = () => {
  // Checks every 5 minutes which preferences are due
  // based on their individual frequency
  cron.schedule("*/5 * * * *", async () => {
    try {
      const now = new Date();

      const prefs = await NotificationPreference.find({
        active: true,
      });

      for (const pref of prefs) {
        const dueTime = pref.lastSentAt
          ? new Date(
              pref.lastSentAt.getTime() +
                pref.frequencyMinutes * 60000
            )
          : new Date(0);

        if (now >= dueTime) {
          await pickAndSendFor(pref).catch((err) => {
            console.error(
              `Failed to send random message for preference ${pref._id}:`,
              err.message
            );
          });
        }
      }
    } catch (err) {
      console.error(
        "Random message cron failed:",
        err.message
      );
    }
  });

  console.log(
    "✅ Random message cron scheduled (checks every 5 min)"
  );
};

// =============================================================
// EXPORTS
// =============================================================
module.exports = {
  startRandomMessageCron,
  pickAndSendFor,
};

