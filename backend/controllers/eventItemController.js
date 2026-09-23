const mongoose = require("mongoose");
const EventItem = require("../models/EventItem");
const EventItemTemplate = require("../models/EventItemTemplate");
const Event = require("../models/Event");

const numberOrZero = (value) => (value === undefined || value === "" ? 0 : Number(value) || 0);
const truthy = (value) => value === true || value === "true";

// ==========================================================
// ITEMS
// ==========================================================

const addItem = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(eventId).select("_id").lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const {
      name, category, vendor, vendorPhone, quantity, unit,
      plannedCost, actualCost, priceKnown, checklistStatus, remarks, saveAsTemplate,
    } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Item name is required" });

    const priceIsKnown = truthy(priceKnown);

    const item = await EventItem.create({
      event: eventId,
      name: name.trim(),
      category: EventItem.CATEGORIES.includes(category) ? category : "Other",
      vendor: vendor?.trim() || "",
      vendorPhone: vendorPhone?.trim() || "",
      quantity: numberOrZero(quantity) || 1,
      unit: unit?.trim() || "pcs",
      plannedCost: numberOrZero(plannedCost),
      actualCost: priceIsKnown ? numberOrZero(actualCost) : 0,
      priceKnown: priceIsKnown,
      checklistStatus: EventItem.CHECKLIST_STATUSES.includes(checklistStatus) ? checklistStatus : "pending",
      remarks: remarks?.trim() || "",
      billUrl: req.file?.path || "",
      billPublicId: req.file?.filename || "",
      savedAsTemplate: truthy(saveAsTemplate),
      addedBy: req.user._id,
    });

    if (truthy(saveAsTemplate)) {
      await EventItemTemplate.create({
        name: item.name,
        category: item.category,
        vendor: item.vendor,
        vendorPhone: item.vendorPhone,
        quantity: item.quantity,
        unit: item.unit,
        plannedCost: item.plannedCost,
        notes: item.remarks,
        createdBy: req.user._id,
      });
    }

    return res.status(201).json(item);
  } catch (err) {
    console.error("addItem error:", err);
    return res.status(500).json({ message: "Could not add item" });
  }
};

// Quick-add: copies a saved template straight into this event's item
// list, so recurring supplies don't need retyping every time.
const addItemFromTemplate = async (req, res) => {
  try {
    const { id: eventId, templateId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(templateId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const [event, template] = await Promise.all([
      Event.findById(eventId).select("_id").lean(),
      EventItemTemplate.findById(templateId).lean(),
    ]);

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!template) return res.status(404).json({ message: "Template not found" });

    const item = await EventItem.create({
      event: eventId,
      name: template.name,
      category: template.category,
      vendor: template.vendor,
      vendorPhone: template.vendorPhone,
      quantity: template.quantity,
      unit: template.unit,
      plannedCost: template.plannedCost,
      remarks: template.notes,
      addedBy: req.user._id,
    });

    return res.status(201).json(item);
  } catch (err) {
    console.error("addItemFromTemplate error:", err);
    return res.status(500).json({ message: "Could not add item from template" });
  }
};

const listItems = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    const filter = { event: eventId };
    if (req.query.status) filter.checklistStatus = req.query.status;
    if (req.query.priceKnown === "false") filter.priceKnown = false;

    const items = await EventItem.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(items);
  } catch (err) {
    console.error("listItems error:", err);
    return res.status(500).json({ message: "Could not load items" });
  }
};

const updateItem = async (req, res) => {
  try {
    const { id: eventId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const item = await EventItem.findOne({ _id: itemId, event: eventId });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const {
      name, category, vendor, vendorPhone, quantity, unit,
      plannedCost, actualCost, priceKnown, checklistStatus, remarks,
    } = req.body;

    if (typeof name === "string" && name.trim()) item.name = name.trim();
    if (EventItem.CATEGORIES.includes(category)) item.category = category;
    if (typeof vendor === "string") item.vendor = vendor.trim();
    if (typeof vendorPhone === "string") item.vendorPhone = vendorPhone.trim();
    if (quantity !== undefined) item.quantity = numberOrZero(quantity);
    if (typeof unit === "string" && unit.trim()) item.unit = unit.trim();
    if (plannedCost !== undefined) item.plannedCost = numberOrZero(plannedCost);
    if (typeof remarks === "string") item.remarks = remarks.trim();
    if (EventItem.CHECKLIST_STATUSES.includes(checklistStatus)) item.checklistStatus = checklistStatus;

    if (priceKnown !== undefined) {
      item.priceKnown = truthy(priceKnown);
      // Turning "price known" off clears the stale actual cost rather
      // than leaving a number on screen that no longer means anything.
      if (!item.priceKnown) item.actualCost = 0;
    }
    if (item.priceKnown && actualCost !== undefined) {
      item.actualCost = numberOrZero(actualCost);
    }

    // Replacing the bill — clean up the old one.
    if (req.file) {
      if (item.billPublicId) {
        const { cloudinary } = require("../middleware/uploadEventFiles");
        cloudinary.uploader.destroy(item.billPublicId).catch(() => {});
      }
      item.billUrl = req.file.path;
      item.billPublicId = req.file.filename;
    }

    await item.save();

    return res.json(item);
  } catch (err) {
    console.error("updateItem error:", err);
    return res.status(500).json({ message: "Could not update item" });
  }
};

const deleteItem = async (req, res) => {
  try {
    const { id: eventId, itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const item = await EventItem.findOneAndDelete({ _id: itemId, event: eventId });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.billPublicId) {
      const { cloudinary } = require("../middleware/uploadEventFiles");
      cloudinary.uploader.destroy(item.billPublicId).catch(() => {});
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteItem error:", err);
    return res.status(500).json({ message: "Could not delete item" });
  }
};

// ==========================================================
// TEMPLATES
// ==========================================================

const listTemplates = async (req, res) => {
  try {
    const templates = await EventItemTemplate.find({ createdBy: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json(templates);
  } catch (err) {
    console.error("listTemplates error:", err);
    return res.status(500).json({ message: "Could not load templates" });
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, category, vendor, vendorPhone, quantity, unit, plannedCost, notes } = req.body;

    if (!name?.trim()) return res.status(400).json({ message: "Template name is required" });

    const template = await EventItemTemplate.create({
      name: name.trim(),
      category: EventItem.CATEGORIES.includes(category) ? category : "Other",
      vendor: vendor?.trim() || "",
      vendorPhone: vendorPhone?.trim() || "",
      quantity: numberOrZero(quantity) || 1,
      unit: unit?.trim() || "pcs",
      plannedCost: numberOrZero(plannedCost),
      notes: notes?.trim() || "",
      createdBy: req.user._id,
    });

    return res.status(201).json(template);
  } catch (err) {
    console.error("createTemplate error:", err);
    return res.status(500).json({ message: "Could not create template" });
  }
};

const deleteTemplate = async (req, res) => {
  try {
    const template = await EventItemTemplate.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!template) return res.status(404).json({ message: "Template not found" });
    return res.json({ success: true });
  } catch (err) {
    console.error("deleteTemplate error:", err);
    return res.status(500).json({ message: "Could not delete template" });
  }
};

module.exports = {
  addItem, addItemFromTemplate, listItems, updateItem, deleteItem,
  listTemplates, createTemplate, deleteTemplate,
};