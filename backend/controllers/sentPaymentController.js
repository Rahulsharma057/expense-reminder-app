const SentPayment = require("../models/SentPayment");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const STATUSES = ["pending", "successful", "failed", "unknown"];
const SOURCES = ["shared_image", "shared_text", "manual_upload"];

/*
=============================================================
HELPERS
=============================================================
*/

const destroyScreenshot = (publicId) => {
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader.destroy(publicId).catch(() => {});
};

// Everything here is scoped to the logged-in user — never trust a
// client-supplied owner/user id.
const getUserFilter = (req) => ({ createdBy: req.user._id });

/*
=============================================================
CREATE
=============================================================
*/

const createSentPayment = asyncHandler(async (req, res) => {
  const {
    payeeName,
    amount,
    transactionId,
    rrn,
    referenceNumber,
    transactionDate,
    paymentMethod,
    paymentApp,
    status,
    note,
    extractedText,
    source,
  } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: "Enter a valid amount." });
  }

  const cleanTransactionId = transactionId?.trim() || "";

  // Only refuse when the SAME user has already recorded the SAME
  // non-empty transaction ID for a SENT payment. Living in its own
  // collection, this never collides with a received payment that
  // happens to share a UTR (e.g. a refund of a sent payment).
  if (cleanTransactionId) {
    const existing = await SentPayment.findOne({
      ...getUserFilter(req),
      transactionId: cleanTransactionId,
    });

    if (existing) {
      return res.status(409).json({
        message: "A sent payment with this transaction ID already exists.",
        existingId: existing._id,
      });
    }
  }

  const file = req.file || null;

  const payment = await SentPayment.create({
    payeeName: payeeName?.trim() || "",
    amount: Number(amount),
    transactionId: cleanTransactionId,
    rrn: rrn?.trim() || "",
    referenceNumber: referenceNumber?.trim() || "",
    transactionDate: transactionDate ? new Date(transactionDate) : null,
    paymentMethod: paymentMethod?.trim() || "",
    paymentApp: paymentApp?.trim() || "",
    status: STATUSES.includes(status) ? status : "unknown",
    note: note?.trim() || "",
    screenshotUrl: file ? file.path : "",
    screenshotPublicId: file ? file.filename : "",
    extractedText: extractedText || "",
    source: SOURCES.includes(source) ? source : "manual_upload",
    verificationStatus: "manually_confirmed",
    createdBy: req.user._id,
  });

  res.status(201).json(payment);
});

/*
=============================================================
LIST
=============================================================
*/

const listSentPayments = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    source,
    paymentApp,
    from,
    to,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = getUserFilter(req);

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [
      { payeeName: regex },
      { transactionId: regex },
      { note: regex },
    ];
  }

  if (status && STATUSES.includes(status)) {
    filter.status = status;
  }

  if (source && SOURCES.includes(source)) {
    filter.source = source;
  }

  if (paymentApp?.trim()) {
    filter.paymentApp = new RegExp(paymentApp.trim(), "i");
  }

  if (from || to) {
    filter.transactionDate = {};
    if (from) filter.transactionDate.$gte = new Date(from);
    if (to) filter.transactionDate.$lte = new Date(`${to}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [records, total, totalAmountAgg] = await Promise.all([
    SentPayment.find(filter)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),

    SentPayment.countDocuments(filter),

    SentPayment.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  res.json({
    records,
    totalAmount: totalAmountAgg[0]?.total || 0,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

/*
=============================================================
GET ONE
=============================================================
*/

const getSentPayment = asyncHandler(async (req, res) => {
  const record = await SentPayment.findOne({
    _id: req.params.id,
    ...getUserFilter(req),
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found." });
  }

  res.json(record);
});

/*
=============================================================
UPDATE
=============================================================
*/

const updateSentPayment = asyncHandler(async (req, res) => {
  const record = await SentPayment.findOne({
    _id: req.params.id,
    ...getUserFilter(req),
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found." });
  }

  const {
    payeeName,
    amount,
    transactionId,
    rrn,
    referenceNumber,
    transactionDate,
    paymentMethod,
    paymentApp,
    status,
    note,
    removeScreenshot,
  } = req.body;

  if (amount !== undefined) {
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Enter a valid amount." });
    }
    record.amount = Number(amount);
  }

  if (transactionId !== undefined) {
    const cleanTransactionId = transactionId.trim();

    if (cleanTransactionId && cleanTransactionId !== record.transactionId) {
      const existing = await SentPayment.findOne({
        ...getUserFilter(req),
        transactionId: cleanTransactionId,
        _id: { $ne: record._id },
      });

      if (existing) {
        return res.status(409).json({
          message: "A sent payment with this transaction ID already exists.",
          existingId: existing._id,
        });
      }
    }

    record.transactionId = cleanTransactionId;
  }

  if (payeeName !== undefined) record.payeeName = payeeName.trim();
  if (rrn !== undefined) record.rrn = rrn.trim();
  if (referenceNumber !== undefined) record.referenceNumber = referenceNumber.trim();
  if (transactionDate !== undefined) {
    record.transactionDate = transactionDate ? new Date(transactionDate) : null;
  }
  if (paymentMethod !== undefined) record.paymentMethod = paymentMethod.trim();
  if (paymentApp !== undefined) record.paymentApp = paymentApp.trim();
  if (status !== undefined && STATUSES.includes(status)) record.status = status;
  if (note !== undefined) record.note = note.trim();

  // ==================================================
  // SCREENSHOT REPLACE / REMOVE
  // ==================================================

  if (removeScreenshot === "true" && record.screenshotPublicId) {
    await destroyScreenshot(record.screenshotPublicId);
    record.screenshotUrl = "";
    record.screenshotPublicId = "";
  }

  const file = req.file || null;
  if (file) {
    await destroyScreenshot(record.screenshotPublicId);
    record.screenshotUrl = file.path;
    record.screenshotPublicId = file.filename;
  }

  await record.save();

  res.json(record);
});

/*
=============================================================
DELETE
=============================================================
*/

const deleteSentPayment = asyncHandler(async (req, res) => {
  const record = await SentPayment.findOne({
    _id: req.params.id,
    ...getUserFilter(req),
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found." });
  }

  await destroyScreenshot(record.screenshotPublicId);
  await record.deleteOne();

  res.json({ message: "Record deleted.", id: req.params.id });
});

module.exports = {
  createSentPayment,
  listSentPayments,
  getSentPayment,
  updateSentPayment,
  deleteSentPayment,
};
