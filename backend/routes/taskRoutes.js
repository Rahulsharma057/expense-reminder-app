const express = require("express");
const router = express.Router();
const {
  createTask,
  getMyTasks,
  getAllTasks,
  getTaskById,
  updateStatus,
  addMessage,
  addPhotoMessage,
  editMessage,
  markMessagesSeen,
  deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");
const { uploadTaskPhoto } = require("../middleware/upload");

// NOTE: I don't have your original taskRoutes.js, so this is
// rebuilt from the routes implied by taskController.js's own
// comments. Merge the two new lines (photo + edit message) into
// your real file instead of replacing it outright if the paths
// above don't match exactly.

router.use(protect);

router.post("/", createTask);
router.get("/mine", getMyTasks);
router.get("/", getAllTasks);
router.get("/:id", getTaskById);

router.patch("/:id/status", updateStatus);

router.post("/:id/messages", addMessage);
router.post("/:id/messages/photo", uploadTaskPhoto.single("photo"), addPhotoMessage);
router.patch("/:id/messages/:messageId", editMessage);
router.patch("/:id/messages/seen", markMessagesSeen);

router.delete("/:id", deleteTask);

module.exports = router;