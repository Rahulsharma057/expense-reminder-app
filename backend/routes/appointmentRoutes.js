const express = require("express");
const router = express.Router();
const {
  createAppointment, listAppointments, getAppointment, updateAppointment,
  rescheduleAppointment, updateStatus, deleteAppointment, generatePdf,
  updateArrangementItem, checkConflict,
} = require("../controllers/appointmentController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/check-conflict", checkConflict);
router.get("/", listAppointments);
router.post("/", upload.array("photos", 5), createAppointment);

router.get("/:id/pdf", generatePdf);
router.patch("/:id/reschedule", rescheduleAppointment);
router.patch("/:id/status", updateStatus);
router.patch("/:id/arrangements/:itemId", updateArrangementItem);

router.get("/:id", getAppointment);
router.put("/:id", upload.array("photos", 5), updateAppointment);
router.delete("/:id", deleteAppointment);

module.exports = router;