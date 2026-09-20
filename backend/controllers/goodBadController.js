const mongoose = require("mongoose");
const GoodBadEntry = require("../models/GoodBadEntry");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const createEntry = asyncHandler(async (req, res) => {
  const { type, text, category, date } = req.body;
  if (!["Good", "Bad"].includes(type)) return res.status(400).json({ message: "Type must be Good or Bad." });
  if (!text?.trim()) return res.status(400).json({ message: "Text is required." });

  const entry = await GoodBadEntry.create({
    type, text: text.trim(), category: category?.trim() || "",
    date: date ? new Date(date) : new Date(),
    createdBy: req.user._id,
  });
  res.status(201).json(entry);
});

const listEntries = asyncHandler(async (req, res) => {
  const { search, type, category, from, to, page = 1, limit = 30 } = req.query;
  const filter = { createdBy: req.user._id };

  if (search?.trim()) filter.text = new RegExp(search.trim(), "i");
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [entries, total] = await Promise.all([
    GoodBadEntry.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum),
    GoodBadEntry.countDocuments(filter),
  ]);

  res.json({ entries, pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1) } });
});

const updateEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid entry ID: "${id}"` });

  const entry = await GoodBadEntry.findOne({ _id: id, createdBy: req.user._id });
  if (!entry) return res.status(404).json({ message: "Entry not found." });

  const { type, text, category, date } = req.body;
  if (type !== undefined) entry.type = type;
  if (text !== undefined) entry.text = text.trim();
  if (category !== undefined) entry.category = category.trim();
  if (date !== undefined) entry.date = new Date(date);

  await entry.save();
  res.json(entry);
});

const deleteEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid entry ID: "${id}"` });

  const entry = await GoodBadEntry.findOne({ _id: id, createdBy: req.user._id });
  if (!entry) return res.status(404).json({ message: "Entry not found." });

  await entry.deleteOne();
  res.json({ message: "Entry deleted.", id });
});

const getSummary = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = { createdBy: req.user._id };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const entries = await GoodBadEntry.find(filter);
  const goodCount = entries.filter((e) => e.type === "Good").length;
  const badCount = entries.filter((e) => e.type === "Bad").length;
  const total = goodCount + badCount;

  const categoryCounts = {};
  entries.forEach((e) => {
    if (!e.category) return;
    categoryCounts[e.category] = categoryCounts[e.category] || { Good: 0, Bad: 0 };
    categoryCounts[e.category][e.type]++;
  });

  res.json({
    goodCount, badCount, total,
    goodPercent: total ? Math.round((goodCount / total) * 100) : 0,
    byCategory: Object.entries(categoryCounts).map(([category, counts]) => ({ category, ...counts })),
  });
});

module.exports = { createEntry, listEntries, updateEntry, deleteEntry, getSummary };