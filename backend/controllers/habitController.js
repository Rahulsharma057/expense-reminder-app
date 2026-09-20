const mongoose = require("mongoose");
const Habit = require("../models/Habit");
const HabitLog = require("../models/HabitLog");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toDateOnly = (input) => {
  const d = input ? new Date(input) : new Date();
  const iso = d.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
};

// "Success" is normalized per habit type: for a Good habit, doing it is success;
// for a Bad habit, avoiding it (Skipped) is success.
const isSuccess = (habit, log) => {
  if (!log) return null;
  if (habit.type === "Good") return log.status === "Done";
  return log.status === "Skipped";
};

// =============================================================
// HABIT CRUD
// =============================================================
const createHabit = asyncHandler(async (req, res) => {
  const { title, type, description, reasonPresets } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
  if (!["Good", "Bad"].includes(type)) return res.status(400).json({ message: "Type must be Good or Bad." });

  let presets = [];
  if (reasonPresets) {
    try { presets = JSON.parse(reasonPresets).map((r) => r.trim()).filter(Boolean); } catch { presets = []; }
  }

  const habit = await Habit.create({
    title: title.trim(),
    type,
    description: description || "",
    reasonPresets: presets,
    createdBy: req.user._id,
  });

  res.status(201).json(habit);
});

const listHabits = asyncHandler(async (req, res) => {
  const { type, active } = req.query;
  const filter = { createdBy: req.user._id };
  if (type) filter.type = type;
  if (active !== undefined) filter.active = active === "true";

  const habits = await Habit.find(filter).sort({ createdAt: -1 });
  res.json(habits);
});

const getHabit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });
  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });
  res.json(habit);
});

const updateHabit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });

  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });

  const { title, type, description, reasonPresets, active } = req.body;

  if (title !== undefined) habit.title = title.trim();
  if (type !== undefined) habit.type = type;
  if (description !== undefined) habit.description = description;
  if (active !== undefined) habit.active = active === true || active === "true";
  if (reasonPresets !== undefined) {
    try { habit.reasonPresets = JSON.parse(reasonPresets).map((r) => r.trim()).filter(Boolean); } catch { /* ignore */ }
  }

  await habit.save();
  res.json(habit);
});

const deleteHabit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });

  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });

  await HabitLog.deleteMany({ habit: id });
  await habit.deleteOne();
  res.json({ message: "Habit deleted.", id });
});

// =============================================================
// TODAY'S CHECKLIST
// =============================================================
const getTodayChecklist = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const day = toDateOnly(date);

  const habits = await Habit.find({ createdBy: req.user._id, active: true }).sort({ type: 1, title: 1 });
  const logs = await HabitLog.find({ createdBy: req.user._id, date: day, habit: { $in: habits.map((h) => h._id) } });

  const logByHabit = new Map(logs.map((l) => [l.habit.toString(), l]));

  const items = habits.map((h) => {
    const log = logByHabit.get(h._id.toString()) || null;
    return { habit: h, log, success: isSuccess(h, log) };
  });

  res.json({ date: day, items });
});

// =============================================================
// LOG (upsert) — mark a habit Done/Skipped for a given date
// =============================================================
const logHabit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reason, remarks, date } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });
  if (!["Done", "Skipped"].includes(status)) return res.status(400).json({ message: "Status must be Done or Skipped." });

  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });

  const day = toDateOnly(date);

  const log = await HabitLog.findOneAndUpdate(
    { habit: id, date: day },
    { habit: id, date: day, status, reason: reason || "", remarks: remarks || "", createdBy: req.user._id },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json({ log, success: isSuccess(habit, log) });
});

const deleteLog = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.query;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });

  await HabitLog.deleteOne({ habit: id, date: toDateOnly(date), createdBy: req.user._id });
  res.json({ message: "Entry cleared." });
});

// =============================================================
// STATS — % success in a date range + trend vs previous equal period
// =============================================================
const getHabitStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });

  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });

  const rangeEnd = to ? toDateOnly(to) : toDateOnly();
  const rangeStart = from ? toDateOnly(from) : toDateOnly(new Date(rangeEnd.getTime() - 29 * 86400000));
  const dayCount = Math.round((rangeEnd - rangeStart) / 86400000) + 1;

  const computeForRange = async (start, end) => {
    const logs = await HabitLog.find({ habit: id, date: { $gte: start, $lte: end } });
    const successCount = logs.filter((l) => isSuccess(habit, l)).length;
    const totalDays = Math.round((end - start) / 86400000) + 1;
    return { totalDays, loggedCount: logs.length, successCount, percent: totalDays ? Math.round((successCount / totalDays) * 100) : 0 };
  };

  const current = await computeForRange(rangeStart, rangeEnd);

  const prevEnd = new Date(rangeStart.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (dayCount - 1) * 86400000);
  const previous = await computeForRange(prevStart, prevEnd);

  const diff = current.percent - previous.percent;
  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "same";

  res.json({
    habit: { _id: habit._id, title: habit.title, type: habit.type },
    range: { from: rangeStart, to: rangeEnd },
    current, previous, diff, trend,
  });
});

// =============================================================
// REASONS SUMMARY — which reasons come up most often
// =============================================================
const getReasonsSummary = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid habit ID: "${id}"` });

  const habit = await Habit.findOne({ _id: id, createdBy: req.user._id });
  if (!habit) return res.status(404).json({ message: "Habit not found." });

  const filter = { habit: id, reason: { $ne: "" } };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = toDateOnly(from);
    if (to) filter.date.$lte = toDateOnly(to);
  }

  const logs = await HabitLog.find(filter).select("reason");
  const counts = {};
  logs.forEach((l) => { counts[l.reason] = (counts[l.reason] || 0) + 1; });

  const summary = Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  res.json(summary);
});

module.exports = {
  createHabit, listHabits, getHabit, updateHabit, deleteHabit,
  getTodayChecklist, logHabit, deleteLog, getHabitStats, getReasonsSummary,
};