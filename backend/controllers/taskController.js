const mongoose = require("mongoose");
const Task = require("../models/Task");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");

// ==========================================================
// ID / ACCESS HELPERS
// ==========================================================

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const isSameId = (a, b) => toId(a) && toId(a) === toId(b);
const isSuperAdmin = (role) =>
  String(role || "").toLowerCase() === "superadmin";

const getTaskParticipants = (task) => {
  if (task.mode === "GROUP") {
    return Array.isArray(task.participants)
      ? task.participants.filter(Boolean).map(toId)
      : [];
  }
  return task.assignedTo ? [toId(task.assignedTo)] : [];
};

const getChatMembers = (task) => [
  ...new Set(
    [toId(task.assignedBy), ...getTaskParticipants(task)].filter(Boolean),
  ),
];

const isTaskAssigner = (task, userId) => isSameId(task.assignedBy, userId);

const isTaskParticipant = (task, userId) => {
  if (!userId) return false;
  return getTaskParticipants(task).includes(String(userId));
};

const canAccessTask = (task, userId, role) => {
  if (!task || !userId) return false;
  if (isSuperAdmin(role)) return true;
  return isTaskAssigner(task, userId) || isTaskParticipant(task, userId);
};

// ==========================================================
// REALTIME
// ==========================================================

const emitToTask = (taskId, event, payload) => {
  const io = getIO();
  if (io) io.to(`task:${taskId}`).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  const io = getIO();
  if (io) io.to(String(userId)).emit(event, payload);
};

const emitToUsers = (userIds, event, payload) => {
  const io = getIO();
  if (!io) return;
  [...new Set((userIds || []).filter(Boolean).map(toId))].forEach((id) =>
    io.to(id).emit(event, payload),
  );
};

