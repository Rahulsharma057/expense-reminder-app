const mongoose = require("mongoose");

const goodBadEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Good", "Bad"], required: true },
    text: { type: String, required: true, trim: true },
    category: { type: String, default: "", trim: true }, // Work, Relationship, Health, Family, Money, Personal
    date: { type: Date, required: true, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

goodBadEntrySchema.index({ createdBy: 1, date: -1 });
goodBadEntrySchema.index({ type: 1 });

module.exports = mongoose.model("GoodBadEntry", goodBadEntrySchema);