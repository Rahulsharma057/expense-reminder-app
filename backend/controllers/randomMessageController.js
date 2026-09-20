const mongoose = require("mongoose");
const NotificationPreference = require("../models/NotificationPreference");
const MessageTemplate = require("../models/MessageTemplate");
const User = require("../models/User");
const DEFAULT_POOLS = require("../config/messagePools");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const listCategories = (req, res) => {
  res.json(DEFAULT_POOLS.ALL_CATEGORIES);
};

// =============================================================
// CUSTOM MESSAGES
// =============================================================
const listTemplates = asyncHandler(async (req, res) => {
  const templates = await MessageTemplate.find({ createdBy: req.user._id }).sort({ category: 1, createdAt: -1 });
  res.json(templates);
});

const createTemplate = asyncHandler(async (req, res) => {
  const { text, category } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: "Message text is required." });
  if (!category?.trim()) return res.status(400).json({ message: "Category is required." });

  const template = await MessageTemplate.create({ text: text.trim(), category: category.trim(), createdBy: req.user._id });
  res.status(201).json(template);
});

const deleteTemplate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid template ID: "${id}"` });
  const template = await MessageTemplate.findOne({ _id: id, createdBy: req.user._id });
  if (!template) return res.status(404).json({ message: "Template not found." });
  await template.deleteOne();
  res.json({ message: "Template deleted.", id });
});

// People this owner can configure notifications for
const listRecipients = asyncHandler(async (req, res) => {
  const people = await User.find({ $or: [{ _id: req.user._id }, { createdBy: req.user._id }] }).select("_id name username").sort({ name: 1 });
  res.json(people);
});

// =============================================================
// PREFERENCES
// =============================================================
const listPreferences = asyncHandler(async (req, res) => {
  const prefs = await NotificationPreference.find({ owner: req.user._id }).populate("recipientUser", "name username").sort({ createdAt: -1 });
  res.json(prefs);
});

const upsertPreference = asyncHandler(async (req, res) => {
  const { recipientUser, categories, frequencyMinutes, active } = req.body;
  if (!recipientUser || !isValidObjectId(recipientUser)) return res.status(400).json({ message: "Valid recipient is required." });

  const recipient = await User.findOne({ _id: recipientUser, $or: [{ _id: req.user._id }, { createdBy: req.user._id }] });
  if (!recipient) return res.status(404).json({ message: "Recipient not found or not accessible." });

  const pref = await NotificationPreference.findOneAndUpdate(
    { owner: req.user._id, recipientUser },
    {
      owner: req.user._id, recipientUser,
      categories: Array.isArray(categories) ? categories : [],
      frequencyMinutes: Number(frequencyMinutes) || 60,
      active: active !== undefined ? !!active : true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("recipientUser", "name username");

  res.status(201).json(pref);
});

const deletePreference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid preference ID: "${id}"` });
  const pref = await NotificationPreference.findOne({ _id: id, owner: req.user._id });
  if (!pref) return res.status(404).json({ message: "Preference not found." });
  await pref.deleteOne();
  res.json({ message: "Preference removed.", id });
});

// Manual "send now" for testing a preference
const sendNow = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid preference ID: "${id}"` });
  const pref = await NotificationPreference.findOne({ _id: id, owner: req.user._id });
  if (!pref) return res.status(404).json({ message: "Preference not found." });

  const { pickAndSendFor } = require("../jobs/randomMessageCron");
  await pickAndSendFor(pref);
  res.json({ message: "Sent." });
});

module.exports = {
  listCategories, listTemplates, createTemplate, deleteTemplate, listRecipients,
  listPreferences, upsertPreference, deletePreference, sendNow,
};