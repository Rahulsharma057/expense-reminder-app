"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogActions, TextField, Button, Stack, IconButton,
  MenuItem, Box, Typography, Switch, FormControlLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { toast } from "react-toastify";
import api from "../lib/api";

const HIGHLIGHT_COLORS = ["", "#FDE68A", "#FCA5A5", "#A7F3D0", "#93C5FD", "#DDD6FE", "#F9A8D4"];

export default function NoteEditorDialog({ open, note, folders, onClose, onSaved, onDeleted }) {
  const isNew = !note?._id;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("");
  const [color, setColor] = useState("");
  const [pinned, setPinned] = useState(false);

  // Password handling
  const [isLocked, setIsLocked] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || "");
      setContent(note?.content || "");
      setFolder(note?.folder?._id || note?.folder || "");
      setColor(note?.color || "");
      setPinned(note?.pinned || false);
      setIsLocked(!!note?.isLocked && !isNew);
      setShowPasswordFields(false);
      setCurrentPassword("");
      setNewPassword("");
      setRemovePassword(false);
    }
  }, [open, note, isNew]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const payload = { title, content, folder: folder || null, color };
        if (newPassword) payload.password = newPassword;
        const res = await api.post("/notes", payload);
        toast.success("Note created.");
        onSaved?.(res.data);
      } else {
        const payload = { title, content, folder: folder || null, color };
        if (isLocked) payload.password = currentPassword;
        if (removePassword) {
          payload.removePassword = true;
        } else if (newPassword) {
          payload.newPassword = newPassword;
        }
        const res = await api.put(`/notes/${note._id}`, payload);
        toast.success("Note updated.");
        onSaved?.(res.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async () => {
    if (isNew) { setPinned((p) => !p); return; }
    try {
      const res = await api.patch(`/notes/${note._id}/pin`);
      setPinned(res.data.pinned);
      onSaved?.(res.data);
    } catch {
      toast.error("Could not toggle pin.");
    }
  };

  const handleDelete = async () => {
    if (!note?._id) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${note._id}`);
      toast.success("Note deleted.");
      onDeleted?.(note._id);
    } catch {
      toast.error("Could not delete note.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogContent sx={{ bgcolor: color || "background.paper", transition: "background-color 0.2s" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <TextField
            variant="standard" placeholder="Title" fullWidth
            value={title} onChange={(e) => setTitle(e.target.value)}
            InputProps={{ disableUnderline: true, sx: { fontSize: 18, fontWeight: 800 } }}
          />
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={togglePin}>
              {pinned ? <PushPinIcon fontSize="small" color="primary" /> : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
            <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </Stack>

        <TextField
          variant="standard" placeholder="Write your note..." fullWidth multiline minRows={5}
          value={content} onChange={(e) => setContent(e.target.value)}
          InputProps={{ disableUnderline: true, sx: { fontSize: 14 } }}
        />

        <Stack direction="row" spacing={0.75} sx={{ mt: 2 }}>
          {HIGHLIGHT_COLORS.map((c) => (
            <Box
              key={c || "none"}
              onClick={() => setColor(c)}
              sx={{
                width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                bgcolor: c || "background.default",
                border: color === c ? "2px solid" : "1px solid",
                borderColor: color === c ? "primary.main" : "divider",
              }}
            />
          ))}
        </Stack>

        <TextField
          select size="small" fullWidth label="Folder" value={folder} onChange={(e) => setFolder(e.target.value)}
          sx={{ mt: 2 }} SelectProps={{ displayEmpty: true }}
        >
          <MenuItem value="">Unfiled</MenuItem>
          {folders.map((f) => <MenuItem key={f._id} value={f._id}>{f.name}</MenuItem>)}
        </TextField>

        {/* PASSWORD SECTION */}
        <Box sx={{ mt: 2, p: 1.2, borderRadius: 2, bgcolor: "rgba(0,0,0,0.15)" }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {isLocked ? <LockIcon fontSize="small" color="warning" /> : <LockOpenIcon fontSize="small" />}
            <Typography variant="caption" fontWeight={700}>{isLocked ? "Locked note" : "Not locked"}</Typography>
            <FormControlLabel
              sx={{ ml: "auto", mr: 0 }}
              control={<Switch size="small" checked={showPasswordFields} onChange={(e) => setShowPasswordFields(e.target.checked)} />}
              label={<Typography variant="caption">{isLocked ? "Change/Remove" : "Set password"}</Typography>}
            />
          </Stack>

          {showPasswordFields && (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {isLocked && (
                <TextField
                  size="small" type="password" label="Current password" fullWidth
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                />
              )}
              {!removePassword && (
                <TextField
                  size="small" type="password" label={isLocked ? "New password" : "Set password"} fullWidth
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                />
              )}
              {isLocked && (
                <FormControlLabel
                  control={<Switch size="small" checked={removePassword} onChange={(e) => setRemovePassword(e.target.checked)} />}
                  label={<Typography variant="caption">Remove password (unlock permanently)</Typography>}
                />
              )}
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 1.5, bgcolor: color || "background.paper", justifyContent: "space-between" }}>
        {!isNew ? (
          <IconButton size="small" color="error" onClick={handleDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        ) : <Box />}
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none", borderRadius: 2 }}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}