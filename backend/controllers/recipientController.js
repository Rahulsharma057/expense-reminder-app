const Recipient = require("../models/Recipient");
const { asyncHandler } = require("../middleware/errorHandler");

const listRecipients = asyncHandler(async (req, res) => {
  const recipients = await Recipient.find({
    createdBy: req.user._id,
  }).sort({ name: 1 });

  res.json(recipients);
});

const createRecipient = asyncHandler(async (req, res) => {
  const { name, notes } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      message: "Recipient name is required.",
    });
  }

  const nameLower = name.trim().toLowerCase();

  const existing = await Recipient.findOne({
    nameLower,
    createdBy: req.user._id,
  });

  if (existing) {
    return res.status(409).json({
      message: "This recipient already exists.",
      recipient: existing,
    });
  }

  const recipient = await Recipient.create({
    name: name.trim(),
    notes: notes?.trim() || "",
    createdBy: req.user._id,
  });

  res.status(201).json(recipient);
});

const deleteRecipient = asyncHandler(async (req, res) => {
  const recipient = await Recipient.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!recipient) {
    return res.status(404).json({
      message: "Recipient not found.",
    });
  }

  await recipient.deleteOne();

  res.json({
    message: "Recipient deleted.",
    id: req.params.id,
  });
});

module.exports = {
  listRecipients,
  createRecipient,
  deleteRecipient,
};