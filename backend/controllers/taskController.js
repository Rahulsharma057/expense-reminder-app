const mongoose = require("mongoose");
const Task = require("../models/Task");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");

// ======================================================
// HELPERS
// ======================================================

const toId = (value) => {
  if (!value) return null;

  if (typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value);
};

const isSameId = (a, b) => {
  if (!a || !b) return false;
  return toId(a) === toId(b);
};

const isSuperAdmin = (role) => {
  return String(role || "").toLowerCase() === "superadmin";
};

// ======================================================
// REALTIME HELPERS
// ======================================================

const emitToTask = (taskId, event, payload) => {
  const io = getIO();
  if (!io) return;

  io.to(`task:${taskId}`).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  const io = getIO();
  if (!io) return;

  io.to(String(userId)).emit(event, payload);
};

const emitToUsers = (userIds, event, payload) => {
  const io = getIO();
  if (!io) return;

  [
    ...new Set(
      (userIds || [])
        .filter(Boolean)
        .map(toId)
        .filter(Boolean)
    ),
  ].forEach((id) => {
    io.to(id).emit(event, payload);
  });
};

// ======================================================
// TASK PARTICIPANTS
// ======================================================

const getTaskParticipants = (task) => {
  if (task.mode === "GROUP") {
    return Array.isArray(task.participants)
      ? task.participants
          .filter(Boolean)
          .map(toId)
      : [];
  }

  if (task.assignedTo) {
    return [toId(task.assignedTo)];
  }

  return [];
};

// ======================================================
// CHECK PARTICIPANT
// ======================================================

const isTaskParticipant = (task, userId) => {
  if (!userId) return false;

  const user = String(userId);

  return getTaskParticipants(task).some(
    (participantId) => participantId === user
  );
};

// ======================================================
// CHECK ASSIGNER
// ======================================================

const isTaskAssigner = (task, userId) => {
  if (!task?.assignedBy || !userId) return false;

  return isSameId(task.assignedBy, userId);
};

// ======================================================
// FINAL ACCESS CHECK
// ======================================================

const canAccessTask = (task, userId, role) => {
  if (!task || !userId) return false;

  // Superadmin can access everything.
  if (isSuperAdmin(role)) {
    return true;
  }

  // Creator / assigner can access.
  if (isTaskAssigner(task, userId)) {
    return true;
  }

  // Assigned user / group participant can access.
  if (isTaskParticipant(task, userId)) {
    return true;
  }

  return false;
};

// ======================================================
// NOTIFICATION HELPER
// ======================================================

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
        .filter((id) => id !== String(senderId))
    ),
  ];

  if (!uniqueRecipients.length) {
    return;
  }

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({
        recipient,
        type,
        title,
        message,
        task,
      })
    )
  );

  emitToUsers(uniqueRecipients, "notification", {
    type,
    title,
    message,
    task,
    createdAt: new Date(),
  });
};

// ======================================================
// RECURRING TASKS
// ======================================================

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const computeNextDueDate = (currentDueDate, frequency) => {
  const base = currentDueDate
    ? new Date(currentDueDate)
    : new Date();

  const valid = Number.isNaN(base.getTime())
    ? new Date()
    : base;

  if (frequency === "daily") {
    return addDays(valid, 1);
  }

  if (frequency === "weekly") {
    return addDays(valid, 7);
  }

  if (frequency === "monthly") {
    const d = new Date(valid);
    d.setMonth(d.getMonth() + 1);
    return d;
  }

  return null;
};

const toDateInputString = (date) => {
  return date.toISOString().slice(0, 10);
};

const spawnNextRecurrence = async (completedTask) => {
  if (
    !completedTask?.recurrence?.enabled ||
    !completedTask.recurrence.frequency
  ) {
    return null;
  }

  const nextDue = computeNextDueDate(
    completedTask.dueDate,
    completedTask.recurrence.frequency
  );

  if (!nextDue) {
    return null;
  }

  const nextTask = await Task.create({
    title: completedTask.title,
    description: completedTask.description,
    mode: completedTask.mode,
    assignedTo: completedTask.assignedTo || null,
    participants: completedTask.participants || [],
    assignedBy: completedTask.assignedBy,
    dueDate: toDateInputString(nextDue),
    recurrence: completedTask.recurrence,
    recurredFrom: completedTask._id,
  });

  const populatedNext = await nextTask.populate([
    {
      path: "assignedTo",
      select: "name email role",
    },
    {
      path: "participants",
      select: "name email role",
    },
    {
      path: "assignedBy",
      select: "name email role",
    },
  ]);

  const recipients = getTaskParticipants(completedTask);

  await notifyUsers({
    recipients,
    senderId: completedTask.assignedBy,
    type: "NEW_TASK",
    title: "Recurring Task Renewed",
    message: `"${completedTask.title}" has been scheduled again — due ${toDateInputString(
      nextDue
    )}.`,
    task: populatedNext._id,
  });

  return populatedNext;
};

