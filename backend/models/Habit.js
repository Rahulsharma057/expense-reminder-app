const mongoose = require("mongoose");

const habitSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["Good", "Bad"], required: true },
    description: { type: String, default: "" },
    reasonPresets: [{ type: String, trim: true }], // quick-pick reasons for logging
    active: { type: Boolean, default: true },      // false = archived (kept history, hidden from lists)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

habitSchema.index({ createdBy: 1 });
habitSchema.index({ type: 1 });

module.exports = mongoose.model("Habit", habitSchema);