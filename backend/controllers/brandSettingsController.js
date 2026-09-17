const BrandSettings = require("../models/BrandSettings");
const { cloudinary } = require("../config/cloudinary");
const { asyncHandler } = require("../middleware/errorHandler");

const getSettings = asyncHandler(async (req, res) => {
  const settings = await BrandSettings.findOne({ owner: req.user._id });
  res.json(settings || { orgName: "", logo: {}, signature: {}, signatoryName: "" });
});

const updateSettings = asyncHandler(async (req, res) => {
  const { orgName, signatoryName, removeLogo, removeSignature } = req.body;

  let settings = await BrandSettings.findOne({ owner: req.user._id });
  if (!settings) settings = new BrandSettings({ owner: req.user._id });

  if (orgName !== undefined) settings.orgName = orgName.trim();
  if (signatoryName !== undefined) settings.signatoryName = signatoryName.trim();

  const logoFile = req.files?.logo?.[0];
  const signatureFile = req.files?.signature?.[0];

  if (removeLogo === "true" && settings.logo?.publicId) {
    await cloudinary.uploader.destroy(settings.logo.publicId).catch(() => {});
    settings.logo = { url: "", publicId: "" };
  }
  if (logoFile) {
    if (settings.logo?.publicId) await cloudinary.uploader.destroy(settings.logo.publicId).catch(() => {});
    settings.logo = { url: logoFile.path, publicId: logoFile.filename };
  }

  if (removeSignature === "true" && settings.signature?.publicId) {
    await cloudinary.uploader.destroy(settings.signature.publicId).catch(() => {});
    settings.signature = { url: "", publicId: "" };
  }
  if (signatureFile) {
    if (settings.signature?.publicId) await cloudinary.uploader.destroy(settings.signature.publicId).catch(() => {});
    settings.signature = { url: signatureFile.path, publicId: signatureFile.filename };
  }

  await settings.save();
  res.json(settings);
});

module.exports = { getSettings, updateSettings };