// ======================================================
// RECURRENCE NORMALIZER
// ======================================================

const normalizeRecurrence = (recurrence) => {
  if (!recurrence || !recurrence.enabled) {
    return {
      enabled: false,
      frequency: null,
    };
  }

  if (
    !["daily", "weekly", "monthly"].includes(
      recurrence.frequency
    )
  ) {
    return {
      enabled: false,
      frequency: null,
    };
  }

  return {
    enabled: true,
    frequency: recurrence.frequency,
  };
};

// ======================================================
// CREATE TASK
// ======================================================

const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      assignedToList,
      dueDate,
      mode = "INDIVIDUAL",
      recurrence,
    } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!title?.trim()) {
      return res.status(400).json({
        message: "Task title is required",
      });
    }

    if (
      !["INDIVIDUAL", "SEPARATE", "GROUP"].includes(mode)
    ) {
      return res.status(400).json({
        message: "Invalid task mode",
      });
    }

    const safeRecurrence = normalizeRecurrence(recurrence);

    // ==================================================
    // INDIVIDUAL
    // ==================================================

    if (mode === "INDIVIDUAL") {
      if (!assignedTo) {
        return res.status(400).json({
          message: "Please select a teacher",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          message: "Invalid teacher",
        });
      }

      const task = await Task.create({
        title: title.trim(),
        description: description?.trim() || "",
        mode: "INDIVIDUAL",
        assignedTo,
        participants: [],
        assignedBy: req.user._id,
        dueDate: dueDate || "",
        recurrence: safeRecurrence,
      });

      const populated = await task.populate([
        {
          path: "assignedTo",
          select: "name email role",
        },
        {
          path: "assignedBy",
          select: "name email role",
        },
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

    // ==================================================
    // SEPARATE
    // ==================================================

    if (mode === "SEPARATE") {
      const teachers = Array.isArray(assignedToList)
        ? [
            ...new Set(
              assignedToList
                .filter(Boolean)
                .map(String)
            ),
          ]
        : [];

      if (!teachers.length) {
        return res.status(400).json({
          message: "Please select at least one teacher",
        });
      }

      if (teachers.length < 2) {
        return res.status(400).json({
          message:
            "Select at least two teachers for separate assignment",
        });
      }

      const invalidTeacher = teachers.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );

      if (invalidTeacher) {
        return res.status(400).json({
          message: "One or more user IDs are invalid",
        });
      }

      const docs = teachers.map((teacherId) => ({
        title: title.trim(),
        description: description?.trim() || "",
        mode: "SEPARATE",
        assignedTo: teacherId,
        participants: [],
        assignedBy: req.user._id,
        dueDate: dueDate || "",
        recurrence: safeRecurrence,
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
          })
        )
      );

      createdTasks.forEach((task) => {
        emitToUser(task.assignedTo, "newTask", task);
      });

      const populatedTasks = await Task.find({
        _id: {
          $in: createdTasks.map(
            (task) => task._id
          ),
        },
      })
        .populate("assignedTo", "name email role")
        .populate("assignedBy", "name email role")
        .sort({ createdAt: -1 });

      return res.status(201).json({
        mode: "SEPARATE",
        count: populatedTasks.length,
        tasks: populatedTasks,
      });
    }

    // ==================================================
    // GROUP
    // ==================================================

    if (mode === "GROUP") {
      const participants = Array.isArray(assignedToList)
        ? [
            ...new Set(
              assignedToList
                .filter(Boolean)
                .map(String)
            ),
          ]
        : [];

      if (!participants.length) {
        return res.status(400).json({
          message: "Please select at least one teacher",
        });
      }

      if (participants.length < 2) {
        return res.status(400).json({
          message:
            "Select at least two teachers for a group task",
        });
      }

      const invalidParticipant = participants.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      );

      if (invalidParticipant) {
        return res.status(400).json({
          message: "One or more participant IDs are invalid",
        });
      }

      const task = await Task.create({
        title: title.trim(),
        description: description?.trim() || "",
        mode: "GROUP",
        assignedTo: null,
        participants,
        assignedBy: req.user._id,
        dueDate: dueDate || "",
        recurrence: safeRecurrence,
      });

      const populated = await task.populate([
        {
          path: "participants",
          select: "name email role",
        },
        {
          path: "assignedBy",
          select: "name email role",
        },
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
    }

    return res.status(400).json({
      message: "Invalid task mode",
    });
  } catch (err) {
    console.error("createTask error:", err);

    return res.status(500).json({
      message: "Could not create task",
    });
  }
};

