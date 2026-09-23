const mongoose = require("mongoose");
const crypto = require("crypto");

const feedbackSchema = new mongoose.Schema(
  {
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    interviewerName: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, default: "", trim: true },
    recommendation: {
      type: String,
      enum: ["hire", "reject", "hold"],
      required: true,
    },
  },
  { timestamps: true }
);

const interviewSchema = new mongoose.Schema(
  {
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },

    round: { type: String, default: "Round 1", trim: true },
    roundNumber: { type: Number, default: 1 },

    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30 },

    mode: { type: String, enum: ["online", "offline", "phone"], default: "online" },
    // Meeting link for online, address for offline, nothing needed for phone.
    location: { type: String, default: "", trim: true },

    interviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "rescheduled", "no-show"],
      default: "scheduled",
    },

    // Candidate-side confirmation. Candidates aren't system users, so
    // this flips true either via the public confirmToken link they're
    // sent, or manually by a recruiter after confirming by phone.
    confirmed: { type: Boolean, default: false },
    confirmedAt: { type: Date, default: null },
    confirmToken: { type: String, default: () => crypto.randomBytes(16).toString("hex") },

    outcome: {
      type: String,
      enum: ["pending", "pass", "fail", "hold"],
      default: "pending",
    },

    feedback: [feedbackSchema],

    // Dedupe flags for the reminder cron (jobs/interviewReminder.js).
    reminderSentAt: { type: Date, default: null },
    confirmationNudgeSentAt: { type: Date, default: null },

    scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

interviewSchema.index({ scheduledAt: 1, status: 1 });
interviewSchema.index({ interviewers: 1, scheduledAt: 1 });

module.exports = mongoose.model("Interview", interviewSchema);