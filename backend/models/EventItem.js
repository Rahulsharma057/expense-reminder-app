const mongoose = require("mongoose");

// One thing that needs to be arranged for an event — a caterer, a
// banner, return gifts, chairs, whatever. This is where "kitne ka
// decide tha aur kitne ka aaya" (planned vs actual cost) lives.

const CATEGORIES = [
  "Decoration", "Catering", "Gifts", "Stationery", "Logistics",
  "Entertainment", "Photography", "Venue", "Sound & Lighting", "Other",
];

const CHECKLIST_STATUSES = ["pending", "ordered", "purchased", "delivered", "setup-done", "cancelled"];

const eventItemSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: "Other" },

    vendor: { type: String, default: "", trim: true },
    vendorPhone: { type: String, default: "", trim: true },

    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "pcs", trim: true }, // pcs, kg, plates, hours, etc.

    // What was decided/quoted vs what it actually cost. actualCost
    // stays 0 until priceKnown flips true — that distinction matters:
    // "0 because free" and "0 because we don't know yet" are different.
    plannedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
    priceKnown: { type: Boolean, default: false },

    checklistStatus: { type: String, enum: CHECKLIST_STATUSES, default: "pending" },

    billUrl: { type: String, default: "" },
    billPublicId: { type: String, default: "" },

    remarks: { type: String, default: "", trim: true },

    // If true, adding this item also drops a copy into
    // EventItemTemplate so it's one click to reuse next time.
    savedAsTemplate: { type: Boolean, default: false },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

eventItemSchema.index({ event: 1, checklistStatus: 1 });

eventItemSchema.statics.CATEGORIES = CATEGORIES;
eventItemSchema.statics.CHECKLIST_STATUSES = CHECKLIST_STATUSES;

module.exports = mongoose.model("EventItem", eventItemSchema);