const express = require("express");
const router = express.Router();
const {
  createExpense, listExpenses, getExpense, updateExpense, deleteExpense, suggestRecipients,
} = require("../controllers/expenseController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);
router.get("/suggestions/recipients", suggestRecipients);
router.get("/", listExpenses);
router.post("/", upload.single("billPhoto"), createExpense);
router.get("/:id", getExpense);
router.put("/:id", upload.single("billPhoto"), updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
