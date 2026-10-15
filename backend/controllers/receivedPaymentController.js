const ReceivedPayment = require("../models/ReceivedPayment");
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

const createReceivedPayment = asyncHandler(async (req, res) => {
  const {
    payerName,
    receiverName,
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
  // non-empty transaction ID. We deliberately do not treat identical
  // amounts (with no transaction ID) as a duplicate — that's too easy
  // to get wrong and would block legitimate repeat payments.
  if (cleanTransactionId) {
    const existing = await ReceivedPayment.findOne({
      ...getUserFilter(req),
      transactionId: cleanTransactionId,
    });

    if (existing) {
      return res.status(409).json({
        message: "A received payment with this transaction ID already exists.",
        existingId: existing._id,
      });
    }
  }

  const file = req.file || null;

  const payment = await ReceivedPayment.create({
    payerName: payerName?.trim() || "",
    receiverName: receiverName?.trim() || "",
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
    // Reaching this endpoint at all only happens after the user pressed
    // "Confirm & Save" on the review screen — see ReceivedPaymentForm.js.
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

const listReceivedPayments = asyncHandler(async (req, res) => {
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
      { payerName: regex },
      { receiverName: regex },
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
    ReceivedPayment.find(filter)
      .sort({ transactionDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),

    ReceivedPayment.countDocuments(filter),

    ReceivedPayment.aggregate([
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

const getReceivedPayment = asyncHandler(async (req, res) => {
  const record = await ReceivedPayment.findOne({
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

const updateReceivedPayment = asyncHandler(async (req, res) => {
  const record = await ReceivedPayment.findOne({
    _id: req.params.id,
    ...getUserFilter(req),
  });

  if (!record) {
    return res.status(404).json({ message: "Record not found." });
  }

  const {
    payerName,
    receiverName,
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
      const existing = await ReceivedPayment.findOne({
        ...getUserFilter(req),
        transactionId: cleanTransactionId,
        _id: { $ne: record._id },
      });

      if (existing) {
        return res.status(409).json({
          message: "A received payment with this transaction ID already exists.",
          existingId: existing._id,
        });
      }
    }

    record.transactionId = cleanTransactionId;
  }

  if (payerName !== undefined) record.payerName = payerName.trim();
  if (receiverName !== undefined) record.receiverName = receiverName.trim();
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

const deleteReceivedPayment = asyncHandler(async (req, res) => {
  const record = await ReceivedPayment.findOne({
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
  createReceivedPayment,
  listReceivedPayments,
  getReceivedPayment,
  updateReceivedPayment,
  deleteReceivedPayment,
};
