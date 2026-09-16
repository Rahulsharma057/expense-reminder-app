const mongoose = require("mongoose");

// ==========================================================
// WHY THIS FILE EXISTS
// ==========================================================
// Messages used to live inside Task.messages (an embedded array).
// MongoDB caps a single document at 16MB. A busy group chat hits
// that ceiling around 40-50k messages — after that, EVERY write to
// the task (new message, status change, checklist tick, anything)
// starts failing, and there's no clean way to fix it after the fact
// short of manually splitting the document.
//
// Messages are now their own collection, indexed by `task`. A task
// can have unlimited messages; only the Task document itself (title,
// checklist, participants, etc) has to stay under 16MB, which it
// will for the life of the app.
// ==========================================================

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    emoji: { type: String, required: true },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const messageSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    senderName: {
      type: String,
      required: true,
    },

    // text        — plain chat message
    // photo       — image, fileUrl is the Cloudinary image URL
    // document    — pdf/doc/etc, fileUrl is a raw Cloudinary URL
    // voice       — short audio clip, duration is in seconds
    type: {
      type: String,
      enum: ["text", "photo", "document", "voice"],
      default: "text",
    },

    text: {
      type: String,
      default: "",
      trim: true,
    },

    fileUrl: { type: String, default: "" },
    filePublicId: { type: String, default: "" },
    fileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    fileMime: { type: String, default: "" },

    // Only used for type "voice".
    duration: { type: Number, default: 0 },

    // Reply / quote. Denormalised (text/senderName/type snapshotted at
    // reply time) so rendering a reply preview never needs a second
    // query or populate — it just reads straight off this message.
    replyTo: {
      message: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
      text: { type: String, default: "" },
      senderName: { type: String, default: "" },
      type: { type: String, default: "" },
    },

    reactions: [reactionSchema],

    pinned: { type: Boolean, default: false },
    pinnedAt: { type: Date, default: null },
    pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    editedAt: { type: Date, default: null },

    // "Delete for everyone" — content is wiped, message stays as a
    // tombstone so the chat's order/pagination doesn't shift.
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    // "Delete for me" — the message is hidden only for these users;
    // everyone else still sees it normally.
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Distinguishes an internal note ("comment") from a normal chat
    // message. Comments are for the assigner/assignee to leave
    // status-style notes without cluttering the group chat; the
    // frontend renders them in a separate "Activity" tab instead of
    // the main message list.
    isComment: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Newest-first pagination within a task.
messageSchema.index({ task: 1, createdAt: -1 });

// Fetching a task's pinned messages.
messageSchema.index({ task: 1, pinned: 1 });

module.exports = mongoose.model("Message", messageSchema);