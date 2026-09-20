const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Not Started", "In Progress", "Done"], default: "Not Started" },
    note: { type: String, default: "" }, // why it's stuck / what's left / how much is done
  },
  { _id: true }
);

const updateLogSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const goalSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, default: "", trim: true },

    targetDate: { type: Date, default: null },

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Achieved", "Delayed", "Abandoned"],
      default: "Not Started",
    },

    progressPercent: { type: Number, default: 0, min: 0, max: 100 }, // used only when there are no milestones

    milestones: [milestoneSchema],
    updates: [updateLogSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

goalSchema.index({ createdBy: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ targetDate: 1 });

module.exports = mongoose.model("Goal", goalSchema);