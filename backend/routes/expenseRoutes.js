const express = require("express");
const router = express.Router();
const {
  createExpense, listExpenses, getExpense, updateExpense, deleteExpense, suggestRecipients,
  exportExcel, reportPdf, invoicePdf, updateClaimStatus, bulkUpdateClaimStatus,
} = require("../controllers/expenseController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.use(protect);

router.get("/suggestions/recipients", suggestRecipients);
router.get("/export/excel", exportExcel);
router.get("/report/pdf", reportPdf);
router.patch("/bulk/claim", bulkUpdateClaimStatus); // "/:id/claim" se PEHLE, warna "bulk" ko id samajh lega

router.get("/", listExpenses);
router.post("/", upload.array("billPhotos", 5), createExpense);

router.get("/:id/invoice", invoicePdf);
router.patch("/:id/claim", updateClaimStatus);
router.get("/:id", getExpense);
router.put("/:id", upload.array("billPhotos", 5), updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;