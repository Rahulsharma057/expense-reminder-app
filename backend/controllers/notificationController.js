const Notification = require("../models/Notification");

// GET /notifications?page=1&limit=20
const listNotifications = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments({ recipient: req.user._id }),
      Notification.countDocuments({ recipient: req.user._id, read: false }),
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("task", "title")
        .lean(),
    ]);

    return res.json({
      notifications,
      unreadCount,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("listNotifications error:", err);
    return res.status(500).json({ message: "Could not load notifications" });
  }
};

// GET /notifications/unread-count — lightweight polling endpoint for
// the bell badge, used as a fallback if the socket connection drops.
const unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    return res.json({ count });
  } catch (err) {
    console.error("unreadCount error:", err);
    return res.status(500).json({ message: "Could not load unread count" });
  }
};

// PATCH /notifications/:id/read
const markOneRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    return res.json(notification);
  } catch (err) {
    console.error("markOneRead error:", err);
    return res.status(500).json({ message: "Could not update notification" });
  }
};

// PATCH /notifications/read-all
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("markAllRead error:", err);
    return res.status(500).json({ message: "Could not update notifications" });
  }
};

module.exports = { listNotifications, unreadCount, markOneRead, markAllRead };