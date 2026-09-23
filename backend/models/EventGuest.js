const mongoose = require("mongoose");
const crypto = require("crypto");

// A person invited to the event. Like recruitment candidates, guests
// are NOT system users — they never log in, so RSVP happens through a
// public token link (see controllers/eventGuestController.js).

const eventGuestSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },

    category: {
      type: String,
      enum: ["VIP", "Staff", "External", "Family", "Vendor", "Other"],
      default: "Staff",
    },

    // How many people they're bringing along, beyond themselves.
    plusOnes: { type: Number, default: 0 },

    invitationSent: { type: Boolean, default: false },
    invitationSentAt: { type: Date, default: null },

    rsvpStatus: { type: String, enum: ["pending", "confirmed", "declined"], default: "pending" },
    rsvpAt: { type: Date, default: null },
    rsvpToken: { type: String, default: () => crypto.randomBytes(16).toString("hex") },

    notes: { type: String, default: "", trim: true },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

eventGuestSchema.index({ event: 1, rsvpStatus: 1 });

module.exports = mongoose.model("EventGuest", eventGuestSchema);