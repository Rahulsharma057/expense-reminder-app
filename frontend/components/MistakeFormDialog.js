"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, ToggleButtonGroup, ToggleButton, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";
import CategoryQuickPicker from "./CategoryQuickPicker";
import PersonPicker from "./PersonPicker";

const SEVERITIES = ["Minor", "Moderate", "Serious"];

export default function MistakeFormDialog({ open, mistake, onClose, onSaved, onDeleted }) {
  const isEdit = !!mistake?._id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(null);
  const [personType, setPersonType] = useState("Self");
  const [personUser, setPersonUser] = useState(null);
  const [personName, setPersonName] = useState("");
  const [severity, setSeverity] = useState("Moderate");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(mistake?.title || "");
      setDescription(mistake?.description || "");
      setCategory(mistake?.category?._id || mistake?.category || null);
      setPersonType(mistake?.personType || "Self");
      setPersonUser(mistake?.personUser || null);
      setPersonName(mistake?.personName || "");
      setSeverity(mistake?.severity || "Moderate");
    }
  }, [open, mistake]);

  const handlePersonChange = ({ personType: t, personUser: u, personName: n }) => {
    setPersonType(t); setPersonUser(u); setPersonName(n);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    setSaving(true);
    try {
      const payload = { title, description, category, personType, personUser, personName, severity };
      if (isEdit) {
        await api.put(`/mistakes/${mistake._id}`, payload);
        toast.success("Updated.");
      } else {
        await api.post("/mistakes", payload);
        toast.success("Mistake logged.");
      }
      onSaved?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!mistake?._id) return;
    if (!window.confirm(`Delete "${mistake.title}" and its full history? This cannot be undone.`)) return;
    try {
      await api.delete(`/mistakes/${mistake._id}`);
      toast.success("Deleted.");
      onDeleted?.(mistake._id);
    } catch {
      toast.error("Could not delete.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {isEdit ? "Edit Mistake" : "Log a Mistake"}
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField size="small" label="What happened" required fullWidth value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Missed a deadline, Reacted angrily" />
          <TextField size="small" label="Details (optional)" fullWidth multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

          <PersonPicker personType={personType} personUser={personUser} personName={personName} onChange={handlePersonChange} />

          <CategoryQuickPicker selectedId={category} onChange={setCategory} />

          <Stack>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>SEVERITY</Typography>
            <ToggleButtonGroup exclusive fullWidth size="small" value={severity} onChange={(_e, v) => v && setSeverity(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}>
              {SEVERITIES.map((s) => <ToggleButton key={s} value={s}>{s}</ToggleButton>)}
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        {isEdit ? <Button color="error" onClick={handleDelete} sx={{ textTransform: "none" }}>Delete</Button> : <span />}
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}