// ======================================================
// GET MY TASKS
// ======================================================

const getMyTasks = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const userId = req.user._id;

    const tasks = await Task.find({
      $or: [
        { assignedTo: userId },
        { participants: userId },
        { assignedBy: userId },
      ],
    })
      .populate(
        "assignedBy",
        "name username email role isActive"
      )
      .populate(
        "assignedTo",
        "name username email role isActive"
      )
      .populate(
        "participants",
        "name username email role isActive"
      )
      .sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (err) {
    console.error("getMyTasks error:", err);

    return res.status(500).json({
      message: "Could not load tasks",
    });
  }
};

// ======================================================
// GET ALL TASKS
// SUPERADMIN ONLY
// ======================================================

const getAllTasks = async (req, res) => {
  try {
    if (!isSuperAdmin(req.user?.role)) {
      return res.status(403).json({
        message: "Only superadmin can view all tasks",
      });
    }

    const tasks = await Task.find()
      .populate("assignedTo", "name email role")
      .populate("participants", "name email role")
      .populate("assignedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json(tasks);
  } catch (err) {
    console.error("getAllTasks error:", err);

    return res.status(500).json({
      message: "Could not load tasks",
    });
  }
};

// ======================================================
// GET TASK BY ID
// ======================================================

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id)
      .populate("assignedTo", "name email role")
      .populate("participants", "name email role")
      .populate("assignedBy", "name email role")
      .populate("messages.sender", "name role");

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    return res.json(task);
  } catch (err) {
    console.error("getTaskById error:", err);

    return res.status(500).json({
      message: "Could not load task",
    });
  }
};

// ======================================================
// UPDATE STATUS
// ======================================================

const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    if (
      !["pending", "in-progress", "completed"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message: "Invalid status",
      });
    }

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants status title mode dueDate recurrence description"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const oldStatus = task.status;

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("assignedTo", "name email role")
      .populate("participants", "name email role")
      .populate("assignedBy", "name email role");

    let recipients = [];

    if (isTaskAssigner(task, req.user._id)) {
      recipients = getTaskParticipants(task);
    } else {
      recipients = [task.assignedBy];

      if (task.mode === "GROUP") {
        recipients.push(
          ...getTaskParticipants(task)
        );
      }
    }

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

    if (
      status === "completed" &&
      oldStatus !== "completed"
    ) {
      const allRecipients = [
        task.assignedBy,
        ...getTaskParticipants(task),
      ];

      emitToUsers(allRecipients, "taskCompleted", {
        taskId: id,
        title: task.title,
        completedBy: req.user.name,
      });

      await spawnNextRecurrence(updated);
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateStatus error:", err);

    return res.status(500).json({
      message: "Could not update status",
    });
  }
};

// ======================================================
// ADD TEXT MESSAGE
// ======================================================

const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    if (!text?.trim()) {
      return res.status(400).json({
        message: "Message text required",
      });
    }

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants title mode"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        $push: {
          messages: {
            sender: req.user._id,
            senderName: req.user.name,
            text: text.trim(),
            seenBy: [req.user._id],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("messages.sender", "name role");

    if (!updated) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const newMessage =
      updated.messages[updated.messages.length - 1];

    let recipients = [];

    if (task.mode === "GROUP") {
      recipients = [
        task.assignedBy,
        ...task.participants,
      ];
    } else {
      recipients = [
        task.assignedBy,
        task.assignedTo,
      ];
    }

    await notifyUsers({
      recipients,
      senderId: req.user._id,
      type: "NEW_MESSAGE",
      title:
        task.mode === "GROUP"
          ? "New Group Task Message"
          : "New Task Message",
      message: `${req.user.name} sent a message on task "${task.title}".`,
      task: task._id,
    });

    emitToTask(id, "newMessage", {
      taskId: id,
      message: newMessage,
    });

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error("addMessage error:", err);

    return res.status(500).json({
      message: "Could not send message",
    });
  }
};

