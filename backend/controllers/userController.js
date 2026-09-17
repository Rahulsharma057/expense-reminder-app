const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");
const { cloudinary } = require("../utils/cloudinary");

/*
|--------------------------------------------------------------------------
| ROLE HELPERS
|--------------------------------------------------------------------------
*/

const normalizeRole = (role) =>
  String(role || "").trim().toLowerCase();

const isSuperAdmin = (role) =>
  normalizeRole(role) === "superadmin";

const isOwner = (role) =>
  normalizeRole(role) === "owner";

/*
|--------------------------------------------------------------------------
| CREATE USER
|--------------------------------------------------------------------------
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

  /*
  |--------------------------------------------------------------------------
  | Default role
  |--------------------------------------------------------------------------
  */

  let newRole = "member";

  /*
  |--------------------------------------------------------------------------
  | Only SuperAdmin can create Owner
  |--------------------------------------------------------------------------
  */

  if (isSuperAdmin(req.user.role)) {
    const requestedRole = normalizeRole(role);

    if (requestedRole === "owner") {
      newRole = "owner";
    } else {
      newRole = "member";
    }
  }

  const normalizedUsername = username
    .trim()
    .toLowerCase();

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
    role: newRole,
    createdBy: req.user._id,
    isActive: true,
  });

  return res.status(201).json(user.toSafeObject());
});

/*
|--------------------------------------------------------------------------
| USER VISIBILITY
|--------------------------------------------------------------------------
*/

const buildVisibilityFilter = (user) => {
  const role = normalizeRole(user.role);

  /*
  |--------------------------------------------------------------------------
  | SuperAdmin
  |--------------------------------------------------------------------------
  */

  if (role === "superadmin") {
    return {};
  }

  /*
  |--------------------------------------------------------------------------
  | Owner
  |--------------------------------------------------------------------------
  |
  | Owner can see:
  | - Himself
  | - Users created by him
  | - SuperAdmin
  |--------------------------------------------------------------------------
  */

  if (role === "owner") {
    return {
      $or: [
        { _id: user._id },
        { createdBy: user._id },
        { role: "superadmin" },
      ],
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Member
  |--------------------------------------------------------------------------
  |
  | Member can see:
  | - Himself
  | - His creator
  | - Users created by his creator
  | - SuperAdmin
  |--------------------------------------------------------------------------
  */

  return {
    $or: [
      { _id: user._id },
      { _id: user.createdBy },
      { createdBy: user.createdBy },
      { role: "superadmin" },
    ],
  };
};

/*
|--------------------------------------------------------------------------
| LIST USERS
|--------------------------------------------------------------------------
*/

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find(
    buildVisibilityFilter(req.user)
  ).sort({
    role: 1,
    createdAt: -1,
  });

  return res.json(
    users.map((user) => user.toSafeObject())
  );
});

/*
|--------------------------------------------------------------------------
| GET SINGLE USER
|--------------------------------------------------------------------------
*/

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    ...buildVisibilityFilter(req.user),
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  return res.json(user.toSafeObject());
});

/*
|--------------------------------------------------------------------------
| UPDATE USER
|--------------------------------------------------------------------------
*/

const updateUser = asyncHandler(async (req, res) => {
  const { name, username } = req.body;

  if (!name?.trim() || !username?.trim()) {
    return res.status(400).json({
      message: "Name and username are required.",
    });
  }

  const currentUserRole = normalizeRole(req.user.role);

  /*
  |--------------------------------------------------------------------------
  | SuperAdmin can update anyone
  |--------------------------------------------------------------------------
  */

  const query =
    currentUserRole === "superadmin"
      ? {
          _id: req.params.id,
        }
      : {
          _id: req.params.id,
          $or: [
            {
              _id: req.user._id,
            },
            {
              createdBy: req.user._id,
            },
          ],
        };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Owner/Member restrictions
  |--------------------------------------------------------------------------
  */

  if (
    currentUserRole !== "superadmin" &&
    normalizeRole(user.role) !== "member" &&
    user._id.toString() !== req.user._id.toString()
  ) {
    return res.status(403).json({
      message: "Cannot edit this account.",
    });
  }

  const normalizedUsername = username
    .trim()
    .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Username uniqueness
  |--------------------------------------------------------------------------
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
|--------------------------------------------------------------------------
| UPDATE MY AVATAR
|--------------------------------------------------------------------------
|
| Any logged-in user can update their own avatar.
|
*/

const updateMyAvatar = asyncHandler(async (req, res) => {
  if (!req.uploadedAvatar) {
    return res.status(400).json({
      message: "No photo uploaded.",
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Delete old avatar from Cloudinary
  |--------------------------------------------------------------------------
  */

  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(
        user.avatarPublicId,
        {
          resource_type: "image",
        }
      );
    } catch (error) {
      console.error(
        "Old avatar cleanup failed:",
        error?.message
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Save new avatar
  |--------------------------------------------------------------------------
  */

  user.avatarUrl = req.uploadedAvatar.url;
  user.avatarPublicId =
    req.uploadedAvatar.publicId;

  await user.save();

  return res.json(user.toSafeObject());
});

/*
|--------------------------------------------------------------------------
| REMOVE MY AVATAR
|--------------------------------------------------------------------------
*/

const removeMyAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Delete from Cloudinary
  |--------------------------------------------------------------------------
  */

  if (user.avatarPublicId) {
    try {
      await cloudinary.uploader.destroy(
        user.avatarPublicId,
        {
          resource_type: "image",
        }
      );
    } catch (error) {
      console.error(
        "Avatar cleanup failed:",
        error?.message
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Remove avatar from database
  |--------------------------------------------------------------------------
  */

  user.avatarUrl = "";
  user.avatarPublicId = "";

  await user.save();

  return res.json(user.toSafeObject());
});

/*
|--------------------------------------------------------------------------
| TOGGLE USER ACTIVE
|--------------------------------------------------------------------------
*/

const toggleUserActive = asyncHandler(async (req, res) => {
  const currentUserRole = normalizeRole(
    req.user.role
  );

  const query =
    currentUserRole === "superadmin"
      ? {
          _id: req.params.id,
        }
      : {
          _id: req.params.id,
          createdBy: req.user._id,
        };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | SuperAdmin cannot be deactivated
  |--------------------------------------------------------------------------
  */

  if (isSuperAdmin(user.role)) {
    return res.status(400).json({
      message:
        "Cannot deactivate a superadmin account.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Cannot deactivate yourself
  |--------------------------------------------------------------------------
  */

  if (
    user._id.toString() ===
    req.user._id.toString()
  ) {
    return res.status(400).json({
      message:
        "You cannot deactivate your own account.",
    });
  }

  user.isActive = !user.isActive;

  await user.save();

  return res.json(user.toSafeObject());
});

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({
      message: "Password must be at least 4 characters.",
    });
  }

  const currentUserRole = normalizeRole(
    req.user.role
  );

  const query =
    currentUserRole === "superadmin"
      ? {
          _id: req.params.id,
        }
      : {
          _id: req.params.id,
          createdBy: req.user._id,
        };

  const user = await User.findOne(query);

  if (!user) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Only SuperAdmin can reset SuperAdmin password
  |--------------------------------------------------------------------------
  */

  if (
    isSuperAdmin(user.role) &&
    !isSuperAdmin(req.user.role)
  ) {
    return res.status(403).json({
      message:
        "Cannot reset a superadmin's password.",
    });
  }

  user.password = password;

  await user.save();

  return res.json({
    message: `Password reset for ${user.name}.`,
  });
});

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

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