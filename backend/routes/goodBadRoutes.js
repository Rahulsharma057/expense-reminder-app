const express = require("express");
const router = express.Router();
const { createEntry, listEntries, updateEntry, deleteEntry, getSummary } = require("../controllers/goodBadController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/summary", getSummary);
router.get("/", listEntries);
router.post("/", createEntry);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);

module.exports = router;