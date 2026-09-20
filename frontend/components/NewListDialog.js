"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

const TYPES = ["Grocery", "Travel", "Outing", "Festival", "Custom"];

export default function NewListDialog({ open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Grocery");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const res = await api.post("/shopping", { title, type, budget: budget || 0 });
      toast.success("List created.");
      setTitle(""); setBudget(""); setType("Grocery");
      onCreated?.(res.data);
    } catch {
      toast.error("Could not create list.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>New List</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" fullWidth autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Groceries, Goa Trip Packing" />
          <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(_e, v) => v && setType(v)} sx={{ flexWrap: "wrap", "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, fontSize: 11 } }}>
            {TYPES.map((t) => <ToggleButton key={t} value={t}>{t}</ToggleButton>)}
          </ToggleButtonGroup>
          <TextField label="Budget (optional)" type="number" fullWidth value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
      </DialogActions>
    </Dialog>
  );
}