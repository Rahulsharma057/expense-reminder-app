const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controllers/brandSettingsController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/", getSettings);
router.put("/", upload.fields([{ name: "logo", maxCount: 1 }, { name: "signature", maxCount: 1 }]), updateSettings);

module.exports = router;