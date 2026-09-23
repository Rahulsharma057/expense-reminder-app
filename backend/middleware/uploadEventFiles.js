const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Same setup style as your expense-bills upload config — just two more
// folders for this module. If cloudinary.config(...) is already called
// elsewhere in the app (it almost certainly is, for expense-bills),
// calling it again here with the same env vars is harmless — it just
// re-applies the same values.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ---------------- ITEM BILL / QUOTATION ----------------
// The vendor's bill or quotation for one EventItem (photo or PDF).

const itemBillStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "event-item-bills",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf"],
    transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
  },
});

const uploadItemBill = multer({
  storage: itemBillStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single("bill");

// ---------------- EVENT COVER IMAGE ----------------
// Used as the header image on the invitation message / event card.

const coverImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "event-covers",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 1600, crop: "limit", quality: "auto" }],
  },
});

const uploadCoverImage = multer({
  storage: coverImageStorage,
  limits: { fileSize: 6 * 1024 * 1024 },
}).single("cover");

module.exports = { cloudinary, uploadItemBill, uploadCoverImage };