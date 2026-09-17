const mongoose = require("mongoose");

const attendeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    isExternal: { type: Boolean, default: true }, // true = outsider, false = internal team member
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: true }
);

const arrangementSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true }, // e.g. "Lunch for 10 people"
    category: { type: String, enum: ["Food", "Logistics", "Stationery", "Travel", "Other"], default: "Other" },
    cost: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["Pending", "Arranged"], default: "Pending" },
  },
  { _id: true }
);

const rescheduleEntrySchema = new mongoose.Schema(
  {
    previousDateTime: { type: Date, required: true },
    reason: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" }, // agenda
    type: { type: String, enum: ["Appointment", "Meeting", "Meeting with Food"], default: "Appointment" },

    dateTime: { type: Date, required: true },
    duration: { type: Number, default: 30 }, // minutes
    location: { type: String, default: "", trim: true },

    attendees: [attendeeSchema],
    arrangements: [arrangementSchema],
    notes: { type: String, default: "" },

    photos: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],

    status: { type: String, enum: ["Scheduled", "Rescheduled", "Completed", "Cancelled"], default: "Scheduled" },
    rescheduleHistory: [rescheduleEntrySchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

appointmentSchema.index({ dateTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ title: "text" });

module.exports = mongoose.model("Appointment", appointmentSchema);