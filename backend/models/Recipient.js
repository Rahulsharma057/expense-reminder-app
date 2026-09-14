const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true, unique: true },
    notes: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

recipientSchema.pre("validate", function (next) {
  if (this.name) this.nameLower = this.name.trim().toLowerCase();
  next();
});

module.exports = mongoose.model("Recipient", recipientSchema);