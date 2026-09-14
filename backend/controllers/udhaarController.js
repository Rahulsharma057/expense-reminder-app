const Udhaar = require("../models/Udhaar");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const MAX_PHOTOS = 5;

const computeIsOverdue = (u) => {
  if (u.status === "Returned") return false;
  if (!u.expectedReturnDate) return false;
  return new Date(u.expectedReturnDate) < new Date();
};

const createUdhaar = asyncHandler(async (req, res) => {
  const {
    personName, contactNumber, type, category, amount, itemDescription, itemQuantity,
    date, expectedReturnDate, reason, remarks,
  } = req.body;

  if (!personName?.trim()) {
    return res.status(400).json({ message: "Person name is required." });
  }
  if (!type || !["Lent", "Borrowed"].includes(type)) {
    return res.status(400).json({ message: "Select whether you gave (Lent) or took (Borrowed)." });
  }
  if (category === "Cash" && (!amount || Number(amount) <= 0)) {
    return res.status(400).json({ message: "Enter a valid amount." });
  }
  if (category === "Item" && !itemDescription?.trim()) {
    return res.status(400).json({ message: "Describe the item." });
  }

  const files = req.files || [];
  if (files.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos.` });
  }

  const udhaar = await Udhaar.create({
    personName: personName.trim(),
    contactNumber: contactNumber?.trim() || "",
    type,
    category: category || "Cash",
    amount: category === "Cash" ? Number(amount) : 0,
    itemDescription: category === "Item" ? itemDescription.trim() : "",
    itemQuantity: itemQuantity?.trim() || "",
    date: date ? new Date(date) : new Date(),
    expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
    reason: reason?.trim() || "",
    remarks: remarks || "",
    photos: files.map((f) => ({ url: f.path, publicId: f.filename })),
    createdBy: req.user._id,
  });

  res.status(201).json(udhaar);
});

const listUdhaar = asyncHandler(async (req, res) => {
  const { search, type, category, status, overdue, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ personName: regex }, { reason: regex }, { itemDescription: regex }];
  }
  if (type) filter.type = type;
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }
  if (overdue === "true") {
    filter.status = { $ne: "Returned" };
    filter.expectedReturnDate = { $ne: null, $lt: new Date() };
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Udhaar.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limitNum),
    Udhaar.countDocuments(filter),
  ]);

  const withOverdue = records.map((r) => ({ ...r.toObject(), isOverdue: computeIsOverdue(r) }));

  res.json({
    records: withOverdue,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    },
  });
});

const getUdhaarSummary = asyncHandler(async (req, res) => {
  const all = await Udhaar.find({ status: { $ne: "Returned" } });

  let totalLentPending = 0;
  let totalBorrowedPending = 0;
  let overdueCount = 0;

  all.forEach((u) => {
    const remaining = u.category === "Cash" ? Math.max(u.amount - (u.returnedAmount || 0), 0) : 0;
    if (u.type === "Lent") totalLentPending += remaining;
    else totalBorrowedPending += remaining;
    if (computeIsOverdue(u)) overdueCount += 1;
  });

  res.json({ totalLentPending, totalBorrowedPending, pendingCount: all.length, overdueCount });
});

const getUdhaar = asyncHandler(async (req, res) => {
  const record = await Udhaar.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found." });
  res.json({ ...record.toObject(), isOverdue: computeIsOverdue(record) });
});

const updateUdhaar = asyncHandler(async (req, res) => {
  const record = await Udhaar.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found." });

  const {
    personName, contactNumber, type, category, amount, itemDescription, itemQuantity,
    date, expectedReturnDate, reason, remarks, removedPhotoIds,
  } = req.body;

  if (personName !== undefined) record.personName = personName.trim();
  if (contactNumber !== undefined) record.contactNumber = contactNumber.trim();
  if (type !== undefined) record.type = type;
  if (category !== undefined) record.category = category;
  if (amount !== undefined) record.amount = Number(amount);
  if (itemDescription !== undefined) record.itemDescription = itemDescription.trim();
  if (itemQuantity !== undefined) record.itemQuantity = itemQuantity.trim();
  if (date !== undefined) record.date = new Date(date);
  if (expectedReturnDate !== undefined) {
    record.expectedReturnDate = expectedReturnDate ? new Date(expectedReturnDate) : null;
  }
  if (reason !== undefined) record.reason = reason.trim();
  if (remarks !== undefined) record.remarks = remarks;

  let idsToRemove = [];
  if (removedPhotoIds) {
    try { idsToRemove = JSON.parse(removedPhotoIds); } catch { idsToRemove = []; }
  }
  if (idsToRemove.length) {
    await Promise.all(idsToRemove.map((id) => cloudinary.uploader.destroy(id).catch(() => {})));
    record.photos = record.photos.filter((p) => !idsToRemove.includes(p.publicId));
  }

  const files = req.files || [];
  const newPhotos = files.map((f) => ({ url: f.path, publicId: f.filename }));
  if (record.photos.length + newPhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos total.` });
  }
  record.photos = [...record.photos, ...newPhotos];

  await record.save();
  res.json(record);
});

const deleteUdhaar = asyncHandler(async (req, res) => {
  const record = await Udhaar.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found." });

  if (record.photos?.length) {
    await Promise.all(record.photos.map((p) => cloudinary.uploader.destroy(p.publicId).catch(() => {})));
  }
  await record.deleteOne();
  res.json({ message: "Record deleted.", id: req.params.id });
});

// Mark as returned — full or partial (for Cash)
const markReturn = asyncHandler(async (req, res) => {
  const { returnedAmount, actualReturnDate, remarks } = req.body;
  const record = await Udhaar.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found." });

  if (record.category === "Cash") {
    const amt = Number(returnedAmount ?? record.amount);
    record.returnedAmount = Math.min(amt, record.amount);
    record.status = record.returnedAmount >= record.amount ? "Returned" : "Partially Returned";
  } else {
    record.status = "Returned"; // items are all-or-nothing
  }

  record.actualReturnDate = actualReturnDate ? new Date(actualReturnDate) : new Date();
  if (remarks !== undefined && remarks) record.remarks = remarks;

  await record.save();
  res.json(record);
});

const reopenUdhaar = asyncHandler(async (req, res) => {
  const record = await Udhaar.findById(req.params.id);
  if (!record) return res.status(404).json({ message: "Record not found." });

  record.status = "Pending";
  record.actualReturnDate = null;
  record.returnedAmount = 0;
  await record.save();
  res.json(record);
});

module.exports = {
  createUdhaar, listUdhaar, getUdhaarSummary, getUdhaar, updateUdhaar, deleteUdhaar, markReturn, reopenUdhaar,
};