const notifyUsers = async ({
  recipients = [],
  senderId,
  type,
  title,
  message,
  task,
}) => {
  const uniqueRecipients = [
    ...new Set(
      recipients
        .filter(Boolean)
        .map(toId)
        .filter(Boolean)
        .filter((id) => id !== String(senderId)),
    ),
  ];

  if (!uniqueRecipients.length) return;

  // ========================================================
  // DATABASE NOTIFICATION
  // ========================================================

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({
        recipient,
        type,
        title,
        message,
        task,
      }),
    ),
  );

  // ========================================================
  // SOCKET NOTIFICATION
  // ========================================================

  emitToUsers(uniqueRecipients, "notification", {
    type,
    title,
    message,
    task,
    createdAt: new Date(),
  });

  // ========================================================
  // GET SENDER PROFILE
  // ========================================================

  let avatarUrl = "";
  let senderName = "";

  if (senderId) {
    try {
      const sender = await User.findById(senderId)
        .select("name avatarUrl")
        .lean();

      avatarUrl = sender?.avatarUrl || "";
      senderName = sender?.name || "";

      console.log("[push] SENDER:", senderName);
      console.log("[push] AVATAR:", avatarUrl);
    } catch (err) {
      console.error(
        "[push] could not load sender profile:",
        err.message,
      );
    }
  }

  // ========================================================
  // PUSH NOTIFICATION
  // ========================================================

  sendPushToUsers(uniqueRecipients, {
    title,
    body: message,
    url: `/tasks?open=${task}`,

    // Same task notification group
    tag: `task-${task}`,

    // Sender profile photo
    avatarUrl,

    // Extra metadata for service-worker
    notificationType: "task",
    taskId: String(task),
    senderId: senderId ? String(senderId) : "",
    senderName,
  }).catch((err) =>
    console.error("[push] send failed:", err.message),
  );
};
// ==========================================================
// RECURRENCE (unchanged logic, trimmed comments)
// ==========================================================

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const computeNextDueDate = (currentDueDate, frequency) => {
  const base = currentDueDate ? new Date(currentDueDate) : new Date();
  const valid = Number.isNaN(base.getTime()) ? new Date() : base;

  if (frequency === "daily") return addDays(valid, 1);
  if (frequency === "weekly") return addDays(valid, 7);
  if (frequency === "monthly") {
    const d = new Date(valid);
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  return null;
};

const toDateInputString = (date) => date.toISOString().slice(0, 10);

const normalizeRecurrence = (recurrence) => {
  if (
    !recurrence ||
    !recurrence.enabled ||
    !["daily", "weekly", "monthly"].includes(recurrence.frequency)
  ) {
    return { enabled: false, frequency: null };
  }
  return { enabled: true, frequency: recurrence.frequency };
};

const normalizeChecklistRecurrence = (value) => {
  if (
    !value ||
    !value.enabled ||
    !["daily", "weekly", "monthly"].includes(value.frequency)
  ) {
    return { enabled: false, frequency: null, lastResetAt: null };
  }
  return { enabled: true, frequency: value.frequency, lastResetAt: new Date() };
};

const spawnNextRecurrence = async (completedTask) => {
  if (
    !completedTask?.recurrence?.enabled ||
    !completedTask.recurrence.frequency
  )
    return null;

  const nextDue = computeNextDueDate(
    completedTask.dueDate,
    completedTask.recurrence.frequency,
  );
  if (!nextDue) return null;

  const nextTask = await Task.create({
    title: completedTask.title,
    description: completedTask.description,
    mode: completedTask.mode,
    priority: completedTask.priority,
    assignedTo: completedTask.assignedTo || null,
    participants: completedTask.participants || [],
    assignedBy: completedTask.assignedBy,
    dueDate: toDateInputString(nextDue),
    recurrence: completedTask.recurrence,
    recurredFrom: completedTask._id,
    checklist: (completedTask.checklist || []).map((item, index) => ({
      text: item.text,
      done: false,
      assignedTo: item.assignedTo || null,
      assignedToName: item.assignedToName || "",
      order: item.order ?? index,
    })),
    checklistRecurrence: completedTask.checklistRecurrence,
  });

  const populatedNext = await nextTask.populate([
    { path: "assignedTo", select: "name email role avatarUrl" },
    { path: "participants", select: "name email role avatarUrl" },
    { path: "assignedBy", select: "name email role avatarUrl" },
  ]);

  await notifyUsers({
    recipients: getTaskParticipants(completedTask),
    senderId: completedTask.assignedBy,
    type: "NEW_TASK",
    title: "Recurring Task Renewed",
    message: `"${completedTask.title}" has been scheduled again — due ${toDateInputString(nextDue)}.`,
    task: populatedNext._id,
  });

  emitToUsers(getChatMembers(completedTask), "newTask", populatedNext);

  return populatedNext;
};

// ==========================================================
// CHECKLIST RECURRENCE (lazy reset on open — unchanged)
// ==========================================================

const startOfPeriod = (date, frequency) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (frequency === "daily") return d;
  if (frequency === "weekly") {
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
  }
  if (frequency === "monthly") {
    d.setDate(1);
    return d;
  }
  return null;
};

const maybeResetChecklist = async (task) => {
  const rec = task.checklistRecurrence;
  if (!rec?.enabled || !rec.frequency || !task.checklist?.length) return;

  const currentPeriod = startOfPeriod(new Date(), rec.frequency);
  if (!currentPeriod) return;

  const lastReset = rec.lastResetAt ? new Date(rec.lastResetAt) : null;
  if (lastReset && lastReset >= currentPeriod) return;

  const anyDone = task.checklist.some((item) => item.done);

  await Task.updateOne(
    { _id: task._id },
    {
      $set: {
        "checklist.$[].done": false,
        "checklist.$[].doneBy": null,
        "checklist.$[].doneByName": "",
        "checklist.$[].doneAt": null,
        "checklistRecurrence.lastResetAt": new Date(),
      },
    },
  );

  if (anyDone)
    emitToTask(task._id, "checklistReset", { taskId: String(task._id) });
};

// ==========================================================
// CREATE TASK
// Accepts an optional `templateId` — if given, title/description/
// checklist/mode defaults are pulled from the template and merged
// with whatever the request body explicitly overrides.
// ==========================================================

