const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const uploadResumeFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
}).single("resume");

const persistResume = async (req, res, next) => {
  try {
    if (!req.file) return next();

    if (!ALLOWED_MIME.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: "Resume must be a PDF or Word document",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "recruitment/resumes",
          resource_type: "raw",
          public_id: req.file.originalname
            .replace(/\.[^/.]+$/, "")
            .slice(0, 80),
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

    req.uploadedResume = {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
    };

    next();
  } catch (err) {
    console.error("persistResume error:", err);

    return res.status(500).json({
      message: "Could not upload resume",
    });
  }
};

module.exports = {
  uploadResumeFile,
  persistResume,
};