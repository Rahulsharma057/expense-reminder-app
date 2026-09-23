const express = require("express");
const router = express.Router();

const { listTemplates, createTemplate, deleteTemplate } = require("../controllers/eventItemController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/", listTemplates);
router.post("/", createTemplate);
router.delete("/:id", deleteTemplate);

module.exports = router;