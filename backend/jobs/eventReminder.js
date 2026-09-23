const cron = require("node-cron");
const Event = require("../models/Event");
const EventItem = require("../models/EventItem");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");

// ==========================================================
// SETUP
// ==========================================================
// In server.js, after DB connection is established:
//
//   const { startEventReminderJob } = require("./jobs/eventReminder");
//   startEventReminderJob();
//
// Runs once a day at 09:00. Looks at events happening TOMORROW and
// warns the organiser if anything is still unresolved — a price not
// finalised, or a supply not yet delivered — while there's still
// time to chase it.
// ==========================================================

const notify = async (recipient, { title, message }) => {
  await createNotification({ recipient, type: "EVENT_REMINDER", title, message, task: null });

  const io = getIO();
  if (io) io.to(String(recipient)).emit("notification", { type: "EVENT_REMINDER", title, message, createdAt: new Date() });

  sendPushToUsers([recipient], { title, body: message, url: "/events", tag: "event-reminder" }).catch((err) =>
    console.error("[push] event reminder failed:", err.message)
  );
};

const runEventReminders = async () => {
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const events = await Event.find({
    date: { $gte: tomorrowStart, $lte: tomorrowEnd },
    status: { $in: ["planning", "confirmed"] },
  }).lean();

  for (const event of events) {
    const pendingItems = await EventItem.find({
      event: event._id,
      $or: [{ priceKnown: false }, { checklistStatus: { $nin: ["delivered", "setup-done", "cancelled"] } }],
    })
      .select("name priceKnown checklistStatus")
      .lean();

    if (!pendingItems.length) continue;

    const unknownPriceCount = pendingItems.filter((item) => !item.priceKnown).length;
    const notDeliveredCount = pendingItems.filter(
      (item) => !["delivered", "setup-done", "cancelled"].includes(item.checklistStatus)
    ).length;

    const parts = [];
    if (unknownPriceCount) parts.push(`${unknownPriceCount} item(s) with no confirmed price`);
    if (notDeliveredCount) parts.push(`${notDeliveredCount} item(s) not yet delivered`);

    await notify(event.createdBy, {
      title: `"${event.title}" is tomorrow`,
      message: `${parts.join(" and ")}. Check the checklist before the day.`,
    });
  }

  if (events.length) {
    console.log(`[eventReminder] checked ${events.length} event(s) happening tomorrow`);
  }
};

const startEventReminderJob = () => {
  cron.schedule("0 9 * * *", () => {
    runEventReminders().catch((err) => console.error("[eventReminder] job failed:", err));
  });

  console.log("[eventReminder] cron scheduled for 09:00 daily");
};

module.exports = { startEventReminderJob, runEventReminders };