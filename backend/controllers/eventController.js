const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventItem = require("../models/EventItem");
const EventGuest = require("../models/EventGuest");

const createEvent = async (req, res) => {
  try {
    const { title, type, description, date, venue, budget, status } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Event title is required" });
    if (!date || Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: "A valid date is required" });
    }

    const event = await Event.create({
      title: title.trim(),
      type: type?.trim() || "",
      description: description?.trim() || "",
      date: new Date(date),
      venue: venue?.trim() || "",
      budget: Number(budget) || 0,
      status: ["planning", "confirmed", "ongoing", "completed", "cancelled"].includes(status) ? status : "planning",
      createdBy: req.user._id,
    });

    return res.status(201).json(event);
  } catch (err) {
    console.error("createEvent error:", err);
    return res.status(500).json({ message: "Could not create event" });
  }
};

// GET /events?status=planning — each event comes back with a live
// budget + guest summary so the list can show progress at a glance
// without a second round-trip per card.
const listEvents = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const events = await Event.find(filter).sort({ date: 1 }).lean();
    const eventIds = events.map((e) => e._id);

    const [itemTotals, guestCounts] = await Promise.all([
      eventIds.length
        ? EventItem.aggregate([
            { $match: { event: { $in: eventIds } } },
            {
              $group: {
                _id: "$event",
                totalPlanned: { $sum: "$plannedCost" },
                totalActual: { $sum: { $cond: ["$priceKnown", "$actualCost", 0] } },
                itemCount: { $sum: 1 },
                pendingPriceCount: { $sum: { $cond: ["$priceKnown", 0, 1] } },
                notDeliveredCount: {
                  $sum: { $cond: [{ $in: ["$checklistStatus", ["delivered", "setup-done", "cancelled"]] }, 0, 1] },
                },
              },
            },
          ])
        : [],
      eventIds.length
        ? EventGuest.aggregate([
            { $match: { event: { $in: eventIds } } },
            { $group: { _id: { event: "$event", status: "$rsvpStatus" }, count: { $sum: 1 } } },
          ])
        : [],
    ]);

    const itemsByEvent = new Map(itemTotals.map((row) => [String(row._id), row]));

    const guestsByEvent = new Map();
    for (const row of guestCounts) {
      const key = String(row._id.event);
      if (!guestsByEvent.has(key)) guestsByEvent.set(key, { total: 0, confirmed: 0, declined: 0, pending: 0 });
      const entry = guestsByEvent.get(key);
      entry.total += row.count;
      entry[row._id.status] = row.count;
    }

    const withSummary = events.map((event) => ({
      ...event,
      itemSummary: itemsByEvent.get(String(event._id)) || {
        totalPlanned: 0, totalActual: 0, itemCount: 0, pendingPriceCount: 0, notDeliveredCount: 0,
      },
      guestSummary: guestsByEvent.get(String(event._id)) || { total: 0, confirmed: 0, declined: 0, pending: 0 },
    }));

    return res.json(withSummary);
  } catch (err) {
    console.error("listEvents error:", err);
    return res.status(500).json({ message: "Could not load events" });
  }
};

const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(id).populate("createdBy", "name role").lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const [itemTotals] = await EventItem.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: null,
          totalPlanned: { $sum: "$plannedCost" },
          totalActual: { $sum: { $cond: ["$priceKnown", "$actualCost", 0] } },
          itemCount: { $sum: 1 },
          pendingPriceCount: { $sum: { $cond: ["$priceKnown", 0, 1] } },
        },
      },
    ]);

    const guestCounts = await EventGuest.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: "$rsvpStatus", count: { $sum: 1 } } },
    ]);

    const guestSummary = { total: 0, confirmed: 0, declined: 0, pending: 0 };
    guestCounts.forEach((row) => {
      guestSummary[row._id] = row.count;
      guestSummary.total += row.count;
    });

    return res.json({
      ...event,
      itemSummary: itemTotals || { totalPlanned: 0, totalActual: 0, itemCount: 0, pendingPriceCount: 0 },
      guestSummary,
    });
  } catch (err) {
    console.error("getEvent error:", err);
    return res.status(500).json({ message: "Could not load event" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const { title, type, description, date, venue, budget, status } = req.body;

    if (typeof title === "string" && title.trim()) event.title = title.trim();
    if (typeof type === "string") event.type = type.trim();
    if (typeof description === "string") event.description = description.trim();
    if (date && !Number.isNaN(new Date(date).getTime())) event.date = new Date(date);
    if (typeof venue === "string") event.venue = venue.trim();
    if (budget !== undefined) event.budget = Number(budget) || 0;
    if (["planning", "confirmed", "ongoing", "completed", "cancelled"].includes(status)) event.status = status;

    await event.save();

    return res.json(event);
  } catch (err) {
    console.error("updateEvent error:", err);
    return res.status(500).json({ message: "Could not update event" });
  }
};

// Uploads/replaces the cover image. Mounted with uploadCoverImage
// middleware in front, so req.file is already on Cloudinary by the
// time this runs (multer-storage-cloudinary uploads during multer
// parsing — req.file.path is the URL, req.file.filename is the
// public_id).
const uploadCover = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid event ID" });
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.coverImagePublicId) {
      const { cloudinary } = require("../middleware/uploadEventFiles");
      cloudinary.uploader.destroy(event.coverImagePublicId).catch(() => {});
    }

    event.coverImageUrl = req.file.path;
    event.coverImagePublicId = req.file.filename;
    await event.save();

    return res.json(event);
  } catch (err) {
    console.error("uploadCover error:", err);
    return res.status(500).json({ message: "Could not upload cover image" });
  }
};

// Deleting an event cascades to its items (+ their bills on
// Cloudinary) and its guests.
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const items = await EventItem.find({ event: id }).select("billPublicId").lean();

    const { cloudinary } = require("../middleware/uploadEventFiles");

    await Promise.all(
      items.filter((item) => item.billPublicId).map((item) => cloudinary.uploader.destroy(item.billPublicId).catch(() => {}))
    );

    if (event.coverImagePublicId) {
      cloudinary.uploader.destroy(event.coverImagePublicId).catch(() => {});
    }

    await Promise.all([
      EventItem.deleteMany({ event: id }),
      EventGuest.deleteMany({ event: id }),
      Event.findByIdAndDelete(id),
    ]);

    return res.json({ success: true, message: "Event and all its items/guests deleted" });
  } catch (err) {
    console.error("deleteEvent error:", err);
    return res.status(500).json({ message: "Could not delete event" });
  }
};

module.exports = { createEvent, listEvents, getEvent, updateEvent, uploadCover, deleteEvent };