const createTask = async (req, res) => {
  try {
    let {
      title,
      description,
      assignedTo,
      assignedToList,
      dueDate,
      mode = "INDIVIDUAL",
      recurrence,
      checklist,
      checklistRecurrence,
      priority,
      templateId,
    } = req.body;

    if (!req.user?._id)
      return res.status(401).json({ message: "Authentication required" });

    if (templateId) {
      if (!mongoose.Types.ObjectId.isValid(templateId)) {
        return res.status(400).json({ message: "Invalid template" });
      }

      const TaskTemplate = require("../models/TaskTemplate");
      const template = await TaskTemplate.findById(templateId).lean();

      if (template) {
        title = title || template.title;
        description = description || template.description;
        mode = req.body.mode || template.mode;
        priority = priority || template.priority;
        checklist = checklist || template.checklist;
        recurrence = recurrence || template.recurrence;
        checklistRecurrence =
          checklistRecurrence || template.checklistRecurrence;
      }
    }

    if (!title?.trim())
      return res.status(400).json({ message: "Task title is required" });
    if (!["INDIVIDUAL", "SEPARATE", "GROUP"].includes(mode)) {
      return res.status(400).json({ message: "Invalid task mode" });
    }

    const safePriority = ["low", "medium", "high"].includes(priority)
      ? priority
      : "medium";
    const safeRecurrence = normalizeRecurrence(recurrence);
    const safeChecklistRecurrence =
      normalizeChecklistRecurrence(checklistRecurrence);

    const safeChecklist = Array.isArray(checklist)
      ? checklist
          .map((item, index) => ({
            text: String(item?.text || "").trim(),
            order: index,
            assignedTo:
              item?.assignedTo &&
              mongoose.Types.ObjectId.isValid(item.assignedTo)
                ? item.assignedTo
                : null,
            assignedToName: item?.assignedToName || "",
          }))
          .filter((item) => item.text)
          .slice(0, 100)
      : [];

    const base = {
      title: title.trim(),
      description: description?.trim() || "",
      assignedBy: req.user._id,
      dueDate: dueDate || "",
      priority: safePriority,
      recurrence: safeRecurrence,
      checklist: safeChecklist,
      checklistRecurrence: safeChecklistRecurrence,
      createdFromTemplate: templateId || null,
    };

    // ---------------- INDIVIDUAL ----------------

    if (mode === "INDIVIDUAL") {
      if (!assignedTo)
        return res.status(400).json({ message: "Please select a user" });
      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({ message: "Invalid user" });
      }

      const task = await Task.create({
        ...base,
        mode: "INDIVIDUAL",
        assignedTo,
        participants: [],
      });

      const populated = await task.populate([
        { path: "assignedTo", select: "name email role avatarUrl" },
        { path: "assignedBy", select: "name email role avatarUrl" },
      ]);

      await createNotification({
        recipient: assignedTo,
        type: "NEW_TASK",
        title: "New Task Assigned",
        message: `You have been assigned a new task: "${task.title}"`,
        task: task._id,
      });

      emitToUser(assignedTo, "newTask", populated);

      return res.status(201).json(populated);
    }

    // ---------------- SEPARATE ----------------

    if (mode === "SEPARATE") {
      const targets = Array.isArray(assignedToList)
        ? [...new Set(assignedToList.filter(Boolean).map(String))]
        : [];

      if (targets.length < 2) {
        return res
          .status(400)
          .json({
            message: "Select at least two users for separate assignment",
          });
      }
      if (targets.some((tid) => !mongoose.Types.ObjectId.isValid(tid))) {
        return res
          .status(400)
          .json({ message: "One or more user IDs are invalid" });
      }

      const docs = targets.map((userId) => ({
        ...base,
        mode: "SEPARATE",
        assignedTo: userId,
        participants: [],
      }));
      const createdTasks = await Task.insertMany(docs);

      await Promise.all(
        createdTasks.map((task) =>
          createNotification({
            recipient: task.assignedTo,
            type: "NEW_TASK",
            title: "New Task Assigned",
            message: `You have been assigned a new task: "${task.title}"`,
            task: task._id,
          }),
        ),
      );

      const populatedTasks = await Task.find({
        _id: { $in: createdTasks.map((t) => t._id) },
      })
        .populate("assignedTo", "name email role avatarUrl")
        .populate("assignedBy", "name email role avatarUrl")
        .sort({ createdAt: -1 });

      populatedTasks.forEach((task) =>
        emitToUser(task.assignedTo?._id || task.assignedTo, "newTask", task),
      );

      return res
        .status(201)
        .json({
          mode: "SEPARATE",
          count: populatedTasks.length,
          tasks: populatedTasks,
        });
    }

    // ---------------- GROUP ----------------

    const participants = Array.isArray(assignedToList)
      ? [...new Set(assignedToList.filter(Boolean).map(String))]
      : [];

    if (participants.length < 2) {
      return res
        .status(400)
        .json({ message: "Select at least two users for a group task" });
    }
    if (participants.some((pid) => !mongoose.Types.ObjectId.isValid(pid))) {
      return res
        .status(400)
        .json({ message: "One or more participant IDs are invalid" });
    }

    const task = await Task.create({
      ...base,
      mode: "GROUP",
      assignedTo: null,
      participants,
    });

    const populated = await task.populate([
      { path: "participants", select: "name email role avatarUrl" },
      { path: "assignedBy", select: "name email role avatarUrl" },
    ]);

    await notifyUsers({
      recipients: participants,
      senderId: req.user._id,
      type: "NEW_TASK",
      title: "New Group Task",
      message: `You have been added to a group task: "${task.title}"`,
      task: task._id,
    });

    emitToUsers(participants, "newTask", populated);

    return res.status(201).json(populated);
  } catch (err) {
    console.error("createTask error:", err);
    return res.status(500).json({ message: "Could not create task" });
  }
};

