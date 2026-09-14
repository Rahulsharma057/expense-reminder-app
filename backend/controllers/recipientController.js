const Recipient = require("../models/Recipient");
const { asyncHandler } = require("../middleware/errorHandler");

const listRecipients = asyncHandler(async (req, res) => {
  const recipients = await Recipient.find().sort({ name: 1 });
  res.json(recipients);
});

const createRecipient = asyncHandler(async (req, res) => {
  const { name, notes } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Recipient name is required." });
  }

  const existing = await Recipient.findOne({ nameLower: name.trim().toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "This recipient already exists.", recipient: existing });
  }

  const recipient = await Recipient.create({
    name: name.trim(),
    notes: notes?.trim() || "",
    createdBy: req.user._id,
  });

  res.status(201).json(recipient);
});

const deleteRecipient = asyncHandler(async (req, res) => {
  const recipient = await Recipient.findById(req.params.id);
  if (!recipient) return res.status(404).json({ message: "Recipient not found." });

  await recipient.deleteOne();
  res.json({ message: "Recipient deleted.", id: req.params.id });
});

module.exports = { listRecipients, createRecipient, deleteRecipient };