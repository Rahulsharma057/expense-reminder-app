const express = require("express");
const router = express.Router();
const { generateLink, createMeeting, listMeetings, getMeeting, updateMeeting, deleteMeeting } = require("../controllers/meetingController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/generate-link", generateLink);
router.get("/", listMeetings);
router.post("/", upload.single("banner"), createMeeting);

router.get("/:id", getMeeting);
router.put("/:id", upload.single("banner"), updateMeeting);
router.delete("/:id", deleteMeeting);

module.exports = router;