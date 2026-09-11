const express = require("express");
const router = express.Router();
const {
  createReminder, listReminders, updateReminderStatus, addReminderUpdate, deleteReminder,
} = require("../controllers/reminderController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", listReminders);
router.post("/", createReminder);
router.patch("/:id/status", updateReminderStatus);
router.post("/:id/updates", addReminderUpdate);
router.delete("/:id", deleteReminder);

module.exports = router;
