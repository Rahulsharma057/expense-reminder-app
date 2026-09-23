const mongoose = require("mongoose");
const EventGuest = require("../models/EventGuest");
const Event = require("../models/Event");

const addGuest = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(eventId).select("_id").lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const { name, phone, email, category, plusOnes, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Guest name is required" });

    const guest = await EventGuest.create({
      event: eventId,
      name: name.trim(),
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      category: ["VIP", "Staff", "External", "Family", "Vendor", "Other"].includes(category) ? category : "Staff",
      plusOnes: Number(plusOnes) || 0,
      notes: notes?.trim() || "",
      addedBy: req.user._id,
    });

    return res.status(201).json(guest);
  } catch (err) {
    console.error("addGuest error:", err);
    return res.status(500).json({ message: "Could not add guest" });
  }
};

// Paste a list — one guest per line, optionally "Name, Phone" — and
// add them all in one go. Real invite lists rarely get typed field by
// field.
const addGuestsBulk = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { text, category } = req.body;

    if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    const event = await Event.findById(eventId).select("_id").lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (!text?.trim()) return res.status(400).json({ message: "Paste at least one guest" });

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);

    const docs = lines.map((line) => {
      const [namePart, phonePart] = line.split(",").map((part) => part.trim());
      return {
        event: eventId,
        name: namePart || line,
        phone: phonePart || "",
        category: ["VIP", "Staff", "External", "Family", "Vendor", "Other"].includes(category) ? category : "Staff",
        addedBy: req.user._id,
      };
    });

    const created = await EventGuest.insertMany(docs);

    return res.status(201).json({ count: created.length, guests: created });
  } catch (err) {
    console.error("addGuestsBulk error:", err);
    return res.status(500).json({ message: "Could not add guests" });
  }
};

const listGuests = async (req, res) => {
  try {
    const { id: eventId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) return res.status(400).json({ message: "Invalid event ID" });

    const filter = { event: eventId };
    if (req.query.status) filter.rsvpStatus = req.query.status;

    const guests = await EventGuest.find(filter).sort({ createdAt: -1 }).lean();
    return res.json(guests);
  } catch (err) {
    console.error("listGuests error:", err);
    return res.status(500).json({ message: "Could not load guests" });
  }
};

const updateGuest = async (req, res) => {
  try {
    const { id: eventId, guestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const guest = await EventGuest.findOne({ _id: guestId, event: eventId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const { name, phone, email, category, plusOnes, notes, rsvpStatus } = req.body;

    if (typeof name === "string" && name.trim()) guest.name = name.trim();
    if (typeof phone === "string") guest.phone = phone.trim();
    if (typeof email === "string") guest.email = email.trim();
    if (["VIP", "Staff", "External", "Family", "Vendor", "Other"].includes(category)) guest.category = category;
    if (plusOnes !== undefined) guest.plusOnes = Number(plusOnes) || 0;
    if (typeof notes === "string") guest.notes = notes.trim();

    if (["pending", "confirmed", "declined"].includes(rsvpStatus)) {
      guest.rsvpStatus = rsvpStatus;
      guest.rsvpAt = rsvpStatus === "pending" ? null : new Date();
    }

    await guest.save();

    return res.json(guest);
  } catch (err) {
    console.error("updateGuest error:", err);
    return res.status(500).json({ message: "Could not update guest" });
  }
};

const deleteGuest = async (req, res) => {
  try {
    const { id: eventId, guestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const guest = await EventGuest.findOneAndDelete({ _id: guestId, event: eventId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteGuest error:", err);
    return res.status(500).json({ message: "Could not delete guest" });
  }
};

// Marks the invite as sent. Doesn't actually send anything itself —
// no SMS/email service is assumed — the frontend builds a WhatsApp
// link with this guest's rsvpToken baked in and opens it; this
// endpoint just records that it happened.
const markInvitationSent = async (req, res) => {
  try {
    const { id: eventId, guestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const guest = await EventGuest.findOneAndUpdate(
      { _id: guestId, event: eventId },
      { $set: { invitationSent: true, invitationSentAt: new Date() } },
      { new: true }
    );

    if (!guest) return res.status(404).json({ message: "Guest not found" });

    return res.json(guest);
  } catch (err) {
    console.error("markInvitationSent error:", err);
    return res.status(500).json({ message: "Could not update invitation status" });
  }
};

// ==========================================================
// PUBLIC RSVP — no login. The link texted/WhatsApped to the guest
// (built by the frontend from rsvpToken) hits this directly.
// GET /api/events/public/:eventId/guests/:guestId/rsvp?token=&response=yes|no
// ==========================================================

const rsvpPage = (title, message, isError = false) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: linear-gradient(180deg,#FAF9FF,#fff); margin:0; padding:0; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .card { background:#fff; border-radius:20px; padding:32px 28px; max-width:380px; text-align:center; box-shadow:0 10px 40px rgba(76,29,149,0.12); margin:16px; }
  .icon { font-size:44px; margin-bottom:12px; }
  h1 { font-size:19px; color:${isError ? "#B42318" : "#171225"}; margin:0 0 8px; }
  p { font-size:14px; color:#77728A; line-height:1.5; margin:0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? "⚠️" : "🎉"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

const publicRsvp = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const { token, response } = req.query;

    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(guestId)) {
      return res.status(400).send(rsvpPage("Invalid link", "This RSVP link looks broken.", true));
    }

    if (!["yes", "no"].includes(response)) {
      return res.status(400).send(rsvpPage("Invalid link", "This RSVP link is missing a response.", true));
    }

    const [event, guest] = await Promise.all([
      Event.findById(eventId).lean(),
      EventGuest.findOne({ _id: guestId, event: eventId }),
    ]);

    if (!event || !guest) {
      return res.status(404).send(rsvpPage("Not found", "We couldn't find this invitation.", true));
    }

    if (guest.rsvpToken !== token) {
      return res.status(403).send(rsvpPage("Invalid link", "This RSVP link is not valid.", true));
    }

    guest.rsvpStatus = response === "yes" ? "confirmed" : "declined";
    guest.rsvpAt = new Date();
    await guest.save();

    const { getIO } = require("../utils/socket");
    const io = getIO();
    if (io) {
      io.to(String(event.createdBy)).emit("notification", {
        type: "EVENT_RSVP",
        title: response === "yes" ? "Guest Confirmed" : "Guest Declined",
        message: `${guest.name} ${response === "yes" ? "confirmed" : "declined"} for "${event.title}".`,
        createdAt: new Date(),
      });
    }

    return res.send(
      response === "yes"
        ? rsvpPage("You're in! 🎉", `Thanks ${guest.name}! We've marked you as attending "${event.title}". See you there.`)
        : rsvpPage("Got it", `Thanks for letting us know, ${guest.name}. We'll miss you at "${event.title}"!`)
    );
  } catch (err) {
    console.error("publicRsvp error:", err);
    return res.status(500).send(rsvpPage("Something went wrong", "Please try again or contact the organiser directly.", true));
  }
};

module.exports = {
  addGuest, addGuestsBulk, listGuests, updateGuest, deleteGuest,
  markInvitationSent, publicRsvp,
};