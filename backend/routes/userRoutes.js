const express = require("express");

const router = express.Router();

const {
  createUser,
  listUsers,
  getUser,
  updateUser,
  updateMyAvatar,
  removeMyAvatar,
  toggleUserActive,
  resetPassword,
} = require("../controllers/userController");

const { protect, requireOwner } = require("../middleware/auth");
const { uploadAvatarFile, persistAvatar } = require("../middleware/uploadAvatar");

router.use(protect);

/*
=========================================================
USER LIST — open to all authenticated users, scoped by role
in the controller.
=========================================================
*/
router.get("/", listUsers);

/*
=========================================================
NEW: SELF-SERVICE AVATAR
Must come before "/:id" routes below so "me" is never matched
as an :id param.
=========================================================
*/
router.patch("/me/avatar", uploadAvatarFile, persistAvatar, updateMyAvatar);
router.delete("/me/avatar", removeMyAvatar);

/*
=========================================================
USER MANAGEMENT — OWNER / SUPERADMIN
=========================================================
*/

router.post("/", requireOwner, createUser);

router.get("/:id", requireOwner, getUser);

router.patch("/:id", requireOwner, updateUser);

router.patch("/:id/toggle-active", requireOwner, toggleUserActive);

router.patch("/:id/reset-password", requireOwner, resetPassword);

module.exports = router;