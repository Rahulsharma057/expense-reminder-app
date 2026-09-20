const express = require("express");
const router = express.Router();
const {
  listCategories, createCategory, deleteCategory, listPeople,
  createMistake, listMistakes, getMistake, updateMistake, deleteMistake,
  addOccurrence, updateOccurrence, deleteOccurrence, getSummary,
} = require("../controllers/mistakeController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/summary", getSummary);
router.get("/categories", listCategories);
router.post("/categories", createCategory);
router.delete("/categories/:id", deleteCategory);
router.get("/people", listPeople);

router.get("/", listMistakes);
router.post("/", createMistake);

router.post("/:id/occurrences", addOccurrence);
router.patch("/:id/occurrences/:occurrenceId", updateOccurrence);
router.delete("/:id/occurrences/:occurrenceId", deleteOccurrence);

router.get("/:id", getMistake);
router.put("/:id", updateMistake);
router.delete("/:id", deleteMistake);

module.exports = router;