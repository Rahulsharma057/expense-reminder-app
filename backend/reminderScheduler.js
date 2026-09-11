const Reminder = require("./models/Reminder");
const { sendPushToUser } = require("./utils/sendPush");

// Every 60s, find pending reminders whose due time has arrived and haven't
// been notified about yet, push the assignee, and mark them as notified so
// we don't spam the same push repeatedly.
const startReminderScheduler = () => {
  const check = async () => {
    try {
      const now = new Date();
      const dueReminders = await Reminder.find({
        status: "pending",
        dueNotificationSent: false,
        dueDate: { $lte: now },
      });

      for (const reminder of dueReminders) {
        await sendPushToUser(reminder.assignedTo, {
          title: "Task due now",
          body: reminder.title,
          url: "/reminders",
        });
        reminder.dueNotificationSent = true;
        await reminder.save();
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error.message);
    }
  };

  check();
  setInterval(check, 60 * 1000);
};

module.exports = startReminderScheduler;
