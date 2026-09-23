const express = require("express");
const router = express.Router();

const {
  addCandidate, listCandidates, getCandidate, updateCandidate,
  deleteCandidate, compareCandidates,
} = require("../controllers/candidateController");

const { protect } = require("../middleware/auth");
const { uploadResumeFile, persistResume } = require("../middleware/uploadResume");

router.use(protect);

// Must come before "/:id" so "compare" is never matched as an :id.
router.get("/compare/:jobId", compareCandidates);

router.post("/", uploadResumeFile, persistResume, addCandidate);
router.get("/", listCandidates);
router.get("/:id", getCandidate);
router.patch("/:id", uploadResumeFile, persistResume, updateCandidate);
router.delete("/:id", deleteCandidate);

module.exports = router;