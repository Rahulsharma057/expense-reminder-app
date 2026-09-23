const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const Interview = require("../models/Interview");
const Job = require("../models/Job");

const SORT_MAP = {
  rating: { overallRating: -1 },
  "rating-asc": { overallRating: 1 },
  experience: { experienceYears: -1 },
  "expected-salary": { expectedSalary: 1 }, // cheapest-first is often "best value"
  "expected-salary-desc": { expectedSalary: -1 },
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
};

const addCandidate = async (req, res) => {
  try {
    const {
      job, name, email, phone, experienceYears, currentCompany,
      currentDesignation, qualification, skills, currentSalary,
      expectedSalary, negotiable, noticePeriodDays, source, notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(job)) {
      return res.status(400).json({ message: "Please select a valid job" });
    }

    if (!name?.trim()) {
      return res.status(400).json({ message: "Candidate name is required" });
    }

    const jobExists = await Job.findById(job).select("_id").lean();
    if (!jobExists) return res.status(404).json({ message: "Job not found" });

    const candidate = await Candidate.create({
      job,
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      experienceYears: Number(experienceYears) || 0,
      currentCompany: currentCompany?.trim() || "",
      currentDesignation: currentDesignation?.trim() || "",
      qualification: qualification?.trim() || "",
      skills: Array.isArray(skills)
        ? skills.filter(Boolean)
        : String(skills || "").split(",").map((s) => s.trim()).filter(Boolean),
      currentSalary: Number(currentSalary) || 0,
      expectedSalary: Number(expectedSalary) || 0,
      negotiable: negotiable === undefined ? true : negotiable === "true" || negotiable === true,
      noticePeriodDays: Number(noticePeriodDays) || 0,
      source: source?.trim() || "",
      notes: notes?.trim() || "",
      resumeUrl: req.uploadedResume?.url || "",
      resumePublicId: req.uploadedResume?.publicId || "",
      resumeFileName: req.uploadedResume?.fileName || "",
      addedBy: req.user._id,
    });

    return res.status(201).json(candidate);
  } catch (err) {
    console.error("addCandidate error:", err);
    return res.status(500).json({ message: "Could not add candidate" });
  }
};

// GET /candidates?job=<id>&status=shortlisted&sort=rating&q=ravi
const listCandidates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.job && mongoose.Types.ObjectId.isValid(req.query.job)) {
      filter.job = req.query.job;
    }
    if (req.query.status) filter.status = req.query.status;

    if (req.query.q?.trim()) {
      const escaped = req.query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ];
    }

    const sort = SORT_MAP[req.query.sort] || { createdAt: -1 };

    const candidates = await Candidate.find(filter)
      .populate("job", "title department")
      .sort(sort)
      .lean();

    return res.json(candidates);
  } catch (err) {
    console.error("listCandidates error:", err);
    return res.status(500).json({ message: "Could not load candidates" });
  }
};

const getCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid candidate ID" });
    }

    const candidate = await Candidate.findById(id).populate("job", "title department budgetMin budgetMax").lean();
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const interviews = await Interview.find({ candidate: id })
      .populate("interviewers", "name role")
      .sort({ scheduledAt: 1 })
      .lean();

    return res.json({ ...candidate, interviews });
  } catch (err) {
    console.error("getCandidate error:", err);
    return res.status(500).json({ message: "Could not load candidate" });
  }
};