// ==========================================================
// GET MY TASKS — now paginated
// GET /tasks/mine?page=1&limit=30&status=pending&priority=high
// ==========================================================

const getMyTasks = async (req, res) => {
  try {
    if (!req.user?._id)
      return res.status(401).json({ message: "Authentication required" });

    const userId = req.user._id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const filter = {
      $or: [
        { assignedTo: userId },
        { participants: userId },
        { assignedBy: userId },
      ],
    };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const [total, tasks] = await Promise.all([
      Task.countDocuments(filter),
      Task.find(filter)
        .populate("assignedBy", "name username email role isActive avatarUrl")
        .populate("assignedTo", "name username email role isActive avatarUrl")
        .populate("participants", "name username email role isActive avatarUrl")
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const me = String(userId);

    // NEW: real unread counts (WhatsApp-style badge number), computed
    // in one aggregation instead of N queries — "unread" = a message
    // in this task that isn't mine and I haven't seen yet.
    const taskIds = tasks.map((task) => task._id);

    const unreadRows = taskIds.length
      ? await Message.aggregate([
          {
            $match: {
              task: { $in: taskIds },
              sender: { $ne: userId },
              seenBy: { $ne: userId },
              deletedForEveryone: { $ne: true },
            },
          },
          { $group: { _id: "$task", count: { $sum: 1 } } },
        ])
      : [];

    const unreadByTask = new Map(
      unreadRows.map((row) => [String(row._id), row.count]),
    );

    const withPinned = tasks.map((task) => ({
      ...task,
      pinned: (task.pinnedBy || []).some((id) => String(id) === me),
      unreadCount: unreadByTask.get(String(task._id)) || 0,
    }));
    withPinned.sort((a, b) => Number(b.pinned) - Number(a.pinned));

    return res.json({
      tasks: withPinned,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("getMyTasks error:", err);
    return res.status(500).json({ message: "Could not load tasks" });
  }
};

// ==========================================================
// GET ALL TASKS — SUPERADMIN, also paginated
// ==========================================================

const getAllTasks = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role)) {
      return res
        .status(403)
        .json({ message: "Only superadmin can view all tasks" });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 30, 100);

    const [total, tasks] = await Promise.all([
      Task.countDocuments(),
      Task.find()
        .populate("assignedTo", "name email role avatarUrl")
        .populate("participants", "name email role avatarUrl")
        .populate("assignedBy", "name email role avatarUrl")
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.json({
      tasks,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error("getAllTasks error:", err);
    return res.status(500).json({ message: "Could not load tasks" });
  }
};

// ==========================================================
// GET TASK BY ID
// Messages are NOT included here anymore — the frontend calls
// GET /tasks/:id/messages separately (messageController.listMessages).
// This endpoint is now pure metadata, so it's cheap regardless of
// how long the chat is.
// ==========================================================

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });

    const task = await Task.findById(id)
      .populate("assignedTo", "name email role avatarUrl")
      .populate("participants", "name email role avatarUrl")
      .populate("assignedBy", "name email role avatarUrl")
      .populate("checklist.doneBy", "name role avatarUrl")
      .populate("checklist.assignedTo", "name role avatarUrl")
      .lean();

    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await maybeResetChecklist(task);

    const me = String(req.user._id);

    return res.json({
      ...task,
      pinned: (task.pinnedBy || []).some((pid) => String(pid) === me),
      chatMembers: getChatMembers(task),
    });
  } catch (err) {
    console.error("getTaskById error:", err);
    return res.status(500).json({ message: "Could not load task" });
  }
};

