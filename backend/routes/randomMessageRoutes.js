const express = require("express");
const router = express.Router();
const {
  listCategories, listTemplates, createTemplate, deleteTemplate, listRecipients,
  listPreferences, upsertPreference, deletePreference, sendNow,
} = require("../controllers/randomMessageController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/categories", listCategories);
router.get("/templates", listTemplates);
router.post("/templates", createTemplate);
router.delete("/templates/:id", deleteTemplate);

router.get("/recipients", listRecipients);

router.get("/preferences", listPreferences);
router.post("/preferences", upsertPreference);
router.delete("/preferences/:id", deletePreference);
router.post("/preferences/:id/send-now", sendNow);

module.exports = router;