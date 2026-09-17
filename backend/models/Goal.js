const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    status: { type: String, enum: ["Pending", "Done"], default: "Pending" },
    remarks: { type: String, default: "" }, // e.g. why this step isn't done yet
  },
  { _id: true }
);

const updateLogSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true }, // what was done / why delayed
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

    // Used only when there are no milestones — manual progress.
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    milestones: [milestoneSchema],
    updates: [updateLogSchema], // running remarks log — "kya kya kiya"

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

goalSchema.index({ createdBy: 1 });
goalSchema.index({ status: 1 });
goalSchema.index({ targetDate: 1 });

module.exports = mongoose.model("Goal", goalSchema);