// ======================================================
// ADD PHOTO MESSAGE
// ======================================================

const addPhotoMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No photo uploaded",
      });
    }

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants title mode"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const photoUrl = req.file.path;
    const caption = req.body?.caption?.trim();

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        $push: {
          messages: {
            sender: req.user._id,
            senderName: req.user.name,
            text: caption || "📷 Photo",
            photoUrl,
            seenBy: [req.user._id],
          },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("messages.sender", "name role");

    if (!updated) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const newMessage =
      updated.messages[updated.messages.length - 1];

    const recipients =
      task.mode === "GROUP"
        ? [
            task.assignedBy,
            ...task.participants,
          ]
        : [
            task.assignedBy,
            task.assignedTo,
          ];

    await notifyUsers({
      recipients,
      senderId: req.user._id,
      type: "NEW_MESSAGE",
      title:
        task.mode === "GROUP"
          ? "New Group Task Message"
          : "New Task Message",
      message: `${req.user.name} sent a photo on task "${task.title}".`,
      task: task._id,
    });

    emitToTask(id, "newMessage", {
      taskId: id,
      message: newMessage,
    });

    return res.status(201).json(newMessage);
  } catch (err) {
    console.error("addPhotoMessage error:", err);

    return res.status(500).json({
      message: "Could not send photo",
    });
  }
};

// ======================================================
// EDIT MESSAGE
// ======================================================

const editMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { text } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(messageId)
    ) {
      return res.status(400).json({
        message: "Invalid ID",
      });
    }

    if (!text?.trim()) {
      return res.status(400).json({
        message: "Message text required",
      });
    }

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants mode messages"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    const msg = task.messages.id(messageId);

    if (!msg) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (!isSameId(msg.sender, req.user._id)) {
      return res.status(403).json({
        message:
          "You can only edit your own messages",
      });
    }

    const hoursSinceSent =
      (Date.now() -
        new Date(msg.createdAt).getTime()) /
      (1000 * 60 * 60);

    if (hoursSinceSent > 24) {
      return res.status(400).json({
        message:
          "This message can no longer be edited (24 hour limit)",
      });
    }

    msg.text = text.trim();
    msg.editedAt = new Date();

    await task.save();

    emitToTask(id, "messageEdited", {
      taskId: id,
      messageId,
      text: msg.text,
      editedAt: msg.editedAt,
    });

    return res.json(msg);
  } catch (err) {
    console.error("editMessage error:", err);

    return res.status(500).json({
      message: "Could not edit message",
    });
  }
};

// ======================================================
// MARK MESSAGES SEEN
// ======================================================

const markMessagesSeen = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id).select(
      "assignedTo assignedBy participants mode"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    if (
      !canAccessTask(
        task,
        req.user?._id,
        req.user?.role
      )
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    await Task.updateOne(
      {
        _id: id,
      },
      {
        $addToSet: {
          "messages.$[].seenBy": req.user._id,
        },
      }
    );

    emitToTask(id, "messagesSeen", {
      taskId: id,
      userId: req.user._id,
    });

    return res.json({
      ok: true,
    });
  } catch (err) {
    console.error("markMessagesSeen error:", err);

    return res.status(500).json({
      message: "Could not update seen status",
    });
  }
};

// ======================================================
// DELETE TASK
// CREATOR OR SUPERADMIN ONLY
// ======================================================

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    const task = await Task.findById(id).select(
      "_id title assignedTo assignedBy participants mode"
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const isCreator = isTaskAssigner(
      task,
      req.user?._id
    );

    const isAdmin = isSuperAdmin(
      req.user?.role
    );

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        message:
          "Only the task creator or superadmin can delete this task",
      });
    }

    await Task.findByIdAndDelete(id);

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

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createTask,
  getMyTasks,
  getAllTasks,
  getTaskById,
  updateStatus,
  addMessage,
  addPhotoMessage,
  editMessage,
  markMessagesSeen,
  deleteTask,
};