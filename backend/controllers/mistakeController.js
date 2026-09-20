const mongoose = require("mongoose");
const Mistake = require("../models/Mistake");
const MistakeOccurrence = require("../models/MistakeOccurrence");
const MistakeCategory = require("../models/MistakeCategory");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// =============================================================
// CATEGORIES
// =============================================================
const listCategories = asyncHandler(async (req, res) => {
  const categories = await MistakeCategory.find({ createdBy: req.user._id }).sort({ name: 1 });
  res.json(categories);
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required." });

  const existing = await MistakeCategory.findOne({ createdBy: req.user._id, nameLower: name.trim().toLowerCase() });
  if (existing) return res.status(200).json(existing); // idempotent — quick-add buttons can call this safely

  const category = await MistakeCategory.create({ name: name.trim(), color: color || "#8B5CF6", createdBy: req.user._id });
  res.status(201).json(category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid category ID: "${id}"` });

  const category = await MistakeCategory.findOne({ _id: id, createdBy: req.user._id });
  if (!category) return res.status(404).json({ message: "Category not found." });

  await Mistake.updateMany({ category: id, createdBy: req.user._id }, { $set: { category: null } });
  await category.deleteOne();
  res.json({ message: "Category deleted. Mistakes in it are now uncategorized.", id });
});

// Team members the owner can attribute mistakes to (same visibility rule as elsewhere)
const listPeople = asyncHandler(async (req, res) => {
  if (req.user.role !== "owner") {
    return res.json([{ _id: req.user._id, name: req.user.name, username: req.user.username }]);
  }
  const members = await User.find({ $or: [{ _id: req.user._id }, { createdBy: req.user._id }] })
    .select("_id name username")
    .sort({ name: 1 });
  res.json(members);
});

// =============================================================
// HELPERS
// =============================================================
const withStats = async (mistake) => {
  const occurrences = await MistakeOccurrence.find({ mistake: mistake._id }).sort({ date: -1 });
  const obj = mistake.toObject ? mistake.toObject() : mistake;

  const dayCounts = new Array(7).fill(0);
  occurrences.forEach((o) => dayCounts[new Date(o.date).getDay()]++);
  let mostCommonDay = null;
  const maxCount = Math.max(...dayCounts);
  if (occurrences.length && maxCount > 0) {
    mostCommonDay = DAY_NAMES[dayCounts.indexOf(maxCount)];
  }

  return {
    ...obj,
    occurrenceCount: occurrences.length,
    firstOccurred: occurrences.length ? occurrences[occurrences.length - 1].date : null,
    lastOccurred: occurrences.length ? occurrences[0].date : null,
    mostCommonDay,
    recentOccurrences: occurrences.slice(0, 10),
  };
};

// =============================================================
// MISTAKE CRUD
// =============================================================
const createMistake = asyncHandler(async (req, res) => {
  const { title, description, category, personType, personUser, personName, severity } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });

  let resolvedPersonName = personName?.trim() || "";
  if (personType === "TeamMember" && personUser) {
    const user = await User.findById(personUser).select("name");
    resolvedPersonName = user?.name || resolvedPersonName;
  } else if (personType === "Self") {
    resolvedPersonName = req.user.name;
  }

  const mistake = await Mistake.create({
    title: title.trim(),
    description: description || "",
    category: category && isValidObjectId(category) ? category : null,
    personType: personType || "Self",
    personUser: personType === "TeamMember" && personUser && isValidObjectId(personUser) ? personUser : null,
    personName: resolvedPersonName,
    severity: severity || "Moderate",
    createdBy: req.user._id,
  });

  // First occurrence is logged automatically at creation time
  await MistakeOccurrence.create({ mistake: mistake._id, date: new Date(), remarks: description || "", createdBy: req.user._id });

  res.status(201).json(await withStats(mistake));
});

const listMistakes = asyncHandler(async (req, res) => {
  const { search, category, personType, personUser, status, severity, page = 1, limit = 20 } = req.query;
  const filter = { createdBy: req.user._id };

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ title: regex }, { description: regex }, { personName: regex }];
  }
  if (category) filter.category = category;
  if (personType) filter.personType = personType;
  if (personUser && isValidObjectId(personUser)) filter.personUser = personUser;
  if (status) filter.status = status;
  if (severity) filter.severity = severity;

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [mistakes, total] = await Promise.all([
    Mistake.find(filter).populate("category").sort({ updatedAt: -1 }).skip(skip).limit(limitNum),
    Mistake.countDocuments(filter),
  ]);

  const withCounts = await Promise.all(
    mistakes.map(async (m) => {
      const occurrenceCount = await MistakeOccurrence.countDocuments({ mistake: m._id });
      const lastOccurrence = await MistakeOccurrence.findOne({ mistake: m._id }).sort({ date: -1 });
      return { ...m.toObject(), occurrenceCount, lastOccurred: lastOccurrence?.date || null };
    })
  );

  res.json({
    mistakes: withCounts,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1) },
  });
});

const getMistake = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid mistake ID: "${id}"` });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id }).populate("category");
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  res.json(await withStats(mistake));
});

