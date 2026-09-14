const Notification = require("../models/Notification");

// Saves an in-app notification. Never throws — a notification
// failure should never break the task/message action that
// triggered it (createTask, addMessage, updateStatus, etc. all
// call this without a try/catch around it).
const createNotification = async ({ recipient, type, title, message, task }) => {
  try {
    if (!recipient || !type || !title || !message) return null;

    return await Notification.create({
      recipient,
      type,
      title,
      message,
      task: task || null,
    });
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
};

// Handy extras for a notifications/bell-icon screen, if/when you
// build one — not required by taskController, safe to ignore.
const listNotifications = async (userId, { onlyUnread = false } = {}) => {
  const filter = { recipient: userId };
  if (onlyUnread) filter.read = false;
  return Notification.find(filter).sort({ createdAt: -1 }).limit(100);
};

const markNotificationsRead = async (userId, notificationIds) => {
  const filter = { recipient: userId };
  if (Array.isArray(notificationIds) && notificationIds.length) {
    filter._id = { $in: notificationIds };
  }
  return Notification.updateMany(filter, { $set: { read: true } });
};

module.exports = {
  createNotification,
  listNotifications,
  markNotificationsRead,
};