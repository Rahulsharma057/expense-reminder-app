const express = require("express");
const router = express.Router();
const { listRecipients, createRecipient, deleteRecipient } = require("../controllers/recipientController");
const { protect } = require("../middleware/auth");

router.use(protect);
router.get("/", listRecipients);
router.post("/", createRecipient);
router.delete("/:id", deleteRecipient);

module.exports = router;