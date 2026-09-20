const mongoose = require("mongoose");
const Goal = require("../models/Goal");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const MILESTONE_WEIGHT = { "Not Started": 0, "In Progress": 0.5, Done: 1 };

const computeProgress = (goal) => {
  if (goal.milestones?.length) {
    const total = goal.milestones.length;
    const done = goal.milestones.filter((m) => m.status === "Done").length;
    const inProgress = goal.milestones.filter((m) => m.status === "In Progress").length;
    const score = goal.milestones.reduce((sum, m) => sum + (MILESTONE_WEIGHT[m.status] || 0), 0);
    return {
      total, done, inProgress,
      notStarted: total - done - inProgress,
      percent: Math.round((score / total) * 100),
    };
  }
  return { total: 0, done: 0, inProgress: 0, notStarted: 0, percent: goal.progressPercent || 0 };
};

const computeIsDelayed = (goal) =>
  !!goal.targetDate &&
  new Date(goal.targetDate) < new Date() &&
  !["Achieved", "Abandoned"].includes(goal.status);

const withComputed = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, progress: computeProgress(obj), isDelayed: computeIsDelayed(obj) };
};

const createGoal = asyncHandler(async (req, res) => {
  const { title, description, category, targetDate, status, progressPercent, milestones } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });

  let parsedMilestones = [];
  if (milestones) {
    try {
      parsedMilestones = JSON.parse(milestones)
        .map((m) => ({ text: (typeof m === "string" ? m : m.text || "").trim() }))
        .filter((m) => m.text);
    } catch { /* ignore malformed */ }
  }

  const goal = await Goal.create({
    title: title.trim(),
    description: description || "",
    category: category?.trim() || "",
    targetDate: targetDate ? new Date(targetDate) : null,
    status: status || "Not Started",
    progressPercent: Number(progressPercent) || 0,
    milestones: parsedMilestones,
    createdBy: req.user._id,
  });

  res.status(201).json(withComputed(goal));
});

const listGoals = asyncHandler(async (req, res) => {
  const { search, category, status, delayed, dueFrom, dueTo, page = 1, limit = 20 } = req.query;
  const filter = { createdBy: req.user._id };

  if (search?.trim()) filter.title = new RegExp(search.trim(), "i");
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (dueFrom || dueTo) {
    filter.targetDate = {};
    if (dueFrom) filter.targetDate.$gte = new Date(dueFrom);
    if (dueTo) filter.targetDate.$lte = new Date(`${dueTo}T23:59:59`);
  }
  if (delayed === "true") {
    filter.targetDate = { ...(filter.targetDate || {}), $ne: null, $lt: new Date() };
    filter.status = { $nin: ["Achieved", "Abandoned"] };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [goals, total] = await Promise.all([
    Goal.find(filter).sort({ targetDate: 1, createdAt: -1 }).skip(skip).limit(limitNum),
    Goal.countDocuments(filter),
  ]);

  res.json({
    goals: goals.map(withComputed),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1) },
  });
});

const getGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid goal ID: "${id}"` });

  const goal = await Goal.findOne({ _id: id, createdBy: req.user._id });
  if (!goal) return res.status(404).json({ message: "Goal not found." });
  res.json(withComputed(goal));
});

const updateGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid goal ID: "${id}"` });

  const goal = await Goal.findOne({ _id: id, createdBy: req.user._id });
  if (!goal) return res.status(404).json({ message: "Goal not found." });

  const { title, description, category, targetDate, status, progressPercent, milestones } = req.body;

  if (title !== undefined) goal.title = title.trim();
  if (description !== undefined) goal.description = description;
  if (category !== undefined) goal.category = category.trim();
  if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;
  if (status !== undefined) goal.status = status;
  if (progressPercent !== undefined) goal.progressPercent = Number(progressPercent);

  if (milestones !== undefined) {
    try {
      const parsed = JSON.parse(milestones);
      const existingById = new Map(goal.milestones.map((m) => [m._id.toString(), m]));
      goal.milestones = parsed
        .map((m) => {
          const text = (m.text || "").trim();
          if (!text) return null;
          if (m._id && existingById.has(m._id)) {
            const existing = existingById.get(m._id);
            return { _id: existing._id, text, status: existing.status, note: existing.note };
          }
          return { text, status: "Not Started", note: "" };
        })
        .filter(Boolean);
    } catch { /* ignore malformed */ }
  }

  await goal.save();
  res.json(withComputed(goal));
});

const updateMilestone = asyncHandler(async (req, res) => {
  const { id, milestoneId } = req.params;
  const { status, note } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid goal ID: "${id}"` });

  const goal = await Goal.findOne({ _id: id, createdBy: req.user._id });
  if (!goal) return res.status(404).json({ message: "Goal not found." });

  const milestone = goal.milestones.id(milestoneId);
  if (!milestone) return res.status(404).json({ message: "Milestone not found." });

  if (status !== undefined) milestone.status = status;
  if (note !== undefined) milestone.note = note;

  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.status === "Done").length;
  const started = goal.milestones.filter((m) => m.status !== "Not Started").length;
  if (total > 0) {
    if (done === total) goal.status = "Achieved";
    else if (started > 0 && goal.status === "Not Started") goal.status = "In Progress";
  }

  await goal.save();
  res.json(withComputed(goal));
});

const addUpdate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid goal ID: "${id}"` });
  if (!text?.trim()) return res.status(400).json({ message: "Update text is required." });

  const goal = await Goal.findOne({ _id: id, createdBy: req.user._id });
  if (!goal) return res.status(404).json({ message: "Goal not found." });

  goal.updates.unshift({ text: text.trim(), date: new Date() });
  await goal.save();
  res.json(withComputed(goal));
});

const deleteGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid goal ID: "${id}"` });

  const goal = await Goal.findOne({ _id: id, createdBy: req.user._id });
  if (!goal) return res.status(404).json({ message: "Goal not found." });

  await goal.deleteOne();
  res.json({ message: "Goal deleted.", id });
});

module.exports = { createGoal, listGoals, getGoal, updateGoal, updateMilestone, addUpdate, deleteGoal };