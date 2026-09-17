const cron = require("node-cron");
const Checklist = require("../models/Checklist");
const Notification = require("../models/Notification");
const { sendPushToUser } = require("../utils/webPush");
const MS_IN_DAY = 24 * 60 * 60 * 1000;

const startChecklistCron = () => {
  // Runs every day at 00:05 server time
  cron.schedule("5 0 * * *", async () => {
    try {
      await resetRecurringChecklists();
      await sendDueReminders();
    } catch (err) {
      console.error("Checklist cron failed:", err.message);
    }
  });

  console.log("✅ Checklist cron scheduled (daily 00:05)");
};

const resetRecurringChecklists = async () => {
  const now = new Date();
  const recurring = await Checklist.find({ type: { $in: ["Daily", "Weekly"] }, status: "Active" });

  for (const checklist of recurring) {
    const elapsedMs = now - new Date(checklist.lastResetAt);
    const shouldReset =
      (checklist.type === "Daily" && elapsedMs >= MS_IN_DAY) ||
      (checklist.type === "Weekly" && elapsedMs >= 7 * MS_IN_DAY);

    if (!shouldReset) continue;

    checklist.items.forEach((item) => {
      item.status = "Pending";
      item.remarks = "";
    });
    checklist.lastResetAt = now;
    await checklist.save();

    await Promise.all(
      checklist.assignedTo.map(async (userId) => {
        const title = `${checklist.type} Checklist Reset`;
        const message = `"${checklist.title}" is ready again — please complete it.`;
        await Notification.create({ recipient: userId, type: "CHECKLIST", title, message });
        await sendPushToUser(userId, { title, body: message });
      })
    );
  }
};

const sendDueReminders = async () => {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const due = await Checklist.find({ status: "Active", dueDate: { $ne: null, $lte: endOfToday } });

  for (const checklist of due) {
    const isOverdue = new Date(checklist.dueDate) < now;
    const title = isOverdue ? "Checklist Overdue" : "Checklist Due Today";
    const message = `"${checklist.title}" ${isOverdue ? "was due" : "is due"} on ${new Date(checklist.dueDate).toLocaleDateString("en-IN")}.`;

    await Promise.all(
      checklist.assignedTo.map(async (userId) => {
        await Notification.create({ recipient: userId, type: "CHECKLIST", title, message });
        await sendPushToUser(userId, { title, body: message });
      })
    );
  }
};

module.exports = startChecklistCron;