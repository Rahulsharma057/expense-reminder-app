const mongoose = require("mongoose");

const mistakeOccurrenceSchema = new mongoose.Schema(
  {
    mistake: { type: mongoose.Schema.Types.ObjectId, ref: "Mistake", required: true },
    date: { type: Date, required: true, default: Date.now },
    remarks: { type: String, default: "" }, // what happened this time / why
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

mistakeOccurrenceSchema.index({ mistake: 1, date: -1 });

module.exports = mongoose.model("MistakeOccurrence", mistakeOccurrenceSchema);