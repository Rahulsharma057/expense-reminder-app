const express = require("express");
const router = express.Router();

const {
  scheduleInterview, listInterviews, getInterview, updateInterview,
  markConfirmed, publicConfirm, addFeedback, setOutcome, deleteInterview,
} = require("../controllers/interviewController");

const { protect } = require("../middleware/auth");

// PUBLIC — no auth. This is the link texted/emailed directly to the
// candidate; they are not a system user and never log in.
// Must be registered before `router.use(protect)` below.
router.get("/public/:id/confirm", publicConfirm);

router.use(protect);

router.post("/", scheduleInterview);
router.get("/", listInterviews);
router.get("/:id", getInterview);
router.patch("/:id", updateInterview);
router.patch("/:id/confirm", markConfirmed);
router.post("/:id/feedback", addFeedback);
router.patch("/:id/outcome", setOutcome);
router.delete("/:id", deleteInterview);

module.exports = router;