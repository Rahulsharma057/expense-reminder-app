const Expense = require("../models/Expense");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const createExpense = asyncHandler(async (req, res) => {
  const {
    recipientName, amount, transactionId, date, reason,
    description, remarks, mode, paidByOther,
  } = req.body;

  if (!recipientName?.trim()) {
    return res.status(400).json({ message: "Recipient name is required." });
  }
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: "Enter a valid amount." });
  }

  const expense = await Expense.create({
    recipientName: recipientName.trim(),
    amount: Number(amount),
    transactionId: transactionId?.trim() || "",
    date: date ? new Date(date) : new Date(),
    reason: reason?.trim() || "",
    description: description || "",
    remarks: remarks || "",
    mode: mode || "Cash",
    paidByOther: mode === "Other" ? (paidByOther?.trim() || "") : "",
    billPhoto: req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : { url: "", publicId: "" },
    createdBy: req.user._id,
  });

  res.status(201).json(expense);
});

const listExpenses = asyncHandler(async (req, res) => {
  const { search, mode, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ recipientName: regex }, { reason: regex }, { transactionId: regex }];
  }
  if (mode) filter.mode = mode;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [expenses, total, totalAmountAgg] = await Promise.all([
    Expense.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
    Expense.countDocuments(filter),
    Expense.aggregate([{ $match: filter }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
  ]);

  res.json({
    expenses,
    totalAmount: totalAmountAgg[0]?.sum || 0,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

const getExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });
  res.json(expense);
});

const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });

  const {
    recipientName, amount, transactionId, date, reason,
    description, remarks, mode, paidByOther,
  } = req.body;

  if (recipientName !== undefined) expense.recipientName = recipientName.trim();
  if (amount !== undefined) expense.amount = Number(amount);
  if (transactionId !== undefined) expense.transactionId = transactionId.trim();
  if (date !== undefined) expense.date = new Date(date);
  if (reason !== undefined) expense.reason = reason.trim();
  if (description !== undefined) expense.description = description;
  if (remarks !== undefined) expense.remarks = remarks;
  if (mode !== undefined) expense.mode = mode;
  expense.paidByOther = expense.mode === "Other" ? (paidByOther?.trim() || "") : "";

  if (req.file) {
    if (expense.billPhoto?.publicId) {
      cloudinary.uploader.destroy(expense.billPhoto.publicId).catch(() => {});
    }
    expense.billPhoto = { url: req.file.path, publicId: req.file.filename };
  }

  await expense.save();
  res.json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });

  if (expense.billPhoto?.publicId) {
    cloudinary.uploader.destroy(expense.billPhoto.publicId).catch(() => {});
  }
  await expense.deleteOne();
  res.json({ message: "Expense deleted.", id: req.params.id });
});

// A short list of recent unique recipient names, to auto-suggest while typing.
const suggestRecipients = asyncHandler(async (req, res) => {
  const names = await Expense.distinct("recipientName");
  res.json(names.slice(0, 50));
});

module.exports = {
  createExpense, listExpenses, getExpense, updateExpense, deleteExpense, suggestRecipients,
};