const updateMistake = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid mistake ID: "${id}"` });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id });
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  const { title, description, category, personType, personUser, personName, severity, status } = req.body;

  if (title !== undefined) mistake.title = title.trim();
  if (description !== undefined) mistake.description = description;
  if (category !== undefined) mistake.category = category && isValidObjectId(category) ? category : null;
  if (status !== undefined) mistake.status = status;
  if (severity !== undefined) mistake.severity = severity;

  if (personType !== undefined) {
    mistake.personType = personType;
    if (personType === "TeamMember" && personUser) {
      const user = await User.findById(personUser).select("name");
      mistake.personUser = personUser;
      mistake.personName = user?.name || personName || "";
    } else if (personType === "Self") {
      mistake.personUser = null;
      mistake.personName = req.user.name;
    } else {
      mistake.personUser = null;
      mistake.personName = personName?.trim() || "";
    }
  }

  await mistake.save();
  res.json(await withStats(mistake));
});

const deleteMistake = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid mistake ID: "${id}"` });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id });
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  await MistakeOccurrence.deleteMany({ mistake: id });
  await mistake.deleteOne();
  res.json({ message: "Mistake deleted.", id });
});

// =============================================================
// OCCURRENCES — logging "it happened again"
// =============================================================
const addOccurrence = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date, remarks } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid mistake ID: "${id}"` });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id });
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  await MistakeOccurrence.create({
    mistake: id,
    date: date ? new Date(date) : new Date(),
    remarks: remarks || "",
    createdBy: req.user._id,
  });

  if (mistake.status === "Resolved") {
    mistake.status = "Open"; // happening again reopens it
    await mistake.save();
  }

  res.status(201).json(await withStats(mistake));
});

const updateOccurrence = asyncHandler(async (req, res) => {
  const { id, occurrenceId } = req.params;
  const { date, remarks } = req.body;
  if (!isValidObjectId(id) || !isValidObjectId(occurrenceId)) return res.status(400).json({ message: "Invalid ID." });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id });
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  const occurrence = await MistakeOccurrence.findOne({ _id: occurrenceId, mistake: id });
  if (!occurrence) return res.status(404).json({ message: "Occurrence not found." });

  if (date !== undefined) occurrence.date = new Date(date);
  if (remarks !== undefined) occurrence.remarks = remarks;
  await occurrence.save();

  res.json(await withStats(mistake));
});

const deleteOccurrence = asyncHandler(async (req, res) => {
  const { id, occurrenceId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(occurrenceId)) return res.status(400).json({ message: "Invalid ID." });

  const mistake = await Mistake.findOne({ _id: id, createdBy: req.user._id });
  if (!mistake) return res.status(404).json({ message: "Mistake not found." });

  await MistakeOccurrence.deleteOne({ _id: occurrenceId, mistake: id });
  res.json(await withStats(mistake));
});

// =============================================================
// DASHBOARD SUMMARY — repeated-most, recent, totals
// =============================================================
const getSummary = asyncHandler(async (req, res) => {
  const mistakes = await Mistake.find({ createdBy: req.user._id });
  const mistakeIds = mistakes.map((m) => m._id);

  const occurrenceCounts = await MistakeOccurrence.aggregate([
    { $match: { mistake: { $in: mistakeIds } } },
    { $group: { _id: "$mistake", count: { $sum: 1 }, lastDate: { $max: "$date" } } },
  ]);
  const countMap = new Map(occurrenceCounts.map((c) => [c._id.toString(), c]));

  const enriched = mistakes.map((m) => ({
    _id: m._id, title: m.title, personName: m.personName, personType: m.personType,
    occurrenceCount: countMap.get(m._id.toString())?.count || 0,
    lastOccurred: countMap.get(m._id.toString())?.lastDate || null,
  }));

  const mostRepeated = [...enriched].sort((a, b) => b.occurrenceCount - a.occurrenceCount).slice(0, 5);
  const totalOccurrences = enriched.reduce((sum, m) => sum + m.occurrenceCount, 0);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const thisMonthCount = await MistakeOccurrence.countDocuments({ mistake: { $in: mistakeIds }, date: { $gte: thisMonthStart } });

  res.json({
    totalMistakes: mistakes.length,
    totalOccurrences,
    thisMonthOccurrences: thisMonthCount,
    openCount: mistakes.filter((m) => m.status === "Open").length,
    mostRepeated,
  });
});

module.exports = {
  listCategories, createCategory, deleteCategory, listPeople,
  createMistake, listMistakes, getMistake, updateMistake, deleteMistake,
  addOccurrence, updateOccurrence, deleteOccurrence, getSummary,
};