const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// Owner creates a login (id/password) for someone else, so that person
// can log in and post updates on tasks assigned to them.
const createUser = asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;

  if (!name?.trim() || !username?.trim() || !password) {
    return res.status(400).json({ message: "Name, username and password are all required." });
  }
  if (password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters." });
  }

  const existing = await User.findOne({ username: username.trim().toLowerCase() });
  if (existing) {
    return res.status(400).json({ message: "That username is already taken." });
  }

  const user = await User.create({
    name: name.trim(),
    username: username.trim().toLowerCase(),
    password,
    role: "member",
    createdBy: req.user._id,
  });

  res.status(201).json(user.toSafeObject());
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });
  res.json(users.map((u) => u.toSafeObject()));
});

// View a single user's details (owner only).
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json(user.toSafeObject());
});

// Edit a user's name/username (owner only). The owner account itself
// can only be edited by the owner acting on their own profile.
const updateUser = asyncHandler(async (req, res) => {
  const { name, username } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  if (user.role === "owner" && req.user._id.toString() !== user._id.toString()) {
    return res.status(400).json({ message: "Cannot edit the owner account." });
  }

  if (!name?.trim() || !username?.trim()) {
    return res.status(400).json({ message: "Name and username are required." });
  }

  const normalizedUsername = username.trim().toLowerCase();

  if (normalizedUsername !== user.username) {
    const existing = await User.findOne({
      username: normalizedUsername,
      _id: { $ne: user._id },
    });
    if (existing) {
      return res.status(400).json({ message: "That username is already taken." });
    }
  }

  user.name = name.trim();
  user.username = normalizedUsername;
  await user.save();

  res.json(user.toSafeObject());
});

const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  if (user.role === "owner") {
    return res.status(400).json({ message: "Cannot deactivate the owner account." });
  }
  user.isActive = !user.isActive;
  await user.save();
  res.json(user.toSafeObject());
});

// Owner sets a new password for a member (e.g. member forgot it).
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ message: "Password must be at least 4 characters." });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  if (user.role === "owner") {
    return res.status(400).json({ message: "Cannot reset the owner's password here." });
  }

  user.password = password; // pre-save hook on the User model hashes this
  await user.save();

  res.json({ message: `Password reset for ${user.name}.` });
});

module.exports = {
  createUser,
  listUsers,
  getUser,
  updateUser,
  toggleUserActive,
  resetPassword,
};