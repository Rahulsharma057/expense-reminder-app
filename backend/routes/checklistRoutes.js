const express = require("express");
const router = express.Router();
const {
  createChecklist, listChecklists, getChecklist, updateChecklist, updateItemStatus,
  cancelChecklist, reopenChecklist, deleteChecklist, listAssignableUsers,
} = require("../controllers/checklistController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/assignable-users", listAssignableUsers);
router.get("/", listChecklists);
router.post("/", createChecklist);

router.patch("/:id/cancel", cancelChecklist);
router.patch("/:id/reopen", reopenChecklist);
router.patch("/:id/items/:itemId", updateItemStatus);

router.get("/:id", getChecklist);
router.put("/:id", updateChecklist);
router.delete("/:id", deleteChecklist);

module.exports = router;