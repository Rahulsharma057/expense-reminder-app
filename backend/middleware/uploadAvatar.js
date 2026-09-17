const multer = require("multer");
const { cloudinary } = require("../config/cloudinary");
const streamifier = require("streamifier");

// 4MB maximum avatar size
const MAX_AVATAR_SIZE = 4 * 1024 * 1024;

// Receive image in memory first
const uploadAvatarFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
}).single("avatar");

// Upload image to Cloudinary
const persistAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No photo uploaded",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "users/avatars",
          resource_type: "image",

          transformation: [
            {
              width: 400,
              height: 400,
              crop: "fill",
              gravity: "face",
            },
            {
              quality: "auto",
              fetch_format: "auto",
            },
          ],
        },
        (err, uploadResult) => {
          if (err) {
            reject(err);
          } else {
            resolve(uploadResult);
          }
        }
      );

      streamifier
        .createReadStream(req.file.buffer)
        .pipe(stream);
    });

    req.uploadedAvatar = {
      url: result.secure_url,
      publicId: result.public_id,
    };

    next();
  } catch (err) {
    console.error("persistAvatar error:", err);

    return res.status(500).json({
      message: "Could not upload photo",
    });
  }
};

module.exports = {
  uploadAvatarFile,
  persistAvatar,
};