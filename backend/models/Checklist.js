const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Pending", "Done", "Partial", "Not Done"], default: "Pending" },
    remarks: { type: String, default: "" }, // e.g. why not done / how much done
  },
  { _id: true }
);

const checklistSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    type: { type: String, enum: ["One-time", "Daily", "Weekly"], default: "One-time" },

    items: [checklistItemSchema],

    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    dueDate: { type: Date, default: null },

    status: { type: String, enum: ["Active", "Completed", "Cancelled"], default: "Active" },

    // For Daily/Weekly checklists — when items were last auto-reset,
    // so the cron job doesn't reset twice in the same period.
    lastResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

checklistSchema.index({ assignedTo: 1 });
checklistSchema.index({ createdBy: 1 });
checklistSchema.index({ dueDate: 1 });
checklistSchema.index({ status: 1 });

module.exports = mongoose.model("Checklist", checklistSchema);