"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

const toDateInputValue = () => new Date().toISOString().slice(0, 10);

export default function MistakeOccurrenceDialog({ open, mistake, onClose, onSaved }) {
  const [date, setDate] = useState(toDateInputValue());
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post(`/mistakes/${mistake._id}/occurrences`, { date, remarks });
      toast.success("Logged — it happened again.");
      setRemarks("");
      onSaved?.(res.data);
    } catch {
      toast.error("Could not log this.");
    } finally {
      setSaving(false);
    }
  };

  if (!mistake) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>It happened again — {mistake.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Date" type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="What happened this time (optional)" fullWidth multiline minRows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Log It"}</Button>
      </DialogActions>
    </Dialog>
  );
}