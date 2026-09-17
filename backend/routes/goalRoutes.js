const express = require("express");
const router = express.Router();
const {
  createGoal, listGoals, getGoal, updateGoal, updateMilestone, addUpdate, deleteGoal,
} = require("../controllers/goalController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", listGoals);
router.post("/", createGoal);

router.post("/:id/updates", addUpdate);
router.patch("/:id/milestones/:milestoneId", updateMilestone);

router.get("/:id", getGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;