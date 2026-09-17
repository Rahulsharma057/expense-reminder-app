const express = require("express");
const router = express.Router();
const {
  listFolders, createFolder, deleteFolder,
  createNote, listNotes, getNote, unlockNote, updateNote, togglePin, deleteNote,
} = require("../controllers/noteController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/folders", listFolders);
router.post("/folders", createFolder);
router.delete("/folders/:folderId", deleteFolder);

router.get("/", listNotes);
router.post("/", createNote);

router.post("/:id/unlock", unlockNote);
router.patch("/:id/pin", togglePin);

router.get("/:id", getNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;