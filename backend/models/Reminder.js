const mongoose = require("mongoose");

const updateSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const reminderSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    dueDate: { type: Date, required: true },

    status: { type: String, enum: ["pending", "done"], default: "pending" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    updates: { type: [updateSchema], default: [] },

    // Internal — has the "due now" push already been sent for this reminder
    dueNotificationSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reminderSchema.index({ dueDate: 1, status: 1 });
reminderSchema.index({ assignedTo: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);
