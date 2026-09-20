const https = require("https");
const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");

const Appointment = require("../models/Appointment");
const BrandSettings = require("../models/BrandSettings");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const MAX_PHOTOS = 5;

const computeArrangementTotal = (arrangements = []) => arrangements.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

const withComputed = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, arrangementTotal: computeArrangementTotal(obj.arrangements) };
};

// =============================================================
// CREATE
// =============================================================
const createAppointment = asyncHandler(async (req, res) => {
  const { title, description, type, dateTime, duration, location, attendees, arrangements, notes } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });
  if (!dateTime) return res.status(400).json({ message: "Date & time is required." });

  let parsedAttendees = [];
  if (attendees) { try { parsedAttendees = JSON.parse(attendees); } catch { parsedAttendees = []; } }

  let parsedArrangements = [];
  if (arrangements) { try { parsedArrangements = JSON.parse(arrangements); } catch { parsedArrangements = []; } }

  const files = req.files || [];
  if (files.length > MAX_PHOTOS) return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos.` });

  const appointment = await Appointment.create({
    title: title.trim(),
    description: description || "",
    type: type || "Appointment",
    dateTime: new Date(dateTime),
    duration: Number(duration) || 30,
    location: location?.trim() || "",
    attendees: parsedAttendees,
    arrangements: parsedArrangements,
    notes: notes || "",
    photos: files.map((f) => ({ url: f.path, publicId: f.filename })),
    createdBy: req.user._id,
  });

  res.status(201).json(withComputed(appointment));
});

// =============================================================
// LIST — search + filter + pagination (for lazy loading)
// =============================================================
const listAppointments = asyncHandler(async (req, res) => {
  const { search, type, status, from, to, page = 1, limit = 15 } = req.query;
  const filter = { createdBy: req.user._id };

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ title: regex }, { location: regex }, { "attendees.name": regex }];
  }
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (from || to) {
    filter.dateTime = {};
    if (from) filter.dateTime.$gte = new Date(from);
    if (to) filter.dateTime.$lte = new Date(`${to}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 50);
  const skip = (pageNum - 1) * limitNum;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter).sort({ dateTime: 1 }).skip(skip).limit(limitNum),
    Appointment.countDocuments(filter),
  ]);

  res.json({
    appointments: appointments.map(withComputed),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1), hasMore: skip + appointments.length < total },
  });
});

const getAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });
  res.json(withComputed(appointment));
});

const updateAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  const { title, description, type, dateTime, duration, location, attendees, arrangements, notes, removedPhotoIds } = req.body;

  if (title !== undefined) appointment.title = title.trim();
  if (description !== undefined) appointment.description = description;
  if (type !== undefined) appointment.type = type;
  if (dateTime !== undefined) appointment.dateTime = new Date(dateTime);
  if (duration !== undefined) appointment.duration = Number(duration);
  if (location !== undefined) appointment.location = location.trim();
  if (notes !== undefined) appointment.notes = notes;

  if (attendees !== undefined) { try { appointment.attendees = JSON.parse(attendees); } catch { /* ignore */ } }
  if (arrangements !== undefined) { try { appointment.arrangements = JSON.parse(arrangements); } catch { /* ignore */ } }

  let idsToRemove = [];
  if (removedPhotoIds) { try { idsToRemove = JSON.parse(removedPhotoIds); } catch { idsToRemove = []; } }
  if (idsToRemove.length) {
    await Promise.all(idsToRemove.map((pid) => cloudinary.uploader.destroy(pid).catch(() => {})));
    appointment.photos = appointment.photos.filter((p) => !idsToRemove.includes(p.publicId));
  }

  const files = req.files || [];
  const newPhotos = files.map((f) => ({ url: f.path, publicId: f.filename }));
  if (appointment.photos.length + newPhotos.length > MAX_PHOTOS) {
    return res.status(400).json({ message: `You can attach at most ${MAX_PHOTOS} photos total.` });
  }
  appointment.photos = [...appointment.photos, ...newPhotos];

  await appointment.save();
  res.json(withComputed(appointment));
});

// =============================================================
// RESCHEDULE — keeps history of previous date/time
// =============================================================
const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newDateTime, reason } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });
  if (!newDateTime) return res.status(400).json({ message: "New date & time is required." });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  appointment.rescheduleHistory.push({ previousDateTime: appointment.dateTime, reason: reason || "" });
  appointment.dateTime = new Date(newDateTime);
  appointment.status = "Rescheduled";

  await appointment.save();
  res.json(withComputed(appointment));
});

const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });
  if (!["Scheduled", "Completed", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  appointment.status = status;
  await appointment.save();
  res.json(withComputed(appointment));
});

const deleteAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  if (appointment.photos?.length) {
    await Promise.all(appointment.photos.map((p) => cloudinary.uploader.destroy(p.publicId).catch(() => {})));
  }
  await appointment.deleteOne();
  res.json({ message: "Appointment deleted.", id });
});

// =============================================================
// PDF — includes org logo + saved signature automatically
// =============================================================
const fetchImageBuffer = (url) =>
  new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on("data", (c) => chunks.push(c));
      response.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });

