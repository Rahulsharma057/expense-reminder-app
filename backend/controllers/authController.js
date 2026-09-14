const jwt = require("jsonwebtoken");

const User = require("../models/User");

const { asyncHandler } = require("../middleware/errorHandler");

/*
=========================================================
CREATE JWT
=========================================================
*/

const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

/*
=========================================================
LOGIN
=========================================================
*/

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  /*
  -------------------------------------------------------
  VALIDATION
  -------------------------------------------------------
  */

  if (!username?.trim() || !password) {
    return res.status(400).json({
      message: "Username and password are required.",
    });
  }

  const normalizedUsername = username.trim().toLowerCase();

  /*
  -------------------------------------------------------
  FIND USER
  -------------------------------------------------------
  */

  const user = await User.findOne({
    username: normalizedUsername,
  });

  /*
  -------------------------------------------------------
  INVALID / INACTIVE USER
  -------------------------------------------------------
  */

  if (!user || !user.isActive) {
    return res.status(401).json({
      message: "Invalid username or password.",
    });
  }

  /*
  -------------------------------------------------------
  CHECK PASSWORD
  -------------------------------------------------------
  */

  const match = await user.comparePassword(password);

  if (!match) {
    return res.status(401).json({
      message: "Invalid username or password.",
    });
  }

  /*
  -------------------------------------------------------
  LOGIN SUCCESS
  -------------------------------------------------------
  */

  return res.json({
    token: signToken(user),

    user: user.toSafeObject(),
  });
});

/*
=========================================================
GET CURRENT USER
=========================================================

GET /api/auth/me

This endpoint returns ONLY the currently authenticated
user because req.user is created by the protect middleware.
*/

const getMe = asyncHandler(async (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  return res.json({
    user: req.user.toSafeObject(),
  });
});

module.exports = {
  login,
  getMe,
};