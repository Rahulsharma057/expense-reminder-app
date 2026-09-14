const express = require("express");
const router = express.Router();
const {
  createUdhaar, listUdhaar, getUdhaarSummary, getUdhaar, updateUdhaar, deleteUdhaar, markReturn, reopenUdhaar,
} = require("../controllers/udhaarController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/summary", getUdhaarSummary);
router.get("/", listUdhaar);
router.post("/", upload.array("photos", 5), createUdhaar);

router.patch("/:id/return", markReturn);
router.patch("/:id/reopen", reopenUdhaar);
router.get("/:id", getUdhaar);
router.put("/:id", upload.array("photos", 5), updateUdhaar);
router.delete("/:id", deleteUdhaar);

module.exports = router;