const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid candidate ID" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const fields = [
      "name", "email", "phone", "currentCompany", "currentDesignation",
      "qualification", "source", "notes",
    ];
    for (const field of fields) {
      if (typeof req.body[field] === "string") candidate[field] = req.body[field].trim();
    }

    const numberFields = ["experienceYears", "currentSalary", "expectedSalary", "noticePeriodDays", "overallRating"];
    for (const field of numberFields) {
      if (req.body[field] !== undefined) candidate[field] = Number(req.body[field]) || 0;
    }

    if (req.body.negotiable !== undefined) {
      candidate.negotiable = req.body.negotiable === true || req.body.negotiable === "true";
    }

    if (req.body.skills !== undefined) {
      candidate.skills = Array.isArray(req.body.skills)
        ? req.body.skills.filter(Boolean)
        : String(req.body.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (
      req.body.status &&
      [
        "applied", "shortlisted", "interview-scheduled", "interviewed",
        "selected", "on-hold", "rejected", "joined", "not-joined",
      ].includes(req.body.status)
    ) {
      candidate.status = req.body.status;
    }

    // Replacing the resume — clean up the old one first.
    if (req.uploadedResume) {
      if (candidate.resumePublicId) {
        try {
          const cloudinary = require("../utils/cloudinary");
          const client = cloudinary.v2 || cloudinary;
          await client.uploader.destroy(candidate.resumePublicId, { resource_type: "raw" });
        } catch (err) {
          console.error("Old resume cleanup failed:", err?.message);
        }
      }
      candidate.resumeUrl = req.uploadedResume.url;
      candidate.resumePublicId = req.uploadedResume.publicId;
      candidate.resumeFileName = req.uploadedResume.fileName;
    }

    await candidate.save();

    return res.json(candidate);
  } catch (err) {
    console.error("updateCandidate error:", err);
    return res.status(500).json({ message: "Could not update candidate" });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid candidate ID" });
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    if (candidate.resumePublicId) {
      try {
        const cloudinary = require("../utils/cloudinary");
        const client = cloudinary.v2 || cloudinary;
        await client.uploader.destroy(candidate.resumePublicId, { resource_type: "raw" });
      } catch (err) {
        console.error("Resume cleanup failed:", err?.message);
      }
    }

    await Interview.deleteMany({ candidate: id });
    await Candidate.findByIdAndDelete(id);

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteCandidate error:", err);
    return res.status(500).json({ message: "Could not delete candidate" });
  }
};

// ==========================================================
// COMPARISON — "kaun best hai" for a given job. Pulls every
// candidate for that job plus their interview outcomes/average
// feedback rating, so the whole shortlist can be judged side by
// side on one screen instead of opening each profile separately.
// ==========================================================

const compareCandidates = async (req, res) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    const candidates = await Candidate.find({ job: jobId }).lean();
    const candidateIds = candidates.map((c) => c._id);

    const interviews = candidateIds.length
      ? await Interview.find({ candidate: { $in: candidateIds } })
          .select("candidate outcome feedback status scheduledAt")
          .lean()
      : [];

    const interviewsByCandidate = new Map();
    for (const interview of interviews) {
      const key = String(interview.candidate);
      if (!interviewsByCandidate.has(key)) interviewsByCandidate.set(key, []);
      interviewsByCandidate.get(key).push(interview);
    }

    const rows = candidates.map((candidate) => {
      const theirInterviews = interviewsByCandidate.get(String(candidate._id)) || [];

      const allFeedback = theirInterviews.flatMap((i) => i.feedback || []);
      const avgFeedbackRating = allFeedback.length
        ? allFeedback.reduce((sum, f) => sum + f.rating, 0) / allFeedback.length
        : null;

      const passedRounds = theirInterviews.filter((i) => i.outcome === "pass").length;
      const failedRounds = theirInterviews.filter((i) => i.outcome === "fail").length;
      const completedRounds = theirInterviews.filter((i) => i.status === "completed").length;

      // Fits the budget? Only meaningful if both sides have a number.
      const withinBudget =
        job.budgetMax > 0 && candidate.expectedSalary > 0
          ? candidate.expectedSalary <= job.budgetMax
          : null;

      return {
        _id: candidate._id,
        name: candidate.name,
        status: candidate.status,
        experienceYears: candidate.experienceYears,
        qualification: candidate.qualification,
        currentCompany: candidate.currentCompany,
        currentSalary: candidate.currentSalary,
        expectedSalary: candidate.expectedSalary,
        negotiable: candidate.negotiable,
        noticePeriodDays: candidate.noticePeriodDays,
        overallRating: candidate.overallRating,
        avgFeedbackRating,
        completedRounds,
        passedRounds,
        failedRounds,
        withinBudget,
        resumeUrl: candidate.resumeUrl,
      };
    });

    // Best-first: highest rating, then most passed rounds, then
    // lowest expected salary (cheaper is a tiebreaker in their favour).
    rows.sort((a, b) => {
      const ratingA = a.avgFeedbackRating ?? a.overallRating ?? 0;
      const ratingB = b.avgFeedbackRating ?? b.overallRating ?? 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      if (b.passedRounds !== a.passedRounds) return b.passedRounds - a.passedRounds;
      return (a.expectedSalary || Infinity) - (b.expectedSalary || Infinity);
    });

    return res.json({ job: { _id: job._id, title: job.title, budgetMin: job.budgetMin, budgetMax: job.budgetMax }, candidates: rows });
  } catch (err) {
    console.error("compareCandidates error:", err);
    return res.status(500).json({ message: "Could not compare candidates" });
  }
};

module.exports = {
  addCandidate,
  listCandidates,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  compareCandidates,
};