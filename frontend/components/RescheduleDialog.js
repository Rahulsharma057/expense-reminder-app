"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";
import ConflictWarning from "./ConflictWarning";

const toDateTimeLocal = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export default function RescheduleDialog({ open, appointment, onClose, onUpdated }) {
  const [newDateTime, setNewDateTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (open && appointment) {
      setNewDateTime(toDateTimeLocal(appointment.dateTime));
      setReason("");
    }
  }, [open, appointment]);

  useEffect(() => {
    if (!newDateTime || !appointment) return;
    const t = setTimeout(() => {
      api
        .get("/appointments/check-conflict", { params: { dateTime: newDateTime, duration: appointment.duration, excludeId: appointment._id } })
        .then((res) => setConflicts(res.data.conflicts || []))
        .catch(() => setConflicts([]));
    }, 400);
    return () => clearTimeout(t);
  }, [newDateTime, appointment]);

  const handleSave = async () => {
    if (!newDateTime) return;
    setSaving(true);
    try {
      const res = await api.patch(`/appointments/${appointment._id}/reschedule`, { newDateTime, reason });
      toast.success("Rescheduled.");
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not reschedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Reschedule</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="New Date & Time" type="datetime-local" fullWidth value={newDateTime} onChange={(e) => setNewDateTime(e.target.value)} InputLabelProps={{ shrink: true }} />
          <ConflictWarning conflicts={conflicts} />
          <TextField label="Reason (optional)" fullWidth multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !newDateTime}>{saving ? "Saving..." : "Confirm"}</Button>
      </DialogActions>
    </Dialog>
  );
}