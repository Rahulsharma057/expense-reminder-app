const express = require("express");
const router = express.Router();

const {
  listNotifications,
  unreadCount,
  markOneRead,
  markAllRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", markOneRead);

module.exports = router;