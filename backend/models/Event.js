const mongoose = require("mongoose");

// An office function, party, celebration, or any organised event.
// Items (models/EventItem.js) and guests (models/EventGuest.js) both
// point back to one of these.

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // Free text on purpose — "Diwali Party", "Annual Day", "Team
    // Outing", "Product Launch", whatever it actually is. A fixed
    // enum would fight real usage.
    type: { type: String, default: "", trim: true },

    description: { type: String, default: "", trim: true },

    date: { type: Date, required: true },
    venue: { type: String, default: "", trim: true },

    // Overall planned spend for the whole event. Per-item planned
    // costs (models/EventItem.js) don't have to add up to exactly
    // this — it's the ceiling you're aiming to stay under.
    budget: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["planning", "confirmed", "ongoing", "completed", "cancelled"],
      default: "planning",
    },

    coverImageUrl: { type: String, default: "" },
    coverImagePublicId: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

eventSchema.index({ date: 1, status: 1 });
eventSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model("Event", eventSchema);