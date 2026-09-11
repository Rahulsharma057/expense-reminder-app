const express = require("express");
const router = express.Router();
const { createUser, listUsers, toggleUserActive } = require("../controllers/userController");
const { protect, requireOwner } = require("../middleware/auth");

router.use(protect);
router.get("/", listUsers);
router.post("/", requireOwner, createUser);
router.patch("/:id/toggle-active", requireOwner, toggleUserActive);

module.exports = router;
