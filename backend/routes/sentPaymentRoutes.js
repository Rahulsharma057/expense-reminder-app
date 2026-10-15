const express = require("express");
const router = express.Router();
const {
  createSentPayment,
  listSentPayments,
  getSentPayment,
  updateSentPayment,
  deleteSentPayment,
} = require("../controllers/sentPaymentController");
const { protect } = require("../middleware/auth");
const { uploadPaymentScreenshot } = require("../middleware/upload");

router.use(protect);

router.get("/", listSentPayments);
router.post("/", uploadPaymentScreenshot.single("screenshot"), createSentPayment);

router.get("/:id", getSentPayment);
router.put("/:id", uploadPaymentScreenshot.single("screenshot"), updateSentPayment);
router.delete("/:id", deleteSentPayment);

module.exports = router;
