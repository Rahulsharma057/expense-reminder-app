const express = require("express");
const router = express.Router();
const {
  createHabit, listHabits, getHabit, updateHabit, deleteHabit,
  getTodayChecklist, logHabit, deleteLog, getHabitStats, getReasonsSummary,
} = require("../controllers/habitController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/today", getTodayChecklist);
router.get("/", listHabits);
router.post("/", createHabit);

router.post("/:id/log", logHabit);
router.delete("/:id/log", deleteLog);
router.get("/:id/stats", getHabitStats);
router.get("/:id/reasons", getReasonsSummary);

router.get("/:id", getHabit);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);

module.exports = router;