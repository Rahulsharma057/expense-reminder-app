"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Paper, Divider, Chip, Grid, IconButton, Menu, ToggleButtonGroup, ToggleButton,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import GridViewIcon from "@mui/icons-material/GridView";
import ViewListIcon from "@mui/icons-material/ViewList";
import FolderIcon from "@mui/icons-material/Folder";
import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import NoteCard from "../../components/NoteCard";
import NoteListRow from "../../components/NoteListRow";
import NoteEditorDialog from "../../components/NoteEditorDialog";
import NoteUnlockDialog from "../../components/NoteUnlockDialog";
import FolderDeleteDialog from "../../components/FolderDeleteDialog";
import api from "../../lib/api";

function NotesInner() {
  const [notes, setNotes] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeFolderId, setActiveFolderId] = useState(""); // "" = all, "unfiled" = unfiled

  const [view, setView] = useState("grid");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockNoteId, setUnlockNoteId] = useState(null);

  const [folderMenuAnchor, setFolderMenuAnchor] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);

  const [folderToDelete, setFolderToDelete] = useState(null);

  const loadFolders = () => {
    api.get("/notes/folders").then((res) => setFolders(res.data || [])).catch(() => {});
  };

  const loadNotes = () => {
    setLoading(true);
    api
      .get("/notes", { params: { search, folder: activeFolderId || undefined } })
      .then((res) => setNotes(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFolders(); }, []);
  useEffect(() => {
    const t = setTimeout(loadNotes, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFolderId]);

  const activeFolder = folders.find((f) => f._id === activeFolderId);

  const handleNoteClick = (note) => {
    if (note.isLocked) {
      setUnlockNoteId(note._id);
      setUnlockOpen(true);
    } else {
      setEditingNote(note);
      setEditorOpen(true);
    }
  };

  const handleUnlocked = (fullNote) => {
    setUnlockOpen(false);
    setEditingNote(fullNote);
    setEditorOpen(true);
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const handleSaved = () => {
    setEditorOpen(false);
    setEditingNote(null);
    loadNotes();
  };

  const handleDeleted = () => {
    setEditorOpen(false);
    setEditingNote(null);
    loadNotes();
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    setAddingFolder(true);
    try {
      await api.post("/notes/folders", { name: newFolderName });
      setNewFolderName("");
      loadFolders();
      toast.success("Folder created.");
    } catch {
      toast.error("Could not create folder.");
    } finally {
      setAddingFolder(false);
    }
  };

  const handleFolderDeleted = (folderId) => {
    setFolderToDelete(null);
    if (activeFolderId === folderId) setActiveFolderId("");
    loadFolders();
    loadNotes();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <StickyNote2Icon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Notes</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Quick notes, folders &amp; locked notes
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained" size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
            onClick={handleNewNote}
            sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            New Note
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField
            fullWidth size="small" placeholder="Search notes..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
          />
          <ToggleButtonGroup exclusive size="small" value={view} onChange={(_e, v) => v && setView(v)}>
            <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
            <ToggleButton value="list"><ViewListIcon fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* FOLDER CHIPS */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1 }}>
          <Chip label="All" onClick={() => setActiveFolderId("")} sx={{ fontWeight: 700, bgcolor: activeFolderId === "" ? "primary.main" : "transparent", color: activeFolderId === "" ? "#fff" : "text.secondary", border: "1px solid", borderColor: "divider" }} />
          <Chip label="Unfiled" onClick={() => setActiveFolderId("unfiled")} sx={{ fontWeight: 700, bgcolor: activeFolderId === "unfiled" ? "primary.main" : "transparent", color: activeFolderId === "unfiled" ? "#fff" : "text.secondary", border: "1px solid", borderColor: "divider" }} />
          {folders.map((f) => (
            <Chip
              key={f._id}
              icon={<FolderIcon sx={{ fontSize: 15 }} />}
              label={f.name}
              onClick={() => setActiveFolderId(f._id)}
              onDelete={() => setFolderToDelete(f)}
              sx={{ fontWeight: 700, bgcolor: activeFolderId === f._id ? f.color : "transparent", color: activeFolderId === f._id ? "#fff" : "text.secondary", border: "1px solid", borderColor: activeFolderId === f._id ? f.color : "divider" }}
            />
          ))}
          <IconButton size="small" onClick={(e) => setFolderMenuAnchor(e.currentTarget)} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CreateNewFolderIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={folderMenuAnchor} open={!!folderMenuAnchor} onClose={() => setFolderMenuAnchor(null)}>
            <Box sx={{ p: 1.5, display: "flex", gap: 1 }}>
              <TextField size="small" placeholder="Folder name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddFolder()} />
              <Button size="small" variant="contained" onClick={handleAddFolder} disabled={addingFolder || !newFolderName.trim()}>Add</Button>
            </Box>
          </Menu>
        </Stack>

        {/* FOLDER HEADER — shown when a specific folder is open */}
        {activeFolder && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, px: 0.25 }}>
            <FolderIcon sx={{ fontSize: 18, color: activeFolder.color }} />
            <Typography variant="body2" fontWeight={700}>{activeFolder.name}</Typography>
            <Typography variant="caption" color="text.secondary">— {notes.length} note(s)</Typography>
          </Stack>
        )}

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.25, fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
          </Paper>
        ) : notes.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <StickyNote2Icon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No notes here</Typography>
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={handleNewNote} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
              Add a note
            </Button>
          </Paper>
        ) : view === "grid" ? (
          <Grid container spacing={{ xs: 1, sm: 1.25 }}>
            {notes.map((note) => (
              <Grid item xs={6} sm={4} md={3} key={note._id}>
                <NoteCard note={note} onClick={() => handleNoteClick(note)} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Stack spacing={1}>
            {notes.map((note) => (
              <NoteListRow key={note._id} note={note} onClick={() => handleNoteClick(note)} />
            ))}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>
          Notes
        </Typography>
      </Container>

      <NoteEditorDialog
        open={editorOpen}
        note={editingNote}
        folders={folders}
        onClose={() => { setEditorOpen(false); setEditingNote(null); }}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />

      <NoteUnlockDialog
        open={unlockOpen}
        noteId={unlockNoteId}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={handleUnlocked}
      />

      <FolderDeleteDialog
        open={!!folderToDelete}
        folder={folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onDeleted={handleFolderDeleted}
      />
    </Box>
  );
}

export default function NotesPage() {
  return (
    <ProtectedRoute>
      <NotesInner />
    </ProtectedRoute>
  );
}