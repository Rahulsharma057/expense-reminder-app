const https = require("https");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const Expense = require("../models/Expense");
const Recipient = require("../models/Recipient");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const MAX_PHOTOS = 5;

// -----------------------------------------------------------
// Auto-save a typed recipient name into the Recipient list
// (so it shows up as a suggestion + in "manage recipients" later)
// -----------------------------------------------------------
const upsertRecipient = async (name, userId) => {
  if (!name?.trim()) return;
  try {
    const nameLower = name.trim().toLowerCase();
    await Recipient.findOneAndUpdate(
      { nameLower },
      { $setOnInsert: { name: name.trim(), nameLower, createdBy: userId } },
      { upsert: true }
    );
  } catch {
    // Non-critical — ignore race/duplicate errors.
  }
};

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

  const files = req.files || [];
  if (files.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos.` });
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
    billPhotos: files.map((f) => ({ url: f.path, publicId: f.filename })),
    createdBy: req.user._id,
  });

  await upsertRecipient(recipientName, req.user._id);

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
    description, remarks, mode, paidByOther, removedPhotoIds,
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

  // Remove photos the user deleted in the UI
  let idsToRemove = [];
  if (removedPhotoIds) {
    try {
      idsToRemove = JSON.parse(removedPhotoIds);
    } catch {
      idsToRemove = [];
    }
  }
  if (idsToRemove.length) {
    await Promise.all(
      idsToRemove.map((publicId) => cloudinary.uploader.destroy(publicId).catch(() => {}))
    );
    expense.billPhotos = expense.billPhotos.filter((p) => !idsToRemove.includes(p.publicId));
  }

  // Add newly uploaded photos
  const files = req.files || [];
  const newPhotos = files.map((f) => ({ url: f.path, publicId: f.filename }));

  if (expense.billPhotos.length + newPhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos total.` });
  }

  expense.billPhotos = [...expense.billPhotos, ...newPhotos];

  await expense.save();

  if (recipientName !== undefined) {
    await upsertRecipient(recipientName, req.user._id);
  }

  res.json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });

  if (expense.billPhotos?.length) {
    await Promise.all(
      expense.billPhotos.map((p) => cloudinary.uploader.destroy(p.publicId).catch(() => {}))
    );
  }
  await expense.deleteOne();
  res.json({ message: "Expense deleted.", id: req.params.id });
});

// A short list of recent unique recipient names, to auto-suggest while typing.
const suggestRecipients = asyncHandler(async (req, res) => {
  const recipients = await Recipient.find().sort({ name: 1 }).limit(50);
  if (recipients.length) {
    return res.json(recipients.map((r) => r.name));
  }
  // Fallback for older data before the Recipient collection existed.
  const names = await Expense.distinct("recipientName");
  res.json(names.slice(0, 50));
});

// =============================================================
// EXCEL EXPORT — dynamic columns, date range
// =============================================================
const ALL_COLUMNS = {
  date: { header: "Date", width: 14, value: (e) => new Date(e.date).toLocaleDateString("en-IN") },
  recipientName: { header: "Recipient", width: 24, value: (e) => e.recipientName },
  amount: { header: "Amount (Rs.)", width: 14, value: (e) => e.amount },
  mode: { header: "Paid Via", width: 16, value: (e) => e.mode },
  paidByOther: { header: "Paid By (Other)", width: 20, value: (e) => e.paidByOther || "" },
  transactionId: { header: "Transaction ID", width: 20, value: (e) => e.transactionId || "" },
  reason: { header: "Reason", width: 22, value: (e) => e.reason || "" },
  description: { header: "Description", width: 30, value: (e) => e.description || "" },
  remarks: { header: "Remarks", width: 30, value: (e) => e.remarks || "" },
  createdAt: { header: "Added On", width: 18, value: (e) => new Date(e.createdAt).toLocaleString("en-IN") },
};

