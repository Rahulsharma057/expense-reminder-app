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
      enum: ["superadmin", "owner", "member"],
      default: "member",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // NEW: profile photo. Cloudinary URL + public_id so it can be
    // replaced/removed cleanly (same pattern as chat photo messages).
    avatarUrl: {
      type: String,
      default: "",
    },

    avatarPublicId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

/* ====================== PASSWORD HASH ====================== */

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 10);

  next();
});

/* ====================== PASSWORD CHECK ===================== */

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

/* ====================== SAFE OBJECT ======================== */

userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    role: this.role,
    isActive: this.isActive,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    // NEW
    avatarUrl: this.avatarUrl || "",
  };
};

module.exports = mongoose.model("User", userSchema);