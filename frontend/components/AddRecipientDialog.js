"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function AddRecipientDialog({ open, onClose, onAdded }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Recipient name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post("/recipients", { name, notes });
      toast.success("Recipient added.");
      onAdded?.(res.data.name);
      setName("");
      setNotes("");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not add recipient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add New Recipient</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Name" fullWidth autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          <TextField
            label="Notes (optional)"
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Add Recipient"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}