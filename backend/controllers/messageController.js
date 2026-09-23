const mongoose = require("mongoose");
const Task = require("../models/Task");
const Message = require("../models/Message");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");
const { chatThumbUrl, viewerUrl } = require("../utils/cloudinaryThumb");

const PAGE_SIZE = 30;

// ==========================================================
// SHARED HELPERS (mirrors taskController's — kept local so this
// file has no circular dependency on taskController)
// ==========================================================

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const isSameId = (a, b) => toId(a) && toId(a) === toId(b);
const isSuperAdmin = (role) => String(role || "").toLowerCase() === "superadmin";

const getTaskParticipants = (task) => {
  if (task.mode === "GROUP") {
    return Array.isArray(task.participants) ? task.participants.filter(Boolean).map(toId) : [];
  }
  return task.assignedTo ? [toId(task.assignedTo)] : [];
};

const getChatMembers = (task) => [
  ...new Set([toId(task.assignedBy), ...getTaskParticipants(task)].filter(Boolean)),
];

const canAccessTask = (task, userId, role) => {
  if (!task || !userId) return false;
  if (isSuperAdmin(role)) return true;
  const members = getChatMembers(task);
  return members.includes(toId(userId));
};

const emitToTask = (taskId, event, payload) => {
  const io = getIO();
  if (io) io.to(`task:${taskId}`).emit(event, payload);
};

const emitToUsers = (userIds, event, payload) => {
  const io = getIO();
  if (!io) return;
  [...new Set((userIds || []).filter(Boolean).map(toId))].forEach((id) =>
    io.to(id).emit(event, payload)
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
        .filter((id) => id !== String(senderId))
    ),
  ];

  if (!uniqueRecipients.length) return;

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

  // ========================================================
  // GET SENDER PROFILE PHOTO FOR PUSH NOTIFICATION
  // ========================================================

  let avatarUrl = "";

  if (senderId) {
    try {
      const sender = await User.findById(senderId)
        .select("name avatarUrl")
        .lean();

      avatarUrl = sender?.avatarUrl || "";
    } catch (err) {
      console.error(
        "[push] could not load sender avatar:",
        err.message
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
    tag: `task-${task}`,
    avatarUrl,
  }).catch((err) =>
    console.error("[push] send failed:", err.message)
  );
};

const loadAuthorizedTask = async (id, req, res, select) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ message: "Invalid task ID" });
    return null;
  }

  const task = await Task.findById(id).select(
    select || "assignedTo assignedBy participants title mode"
  );

  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }

  if (!canAccessTask(task, req.user?._id, req.user?.role)) {
    res.status(403).json({ message: "Not authorized" });
    return null;
  }

  return task;
};

// Shapes a Message document for the API response: adds a thumbnail
// URL for photos, and hides content for messages this specific viewer
// deleted "for me" without affecting how it looks to anyone else.
const serializeMessage = (message, viewerId) => {
  const plain = message.toObject ? message.toObject() : message;

  const hiddenForViewer = (plain.deletedFor || [])
    .map(toId)
    .includes(toId(viewerId));

  if (hiddenForViewer && !plain.deletedForEveryone) {
    return { ...plain, text: "", fileUrl: "", hiddenForMe: true };
  }

if (plain.type === "photo" && plain.fileUrl) {
  const fullPhotoUrl = plain.fileUrl;

  return {
    ...plain,

    // Main/original Cloudinary image
    photoUrl: fullPhotoUrl,

    // Existing fields — keep them for backward compatibility
    fileUrl: fullPhotoUrl,

    // Thumbnail / viewer URLs
    thumbUrl: chatThumbUrl(fullPhotoUrl),
    viewerUrl: viewerUrl(fullPhotoUrl),
  };
}

  return plain;
};

// ==========================================================
// LIST MESSAGES (lazy loading / pagination)
// GET /tasks/:id/messages?before=<ISO date>&limit=30
// No `before` = the newest page (used when opening the chat).
// ==========================================================

const listMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { before } = req.query;
    const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 100);

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const query = { task: id };

    const beforeDate = before ? new Date(before) : null;
    if (beforeDate && !Number.isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }

    // Fetch newest-first, one extra row to know if there's more, then
    // reverse to chronological order for the frontend.
    const rows = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();

    return res.json({
      messages: page.map((m) => serializeMessage(m, req.user._id)),
      hasMore,
    });
  } catch (err) {
    console.error("listMessages error:", err);
    return res.status(500).json({ message: "Could not load messages" });
  }
};

// ==========================================================
// SEARCH MESSAGES WITHIN A TASK
// GET /tasks/:id/messages/search?q=hello
// ==========================================================

const searchMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const q = String(req.query.q || "").trim();

    if (!q) return res.json({ messages: [] });

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    // Escape regex special characters — this is a user-typed search
    // string, not a pattern.
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const rows = await Message.find({
      task: id,
      deletedForEveryone: { $ne: true },
      text: { $regex: escaped, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      messages: rows.map((m) => serializeMessage(m, req.user._id)),
    });
  } catch (err) {
    console.error("searchMessages error:", err);
    return res.status(500).json({ message: "Could not search messages" });
  }
};

// ==========================================================
// PINNED MESSAGES
// GET /tasks/:id/messages/pinned
// ==========================================================

const listPinnedMessages = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const rows = await Message.find({ task: id, pinned: true })
      .sort({ pinnedAt: -1 })
      .lean();

    return res.json({ messages: rows.map((m) => serializeMessage(m, req.user._id)) });
  } catch (err) {
    console.error("listPinnedMessages error:", err);
    return res.status(500).json({ message: "Could not load pinned messages" });
  }
};

// ==========================================================
// SEND — shared push logic for text/photo/document/voice
// ==========================================================

const buildPreviewText = (type, text) => {
  if (type === "photo") return text ? `📷 ${text}` : "📷 Photo";
  if (type === "document") return `📄 ${text || "Document"}`;
  if (type === "voice") return "🎤 Voice message";
  return text;
};

const resolveReplySnapshot = async (taskId, replyToId) => {
  if (!replyToId || !mongoose.Types.ObjectId.isValid(replyToId)) return null;

  const original = await Message.findOne({ _id: replyToId, task: taskId }).lean();
  if (!original) return null;

  return {
    message: original._id,
    text:
      original.type === "text"
        ? original.text
        : buildPreviewText(original.type, original.text),
    senderName: original.senderName,
    type: original.type,
  };
};

const createAndBroadcastMessage = async ({ req, task, doc }) => {
  const created = await Message.create(doc);

  await Task.updateOne(
    { _id: task._id },
    {
      $inc: { messageCount: 1 },
      $set: {
        lastMessageAt: created.createdAt,
        lastMessageText: buildPreviewText(created.type, created.text).slice(0, 120),
        lastMessageSenderName: req.user.name,
      },
    }
  );

  const payload = serializeMessage(created, req.user._id);

  emitToTask(task._id, "newMessage", { taskId: String(task._id), message: payload });

  await notifyUsers({
    recipients: getChatMembers(task),
    senderId: req.user._id,
    type: "NEW_MESSAGE",
    title: task.mode === "GROUP" ? "New Group Task Message" : "New Task Message",
    message: `${req.user.name}: ${buildPreviewText(created.type, created.text).slice(0, 80)}`,
    task: task._id,
  });

  return payload;
};

// ---------------- TEXT ----------------

const addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, replyTo } = req.body;

    if (!text?.trim()) return res.status(400).json({ message: "Message text required" });

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const replySnapshot = await resolveReplySnapshot(id, replyTo);

    const message = await createAndBroadcastMessage({
      req,
      task,
      doc: {
        task: id,
        sender: req.user._id,
        senderName: req.user.name,
        type: "text",
        text: text.trim(),
        seenBy: [req.user._id],
        ...(replySnapshot ? { replyTo: replySnapshot } : {}),
      },
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error("addMessage error:", err);
    return res.status(500).json({ message: "Could not send message" });
  }
};

// ---------------- PHOTO / DOCUMENT / VOICE ----------------
// All three share this shape once the upload middleware has already
// run and populated req.uploadedFile.

