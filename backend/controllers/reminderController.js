const Reminder = require("../models/Reminder");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendPushToUser } = require("../utils/sendPush");

const createReminder = asyncHandler(async (req, res) => {
  const { title, description, dueDate, assignedTo } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
  if (!dueDate) return res.status(400).json({ message: "Due date/time is required." });

  const reminder = await Reminder.create({
    title: title.trim(),
    description: description || "",
    dueDate: new Date(dueDate),
    createdBy: req.user._id,
    assignedTo: assignedTo || req.user._id,
  });

  const populated = await reminder.populate([
    { path: "createdBy", select: "name username" },
    { path: "assignedTo", select: "name username" },
  ]);

  // Notify the assignee right away that something new has been given to them
  // (separate from the "it's now due" push sent later by the scheduler).
  sendPushToUser(reminder.assignedTo, {
    title: "New task assigned",
    body: `${req.user.name} assigned you: "${reminder.title}"`,
    url: "/reminders",
  }).catch((e) => console.error("push error:", e.message));

  res.status(201).json(populated);
});

const listReminders = asyncHandler(async (req, res) => {
  const { status, mine } = req.query;
  const filter = {};

  if (status) filter.status = status;
  // "mine=1" — only reminders assigned to me. Owner without this flag sees everyone's.
  if (mine === "1" || req.user.role !== "owner") {
    filter.assignedTo = req.user._id;
  }

  const reminders = await Reminder.find(filter)
    .populate("createdBy", "name username")
    .populate("assignedTo", "name username")
    .populate("updates.postedBy", "name username")
    .sort({ dueDate: 1 });

  res.json(reminders);
});

const updateReminderStatus = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ message: "Reminder not found." });

  const isOwner = req.user.role === "owner";
  const isAssignee = String(reminder.assignedTo) === String(req.user._id);
  if (!isOwner && !isAssignee) {
    return res.status(403).json({ message: "You can only update your own tasks." });
  }

  const { status } = req.body;
  if (!["pending", "done"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }
  reminder.status = status;
  await reminder.save();

  if (status === "done") {
    sendPushToUser(reminder.createdBy, {
      title: "Task completed",
      body: `"${reminder.title}" was marked done by ${req.user.name}.`,
      url: "/reminders",
    }).catch((e) => console.error("push error:", e.message));
  }

  const populated = await reminder.populate([
    { path: "createdBy", select: "name username" },
    { path: "assignedTo", select: "name username" },
  ]);
  res.json(populated);
});

// Either the assignee or the creator can post a short update/comment on a task.
const addReminderUpdate = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ message: "Reminder not found." });

  const isOwner = req.user.role === "owner";
  const isAssignee = String(reminder.assignedTo) === String(req.user._id);
  if (!isOwner && !isAssignee) {
    return res.status(403).json({ message: "You can only update your own tasks." });
  }

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: "Update text is required." });

  reminder.updates.push({ text: text.trim(), postedBy: req.user._id });
  await reminder.save();

  if (String(reminder.createdBy) !== String(req.user._id)) {
    sendPushToUser(reminder.createdBy, {
      title: "New update on a task",
      body: `${req.user.name} updated "${reminder.title}": ${text.trim().slice(0, 80)}`,
      url: "/reminders",
    }).catch((e) => console.error("push error:", e.message));
  }

  const populated = await reminder.populate([
    { path: "createdBy", select: "name username" },
    { path: "assignedTo", select: "name username" },
    { path: "updates.postedBy", select: "name username" },
  ]);
  res.json(populated);
});

const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) return res.status(404).json({ message: "Reminder not found." });

  const isOwner = req.user.role === "owner";
  const isCreator = String(reminder.createdBy) === String(req.user._id);
  if (!isOwner && !isCreator) {
    return res.status(403).json({ message: "Only the creator or owner can delete this." });
  }

  await reminder.deleteOne();
  res.json({ message: "Reminder deleted.", id: req.params.id });
});

module.exports = {
  createReminder, listReminders, updateReminderStatus, addReminderUpdate, deleteReminder,
};
