const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

/*
=========================================================
CREATE USER
=========================================================

Only owner can create members.

The created member is linked with:
createdBy = logged-in owner
*/

const createUser = asyncHandler(async (req, res) => {
  const { name, username, password } = req.body;

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

  const normalizedUsername = username.trim().toLowerCase();

  const existing = await User.findOne({
    username: normalizedUsername,
  });

  if (existing) {
    return res.status(400).json({
      message: "That username is already taken.",
    });
  }

  const user = await User.create({
    name: name.trim(),
    username: normalizedUsername,
    password,
    role: "member",
    createdBy: req.user._id,
    isActive: true,
  });

  return res.status(201).json(user.toSafeObject());
});

/*
=========================================================
LIST USERS
=========================================================

IMPORTANT:

Owner should see:
1. Own account
2. Members created by this owner

NOT every user in database.
*/

const listUsers = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const users = await User.find({
    $or: [
      {
        _id: ownerId,
      },
      {
        createdBy: ownerId,
      },
    ],
  }).sort({
    createdAt: -1,
  });

  return res.json(
    users.map((user) => user.toSafeObject())
  );
});

/*
=========================================================
GET SINGLE USER
=========================================================

Owner can only access:
- their own profile
- users created by them
*/

const getUser = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const user = await User.findOne({
    _id: req.params.id,

    $or: [
      {
        _id: ownerId,
      },
      {
        createdBy: ownerId,
      },
    ],
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  return res.json(user.toSafeObject());
});

/*
=========================================================
UPDATE USER
=========================================================

Owner can edit:
- own account
- members created by them

Owner cannot edit another unrelated owner.
*/

const updateUser = asyncHandler(async (req, res) => {
  const { name, username } = req.body;

  const ownerId = req.user._id;

  const user = await User.findOne({
    _id: req.params.id,

    $or: [
      {
        _id: ownerId,
      },
      {
        createdBy: ownerId,
      },
    ],
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
   * An owner can only edit their own owner account.
   */
  if (
    user.role === "owner" &&
    user._id.toString() !== ownerId.toString()
  ) {
    return res.status(403).json({
      message: "Cannot edit another owner account.",
    });
  }

  if (!name?.trim() || !username?.trim()) {
    return res.status(400).json({
      message: "Name and username are required.",
    });
  }

  const normalizedUsername = username.trim().toLowerCase();

  /*
   * Check duplicate username.
   */
  if (normalizedUsername !== user.username) {
    const existing = await User.findOne({
      username: normalizedUsername,
      _id: {
        $ne: user._id,
      },
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

Owner can activate/deactivate only:
- members created by this owner

Owner cannot deactivate owner account.
*/

const toggleUserActive = asyncHandler(async (req, res) => {
  const ownerId = req.user._id;

  const user = await User.findOne({
    _id: req.params.id,

    createdBy: ownerId,
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  if (user.role === "owner") {
    return res.status(400).json({
      message: "Cannot deactivate the owner account.",
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

Owner can reset password only for:
members created by this owner.
*/

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({
      message: "Password must be at least 4 characters.",
    });
  }

  const ownerId = req.user._id;

  const user = await User.findOne({
    _id: req.params.id,
    createdBy: ownerId,
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  if (user.role === "owner") {
    return res.status(400).json({
      message: "Cannot reset the owner's password here.",
    });
  }

  user.password = password;

  /*
   * User model pre-save hook will hash it.
   */
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