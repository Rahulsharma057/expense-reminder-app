const express = require("express");
const router = express.Router();
const {
  createReceivedPayment,
  listReceivedPayments,
  getReceivedPayment,
  updateReceivedPayment,
  deleteReceivedPayment,
} = require("../controllers/receivedPaymentController");
const { protect } = require("../middleware/auth");
const { uploadPaymentScreenshot } = require("../middleware/upload");

router.use(protect);

router.get("/", listReceivedPayments);
router.post("/", uploadPaymentScreenshot.single("screenshot"), createReceivedPayment);

router.get("/:id", getReceivedPayment);
router.put("/:id", uploadPaymentScreenshot.single("screenshot"), updateReceivedPayment);
router.delete("/:id", deleteReceivedPayment);

module.exports = router;