// ==========================================================
// UPDATE STATUS
// ==========================================================

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });
    if (!["pending", "in-progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const oldStatus = task.status;

    task.status = status;
    await task.save();

    const updated = await Task.findById(id)
      .populate("assignedTo", "name email role avatarUrl")
      .populate("participants", "name email role avatarUrl")
      .populate("assignedBy", "name email role avatarUrl");

    const recipients = isTaskAssigner(task, req.user._id)
      ? getTaskParticipants(task)
      : getChatMembers(task);

    await notifyUsers({
      recipients,
      senderId: req.user._id,
      type: "TASK_STATUS",
      title: "Task Status Updated",
      message: `Task "${task.title}" status changed from "${oldStatus}" to "${status}".`,
      task: task._id,
    });

    emitToTask(id, "statusUpdated", {
      taskId: id,
      status,
      updatedBy: req.user.name,
    });

    if (status === "completed" && oldStatus !== "completed") {
      emitToUsers(getChatMembers(task), "taskCompleted", {
        taskId: id,
        title: task.title,
        completedBy: req.user.name,
      });
      await spawnNextRecurrence(task);
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateStatus error:", err);
    return res.status(500).json({ message: "Could not update status" });
  }
};

// ==========================================================
// UPDATE TASK (title/description/dueDate/recurrence/priority)
// ==========================================================

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, recurrence, priority } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const canEdit =
      isTaskAssigner(task, req.user?._id) || isSuperAdmin(req.user?.role);
    if (!canEdit) {
      return res
        .status(403)
        .json({
          message: "Only the task creator or superadmin can edit this task",
        });
    }

    if (typeof title === "string" && title.trim()) task.title = title.trim();
    if (typeof description === "string") task.description = description.trim();

    if (typeof dueDate === "string" && dueDate !== task.dueDate) {
      task.dueDate = dueDate;
      // Due date changed → the "due tomorrow" reminder needs to be
      // eligible to fire again for the new date.
      task.reminderSentAt = null;
    }

    if (recurrence) task.recurrence = normalizeRecurrence(recurrence);
    if (["low", "medium", "high"].includes(priority)) task.priority = priority;

    await task.save();

    const updated = await Task.findById(id)
      .populate("assignedTo", "name email role avatarUrl")
      .populate("participants", "name email role avatarUrl")
      .populate("assignedBy", "name email role avatarUrl");

    emitToTask(id, "taskUpdated", { taskId: id, task: updated });

    return res.json(updated);
  } catch (err) {
    console.error("updateTask error:", err);
    return res.status(500).json({ message: "Could not update task" });
  }
};

// ==========================================================
// REASSIGN / TRANSFER TASK
// Only for INDIVIDUAL / SEPARATE tasks — swaps assignedTo to a new
// user. GROUP tasks should add/remove participants instead (not
// implemented here, but a natural extension of this same pattern).
// ==========================================================

const reassignTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { newAssigneeId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(newAssigneeId)
    ) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.mode === "GROUP") {
      return res
        .status(400)
        .json({
          message:
            "Group tasks can't be reassigned this way — edit participants instead",
        });
    }

    const canReassign =
      isTaskAssigner(task, req.user?._id) || isSuperAdmin(req.user?.role);
    if (!canReassign) {
      return res
        .status(403)
        .json({
          message: "Only the task creator or superadmin can reassign this task",
        });
    }

    const previousAssignee = task.assignedTo;
    task.assignedTo = newAssigneeId;
    await task.save();

    const updated = await Task.findById(id)
      .populate("assignedTo", "name email role avatarUrl")
      .populate("assignedBy", "name email role avatarUrl");

    await notifyUsers({
      recipients: [newAssigneeId],
      senderId: req.user._id,
      type: "NEW_TASK",
      title: "Task Reassigned To You",
      message: `"${task.title}" has been reassigned to you by ${req.user.name}.`,
      task: task._id,
    });

    if (previousAssignee) {
      await notifyUsers({
        recipients: [previousAssignee],
        senderId: req.user._id,
        type: "TASK_STATUS",
        title: "Task Reassigned",
        message: `"${task.title}" has been reassigned to someone else.`,
        task: task._id,
      });
    }

    emitToUser(newAssigneeId, "newTask", updated);
    if (previousAssignee)
      emitToUser(previousAssignee, "taskDeleted", { taskId: id });

    return res.json(updated);
  } catch (err) {
    console.error("reassignTask error:", err);
    return res.status(500).json({ message: "Could not reassign task" });
  }
};

// ==========================================================
// CHECKLIST
// ==========================================================

const addChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });
    if (!text?.trim())
      return res.status(400).json({ message: "Checklist text required" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if ((task.checklist?.length || 0) >= 100) {
      return res
        .status(400)
        .json({ message: "A task can hold at most 100 checklist items" });
    }

    let assignee = null;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      if (
        isTaskParticipant(task, assignedTo) ||
        isTaskAssigner(task, assignedTo)
      ) {
        const User = require("../models/User");
        assignee = await User.findById(assignedTo).select("name").lean();
      }
    }

    task.checklist.push({
      text: text.trim(),
      order: task.checklist.length,
      assignedTo: assignee ? assignedTo : null,
      assignedToName: assignee ? assignee.name : "",
    });

    await task.save();

    const item = task.checklist[task.checklist.length - 1];
    emitToTask(id, "checklistItemAdded", { taskId: id, item });

    if (assignee) {
      await notifyUsers({
        recipients: [assignedTo],
        senderId: req.user._id,
        type: "CHECKLIST_ASSIGNED",
        title: "Checklist Item Assigned",
        message: `${req.user.name} assigned you "${item.text}" on "${task.title}".`,
        task: task._id,
      });
    }

    return res.status(201).json(item);
  } catch (err) {
    console.error("addChecklistItem error:", err);
    return res.status(500).json({ message: "Could not add checklist item" });
  }
};

const updateChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { done, text, assignedTo } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const item = task.checklist.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Checklist item not found" });

    if (typeof text === "string" && text.trim()) item.text = text.trim();

    if (typeof done === "boolean") {
      item.done = done;
      item.doneBy = done ? req.user._id : null;
      item.doneByName = done ? req.user.name : "";
      item.doneAt = done ? new Date() : null;
    }

    if (assignedTo !== undefined) {
      if (!assignedTo) {
        item.assignedTo = null;
        item.assignedToName = "";
      } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
        const User = require("../models/User");
        const assignee = await User.findById(assignedTo).select("name").lean();
        if (assignee) {
          item.assignedTo = assignedTo;
          item.assignedToName = assignee.name;
        }
      }
    }

    await task.save();

    const total = task.checklist.length;
    const completed = task.checklist.filter((entry) => entry.done).length;

    emitToTask(id, "checklistItemUpdated", {
      taskId: id,
      item,
      progress: { completed, total },
    });

    if (total > 0 && completed === total && done === true) {
      await notifyUsers({
        recipients: getChatMembers(task),
        senderId: req.user._id,
        type: "CHECKLIST_DONE",
        title: "Checklist Completed",
        message: `${req.user.name} finished all ${total} checklist items on "${task.title}".`,
        task: task._id,
      });
    }

    return res.json({ item, progress: { completed, total } });
  } catch (err) {
    console.error("updateChecklistItem error:", err);
    return res.status(500).json({ message: "Could not update checklist item" });
  }
};

const deleteChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(itemId)
    ) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const item = task.checklist.id(itemId);
    if (!item)
      return res.status(404).json({ message: "Checklist item not found" });

    item.deleteOne();
    await task.save();

    const total = task.checklist.length;
    const completed = task.checklist.filter((entry) => entry.done).length;

    emitToTask(id, "checklistItemDeleted", {
      taskId: id,
      itemId,
      progress: { completed, total },
    });

    return res.json({ success: true, itemId, progress: { completed, total } });
  } catch (err) {
    console.error("deleteChecklistItem error:", err);
    return res.status(500).json({ message: "Could not delete checklist item" });
  }
};