const addFileMessage = (type) => async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.uploadedFile) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const caption = req.body?.caption?.trim() || "";
    const replySnapshot = await resolveReplySnapshot(id, req.body?.replyTo);

    const message = await createAndBroadcastMessage({
      req,
      task,
      doc: {
        task: id,
        sender: req.user._id,
        senderName: req.user.name,
        type,
        text: caption,
        fileUrl: req.uploadedFile.url,
        filePublicId: req.uploadedFile.publicId,
        fileName: req.uploadedFile.name,
        fileSize: req.uploadedFile.size,
        fileMime: req.uploadedFile.mime,
        duration: req.uploadedFile.duration || 0,
        seenBy: [req.user._id],
        ...(replySnapshot ? { replyTo: replySnapshot } : {}),
      },
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error("addFileMessage error:", err);
    return res.status(500).json({ message: "Could not send file" });
  }
};

const addPhotoMessage = addFileMessage("photo");
const addDocumentMessage = addFileMessage("document");
const addVoiceMessage = addFileMessage("voice");

// ---------------- FORWARD ----------------
// Copies a message's content into another task's chat. The user must
// have access to BOTH the source and the destination task.

const forwardMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { targetTaskId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(messageId) ||
      !mongoose.Types.ObjectId.isValid(targetTaskId)
    ) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const sourceTask = await loadAuthorizedTask(id, req, res);
    if (!sourceTask) return;

    const targetTask = await loadAuthorizedTask(targetTaskId, req, res);
    if (!targetTask) return;

    const original = await Message.findOne({ _id: messageId, task: id }).lean();
    if (!original || original.deletedForEveryone) {
      return res.status(404).json({ message: "Message not found" });
    }

    const message = await createAndBroadcastMessage({
      req,
      task: targetTask,
      doc: {
        task: targetTaskId,
        sender: req.user._id,
        senderName: req.user.name,
        type: original.type,
        text: original.text,
        fileUrl: original.fileUrl,
        filePublicId: "", // forwarded copy — don't co-own the original Cloudinary asset
        fileName: original.fileName,
        fileSize: original.fileSize,
        fileMime: original.fileMime,
        duration: original.duration,
        seenBy: [req.user._id],
      },
    });

    return res.status(201).json(message);
  } catch (err) {
    console.error("forwardMessage error:", err);
    return res.status(500).json({ message: "Could not forward message" });
  }
};

// ---------------- EDIT ----------------

const editMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!text?.trim()) return res.status(400).json({ message: "Message text required" });

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const message = await Message.findOne({ _id: messageId, task: id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.deletedForEveryone) {
      return res.status(400).json({ message: "A deleted message cannot be edited" });
    }

    if (!isSameId(message.sender, req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own messages" });
    }

    const hoursSinceSent = (Date.now() - message.createdAt.getTime()) / 36e5;
    if (hoursSinceSent > 24) {
      return res.status(400).json({ message: "This message can no longer be edited (24 hour limit)" });
    }

    message.text = text.trim();
    message.editedAt = new Date();
    await message.save();

    emitToTask(id, "messageEdited", {
      taskId: id,
      messageId,
      text: message.text,
      editedAt: message.editedAt,
    });

    return res.json(serializeMessage(message, req.user._id));
  } catch (err) {
    console.error("editMessage error:", err);
    return res.status(500).json({ message: "Could not edit message" });
  }
};

// ---------------- DELETE (for me / for everyone) ----------------
// DELETE /tasks/:id/messages/:messageId?scope=me|everyone (default: me
// for other people's messages you've hidden, everyone for your own)

const deleteMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const message = await Message.findOne({ _id: messageId, task: id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    const isOwn = isSameId(message.sender, req.user._id);
    const requestedScope = req.query.scope === "everyone" ? "everyone" : "me";

    // You can only wipe it for EVERYONE if it's yours (or you're
    // superadmin). Anyone can always hide it just for themselves.
    const scope =
      requestedScope === "everyone" && (isOwn || isSuperAdmin(req.user?.role))
        ? "everyone"
        : "me";

    if (scope === "everyone") {
      if (message.filePublicId) {
        try {
      const { cloudinary } = require("../config/cloudinary");
          const client = cloudinary.v2 || cloudinary;
          const resourceType =
            message.type === "document" ? "raw" : message.type === "voice" ? "video" : "image";
          await client.uploader.destroy(message.filePublicId, { resource_type: resourceType });
        } catch (cloudErr) {
          console.error("Cloudinary destroy failed:", cloudErr?.message);
        }
      }

      message.deletedForEveryone = true;
      message.deletedAt = new Date();
      message.text = "";
      message.fileUrl = "";
      message.filePublicId = "";
      message.pinned = false;

      await message.save();

      emitToTask(id, "messageDeleted", { taskId: id, messageId, scope: "everyone" });
    } else {
      await Message.updateOne(
        { _id: messageId },
        { $addToSet: { deletedFor: req.user._id } }
      );

      // Only this user's own client needs to know — no room broadcast.
    }

    return res.json({ success: true, messageId, scope });
  } catch (err) {
    console.error("deleteMessage error:", err);
    return res.status(500).json({ message: "Could not delete message" });
  }
};

// ---------------- REACTIONS ----------------
// PUT /tasks/:id/messages/:messageId/reactions  { emoji }
// Toggles: reacting again with the SAME emoji removes it.

const toggleReaction = async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) return res.status(400).json({ message: "Emoji required" });

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const message = await Message.findOne({ _id: messageId, task: id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    const existingIndex = message.reactions.findIndex(
      (r) => isSameId(r.user, req.user._id) && r.emoji === emoji
    );

    if (existingIndex >= 0) {
      message.reactions.splice(existingIndex, 1);
    } else {
      // A user can only have ONE reaction per message — adding a new
      // emoji replaces their previous one, matching WhatsApp behaviour.
      message.reactions = message.reactions.filter(
        (r) => !isSameId(r.user, req.user._id)
      );
      message.reactions.push({ user: req.user._id, userName: req.user.name, emoji });
    }

    await message.save();

    emitToTask(id, "messageReacted", {
      taskId: id,
      messageId,
      reactions: message.reactions,
    });

    return res.json({ reactions: message.reactions });
  } catch (err) {
    console.error("toggleReaction error:", err);
    return res.status(500).json({ message: "Could not update reaction" });
  }
};

// ---------------- PIN / UNPIN A MESSAGE ----------------

const togglePinMessage = async (req, res) => {
  try {
    const { id, messageId } = req.params;

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const message = await Message.findOne({ _id: messageId, task: id });
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.deletedForEveryone) {
      return res.status(400).json({ message: "Cannot pin a deleted message" });
    }

    message.pinned = !message.pinned;
    message.pinnedAt = message.pinned ? new Date() : null;
    message.pinnedBy = message.pinned ? req.user._id : null;

    await message.save();

    emitToTask(id, "messagePinToggled", {
      taskId: id,
      messageId,
      pinned: message.pinned,
    });

    return res.json({ messageId, pinned: message.pinned });
  } catch (err) {
    console.error("togglePinMessage error:", err);
    return res.status(500).json({ message: "Could not update pin" });
  }
};

// ---------------- MARK SEEN (double tick) ----------------

const markMessagesSeen = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await loadAuthorizedTask(id, req, res);
    if (!task) return;

    const result = await Message.updateMany(
      { task: id, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );

    if (result.modifiedCount) {
      emitToTask(id, "messagesSeen", {
        taskId: id,
        userId: String(req.user._id),
        userName: req.user.name,
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("markMessagesSeen error:", err);
    return res.status(500).json({ message: "Could not update seen status" });
  }
};

module.exports = {
  listMessages,
  searchMessages,
  listPinnedMessages,
  addMessage,
  addPhotoMessage,
  addDocumentMessage,
  addVoiceMessage,
  forwardMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePinMessage,
  markMessagesSeen,
  // exported for taskController to reuse when deleting a whole task
  _internal: { getChatMembers, canAccessTask },
};