const mongoose = require("mongoose");

const messageTemplateSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

messageTemplateSchema.index({ createdBy: 1, category: 1 });

module.exports = mongoose.model("MessageTemplate", messageTemplateSchema);