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

module.exports = { createUser, listUsers, toggleUserActive };
