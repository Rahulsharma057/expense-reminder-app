const crypto = require("crypto");
const mongoose = require("mongoose");
const Meeting = require("../models/Meeting");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Free, no-login, instantly working meeting link (Jitsi Meet).
const generateLink = asyncHandler(async (req, res) => {
  const slug = crypto.randomBytes(6).toString("hex");
  res.json({ link: `https://meet.jit.si/expense-reminder-${slug}`, platform: "Jitsi Meet" });
});

const createMeeting = asyncHandler(async (req, res) => {
  const { subject, description, platform, meetingLink, dateTime, duration, reminderMinutesBefore, participants } = req.body;

  if (!subject?.trim()) return res.status(400).json({ message: "Subject is required." });
  if (!meetingLink?.trim()) return res.status(400).json({ message: "Meeting link is required." });
  if (!dateTime) return res.status(400).json({ message: "Date & time is required." });

  let parsedParticipants = [];
  if (participants) {
    try { parsedParticipants = JSON.parse(participants); } catch { parsedParticipants = []; }
  }

  const meeting = await Meeting.create({
    subject: subject.trim(),
    description: description || "",
    platform: platform || "Jitsi Meet",
    meetingLink: meetingLink.trim(),
    dateTime: new Date(dateTime),
    duration: Number(duration) || 30,
    reminderMinutesBefore: Number(reminderMinutesBefore) || 30,
    participants: parsedParticipants,
    banner: req.file ? { url: req.file.path, publicId: req.file.filename } : { url: "", publicId: "" },
    createdBy: req.user._id,
  });

  res.status(201).json(meeting);
});

const listMeetings = asyncHandler(async (req, res) => {
  const { search, status, platform, from, to, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [{ subject: regex }, { description: regex }];
  }
  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  if (from || to) {
    filter.dateTime = {};
    if (from) filter.dateTime.$gte = new Date(from);
    if (to) filter.dateTime.$lte = new Date(`${to}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [meetings, total] = await Promise.all([
    Meeting.find(filter).sort({ dateTime: 1 }).skip(skip).limit(limitNum),
    Meeting.countDocuments(filter),
  ]);

  res.json({
    meetings,
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1) },
  });
});

const getMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: `Invalid meeting ID: "${id}"` });
  }

  const meeting = await Meeting.findById(id);
  if (!meeting) return res.status(404).json({ message: "Meeting not found." });
  res.json(meeting);
});

const updateMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: `Invalid meeting ID: "${id}"` });
  }

  const meeting = await Meeting.findById(id);
  if (!meeting) return res.status(404).json({ message: "Meeting not found." });

  const {
    subject, description, platform, meetingLink, dateTime, duration,
    reminderMinutesBefore, participants, status, removeBanner,
  } = req.body;

  if (subject !== undefined) meeting.subject = subject.trim();
  if (description !== undefined) meeting.description = description;
  if (platform !== undefined) meeting.platform = platform;
  if (meetingLink !== undefined) meeting.meetingLink = meetingLink.trim();
  if (dateTime !== undefined) meeting.dateTime = new Date(dateTime);
  if (duration !== undefined) meeting.duration = Number(duration);
  if (reminderMinutesBefore !== undefined) meeting.reminderMinutesBefore = Number(reminderMinutesBefore);
  if (status !== undefined) meeting.status = status;

  if (participants !== undefined) {
    try { meeting.participants = JSON.parse(participants); } catch { /* ignore malformed */ }
  }

  if (removeBanner === "true" && meeting.banner?.publicId) {
    await cloudinary.uploader.destroy(meeting.banner.publicId).catch(() => {});
    meeting.banner = { url: "", publicId: "" };
  }

  if (req.file) {
    if (meeting.banner?.publicId) {
      await cloudinary.uploader.destroy(meeting.banner.publicId).catch(() => {});
    }
    meeting.banner = { url: req.file.path, publicId: req.file.filename };
  }

  await meeting.save();
  res.json(meeting);
});

const deleteMeeting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: `Invalid meeting ID: "${id}"` });
  }

  const meeting = await Meeting.findById(id);
  if (!meeting) return res.status(404).json({ message: "Meeting not found." });

  if (meeting.banner?.publicId) {
    await cloudinary.uploader.destroy(meeting.banner.publicId).catch(() => {});
  }
  await meeting.deleteOne();
  res.json({ message: "Meeting deleted.", id });
});

module.exports = { generateLink, createMeeting, listMeetings, getMeeting, updateMeeting, deleteMeeting };