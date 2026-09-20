const mongoose = require("mongoose");

const habitLogSchema = new mongoose.Schema(
  {
    habit: { type: mongoose.Schema.Types.ObjectId, ref: "Habit", required: true },
    date: { type: Date, required: true }, // normalized to a specific calendar day
    status: { type: String, enum: ["Done", "Skipped"], required: true }, // "Done" = you performed the habit that day
    reason: { type: String, default: "", trim: true },
    remarks: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

habitLogSchema.index({ habit: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("HabitLog", habitLogSchema);