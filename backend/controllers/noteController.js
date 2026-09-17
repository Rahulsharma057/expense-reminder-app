const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Note = require("../models/Note");
const NoteFolder = require("../models/NoteFolder");
const { asyncHandler } = require("../middleware/errorHandler");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Strips content for locked notes when the caller hasn't unlocked them.
const toSafeNote = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const isLocked = !!obj.passwordHash;
  if (isLocked) {
    return { ...obj, content: "", passwordHash: undefined, isLocked: true };
  }
  return { ...obj, passwordHash: undefined, isLocked: false };
};

// =============================================================
// FOLDERS
// =============================================================
const listFolders = asyncHandler(async (req, res) => {
  const folders = await NoteFolder.find({ createdBy: req.user._id }).sort({ name: 1 });
  res.json(folders);
});

const createFolder = asyncHandler(async (req, res) => {
  const { name, color } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Folder name is required." });

  const folder = await NoteFolder.create({
    name: name.trim(),
    color: color || "#8B5CF6",
    createdBy: req.user._id,
  });
  res.status(201).json(folder);
});

const deleteFolder = asyncHandler(async (req, res) => {
  const { folderId } = req.params;
  if (!isValidObjectId(folderId)) return res.status(400).json({ message: `Invalid folder ID: "${folderId}"` });

  const folder = await NoteFolder.findOne({ _id: folderId, createdBy: req.user._id });
  if (!folder) return res.status(404).json({ message: "Folder not found." });

  // Notes in this folder become unfiled rather than being deleted.
  await Note.updateMany({ folder: folderId, createdBy: req.user._id }, { $set: { folder: null } });
  await folder.deleteOne();

  res.json({ message: "Folder deleted. Its notes are now unfiled.", id: folderId });
});

// =============================================================
// NOTES
// =============================================================
const createNote = asyncHandler(async (req, res) => {
  const { title, content, folder, color, password } = req.body;

  const note = await Note.create({
    title: title?.trim() || "",
    content: content || "",
    folder: folder && isValidObjectId(folder) ? folder : null,
    color: color || "",
    passwordHash: password ? await bcrypt.hash(password, 10) : "",
    createdBy: req.user._id,
  });

  res.status(201).json(toSafeNote(note));
});

const listNotes = asyncHandler(async (req, res) => {
  const { search, folder, pinned } = req.query;
  const filter = { createdBy: req.user._id };

  if (folder === "unfiled") filter.folder = null;
  else if (folder && isValidObjectId(folder)) filter.folder = folder;

  if (pinned === "true") filter.pinned = true;

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    // Locked notes' content can't be searched (we never store it in plaintext in memory
    // beyond the request) — search title always, content only where not locked.
    filter.$or = [
      { title: regex },
      { $and: [{ passwordHash: "" }, { content: regex }] },
    ];
  }

  const notes = await Note.find(filter).sort({ pinned: -1, updatedAt: -1 });
  res.json(notes.map(toSafeNote));
});

const getNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid note ID: "${id}"` });

  const note = await Note.findOne({ _id: id, createdBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found." });

  res.json(toSafeNote(note));
});

const unlockNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid note ID: "${id}"` });

  const note = await Note.findOne({ _id: id, createdBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found." });
  if (!note.passwordHash) return res.json(toSafeNote(note)); // not locked, nothing to unlock

  const match = await bcrypt.compare(password || "", note.passwordHash);
  if (!match) return res.status(401).json({ message: "Incorrect password." });

  const obj = note.toObject();
  res.json({ ...obj, passwordHash: undefined, isLocked: true }); // full content included this time
});

const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid note ID: "${id}"` });

  const note = await Note.findOne({ _id: id, createdBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found." });

  const { title, content, folder, color, password, newPassword, removePassword } = req.body;

  // If the note is currently locked, any content/password change needs the current password.
  if (note.passwordHash && (content !== undefined || newPassword !== undefined || removePassword)) {
    const match = await bcrypt.compare(password || "", note.passwordHash);
    if (!match) return res.status(401).json({ message: "Incorrect password — cannot save changes." });
  }

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (folder !== undefined) note.folder = folder && isValidObjectId(folder) ? folder : null;
  if (color !== undefined) note.color = color;

  if (removePassword) {
    note.passwordHash = "";
  } else if (newPassword) {
    note.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await note.save();

  const obj = note.toObject();
  res.json({ ...obj, passwordHash: undefined, isLocked: !!note.passwordHash });
});

const togglePin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid note ID: "${id}"` });

  const note = await Note.findOne({ _id: id, createdBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found." });

  note.pinned = !note.pinned;
  await note.save();
  res.json(toSafeNote(note));
});

const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: `Invalid note ID: "${id}"` });

  const note = await Note.findOne({ _id: id, createdBy: req.user._id });
  if (!note) return res.status(404).json({ message: "Note not found." });

  await note.deleteOne();
  res.json({ message: "Note deleted.", id });
});

module.exports = {
  listFolders, createFolder, deleteFolder,
  createNote, listNotes, getNote, unlockNote, updateNote, togglePin, deleteNote,
};