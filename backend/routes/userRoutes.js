const express = require("express");
const router = express.Router();
const {
  createUser,
  listUsers,
  getUser,
  updateUser,
  toggleUserActive,
  resetPassword,
} = require("../controllers/userController");
const { protect, requireOwner } = require("../middleware/auth");

router.use(protect);

router.get("/", listUsers);
router.post("/", requireOwner, createUser);

router.get("/:id", requireOwner, getUser);
router.patch("/:id", requireOwner, updateUser);
router.patch("/:id/toggle-active", requireOwner, toggleUserActive);
router.patch("/:id/reset-password", requireOwner, resetPassword);

module.exports = router;