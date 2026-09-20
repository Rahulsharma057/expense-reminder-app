"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, ToggleButtonGroup, ToggleButton, Autocomplete } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

const CATEGORIES = ["Work", "Relationship", "Health", "Family", "Money", "Personal"];

export default function GoodBadEntryDialog({ open, entry, defaultType = "Good", onClose, onSaved }) {
  const isEdit = !!entry?._id;

  const [type, setType] = useState(defaultType);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType(entry?.type || defaultType);
      setText(entry?.text || "");
      setCategory(entry?.category || "");
      setDate(entry?.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
    }
  }, [open, entry, defaultType]);

  const handleSave = async () => {
    if (!text.trim()) { toast.error("Enter what happened."); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/good-bad/${entry._id}`, { type, text, category, date });
        toast.success("Updated.");
      } else {
        await api.post("/good-bad", { type, text, category, date });
        toast.success("Added.");
      }
      onSaved?.();
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Edit Entry" : "Add Entry"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(_e, v) => v && setType(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}>
            <ToggleButton value="Good" sx={{ "&.Mui-selected": { bgcolor: "rgba(74,222,128,0.2)", color: "#4ADE80" } }}>Good Thing</ToggleButton>
            <ToggleButton value="Bad" sx={{ "&.Mui-selected": { bgcolor: "rgba(248,113,113,0.2)", color: "#F87171" } }}>Bad Thing</ToggleButton>
          </ToggleButtonGroup>

          <TextField label="What happened" fullWidth multiline minRows={2} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          <Autocomplete freeSolo options={CATEGORIES} inputValue={category} onInputChange={(_e, v) => setCategory(v)} renderInput={(params) => <TextField {...params} size="small" label="Category (optional)" />} />
          <TextField label="Date" type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}