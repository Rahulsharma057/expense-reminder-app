const mongoose = require("mongoose");

const notificationPreferenceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who configured this
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categories: [{ type: String }], // which categories to draw random messages from
    frequencyMinutes: { type: Number, default: 60 }, // "every hour" by default
    active: { type: Boolean, default: true },
    lastSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ owner: 1, recipientUser: 1 }, { unique: true });

module.exports = mongoose.model("NotificationPreference", notificationPreferenceSchema);