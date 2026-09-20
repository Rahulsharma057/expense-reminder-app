"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, ToggleButtonGroup, ToggleButton, Chip, IconButton, Typography, FormControlLabel, Switch } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function HabitFormDialog({ open, habit, onClose, onSaved, onDeleted }) {
  const isEdit = !!habit?._id;

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Good");
  const [description, setDescription] = useState("");
  const [presets, setPresets] = useState([]);
  const [newPreset, setNewPreset] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(habit?.title || "");
      setType(habit?.type || "Good");
      setDescription(habit?.description || "");
      setPresets(habit?.reasonPresets || []);
      setActive(habit?.active ?? true);
      setNewPreset("");
    }
  }, [open, habit]);

  const addPreset = () => {
    if (!newPreset.trim()) return;
    setPresets((prev) => [...prev, newPreset.trim()]);
    setNewPreset("");
  };
  const removePreset = (index) => setPresets((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const payload = { title, type, description, reasonPresets: JSON.stringify(presets), active };
      if (isEdit) {
        await api.put(`/habits/${habit._id}`, payload);
        toast.success("Habit updated.");
      } else {
        await api.post("/habits", payload);
        toast.success("Habit added.");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save habit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!habit?._id) return;
    if (!window.confirm(`Delete "${habit.title}" and all its history? This cannot be undone.`)) return;
    try {
      await api.delete(`/habits/${habit._id}`);
      toast.success("Habit deleted.");
      onDeleted?.(habit._id);
    } catch {
      toast.error("Could not delete habit.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? "Edit Habit" : "New Habit"}
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(_e, v) => v && setType(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}>
            <ToggleButton value="Good" sx={{ "&.Mui-selected": { bgcolor: "rgba(74,222,128,0.2)", color: "#4ADE80" } }}>Good Habit</ToggleButton>
            <ToggleButton value="Bad" sx={{ "&.Mui-selected": { bgcolor: "rgba(248,113,113,0.2)", color: "#F87171" } }}>Bad Habit</ToggleButton>
          </ToggleButtonGroup>

          <TextField size="small" label="Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "Good" ? "e.g. Morning workout" : "e.g. Smoking"} />
          <TextField size="small" label="Description (optional)" fullWidth multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

          <Stack spacing={0.8}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              COMMON REASONS (quick-pick when logging)
            </Typography>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {presets.map((p, i) => (
                <Chip key={i} label={p} size="small" onDelete={() => removePreset(i)} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField size="small" fullWidth placeholder="e.g. Was too tired" value={newPreset} onChange={(e) => setNewPreset(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addPreset()} />
              <IconButton size="small" onClick={addPreset} sx={{ border: "1px solid", borderColor: "divider" }}><AddIcon fontSize="small" /></IconButton>
            </Stack>
          </Stack>

          {isEdit && (
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label={<Typography variant="body2">{active ? "Keeping this habit (active)" : "Archived — hidden from Today & lists, history is kept"}</Typography>}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        {isEdit ? <Button color="error" onClick={handleDelete} sx={{ textTransform: "none" }}>Delete Permanently</Button> : <span />}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}