const multer = require("multer");
const { cloudinary } = require("../config/cloudinary");
const streamifier = require("streamifier");

// ==========================================================
// WHY A NEW MIDDLEWARE
// ==========================================================
// The old uploadTaskPhoto (multer-storage-cloudinary) only ever
// handled images. Documents and voice notes need different
// Cloudinary resource_types ("raw" for pdf/doc, "video" for
// audio — Cloudinary treats audio as a video resource type).
//
// So this middleware uses memory storage + manual
// upload_stream. This lets each route choose the correct
// Cloudinary resource_type.
// ==========================================================

const MAX_SIZES = {
  photo: 5 * 1024 * 1024, // 5MB
  document: 15 * 1024 * 1024, // 15MB
  voice: 10 * 1024 * 1024, // 10MB
};

const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const memoryUpload = (maxSize) =>
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSize,
    },
  });

const uploadToCloudinary = (
  buffer,
  { folder, resourceType, filenameHint }
) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,

        public_id: filenameHint
          ? filenameHint
              .replace(/\.[^/.]+$/, "")
              .slice(0, 80)
          : undefined,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );

    streamifier
      .createReadStream(buffer)
      .pipe(stream);
  });

// ==========================================================
// IMAGE
// ==========================================================

const uploadChatPhoto =
  memoryUpload(MAX_SIZES.photo).single("photo");

const persistChatPhoto = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return next();
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      {
        folder: "tasks/photos",
        resourceType: "image",
        filenameHint: req.file.originalname,
      }
    );

    req.uploadedFile = {
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
    };

    next();
  } catch (err) {
    console.error(
      "persistChatPhoto error:",
      err
    );

    return res.status(500).json({
      message: "Could not upload photo",
    });
  }
};

// ==========================================================
// DOCUMENT
// ==========================================================

const uploadChatDocument =
  memoryUpload(MAX_SIZES.document).single(
    "document"
  );

const persistChatDocument = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return next();
    }

    if (
      !ALLOWED_DOCUMENT_MIME.includes(
        req.file.mimetype
      )
    ) {
      return res.status(400).json({
        message:
          "Unsupported file type. PDF, Word, Excel, or text only.",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      {
        folder: "tasks/documents",
        resourceType: "raw",
        filenameHint: req.file.originalname,
      }
    );

    req.uploadedFile = {
      url: result.secure_url,
      publicId: result.public_id,
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
    };

    next();
  } catch (err) {
    console.error(
      "persistChatDocument error:",
      err
    );

    return res.status(500).json({
      message: "Could not upload document",
    });
  }
};

// ==========================================================
// VOICE NOTE
// ==========================================================

const uploadChatVoice =
  memoryUpload(MAX_SIZES.voice).single(
    "voice"
  );

const persistChatVoice = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      return next();
    }

    if (!req.file.mimetype.startsWith("audio/")) {
      return res.status(400).json({
        message:
          "Please record or select an audio file",
      });
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      {
        folder: "tasks/voice",

        // Cloudinary stores audio/video under
        // resource_type: "video"
        resourceType: "video",

        filenameHint:
          req.file.originalname ||
          `voice-${Date.now()}`,
      }
    );

    req.uploadedFile = {
      url: result.secure_url,
      publicId: result.public_id,
      name:
        req.file.originalname ||
        "Voice note",
      size: req.file.size,
      mime: req.file.mimetype,
      duration: Math.round(
        result.duration || 0
      ),
    };

    next();
  } catch (err) {
    console.error(
      "persistChatVoice error:",
      err
    );

    return res.status(500).json({
      message: "Could not upload voice note",
    });
  }
};

module.exports = {
  uploadChatPhoto,
  persistChatPhoto,

  uploadChatDocument,
  persistChatDocument,

  uploadChatVoice,
  persistChatVoice,
};