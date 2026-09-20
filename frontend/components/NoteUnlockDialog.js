"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function NoteUnlockDialog({ open, noteId, onClose, onUnlocked }) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const handleUnlock = async () => {
    setChecking(true);
    try {
      const res = await api.post(`/notes/${noteId}/unlock`, { password });
      setPassword("");
      onUnlocked?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Incorrect password.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <LockIcon fontSize="small" /> Locked Note
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
       "This note is password protected. Enter the password to view it."
        </Typography>
        <TextField
          type="password" fullWidth autoFocus label="Password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleUnlock} disabled={checking || !password}>
          {checking ? "Checking..." : "Unlock"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}