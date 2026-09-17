const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const isSuperAdmin = (role) =>
  String(role || "").toLowerCase() === "superadmin";

const isOwner = (role) => String(role || "").toLowerCase() === "owner";

/*
=========================================================
CREATE USER
=========================================================
*/

const createUser = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;

  if (!name?.trim() || !username?.trim() || !password) {
    return res.status(400).json({
      message: "Name, username and password are all required.",
    });
  }

  if (password.length < 4) {
    return res.status(400).json({
      message: "Password must be at least 4 characters.",
    });
  }

  let newRole = "member";

  if (isSuperAdmin(req.user.role)) {
    if (role === "owner" || role === "member") {
      newRole = role;
    }
  }

  const normalizedUsername = username.trim().toLowerCase();

  const existing = await User.findOne({ username: normalizedUsername });

  if (existing) {
    return res.status(400).json({
      message: "That username is already taken.",
    });
  }

  const user = await User.create({
    name: name.trim(),
    username: normalizedUsername,
    password,
    role: newRole,
    createdBy: req.user._id,
    isActive: true,
  });

  return res.status(201).json(user.toSafeObject());
});

/*
=========================================================
LIST USERS
=========================================================
*/

const buildVisibilityFilter = (user) => {
  if (isSuperAdmin(user.role)) {
    return {};
  }

  if (isOwner(user.role)) {
    return {
      $or: [
        { _id: user._id },
        { createdBy: user._id },
        { role: "superadmin" },
      ],
    };
  }

  return {
    $or: [
      { _id: user._id },
      { _id: user.createdBy },
      { createdBy: user.createdBy },
      { role: "superadmin" },
    ],
  };
};

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(buildVisibilityFilter(req.user)).sort({
    role: 1,
    createdAt: -1,
  });

  return res.json(users.map((user) => user.toSafeObject()));
});

/*
=========================================================
GET SINGLE USER
=========================================================
*/

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    ...buildVisibilityFilter(req.user),
  });

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json(user.toSafeObject());
});

/*
=========================================================
UPDATE USER
=========================================================
*/

const updateUser = asyncHandler(async (req, res) => {
  const { name, username } = req.body;

  const query = isSuperAdmin(req.user.role)
    ? { _id: req.params.id }
    : {
        _id: req.params.id,
        $or: [{ _id: req.user._id }, { createdBy: req.user._id }],
      };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (
    !isSuperAdmin(req.user.role) &&
    user.role !== "member" &&
    user._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      message: "Cannot edit this account.",
    });
  }

  if (!name?.trim() || !username?.trim()) {
    return res.status(400).json({
      message: "Name and username are required.",
    });
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername !== user.username) {
    const existing = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: user._id },
    });

    if (existing) {
      return res.status(400).json({
        message: "That username is already taken.",
      });
    }
  }

  user.name = name.trim();
  user.username = normalizedUsername;

  await user.save();

  return res.json(user.toSafeObject());
});

/*
=========================================================
NEW: UPDATE MY OWN AVATAR
=========================================================

Self-service — any logged-in user (member, owner, superadmin) can set
their own profile photo. No role restriction, unlike the management
endpoints above; this only ever touches req.user's own document.
*/

const updateMyAvatar = asyncHandler(async (req, res) => {
  if (!req.uploadedAvatar) {
    return res.status(400).json({ message: "No photo uploaded" });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Clean up the old photo on Cloudinary so replacing an avatar
  // doesn't silently pile up orphaned files.
  if (user.avatarPublicId) {
    try {
      const cloudinary = require("../utils/cloudinary");
      const client = cloudinary.v2 || cloudinary;
      await client.uploader.destroy(user.avatarPublicId, { resource_type: "image" });
    } catch (err) {
      console.error("Old avatar cleanup failed:", err?.message);
    }
  }

  user.avatarUrl = req.uploadedAvatar.url;
  user.avatarPublicId = req.uploadedAvatar.publicId;

  await user.save();

  return res.json(user.toSafeObject());
});

/*
=========================================================
NEW: REMOVE MY OWN AVATAR
=========================================================
*/

const removeMyAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user.avatarPublicId) {
    try {
      const cloudinary = require("../utils/cloudinary");
      const client = cloudinary.v2 || cloudinary;
      await client.uploader.destroy(user.avatarPublicId, { resource_type: "image" });
    } catch (err) {
      console.error("Avatar cleanup failed:", err?.message);
    }
  }

  user.avatarUrl = "";
  user.avatarPublicId = "";

  await user.save();

  return res.json(user.toSafeObject());
});

/*
=========================================================
TOGGLE USER ACTIVE
=========================================================
*/

const toggleUserActive = asyncHandler(async (req, res) => {
  const query = isSuperAdmin(req.user.role)
    ? { _id: req.params.id }
    : { _id: req.params.id, createdBy: req.user._id };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (isSuperAdmin(user.role)) {
    return res.status(400).json({
      message: "Cannot deactivate a superadmin account.",
    });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({
      message: "You cannot deactivate your own account.",
    });
  }

  user.isActive = !user.isActive;

  await user.save();

  return res.json(user.toSafeObject());
});

/*
=========================================================
RESET PASSWORD
=========================================================
*/

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({
      message: "Password must be at least 4 characters.",
    });
  }

  const query = isSuperAdmin(req.user.role)
    ? { _id: req.params.id }
    : { _id: req.params.id, createdBy: req.user._id };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (isSuperAdmin(user.role) && !isSuperAdmin(req.user.role)) {
    return res.status(403).json({
      message: "Cannot reset a superadmin's password.",
    });
  }

  user.password = password;

  await user.save();

  return res.json({
    message: `Password reset for ${user.name}.`,
  });
});

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  updateMyAvatar,
  removeMyAvatar,
  toggleUserActive,
  resetPassword,
};