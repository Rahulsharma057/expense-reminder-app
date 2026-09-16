const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    platform: { type: String, enum: ["Google Meet", "Jitsi Meet", "Other"], default: "Jitsi Meet" },
    meetingLink: { type: String, required: true, trim: true },

    dateTime: { type: Date, required: true },
    duration: { type: Number, default: 30 }, // minutes

    participants: [participantSchema],

    reminderMinutesBefore: { type: Number, default: 30 },

    status: { type: String, enum: ["Scheduled", "Completed", "Cancelled"], default: "Scheduled" },

    banner: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

meetingSchema.index({ dateTime: 1 });
meetingSchema.index({ status: 1 });

module.exports = mongoose.model("Meeting", meetingSchema);