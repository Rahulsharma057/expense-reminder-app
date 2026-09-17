const mongoose = require("mongoose");
const Checklist = require("../models/Checklist");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendPushToUser } = require("../utils/webPush");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const computeProgress = (items = []) => {
  const total = items.length;
  if (!total) return { total: 0, done: 0, percent: 0 };
  let score = 0;
  items.forEach((item) => {
    if (item.status === "Done") score += 1;
    else if (item.status === "Partial") score += 0.5;
  });
  return {
    total,
    done: items.filter((i) => i.status === "Done").length,
    percent: Math.round((score / total) * 100),
  };
};

const withProgress = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, progress: computeProgress(obj.items) };
};

// Owner can only assign to themself or members they created
const validateAssignees = async (ownerId, assignedTo) => {
  if (!assignedTo?.length) return [];
  const users = await User.find({
    _id: { $in: assignedTo },
    $or: [{ _id: ownerId }, { createdBy: ownerId }],
  }).select("_id");
  return users.map((u) => u._id.toString());
};

const notifyAssignees = async (checklist, title, message) => {
  await Promise.all(
    checklist.assignedTo.map(async (userId) => {
      await Notification.create({ recipient: userId, type: "CHECKLIST", title, message, task: null });
      await sendPushToUser(userId, { title, body: message });
    })
  );
};

// =============================================================
// CREATE
// =============================================================
const createChecklist = asyncHandler(async (req, res) => {
  const { title, description, type, items, assignedTo, dueDate } = req.body;

  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });

  let parsedItems = [];
  if (items) {
    try { parsedItems = JSON.parse(items); } catch { parsedItems = []; }
  }
  if (!parsedItems.length) return res.status(400).json({ message: "Add at least one checklist item." });

  let parsedAssignedTo = [];
  if (assignedTo) {
    try { parsedAssignedTo = JSON.parse(assignedTo); } catch { parsedAssignedTo = []; }
  }

  const validAssignees = parsedAssignedTo.length
    ? await validateAssignees(req.user._id, parsedAssignedTo)
    : [req.user._id.toString()];

  if (!validAssignees.length) {
    return res.status(400).json({ message: "No valid assignees selected." });
  }

  const checklist = await Checklist.create({
    title: title.trim(),
    description: description || "",
    type: type || "One-time",
    items: parsedItems.map((i) => ({ text: (typeof i === "string" ? i : i.text || "").trim() })).filter((i) => i.text),
    assignedTo: validAssignees,
    createdBy: req.user._id,
    dueDate: dueDate ? new Date(dueDate) : null,
  });

  await notifyAssignees(checklist, "New Checklist Assigned", `"${checklist.title}" has been assigned to you.`);

  res.status(201).json(withProgress(checklist));
});

// =============================================================
// LIST — owner sees what they created, member sees what's assigned
// =============================================================
const listChecklists = asyncHandler(async (req, res) => {
  const { search, type, status, assignedTo, dueFrom, dueTo, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (req.user.role === "owner") {
    filter.createdBy = req.user._id;
    if (assignedTo && isValidObjectId(assignedTo)) filter.assignedTo = assignedTo;
  } else {
    filter.assignedTo = req.user._id;
  }

  if (search?.trim()) filter.title = new RegExp(search.trim(), "i");
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (dueFrom || dueTo) {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
    if (dueTo) filter.dueDate.$lte = new Date(`${dueTo}T23:59:59`);
  }

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const [checklists, total] = await Promise.all([
    Checklist.find(filter)
      .populate("assignedTo", "name username")
      .populate("createdBy", "name username")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Checklist.countDocuments(filter),
  ]);

  res.json({
    checklists: checklists.map(withProgress),
    pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.max(Math.ceil(total / limitNum), 1) },
  });
});

// =============================================================
// GET ONE
// =============================================================
const getChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id)
    .populate("assignedTo", "name username")
    .populate("createdBy", "name username");

  if (!checklist) return res.status(404).json({ message: "Checklist not found." });

  const isOwnerOfIt = checklist.createdBy._id.toString() === req.user._id.toString();
  const isAssignee = checklist.assignedTo.some((u) => u._id.toString() === req.user._id.toString());
  if (!isOwnerOfIt && !isAssignee) {
    return res.status(403).json({ message: "You don't have access to this checklist." });
  }

  res.json(withProgress(checklist));
});

