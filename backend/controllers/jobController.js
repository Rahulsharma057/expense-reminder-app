const mongoose = require("mongoose");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const Interview = require("../models/Interview");

const createJob = async (req, res) => {
  try {
    const {
      title, department, description, location,
      experienceMin, experienceMax, qualification,
      budgetMin, budgetMax, openings, status,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Job title is required" });
    }

    const job = await Job.create({
      title: title.trim(),
      department: department?.trim() || "",
      description: description?.trim() || "",
      location: location?.trim() || "",
      experienceMin: Number(experienceMin) || 0,
      experienceMax: Number(experienceMax) || 0,
      qualification: Array.isArray(qualification)
        ? qualification.filter(Boolean)
        : String(qualification || "")
            .split(",")
            .map((q) => q.trim())
            .filter(Boolean),
      budgetMin: Number(budgetMin) || 0,
      budgetMax: Number(budgetMax) || 0,
      openings: Number(openings) || 1,
      status: ["open", "on-hold", "closed"].includes(status) ? status : "open",
      postedBy: req.user._id,
    });

    return res.status(201).json(job);
  } catch (err) {
    console.error("createJob error:", err);
    return res.status(500).json({ message: "Could not create job" });
  }
};

// GET /jobs?status=open — includes a live candidate-count summary per
// job so the list can show "12 candidates, 3 selected" at a glance
// without a second round-trip per job.
const listJobs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const jobs = await Job.find(filter)
      .populate("postedBy", "name role")
      .sort({ createdAt: -1 })
      .lean();

    const jobIds = jobs.map((job) => job._id);

    const counts = jobIds.length
      ? await Candidate.aggregate([
          { $match: { job: { $in: jobIds } } },
          { $group: { _id: { job: "$job", status: "$status" }, count: { $sum: 1 } } },
        ])
      : [];

    const summaryByJob = new Map();
    for (const row of counts) {
      const jobId = String(row._id.job);
      if (!summaryByJob.has(jobId)) summaryByJob.set(jobId, { total: 0, byStatus: {} });
      const entry = summaryByJob.get(jobId);
      entry.total += row.count;
      entry.byStatus[row._id.status] = row.count;
    }

    const withCounts = jobs.map((job) => ({
      ...job,
      candidateSummary: summaryByJob.get(String(job._id)) || { total: 0, byStatus: {} },
    }));

    return res.json(withCounts);
  } catch (err) {
    console.error("listJobs error:", err);
    return res.status(500).json({ message: "Could not load jobs" });
  }
};

const getJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(id).populate("postedBy", "name role").lean();
    if (!job) return res.status(404).json({ message: "Job not found" });

    return res.json(job);
  } catch (err) {
    console.error("getJob error:", err);
    return res.status(500).json({ message: "Could not load job" });
  }
};

const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const {
      title, department, description, location,
      experienceMin, experienceMax, qualification,
      budgetMin, budgetMax, openings, status,
    } = req.body;

    if (typeof title === "string" && title.trim()) job.title = title.trim();
    if (typeof department === "string") job.department = department.trim();
    if (typeof description === "string") job.description = description.trim();
    if (typeof location === "string") job.location = location.trim();
    if (experienceMin !== undefined) job.experienceMin = Number(experienceMin) || 0;
    if (experienceMax !== undefined) job.experienceMax = Number(experienceMax) || 0;
    if (qualification !== undefined) {
      job.qualification = Array.isArray(qualification)
        ? qualification.filter(Boolean)
        : String(qualification || "").split(",").map((q) => q.trim()).filter(Boolean);
    }
    if (budgetMin !== undefined) job.budgetMin = Number(budgetMin) || 0;
    if (budgetMax !== undefined) job.budgetMax = Number(budgetMax) || 0;
    if (openings !== undefined) job.openings = Number(openings) || 1;
    if (["open", "on-hold", "closed"].includes(status)) job.status = status;

    await job.save();

    return res.json(job);
  } catch (err) {
    console.error("updateJob error:", err);
    return res.status(500).json({ message: "Could not update job" });
  }
};

// Deleting a job cascades to its candidates, their resumes on
// Cloudinary, and every scheduled interview for those candidates —
// otherwise you'd be left with orphaned records pointing at nothing.
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const candidates = await Candidate.find({ job: id }).select("_id resumePublicId").lean();
    const candidateIds = candidates.map((c) => c._id);

    if (candidateIds.length) {
      try {
        const cloudinary = require("../utils/cloudinary");
        const client = cloudinary.v2 || cloudinary;
        await Promise.all(
          candidates
            .filter((c) => c.resumePublicId)
            .map((c) => client.uploader.destroy(c.resumePublicId, { resource_type: "raw" }).catch(() => {}))
        );
      } catch (cleanupErr) {
        console.error("Resume cleanup failed:", cleanupErr?.message);
      }

      await Interview.deleteMany({ candidate: { $in: candidateIds } });
      await Candidate.deleteMany({ job: id });
    }

    await Job.findByIdAndDelete(id);

    return res.json({ success: true, message: "Job and its candidates/interviews deleted" });
  } catch (err) {
    console.error("deleteJob error:", err);
    return res.status(500).json({ message: "Could not delete job" });
  }
};

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob };