const mongoose = require("mongoose");

// A person who applied for a Job. Not a system User — candidates never
// log in; everything about them is entered/managed by your team.

const candidateSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, index: true },

    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },

    resumeUrl: { type: String, default: "" },
    resumePublicId: { type: String, default: "" },
    resumeFileName: { type: String, default: "" },

    experienceYears: { type: Number, default: 0 },
    currentCompany: { type: String, default: "", trim: true },
    currentDesignation: { type: String, default: "", trim: true },
    qualification: { type: String, default: "", trim: true },
    skills: [{ type: String, trim: true }],

    // Money — "kitna de sakte hain" / "kitna maang rahe hain". Same
    // unit as Job.budgetMin/Max so they're directly comparable.
    currentSalary: { type: Number, default: 0 },
    expectedSalary: { type: Number, default: 0 },
    negotiable: { type: Boolean, default: true },

    // "kab join karega" — how many days of notice they need to serve
    // at their current job before they can start.
    noticePeriodDays: { type: Number, default: 0 },

    source: { type: String, default: "", trim: true }, // referral, naukri, linkedin, walk-in, etc.

    status: {
      type: String,
      enum: [
        "applied",
        "shortlisted",
        "interview-scheduled",
        "interviewed",
        "selected",
        "on-hold",
        "rejected",
        "joined",
        "not-joined",
      ],
      default: "applied",
    },

    // 0–5. Used for the "who is best" comparison/sort. Can be set
    // manually or nudged up/down as interview feedback comes in.
    overallRating: { type: Number, default: 0, min: 0, max: 5 },

    notes: { type: String, default: "", trim: true },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

candidateSchema.index({ job: 1, status: 1 });
candidateSchema.index({ job: 1, overallRating: -1 });
candidateSchema.index({ name: "text", email: "text", phone: "text" });

module.exports = mongoose.model("Candidate", candidateSchema);