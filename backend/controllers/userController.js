const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const isSuperAdmin = (role) =>
  String(role || "").toLowerCase() === "superadmin";

const isOwner = (role) => String(role || "").toLowerCase() === "owner";

/*
=========================================================
CREATE USER
=========================================================

- superadmin can create owners and members
- owner can create members only
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
    // Superadmin may hand out owner accounts. Creating another
    // superadmin is deliberately not allowed through the API.
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

Everyone can call this now, because anyone can assign a task.
What comes back is scoped by role:

- superadmin  : every user
- owner       : self + members they created + superadmin
- member      : self + their owner + fellow members under that
                owner + superadmin

The superadmin is always included, which is what makes
"anyone can message the superadmin" work — a member just
creates an INDIVIDUAL task assigned to them, and that task's
chat becomes the conversation.
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

  // member
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

- superadmin can edit anyone
- owner can edit their own account + members they created
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

  // An owner can only edit their OWN owner account, not another owner's.
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

  // The User model pre-save hook hashes it.
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
  toggleUserActive,
  resetPassword,
};