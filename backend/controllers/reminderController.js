const Reminder = require("../models/Reminder");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendPushToUser } = require("../utils/sendPush");

// ============================================================
// CREATE REMINDER
// ============================================================

const createReminder = asyncHandler(async (req, res) => {
  const { title, description, dueDate, assignedTo } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({
      message: "Title is required.",
    });
  }

  if (!dueDate) {
    return res.status(400).json({
      message: "Due date/time is required.",
    });
  }

  const reminder = await Reminder.create({
    title: title.trim(),
    description: description || "",
    dueDate: new Date(dueDate),
    createdBy: req.user._id,
    assignedTo: assignedTo || req.user._id,
  });

  const populated = await reminder.populate([
    {
      path: "createdBy",
      select: "name username",
    },
    {
      path: "assignedTo",
      select: "name username",
    },
  ]);

  // Notify assignee
  if (
    reminder.assignedTo &&
    String(reminder.assignedTo) !== String(req.user._id)
  ) {
    sendPushToUser(reminder.assignedTo, {
      title: "New task assigned",
      body: `${req.user.name} assigned you: "${reminder.title}"`,
      url: "/reminders",
    }).catch((e) =>
      console.error("push error:", e.message)
    );
  }

  res.status(201).json(populated);
});

// ============================================================
// LIST REMINDERS
// ============================================================

const listReminders = asyncHandler(async (req, res) => {
  const { status, mine } = req.query;

  /*
   * A reminder belongs to the users involved in it:
   *
   * 1. createdBy
   * 2. assignedTo
   *
   * Therefore a user can only see reminders where he/she
   * is creator OR assignee.
   */

  const filter = {
    $or: [
      { createdBy: req.user._id },
      { assignedTo: req.user._id },
    ],
  };

  if (status) {
    filter.status = status;
  }

  /*
   * mine=1 means only reminders assigned to current user.
   */
  if (mine === "1") {
    filter.$or = [
      {
        assignedTo: req.user._id,
      },
    ];
  }

  const reminders = await Reminder.find(filter)
    .populate("createdBy", "name username")
    .populate("assignedTo", "name username")
    .populate("updates.postedBy", "name username")
    .sort({ dueDate: 1 });

  res.json(reminders);
});

// ============================================================
// UPDATE REMINDER STATUS
// ============================================================

const updateReminderStatus = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    $or: [
      { createdBy: req.user._id },
      { assignedTo: req.user._id },
    ],
  });

  if (!reminder) {
    return res.status(404).json({
      message: "Reminder not found.",
    });
  }

  const isCreator =
    String(reminder.createdBy) === String(req.user._id);

  const isAssignee =
    String(reminder.assignedTo) === String(req.user._id);

  if (!isCreator && !isAssignee) {
    return res.status(403).json({
      message: "You can only update your own tasks.",
    });
  }

  const { status } = req.body;

  if (!["pending", "done"].includes(status)) {
    return res.status(400).json({
      message: "Invalid status.",
    });
  }

  reminder.status = status;

  await reminder.save();

  // Notify creator when assignee completes task
  if (
    status === "done" &&
    String(reminder.createdBy) !== String(req.user._id)
  ) {
    sendPushToUser(reminder.createdBy, {
      title: "Task completed",
      body: `"${reminder.title}" was marked done by ${req.user.name}.`,
      url: "/reminders",
    }).catch((e) =>
      console.error("push error:", e.message)
    );
  }

  const populated = await reminder.populate([
    {
      path: "createdBy",
      select: "name username",
    },
    {
      path: "assignedTo",
      select: "name username",
    },
    {
      path: "updates.postedBy",
      select: "name username",
    },
  ]);

  res.json(populated);
});

// ============================================================
// ADD REMINDER UPDATE / COMMENT
// ============================================================

const addReminderUpdate = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    $or: [
      { createdBy: req.user._id },
      { assignedTo: req.user._id },
    ],
  });

  if (!reminder) {
    return res.status(404).json({
      message: "Reminder not found.",
    });
  }

  const isCreator =
    String(reminder.createdBy) === String(req.user._id);

  const isAssignee =
    String(reminder.assignedTo) === String(req.user._id);

  if (!isCreator && !isAssignee) {
    return res.status(403).json({
      message: "You can only update your own tasks.",
    });
  }

  const { text } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({
      message: "Update text is required.",
    });
  }

  const cleanText = text.trim();

  reminder.updates.push({
    text: cleanText,
    postedBy: req.user._id,
  });

  await reminder.save();

  // Notify creator if someone else added the update
  if (
    String(reminder.createdBy) !== String(req.user._id)
  ) {
    sendPushToUser(reminder.createdBy, {
      title: "New update on a task",
      body: `${req.user.name} updated "${reminder.title}": ${cleanText.slice(
        0,
        80
      )}`,
      url: "/reminders",
    }).catch((e) =>
      console.error("push error:", e.message)
    );
  }

  const populated = await reminder.populate([
    {
      path: "createdBy",
      select: "name username",
    },
    {
      path: "assignedTo",
      select: "name username",
    },
    {
      path: "updates.postedBy",
      select: "name username",
    },
  ]);

  res.json(populated);
});

// ============================================================
// DELETE REMINDER
// ============================================================

const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOne({
    _id: req.params.id,
    $or: [
      { createdBy: req.user._id },
      { assignedTo: req.user._id },
    ],
  });

  if (!reminder) {
    return res.status(404).json({
      message: "Reminder not found.",
    });
  }

  const isCreator =
    String(reminder.createdBy) === String(req.user._id);

  if (!isCreator) {
    return res.status(403).json({
      message: "Only the creator can delete this reminder.",
    });
  }

  await reminder.deleteOne();

  res.json({
    message: "Reminder deleted.",
    id: req.params.id,
  });
});

// ============================================================

module.exports = {
  createReminder,
  listReminders,
  updateReminderStatus,
  addReminderUpdate,
  deleteReminder,
};