"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, ToggleButtonGroup, ToggleButton, TextField, Typography } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";
import ReasonPicker from "./ReasonPicker";

export default function HabitLogDialog({ open, habit, date, existingLog, onClose, onSaved }) {
  const [status, setStatus] = useState("Done");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStatus(existingLog?.status || (habit?.type === "Good" ? "Done" : "Skipped"));
      setReason(existingLog?.reason || "");
      setRemarks(existingLog?.remarks || "");
    }
  }, [open, existingLog, habit]);

  if (!habit) return null;

  const isCurrentlySuccess = status === (habit.type === "Good" ? "Done" : "Skipped");

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/habits/${habit._id}/log`, { status, reason, remarks, date });
      toast.success("Saved.");
      onSaved?.();
    } catch {
      toast.error("Could not save entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{habit.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {new Date(date).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </Typography>

          <ToggleButtonGroup exclusive fullWidth value={status} onChange={(_e, v) => v && setStatus(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}>
            <ToggleButton value="Done" sx={{ "&.Mui-selected": { bgcolor: habit.type === "Good" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)", color: habit.type === "Good" ? "#4ADE80" : "#F87171" } }}>
              Done
            </ToggleButton>
            <ToggleButton value="Skipped" sx={{ "&.Mui-selected": { bgcolor: habit.type === "Good" ? "rgba(248,113,113,0.2)" : "rgba(74,222,128,0.2)", color: habit.type === "Good" ? "#F87171" : "#4ADE80" } }}>
              Skipped
            </ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="caption" sx={{ color: isCurrentlySuccess ? "#4ADE80" : "#F87171" }} fontWeight={700}>
            {isCurrentlySuccess ? "This counts as a success for this habit" : "This counts as a miss for this habit"}
          </Typography>

          <ReasonPicker presets={habit.reasonPresets} value={reason} onChange={setReason} label="Why? (pick or type)" />

          <TextField size="small" label="Remarks (optional)" fullWidth multiline minRows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}