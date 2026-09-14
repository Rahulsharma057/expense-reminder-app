const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

// --- existing: bill/receipt photo uploads (unchanged) ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/bills",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1200, height: 1200, crop: "limit" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// --- new: task chat photo uploads ---
const taskPhotoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "expense-reminder/task-chat",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
});

const uploadTaskPhoto = multer({
  storage: taskPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per photo
});

// Default export stays the bills uploader (unchanged for existing callers).
// uploadTaskPhoto is attached as a named property for the task chat routes.
module.exports = upload;
module.exports.uploadTaskPhoto = uploadTaskPhoto;