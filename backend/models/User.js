const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member",
    },

    /*
     * For member accounts this stores the owner
     * who created that member.
     */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
=========================================================
PASSWORD HASH
=========================================================
*/

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

/*
=========================================================
PASSWORD CHECK
=========================================================
*/

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/*
=========================================================
SAFE USER OBJECT
=========================================================

Never send password to frontend.
*/

userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    role: this.role,
    isActive: this.isActive,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);