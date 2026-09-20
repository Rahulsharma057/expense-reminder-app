const mongoose = require("mongoose");
const ShoppingList = require("../models/ShoppingList");
const ShoppingItem = require("../models/ShoppingItem");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const computeListStats = (items = [], budget = 0) => {
  const totalEstimated = items.reduce((s, i) => s + (Number(i.estimatedPrice) || 0), 0);
  const totalActual = items.reduce((s, i) => s + (i.purchased ? Number(i.actualPrice) || 0 : 0), 0);
  const purchasedCount = items.filter((i) => i.purchased).length;
  return {
    totalItems: items.length, purchasedCount, remainingCount: items.length - purchasedCount,
    totalEstimated, totalActual,
    budget, overBudget: budget > 0 && totalActual > budget,
    remainingBudget: budget > 0 ? budget - totalActual : null,
  };
};

// =============================================================
// LISTS
// =============================================================
const createList = asyncHandler(async (req, res) => {
  const { title, type, budget } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: "Title is required." });

  const list = await ShoppingList.create({ title: title.trim(), type: type || "Grocery", budget: Number(budget) || 0, createdBy: req.user._id });
  res.status(201).json({ ...list.toObject(), stats: computeListStats([], list.budget) });
});

const listLists = asyncHandler(async (req, res) => {
  const { search, type } = req.query;
  const filter = { createdBy: req.user._id };
  if (search?.trim()) filter.title = new RegExp(search.trim(), "i");
  if (type) filter.type = type;

  const lists = await ShoppingList.find(filter).sort({ createdAt: -1 });
  const withStats = await Promise.all(
    lists.map(async (l) => {
      const items = await ShoppingItem.find({ list: l._id });
      return { ...l.toObject(), stats: computeListStats(items, l.budget) };
    })
  );
  res.json(withStats);
});

const getList = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid list ID: "${id}"` });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  const items = await ShoppingItem.find({ list: id }).sort({ purchased: 1, createdAt: 1 });
  res.json({ ...list.toObject(), items, stats: computeListStats(items, list.budget) });
});

const updateList = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid list ID: "${id}"` });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  const { title, type, budget } = req.body;
  if (title !== undefined) list.title = title.trim();
  if (type !== undefined) list.type = type;
  if (budget !== undefined) list.budget = Number(budget);

  await list.save();
  const items = await ShoppingItem.find({ list: id });
  res.json({ ...list.toObject(), items, stats: computeListStats(items, list.budget) });
});

const deleteList = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid list ID: "${id}"` });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  await ShoppingItem.deleteMany({ list: id });
  await list.deleteOne();
  res.json({ message: "List deleted.", id });
});

// =============================================================
// ITEMS
// =============================================================
const addItem = asyncHandler(async (req, res) => {
  const { id } = req.params; // list id
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid list ID: "${id}"` });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  const { name, quantity, estimatedPrice } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Item name is required." });

  const item = await ShoppingItem.create({
    list: id, name: name.trim(), quantity: quantity || "1",
    estimatedPrice: Number(estimatedPrice) || 0, createdBy: req.user._id,
  });

  const items = await ShoppingItem.find({ list: id });
  res.status(201).json({ item, stats: computeListStats(items, list.budget) });
});

const updateItem = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(itemId)) return res.status(400).json({ message: "Invalid ID." });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  const item = await ShoppingItem.findOne({ _id: itemId, list: id });
  if (!item) return res.status(404).json({ message: "Item not found." });

  const { name, quantity, estimatedPrice, actualPrice, purchased } = req.body;
  if (name !== undefined) item.name = name.trim();
  if (quantity !== undefined) item.quantity = quantity;
  if (estimatedPrice !== undefined) item.estimatedPrice = Number(estimatedPrice);
  if (actualPrice !== undefined) item.actualPrice = Number(actualPrice);
  if (purchased !== undefined) item.purchased = !!purchased;

  await item.save();
  const items = await ShoppingItem.find({ list: id });
  res.json({ item, stats: computeListStats(items, list.budget) });
});

const deleteItem = asyncHandler(async (req, res) => {
  const { id, itemId } = req.params;
  if (!isValidObjectId(id) || !isValidObjectId(itemId)) return res.status(400).json({ message: "Invalid ID." });

  const list = await ShoppingList.findOne({ _id: id, createdBy: req.user._id });
  if (!list) return res.status(404).json({ message: "List not found." });

  await ShoppingItem.deleteOne({ _id: itemId, list: id });
  const items = await ShoppingItem.find({ list: id });
  res.json({ message: "Item removed.", stats: computeListStats(items, list.budget) });
});

module.exports = { createList, listLists, getList, updateList, deleteList, addItem, updateItem, deleteItem };