const exportExcel = asyncHandler(async (req, res) => {
  const { from, to, columns } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const selectedKeys = (columns ? columns.split(",") : Object.keys(ALL_COLUMNS))
    .map((k) => k.trim())
    .filter((k) => ALL_COLUMNS[k]);
  const keys = selectedKeys.length ? selectedKeys : Object.keys(ALL_COLUMNS);

  const expenses = await Expense.find(filter).sort({ date: 1 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");

  sheet.columns = keys.map((k) => ({
    header: ALL_COLUMNS[k].header,
    key: k,
    width: ALL_COLUMNS[k].width,
  }));

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };

  let total = 0;
  expenses.forEach((e) => {
    const row = {};
    keys.forEach((k) => {
      row[k] = ALL_COLUMNS[k].value(e);
    });
    sheet.addRow(row);
    total += Number(e.amount) || 0;
  });

  sheet.addRow({});
  const totalRow = sheet.addRow({
    [keys[0]]: "TOTAL",
    ...(keys.includes("amount") ? { amount: total } : {}),
  });
  totalRow.font = { bold: true };

  const filename = `expenses_${from || "all"}_to_${to || "all"}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

// =============================================================
// DATE-RANGE PDF REPORT (admin — all expenses in a period)
// =============================================================
const reportPdf = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const expenses = await Expense.find(filter).sort({ date: 1 });
  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const filename = `expense_report_${from || "all"}_to_${to || "all"}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(18).fillColor("#5B21B6").text("Expense Report", { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#555").text(
    `Period: ${from ? new Date(from).toLocaleDateString("en-IN") : "Beginning"} - ${
      to ? new Date(to).toLocaleDateString("en-IN") : "Today"
    }`,
    { align: "center" }
  );
  doc.moveDown(1);

  const tableTop = doc.y;
  const colX = { date: 40, recipient: 105, amount: 240, mode: 305, reason: 390 };

  doc.rect(40, tableTop, 515, 20).fill("#7C3AED");
  doc.fillColor("#FFFFFF").fontSize(9);
  doc.text("Date", colX.date + 3, tableTop + 5);
  doc.text("Recipient", colX.recipient + 3, tableTop + 5);
  doc.text("Amount", colX.amount + 3, tableTop + 5);
  doc.text("Mode", colX.mode + 3, tableTop + 5);
  doc.text("Reason", colX.reason + 3, tableTop + 5);

  let y = tableTop + 24;

  expenses.forEach((e, idx) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    if (idx % 2 === 0) {
      doc.rect(40, y - 3, 515, 18).fill("#F5F3FF");
    }
    doc.fillColor("#222").fontSize(8.5);
    doc.text(new Date(e.date).toLocaleDateString("en-IN"), colX.date + 3, y);
    doc.text(e.recipientName, colX.recipient + 3, y, { width: 130 });
    doc.text(`Rs. ${Number(e.amount).toLocaleString("en-IN")}`, colX.amount + 3, y);
    doc.text(e.mode, colX.mode + 3, y);
    doc.text(e.reason || "-", colX.reason + 3, y, { width: 120 });
    y += 18;
  });

  doc.moveDown(2);
  doc.moveTo(40, y + 5).lineTo(555, y + 5).stroke("#ccc");
  doc.fontSize(12).fillColor("#5B21B6")
    .text(`Total: Rs. ${total.toLocaleString("en-IN")}`, 40, y + 12, { align: "right", width: 515 });

  doc.end();
});

// =============================================================
// SINGLE-EXPENSE INVOICE PDF
// =============================================================
const fetchImageBuffer = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => resolve(Buffer.concat(chunks)));
      })
      .on("error", reject);
  });

const invoicePdf = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice_${expense._id}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).fillColor("#5B21B6").text("Expense Invoice", { align: "center" });
  doc.moveDown(1);

  const rows = [
    ["Recipient", expense.recipientName],
    ["Amount", `Rs. ${Number(expense.amount).toLocaleString("en-IN")}`],
    ["Date", new Date(expense.date).toLocaleDateString("en-IN")],
    ["Paid Via", expense.mode === "Other" ? `Other (${expense.paidByOther || "-"})` : expense.mode],
    ["Transaction ID", expense.transactionId || "-"],
    ["Reason", expense.reason || "-"],
    ["Description", expense.description || "-"],
    ["Remarks", expense.remarks || "-"],
  ];

  doc.fontSize(11).fillColor("#222");
  rows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(value);
    doc.moveDown(0.3);
  });

  const photos = expense.billPhotos?.length ? expense.billPhotos : [];

  if (photos.length) {
    doc.moveDown(1);
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#5B21B6").text("Attached Bill / Slip Photos");
    doc.moveDown(0.5);

    for (const photo of photos) {
      try {
        const buffer = await fetchImageBuffer(photo.url);
        if (doc.y > 600) doc.addPage();
        doc.image(buffer, { fit: [250, 250], align: "center" });
        doc.moveDown(1);
      } catch {
        // Skip photo if it can't be fetched.
      }
    }
  }

  doc.end();
});
// =============================================================
// CLAIM STATUS — single + bulk update
// =============================================================
const updateClaimStatus = asyncHandler(async (req, res) => {
  const { claimStatus, expectedReturnDate, claimRemark } = req.body;

  const expense = await Expense.findById(req.params.id);
  if (!expense) return res.status(404).json({ message: "Expense not found." });

  if (claimStatus !== undefined) expense.claimStatus = claimStatus;
  if (expectedReturnDate !== undefined) {
    expense.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
  }
  if (claimRemark !== undefined) expense.claimRemark = claimRemark;

  await expense.save();
  res.json(expense);
});

const bulkUpdateClaimStatus = asyncHandler(async (req, res) => {
  const { ids, claimStatus } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: "No expenses selected." });
  }
  if (!claimStatus) {
    return res.status(400).json({ message: "Claim status is required." });
  }

  await Expense.updateMany({ _id: { $in: ids } }, { $set: { claimStatus } });
  res.json({ message: "Claim status updated.", updated: ids.length });
});
module.exports = {
  createExpense, listExpenses, getExpense, updateExpense, deleteExpense, suggestRecipients,
  exportExcel, reportPdf, invoicePdf, updateClaimStatus, bulkUpdateClaimStatus,
};