const updateChecklistRecurrence = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants mode",
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const safe = normalizeChecklistRecurrence(req.body);

    const updated = await Task.findByIdAndUpdate(
      id,
      { $set: { checklistRecurrence: safe } },
      { new: true },
    ).select("checklistRecurrence");

    emitToTask(id, "checklistRecurrenceUpdated", {
      taskId: id,
      checklistRecurrence: updated.checklistRecurrence,
    });

    return res.json(updated.checklistRecurrence);
  } catch (err) {
    console.error("updateChecklistRecurrence error:", err);
    return res.status(500).json({ message: "Could not update repeat setting" });
  }
};

// ==========================================================
// PIN / UNPIN CHAT (per user — unchanged from before)
// ==========================================================

const togglePin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid task ID" });

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants mode pinnedBy",
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (!canAccessTask(task, req.user?._id, req.user?.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const me = String(req.user._id);
    const isPinned = (task.pinnedBy || []).some((pid) => String(pid) === me);

    await Task.updateOne(
      { _id: id },
      isPinned
        ? { $pull: { pinnedBy: req.user._id } }
        : { $addToSet: { pinnedBy: req.user._id } },
    );

    return res.json({ taskId: id, pinned: !isPinned });
  } catch (err) {
    console.error("togglePin error:", err);
    return res.status(500).json({ message: "Could not update pin" });
  }
};

// ==========================================================
// DELETE TASK — also cleans up its Message collection rows and
// their Cloudinary assets, since messages no longer live inside
// the task document and won't be deleted automatically.
// ==========================================================

// ==========================================================
// DELETE TASK — also cleans up its Message collection rows and
// their Cloudinary assets, since messages no longer live inside
// the task document and won't be deleted automatically.
// ==========================================================

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id).select(
      "_id title assignedTo assignedBy participants mode",
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const isCreator = isTaskAssigner(task, req.user?._id);
    const isAdmin = isSuperAdmin(req.user?.role);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message: "Only the task creator or superadmin can delete this task",
      });
    }

    const members = getChatMembers(task);

    // ======================================================
    // CLOUDINARY CLEANUP
    // ======================================================

    try {
      const filesToClean = await Message.find({
        task: id,
        filePublicId: {
          $exists: true,
          $nin: ["", null],
        },
      })
        .select("filePublicId type")
        .lean();

      if (filesToClean.length) {
        const { cloudinary: client } = require("../config/cloudinary");

        await Promise.all(
          filesToClean.map(async (file) => {
            try {
              const resourceType =
                file.type === "document"
                  ? "raw"
                  : file.type === "voice"
                    ? "video"
                    : "image";

              await client.uploader.destroy(file.filePublicId, {
                resource_type: resourceType,
              });
            } catch (cloudinaryError) {
              console.error(
                `Cloudinary cleanup failed for ${file.filePublicId}:`,
                cloudinaryError?.message,
              );
            }
          }),
        );
      }
    } catch (cleanupErr) {
      console.error(
        "deleteTask cloudinary cleanup failed:",
        cleanupErr?.message,
      );
    }

    // ======================================================
    // DELETE TASK + CHAT MESSAGES
    // ======================================================

    await Promise.all([
      Task.findByIdAndDelete(id),
      Message.deleteMany({
        task: id,
      }),
    ]);

    // ======================================================
    // REALTIME UPDATE
    // ======================================================

    emitToUsers(members, "taskDeleted", {
      taskId: String(task._id),
    });

    return res.json({
      success: true,
      message: "Task deleted successfully",
      data: {
        _id: task._id,
      },
    });
  } catch (err) {
    console.error("deleteTask error:", err);

    return res.status(500).json({
      message: "Could not delete task",
    });
  }
};

module.exports = {
  createTask,
  getMyTasks,
  getAllTasks,
  getTaskById,
  updateStatus,
  updateTask,
  reassignTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateChecklistRecurrence,
  togglePin,
  deleteTask,
};
