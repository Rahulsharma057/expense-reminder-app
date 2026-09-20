"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { toast } from "react-toastify";
import api from "../lib/api";
import MistakeOccurrenceDialog from "./MistakeOccurrenceDialog";

const SEVERITY_COLORS = { Minor: "#60A5FA", Moderate: "#FBBF24", Serious: "#F87171" };

export default function MistakeDetailDialog({ open, mistake, onClose, onEdit, onUpdated }) {
  const [logOpen, setLogOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  if (!mistake) return null;

  const severityColor = SEVERITY_COLORS[mistake.severity] || "#94a3b8";

  const handleResolve = async () => {
    setResolving(true);
    try {
      await api.put(`/mistakes/${mistake._id}`, { status: mistake.status === "Resolved" ? "Open" : "Resolved" });
      toast.success(mistake.status === "Resolved" ? "Reopened." : "Marked as resolved.");
      onUpdated?.();
    } catch {
      toast.error("Could not update.");
    } finally {
      setResolving(false);
    }
  };

  const deleteOccurrence = async (occurrenceId) => {
    if (!window.confirm("Remove this log entry?")) return;
    try {
      await api.delete(`/mistakes/${mistake._id}/occurrences/${occurrenceId}`);
      onUpdated?.();
    } catch {
      toast.error("Could not remove entry.");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{mistake.title}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Chip size="small" label={mistake.personName || mistake.personType} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
            {mistake.category?.name && <Chip size="small" label={mistake.category.name} sx={{ bgcolor: `${mistake.category.color}26`, color: mistake.category.color, fontWeight: 700 }} />}
            <Chip size="small" label={mistake.severity} sx={{ bgcolor: `${severityColor}26`, color: severityColor, fontWeight: 700 }} />
            <Chip size="small" label={mistake.status} sx={{ bgcolor: mistake.status === "Resolved" ? "rgba(74,222,128,0.15)" : "rgba(96,165,250,0.15)", color: mistake.status === "Resolved" ? "#4ADE80" : "#60A5FA", fontWeight: 700 }} />
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
            <Stack sx={{ flex: 1 }}>
              <Typography variant="h4" fontWeight={800} color="primary.light">{mistake.occurrenceCount ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">times repeated</Typography>
            </Stack>
            {mistake.mostCommonDay && (
              <Stack sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800}>{mistake.mostCommonDay}</Typography>
                <Typography variant="caption" color="text.secondary">most common day</Typography>
              </Stack>
            )}
          </Stack>

          {mistake.firstOccurred && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              First: {new Date(mistake.firstOccurred).toLocaleDateString("en-IN")} • Last: {new Date(mistake.lastOccurred).toLocaleDateString("en-IN")}
            </Typography>
          )}

          {mistake.description && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="body2" color="text.secondary">{mistake.description}</Typography>
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">OCCURRENCE HISTORY</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setLogOpen(true)} sx={{ textTransform: "none" }}>
              Log Again
            </Button>
          </Stack>

          {mistake.recentOccurrences?.length ? (
            <Stack spacing={1}>
              {mistake.recentOccurrences.map((o) => (
                <Stack key={o._id} direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(o.date).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                    </Typography>
                    {o.remarks && <Typography variant="body2">{o.remarks}</Typography>}
                  </Stack>
                  <IconButton size="small" onClick={() => deleteOccurrence(o._id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="caption" color="text.secondary">No log entries yet.</Typography>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="outlined" color={mistake.status === "Resolved" ? "warning" : "success"} startIcon={<CheckCircleIcon />} onClick={handleResolve} disabled={resolving} sx={{ textTransform: "none", borderRadius: 2 }}>
              {mistake.status === "Resolved" ? "Reopen" : "Mark Resolved"}
            </Button>
            <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(mistake)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Edit
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <MistakeOccurrenceDialog
        open={logOpen}
        mistake={mistake}
        onClose={() => setLogOpen(false)}
        onSaved={() => { setLogOpen(false); onUpdated?.(); }}
      />
    </>
  );
}