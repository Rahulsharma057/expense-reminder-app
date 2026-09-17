const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, default: "", trim: true },
    content: { type: String, default: "" },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "NoteFolder", default: null },
    pinned: { type: Boolean, default: false },
    color: { type: String, default: "" }, // highlight color hex, "" = default
    passwordHash: { type: String, default: "" }, // set = note is locked

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

noteSchema.index({ createdBy: 1 });
noteSchema.index({ folder: 1 });
noteSchema.index({ pinned: 1 });

module.exports = mongoose.model("Note", noteSchema);