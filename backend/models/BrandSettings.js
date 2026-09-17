const mongoose = require("mongoose");

const brandSettingsSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    orgName: { type: String, default: "", trim: true },
    logo: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    signature: { url: { type: String, default: "" }, publicId: { type: String, default: "" } },
    signatoryName: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandSettings", brandSettingsSchema);