const generatePdf = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  const brand = await BrandSettings.findOne({ owner: req.user._id });

  const doc = new PDFDocument({ margin: 40, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${appointment.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`);
  doc.pipe(res);

  // Header — logo + org name
  let headerY = 40;
  if (brand?.logo?.url) {
    try {
      const logoBuffer = await fetchImageBuffer(brand.logo.url);
      doc.image(logoBuffer, 40, headerY, { fit: [60, 60] });
    } catch { /* skip if unreachable */ }
  }
  if (brand?.orgName) {
    doc.fontSize(11).fillColor("#555").text(brand.orgName, 400, headerY + 5, { align: "right", width: 155 });
  }

  doc.moveDown(brand?.logo?.url ? 3 : 1);
  doc.fontSize(20).fillColor("#5B21B6").text(appointment.title, 40, 110, { width: 515 });
  doc.fontSize(10).fillColor("#888").text(appointment.type, { width: 515 });
  doc.moveDown(1);

  const rows = [
    ["Date & Time", new Date(appointment.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })],
    ["Duration", `${appointment.duration} minutes`],
    ["Location", appointment.location || "-"],
    ["Status", appointment.status],
  ];
  doc.fontSize(11).fillColor("#222");
  rows.forEach(([label, value]) => {
    doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
    doc.font("Helvetica").text(value);
    doc.moveDown(0.3);
  });

  if (appointment.description) {
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5B21B6").text("Agenda / Description");
    doc.font("Helvetica").fontSize(10).fillColor("#222").text(appointment.description);
  }

  if (appointment.attendees?.length) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5B21B6").text("Attendees");
    doc.font("Helvetica").fontSize(10).fillColor("#222");
    appointment.attendees.forEach((a) => {
      doc.text(`• ${a.name}${a.isExternal ? " (Guest)" : ""}${a.phone ? ` — ${a.phone}` : ""}${a.email ? ` — ${a.email}` : ""}`);
    });
  }

  if (appointment.arrangements?.length) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5B21B6").text("Arrangements");
    doc.moveDown(0.3);

    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 18).fill("#7C3AED");
    doc.fillColor("#fff").fontSize(9);
    doc.text("Item", 45, tableTop + 4);
    doc.text("Category", 280, tableTop + 4);
    doc.text("Status", 380, tableTop + 4);
    doc.text("Cost", 470, tableTop + 4);

    let y = tableTop + 22;
    let total = 0;
    appointment.arrangements.forEach((a, idx) => {
      if (idx % 2 === 0) doc.rect(40, y - 3, 515, 16).fill("#F5F3FF");
      doc.fillColor("#222").fontSize(8.5);
      doc.text(a.text, 45, y, { width: 225 });
      doc.text(a.category, 280, y);
      doc.text(a.status, 380, y);
      doc.text(`Rs. ${Number(a.cost).toLocaleString("en-IN")}`, 470, y);
      total += Number(a.cost) || 0;
      y += 16;
    });

    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5B21B6").text(`Total Arrangement Cost: Rs. ${total.toLocaleString("en-IN")}`, 40, y + 10, { align: "right", width: 515 });
  }

  if (appointment.notes) {
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#5B21B6").text("Notes");
    doc.font("Helvetica").fontSize(10).fillColor("#222").text(appointment.notes);
  }

  // Signature — bottom, auto from saved BrandSettings
  if (brand?.signature?.url) {
    try {
      const sigBuffer = await fetchImageBuffer(brand.signature.url);
      const sigY = Math.max(doc.y + 30, 680);
      doc.image(sigBuffer, 400, sigY, { fit: [130, 50] });
      doc.fontSize(9).fillColor("#555").text(brand.signatoryName || "Authorized Signatory", 400, sigY + 55, { width: 155, align: "center" });
      doc.text(new Date().toLocaleDateString("en-IN"), 400, sigY + 68, { width: 155, align: "center" });
    } catch { /* skip if unreachable */ }
  }

  doc.end();
});
// =============================================================
// UPDATE A SINGLE ARRANGEMENT ITEM — checkbox toggle, saves instantly
// so items can be tracked/updated independently over time.
// =============================================================
const updateArrangementItem = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { status, cost, text } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid appointment ID: "${id}"` });

  const appointment = await Appointment.findOne({ _id: id, createdBy: req.user._id });
  if (!appointment) return res.status(404).json({ message: "Appointment not found." });

  const item = appointment.arrangements.id(itemId);
  if (!item) return res.status(404).json({ message: "Arrangement item not found." });

  if (status !== undefined) item.status = status;
  if (cost !== undefined) item.cost = Number(cost);
  if (text !== undefined) item.text = text.trim();

  await appointment.save();
  res.json(withComputed(appointment));
});

// =============================================================
// CONFLICT CHECK — warn if another appointment overlaps this time slot
// =============================================================
const checkConflict = asyncHandler(async (req, res) => {
  const { dateTime, duration, excludeId } = req.query;
  if (!dateTime) return res.json({ conflicts: [] });

  const start = new Date(dateTime);
  const end = new Date(start.getTime() + (Number(duration) || 30) * 60000);

  const filter = {
    createdBy: req.user._id,
    status: { $nin: ["Cancelled"] },
    dateTime: { $lt: end }, // existing appointment starts before this one ends
  };
  if (excludeId && isValidObjectId(excludeId)) filter._id = { $ne: excludeId };

  const candidates = await Appointment.find(filter).select("title dateTime duration");

  const conflicts = candidates.filter((c) => {
    const cEnd = new Date(new Date(c.dateTime).getTime() + (c.duration || 30) * 60000);
    return cEnd > start; // and ends after this one starts — genuine overlap
  });

  res.json({ conflicts: conflicts.map((c) => ({ id: c._id, title: c.title, dateTime: c.dateTime, duration: c.duration })) });
});

module.exports = {
  createAppointment, listAppointments, getAppointment, updateAppointment,
  rescheduleAppointment, updateStatus, deleteAppointment, generatePdf,
  updateArrangementItem, checkConflict,
};