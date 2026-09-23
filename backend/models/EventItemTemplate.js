const mongoose = require("mongoose");

// A saved item shape ("Return gifts — 200pcs from Sharma Gifts,
// usually ₹15,000") that any event can pull in with one click instead
// of retyping the same vendor/cost every time. Never linked live to
// the events it was used in — editing a template doesn't touch past
// items created from it.

const eventItemTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "Decoration", "Catering", "Gifts", "Stationery", "Logistics",
        "Entertainment", "Photography", "Venue", "Sound & Lighting", "Other",
      ],
      default: "Other",
    },
    vendor: { type: String, default: "", trim: true },
    vendorPhone: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 1 },
    unit: { type: String, default: "pcs", trim: true },
    plannedCost: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

eventItemTemplateSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("EventItemTemplate", eventItemTemplateSchema);