const express = require("express");
const router = express.Router();

const {
  createEvent, listEvents, getEvent, updateEvent, uploadCover, deleteEvent,
} = require("../controllers/eventController");

const {
  addItem, addItemFromTemplate, listItems, updateItem, deleteItem,
} = require("../controllers/eventItemController");

const {
  addGuest, addGuestsBulk, listGuests, updateGuest, deleteGuest,
  markInvitationSent, publicRsvp,
} = require("../controllers/eventGuestController");

const { protect } = require("../middleware/auth");
const { uploadItemBill, uploadCoverImage } = require("../middleware/uploadEventFiles");

// PUBLIC — no auth. The guest taps this straight from a WhatsApp
// message; they never log in. Must be registered before
// `router.use(protect)` below.
router.get("/public/:eventId/guests/:guestId/rsvp", publicRsvp);

router.use(protect);

// -------------------- EVENTS --------------------

router.post("/", createEvent);
router.get("/", listEvents);
router.get("/:id", getEvent);
router.patch("/:id", updateEvent);
router.post("/:id/cover", uploadCoverImage, uploadCover);
router.delete("/:id", deleteEvent);

// -------------------- ITEMS --------------------

router.get("/:id/items", listItems);
router.post("/:id/items", uploadItemBill, addItem);
router.post("/:id/items/from-template/:templateId", addItemFromTemplate);
router.patch("/:id/items/:itemId", uploadItemBill, updateItem);
router.delete("/:id/items/:itemId", deleteItem);

// -------------------- GUESTS --------------------

router.get("/:id/guests", listGuests);
router.post("/:id/guests", addGuest);
router.post("/:id/guests/bulk", addGuestsBulk);
router.patch("/:id/guests/:guestId", updateGuest);
router.delete("/:id/guests/:guestId", deleteGuest);
router.patch("/:id/guests/:guestId/invite-sent", markInvitationSent);

module.exports = router;