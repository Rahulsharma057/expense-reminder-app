const mongoose = require("mongoose");

// A job opening. Candidates are linked to one of these (models/Candidate.js).

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    department: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },

    // Years of experience wanted.
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number, default: 0 },

    // Free-text list so it fits "B.Tech", "MBA", "Any Graduate", etc.
    qualification: [{ type: String, trim: true }],

    // Annual budget range the company is willing to pay (whatever
    // currency/unit you enter consistently — e.g. lakhs per annum).
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },

    openings: { type: Number, default: 1, min: 1 },

    status: {
      type: String,
      enum: ["open", "on-hold", "closed"],
      default: "open",
    },

    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ postedBy: 1, createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);