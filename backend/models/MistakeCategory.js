const mongoose = require("mongoose");

const mistakeCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameLower: { type: String, required: true },
    color: { type: String, default: "#8B5CF6" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

mistakeCategorySchema.index({ createdBy: 1, nameLower: 1 }, { unique: true });

mistakeCategorySchema.pre("validate", function (next) {
  if (this.name) this.nameLower = this.name.trim().toLowerCase();
  next();
});

module.exports = mongoose.model("MistakeCategory", mistakeCategorySchema);