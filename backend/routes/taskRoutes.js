const express = require("express");
const router = express.Router();

const {
  createTask,
  getMyTasks,
  getAllTasks,
  getTaskById,
  updateStatus,
  updateTask,
  reassignTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateChecklistRecurrence,
  togglePin,
  deleteTask,
} = require("../controllers/taskController");

const {
  listMessages,
  searchMessages,
  listPinnedMessages,
  addMessage,
  addPhotoMessage,
  addDocumentMessage,
  addVoiceMessage,
  forwardMessage,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePinMessage,
  markMessagesSeen,
} = require("../controllers/messageController");

const { protect } = require("../middleware/auth");
const {
  uploadChatPhoto, persistChatPhoto,
  uploadChatDocument, persistChatDocument,
  uploadChatVoice, persistChatVoice,
} = require("../middleware/uploadChat");

router.use(protect);

// -------------------- TASKS --------------------

router.post("/", createTask);
router.get("/mine", getMyTasks);
router.get("/", getAllTasks);
router.get("/:id", getTaskById);

router.patch("/:id", updateTask);
router.patch("/:id/status", updateStatus);
router.patch("/:id/reassign", reassignTask);
router.patch("/:id/pin", togglePin);

router.delete("/:id", deleteTask);

// -------------------- CHECKLIST --------------------

router.post("/:id/checklist", addChecklistItem);
router.patch("/:id/checklist/recurrence", updateChecklistRecurrence);
router.patch("/:id/checklist/:itemId", updateChecklistItem);
router.delete("/:id/checklist/:itemId", deleteChecklistItem);

// -------------------- MESSAGES --------------------
// Order matters: more specific paths ("seen", "search", "pinned")
// must be registered BEFORE the generic "/:messageId" routes, or
// Express will try to match them as a messageId.

router.get("/:id/messages", listMessages); // ?before=&limit=
router.get("/:id/messages/search", searchMessages); // ?q=
router.get("/:id/messages/pinned", listPinnedMessages);

router.post("/:id/messages", addMessage);
router.post("/:id/messages/photo", uploadChatPhoto, persistChatPhoto, addPhotoMessage);
router.post("/:id/messages/document", uploadChatDocument, persistChatDocument, addDocumentMessage);
router.post("/:id/messages/voice", uploadChatVoice, persistChatVoice, addVoiceMessage);

router.post("/:id/messages/:messageId/forward", forwardMessage);
router.put("/:id/messages/:messageId/reactions", toggleReaction);
router.patch("/:id/messages/:messageId/pin", togglePinMessage);

router.patch("/:id/messages/seen", markMessagesSeen);
router.patch("/:id/messages/:messageId", editMessage);
router.delete("/:id/messages/:messageId", deleteMessage); // ?scope=me|everyone

module.exports = router;