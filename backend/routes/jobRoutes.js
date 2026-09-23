const express = require("express");
const router = express.Router();

const { createJob, listJobs, getJob, updateJob, deleteJob } = require("../controllers/jobController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.post("/", createJob);
router.get("/", listJobs);
router.get("/:id", getJob);
router.patch("/:id", updateJob);
router.delete("/:id", deleteJob);

module.exports = router;