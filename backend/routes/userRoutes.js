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

/*
=========================================================
USER LIST
=========================================================

CHANGED: this is no longer owner-only.

Anyone can assign a task now, so every logged-in user needs to be
able to see who they're allowed to assign to. The controller scopes
the result by role (see buildVisibilityFilter), so a member still
can't enumerate the whole database — they only see their own org
plus the superadmin.
*/
router.get("/", listUsers);

/*
=========================================================
USER MANAGEMENT — OWNER / SUPERADMIN
=========================================================

NOTE: requireOwner must allow role === "superadmin" too. If your
middleware currently checks `req.user.role === "owner"` exactly,
change it to allow both, e.g.:

  const allowed = ["owner", "superadmin"];
  if (!allowed.includes(req.user.role)) return res.status(403)...
*/

router.post("/", requireOwner, createUser);

router.get("/:id", requireOwner, getUser);

router.patch("/:id", requireOwner, updateUser);

router.patch("/:id/toggle-active", requireOwner, toggleUserActive);

router.patch("/:id/reset-password", requireOwner, resetPassword);

module.exports = router;