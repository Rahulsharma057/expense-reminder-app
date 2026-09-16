const cron = require("node-cron");
const Task = require("../models/Task");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");

// ==========================================================
// SETUP
// ==========================================================
// npm install node-cron
//
// In your server.js, after DB connection is established:
//
//   const { startDueDateReminderJob } = require("./jobs/dueDateReminder");
//   startDueDateReminderJob();
//
// Runs once a day at 09:00 server time. Change the cron expression
// below if your server's timezone isn't what you want reminders sent
// in — safest is to also set process.env.TZ in your deploy config.
// ==========================================================

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const getRecipients = (task) => {
  const ids =
    task.mode === "GROUP"
      ? (task.participants || []).map(toId)
      : [toId(task.assignedTo)];
  return [...new Set(ids.filter(Boolean))];
};

const tomorrowDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

const runDueDateReminders = async () => {
  const target = tomorrowDateString();

  // Tasks due tomorrow, not completed, not already reminded for this
  // dueDate (reminderSentAt is cleared whenever dueDate changes — see
  // taskController.updateTask).
  const tasks = await Task.find({
    dueDate: target,
    status: { $ne: "completed" },
    reminderSentAt: null,
  }).lean();

  if (!tasks.length) return;

  const io = getIO();

  await Promise.all(
    tasks.map(async (task) => {
      const recipients = getRecipients(task);
      if (!recipients.length) return;

      await Promise.all(
        recipients.map((recipient) =>
          createNotification({
            recipient,
            type: "DUE_TOMORROW",
            title: "Task Due Tomorrow",
            message: `"${task.title}" is due tomorrow (${task.dueDate}).`,
            task: task._id,
          })
        )
      );

      if (io) {
        recipients.forEach((id) =>
          io.to(id).emit("notification", {
            type: "DUE_TOMORROW",
            title: "Task Due Tomorrow",
            message: `"${task.title}" is due tomorrow.`,
            task: task._id,
            createdAt: new Date(),
          })
        );
      }

      sendPushToUsers(recipients, {
        title: "Task Due Tomorrow",
        body: `"${task.title}" is due tomorrow.`,
        url: `/tasks?open=${task._id}`,
        tag: `due-${task._id}`,
      }).catch((err) => console.error("[push] due reminder failed:", err.message));

      await Task.updateOne({ _id: task._id }, { $set: { reminderSentAt: new Date() } });
    })
  );

  console.log(`[dueDateReminder] sent reminders for ${tasks.length} task(s) due ${target}`);
};

const startDueDateReminderJob = () => {
  // 09:00 every day.
  cron.schedule("0 9 * * *", () => {
    runDueDateReminders().catch((err) =>
      console.error("[dueDateReminder] job failed:", err)
    );
  });

  console.log("[dueDateReminder] cron scheduled for 09:00 daily");
};

module.exports = { startDueDateReminderJob, runDueDateReminders };