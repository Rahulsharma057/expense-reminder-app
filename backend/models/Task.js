const mongoose = require("mongoose");

// ==========================================================
// CHECKLIST ITEM
// ==========================================================

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },

    done: { type: Boolean, default: false },
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    doneByName: { type: String, default: "" },
    doneAt: { type: Date, default: null },

    // NEW: a checklist item can be handed to one specific person in a
    // GROUP task, so "who owns this step" is visible at a glance
    // instead of it being anyone's guess.
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedToName: { type: String, default: "" },

    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ==========================================================
// TASK
// ==========================================================

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    mode: {
      type: String,
      enum: ["INDIVIDUAL", "SEPARATE", "GROUP"],
      default: "INDIVIDUAL",
    },

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },

    // NEW: priority, used for list sorting and visual flags.
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    dueDate: { type: String, default: "" },

    // NEW: set once a "due tomorrow" reminder has gone out for the
    // CURRENT dueDate, so the daily cron never sends it twice. Cleared
    // automatically whenever dueDate changes (see updateTask).
    reminderSentAt: { type: Date, default: null },

    recurrence: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
    },

    recurredFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null },

    // NEW: which template this task was created from, if any. Purely
    // informational — editing the task never touches the template.
    createdFromTemplate: { type: mongoose.Schema.Types.ObjectId, ref: "TaskTemplate", default: null },

    checklist: [checklistItemSchema],

    checklistRecurrence: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String, enum: ["daily", "weekly", "monthly", null], default: null },
      lastResetAt: { type: Date, default: null },
    },

    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Denormalised chat preview — kept up to date by messageController
    // on every send/delete, so the task list never has to touch the
    // Message collection at all.
    lastMessageAt: { type: Date, default: null },
    lastMessageText: { type: String, default: "" },
    lastMessageSenderName: { type: String, default: "" },
    messageCount: { type: Number, default: 0 },

    // messages array is GONE — see models/Message.js. If you're
    // migrating an existing database, run a one-time script that
    // reads each task's old `messages` subdocuments and inserts them
    // into the new Message collection with `task: task._id`, then
    // drops the field.
  },
  { timestamps: true }
);

// ==========================================================
// INDEXES
// ==========================================================

taskSchema.index({ assignedTo: 1, lastMessageAt: -1 });
taskSchema.index({ participants: 1, lastMessageAt: -1 });
taskSchema.index({ assignedBy: 1, lastMessageAt: -1 });
taskSchema.index({ assignedTo: 1, createdAt: -1 });
taskSchema.index({ participants: 1, createdAt: -1 });
taskSchema.index({ assignedBy: 1, createdAt: -1 });
// Used by the due-date reminder cron to find tasks due tomorrow that
// haven't been reminded yet, without a full collection scan.
taskSchema.index({ dueDate: 1, status: 1, reminderSentAt: 1 });

module.exports = mongoose.model("Task", taskSchema);