// =============================================================
// UPDATE — creator only
// =============================================================
const updateChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id);
  if (!checklist) return res.status(404).json({ message: "Checklist not found." });

  if (checklist.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the creator can edit this checklist." });
  }

  const { title, description, type, items, assignedTo, dueDate, status } = req.body;

  if (title !== undefined) checklist.title = title.trim();
  if (description !== undefined) checklist.description = description;
  if (type !== undefined) checklist.type = type;
  if (dueDate !== undefined) checklist.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) checklist.status = status;

  if (items !== undefined) {
    try {
      const parsed = JSON.parse(items);
      const existingById = new Map(checklist.items.map((i) => [i._id.toString(), i]));
      checklist.items = parsed
        .map((item) => {
          const text = (item.text || "").trim();
          if (!text) return null;
          if (item._id && existingById.has(item._id)) {
            const existing = existingById.get(item._id);
            return { _id: existing._id, text, status: existing.status, remarks: existing.remarks };
          }
          return { text, status: "Pending", remarks: "" };
        })
        .filter(Boolean);
    } catch { /* ignore malformed */ }
  }

  if (assignedTo !== undefined) {
    try {
      const parsed = JSON.parse(assignedTo);
      const validAssignees = await validateAssignees(req.user._id, parsed);
      checklist.assignedTo = validAssignees.length ? validAssignees : [req.user._id];
    } catch { /* ignore malformed */ }
  }

  await checklist.save();
  res.json(withProgress(checklist));
});

// =============================================================
// UPDATE ONE ITEM — any assignee or the creator can mark it
// =============================================================
const updateItemStatus = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  const { status, remarks } = req.body;

  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id);
  if (!checklist) return res.status(404).json({ message: "Checklist not found." });

  const isOwnerOfIt = checklist.createdBy.toString() === req.user._id.toString();
  const isAssignee = checklist.assignedTo.some((u) => u.toString() === req.user._id.toString());
  if (!isOwnerOfIt && !isAssignee) {
    return res.status(403).json({ message: "You don't have access to this checklist." });
  }

  const item = checklist.items.id(itemId);
  if (!item) return res.status(404).json({ message: "Item not found." });

  if (status !== undefined) item.status = status;
  if (remarks !== undefined) item.remarks = remarks;

  await checklist.save();

  const progress = computeProgress(checklist.items);
  if (progress.percent === 100 && checklist.status === "Active") {
    checklist.status = "Completed";
    await checklist.save();

    if (checklist.createdBy.toString() !== req.user._id.toString()) {
      const title = "Checklist Completed";
      const message = `"${checklist.title}" has been fully completed.`;
      await Notification.create({ recipient: checklist.createdBy, type: "CHECKLIST", title, message });
      await sendPushToUser(checklist.createdBy, { title, body: message });
    }
  }

  res.json(withProgress(await checklist.populate("assignedTo createdBy", "name username")));
});

// =============================================================
// CANCEL / REOPEN — creator only
// =============================================================
const cancelChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id);
  if (!checklist) return res.status(404).json({ message: "Checklist not found." });
  if (checklist.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the creator can cancel this checklist." });
  }

  checklist.status = "Cancelled";
  await checklist.save();
  res.json(withProgress(checklist));
});

const reopenChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id);
  if (!checklist) return res.status(404).json({ message: "Checklist not found." });
  if (checklist.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the creator can reopen this checklist." });
  }

  checklist.status = "Active";
  await checklist.save();
  res.json(withProgress(checklist));
});

// =============================================================
// DELETE — creator only
// =============================================================
const deleteChecklist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid checklist ID: "${id}"` });

  const checklist = await Checklist.findById(id);
  if (!checklist) return res.status(404).json({ message: "Checklist not found." });
  if (checklist.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Only the creator can delete this checklist." });
  }

  await checklist.deleteOne();
  res.json({ message: "Checklist deleted.", id });
});

// People the current user can assign a checklist to
const listAssignableUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== "owner") {
    return res.json([{ _id: req.user._id, name: req.user.name, username: req.user.username }]);
  }
  const members = await User.find({ $or: [{ _id: req.user._id }, { createdBy: req.user._id }] })
    .select("_id name username")
    .sort({ name: 1 });
  res.json(members);
});

module.exports = {
  createChecklist, listChecklists, getChecklist, updateChecklist, updateItemStatus,
  cancelChecklist, reopenChecklist, deleteChecklist, listAssignableUsers,
};