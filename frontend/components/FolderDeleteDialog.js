"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Typography, CircularProgress, Alert } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function FolderDeleteDialog({ open, folder, onClose, onDeleted }) {
  const [loading, setLoading] = useState(true);
  const [lockedNotes, setLockedNotes] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !folder) return;
    setLoading(true);
    setError("");
    setPasswords({});
    api
      .get("/notes", { params: { folder: folder._id } })
      .then((res) => setLockedNotes((res.data || []).filter((n) => n.isLocked)))
      .finally(() => setLoading(false));
  }, [open, folder]);

  const handleDelete = async () => {
    setError("");

    if (lockedNotes.length) {
      setDeleting(true);
      try {
        // Verify every locked note's password before deleting the folder
        await Promise.all(
          lockedNotes.map((note) => api.post(`/notes/${note._id}/unlock`, { password: passwords[note._id] || "" }))
        );
      } catch {
        setError("One or more passwords are incorrect. Enter the correct password for each locked note.");
        setDeleting(false);
        return;
      }
    }

    try {
      await api.delete(`/notes/folders/${folder._id}`);
      toast.success("Folder deleted.");
      onDeleted?.(folder._id);
    } catch {
      toast.error("Could not delete folder.");
    } finally {
      setDeleting(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete Folder "{folder.name}"</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack>
        ) : lockedNotes.length ? (
          <Stack spacing={2}>
            <Alert severity="warning" icon={<LockIcon fontSize="small" />}>
              This folder has {lockedNotes.length} locked note(s). Enter each password to confirm deletion.
            </Alert>
            {error && <Alert severity="error">{error}</Alert>}
            {lockedNotes.map((note) => (
              <TextField
                key={note._id}
                type="password" size="small" fullWidth
                label={`Password for "${note.title || "Untitled"}"`}
                value={passwords[note._id] || ""}
                onChange={(e) => setPasswords((prev) => ({ ...prev, [note._id]: e.target.value }))}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Notes inside this folder will become unfiled. This cannot be undone.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained" color="error" onClick={handleDelete}
          disabled={loading || deleting || (lockedNotes.length > 0 && lockedNotes.some((n) => !passwords[n._id]))}
        >
          {deleting ? "Deleting..." : "Delete Folder"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}