const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

module.exports = upload;
