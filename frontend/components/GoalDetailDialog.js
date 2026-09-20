"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button,
  LinearProgress, TextField, Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import NotesIcon from "@mui/icons-material/Notes";
import { toast } from "react-toastify";
import api from "../lib/api";

const MILESTONE_STATUSES = ["Not Started", "In Progress", "Done"];
const MILESTONE_COLORS = { "Not Started": "#94a3b8", "In Progress": "#60A5FA", Done: "#4ADE80" };
const STATUS_COLORS = { "Not Started": "#94a3b8", "In Progress": "#60A5FA", Achieved: "#4ADE80", Delayed: "#F87171", Abandoned: "#FB923C" };

function MilestoneRow({ goalId, milestone, onUpdated }) {
  const [note, setNote] = useState(milestone.note || "");
  const [showNote, setShowNote] = useState(!!milestone.note);
  const [saving, setSaving] = useState(false);

  const save = async (status, noteValue) => {
    setSaving(true);
    try {
      const res = await api.patch(`/goals/${goalId}/milestones/${milestone._id}`, { status, note: noteValue });
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update milestone.");
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = () => {
    const currentIndex = MILESTONE_STATUSES.indexOf(milestone.status);
    const nextStatus = MILESTONE_STATUSES[(currentIndex + 1) % MILESTONE_STATUSES.length];
    save(nextStatus, undefined);
  };

  return (
    <Stack spacing={0.6} sx={{ py: 0.9, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Chip
          size="small" label={milestone.status} onClick={cycleStatus} disabled={saving}
          sx={{ bgcolor: `${MILESTONE_COLORS[milestone.status]}26`, color: MILESTONE_COLORS[milestone.status], fontWeight: 700, cursor: "pointer", minWidth: 92 }}
        />
        <Typography
          variant="body2"
          sx={{ flex: 1, textDecoration: milestone.status === "Done" ? "line-through" : "none", color: milestone.status === "Done" ? "text.secondary" : "text.primary" }}
        >
          {milestone.text}
        </Typography>
        <IconButton size="small" onClick={() => setShowNote((s) => !s)}>
          <NotesIcon fontSize="small" sx={{ color: milestone.note ? "primary.main" : "text.secondary" }} />
        </IconButton>
      </Stack>

      <Collapse in={showNote}>
        <TextField
          size="small" fullWidth placeholder="Why is it stuck / what's left / how much is done"
          value={note} onChange={(e) => setNote(e.target.value)}
          onBlur={() => save(undefined, note)} disabled={saving}
          sx={{ ml: 11.5 }}
        />
      </Collapse>
    </Stack>
  );
}

export default function GoalDetailDialog({ open, goal, onClose, onEdit, onDelete, onUpdated }) {
  const [newUpdateText, setNewUpdateText] = useState("");
  const [addingUpdate, setAddingUpdate] = useState(false);
  if (!goal) return null;

  const statusColor = goal.isDelayed ? "#F87171" : (STATUS_COLORS[goal.status] || "#94a3b8");
  const statusLabel = goal.isDelayed ? "Delayed" : goal.status;

  const handleAddUpdate = async () => {
    if (!newUpdateText.trim()) return;
    setAddingUpdate(true);
    try {
      const res = await api.post(`/goals/${goal._id}/updates`, { text: newUpdateText });
      setNewUpdateText("");
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not add update.");
    } finally {
      setAddingUpdate(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{goal.title}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "divider" }}>
        {/* OVERVIEW */}
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>OVERVIEW</Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          {goal.category && <Chip size="small" label={goal.category} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />}
          <Chip size="small" label={statusLabel} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
          {goal.targetDate && <Chip size="small" label={`Target: ${new Date(goal.targetDate).toLocaleDateString("en-IN")}`} variant="outlined" />}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate" value={goal.progress?.percent ?? 0}
            sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 4 } }}
          />
          <Typography variant="caption" fontWeight={700}>{goal.progress?.percent ?? 0}%</Typography>
        </Stack>

        {goal.progress?.total > 0 && (
          <Stack direction="row" spacing={0.6} sx={{ mb: 1.5 }}>
            <Chip size="small" label={`${goal.progress.done} Done`} sx={{ bgcolor: "rgba(74,222,128,0.15)", color: "#4ADE80", fontWeight: 700 }} />
            <Chip size="small" label={`${goal.progress.inProgress} In Progress`} sx={{ bgcolor: "rgba(96,165,250,0.15)", color: "#60A5FA", fontWeight: 700 }} />
            <Chip size="small" label={`${goal.progress.notStarted} Not Started`} sx={{ bgcolor: "rgba(148,163,184,0.15)", color: "#94a3b8", fontWeight: 700 }} />
          </Stack>
        )}

        {goal.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{goal.description}</Typography>}

        {/* MILESTONES */}
        {goal.milestones?.length > 0 && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>MILESTONES — tap status to change</Typography>
            <Stack>
              {goal.milestones.map((m) => (
                <MilestoneRow key={m._id} goalId={goal._id} milestone={m} onUpdated={onUpdated} />
              ))}
            </Stack>
          </>
        )}

        {/* ACTIVITY LOG */}
        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>ACTIVITY LOG</Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <TextField
            size="small" fullWidth placeholder="e.g. Worked 2 hours today, couldn't reach the client"
            value={newUpdateText} onChange={(e) => setNewUpdateText(e.target.value)}
          />
          <IconButton size="small" onClick={handleAddUpdate} disabled={addingUpdate || !newUpdateText.trim()} sx={{ border: "1px solid", borderColor: "divider" }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>

        {goal.updates?.length ? (
          <Stack spacing={1}>
            {goal.updates.map((u) => (
              <Stack key={u._id} spacing={0.2}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(u.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </Typography>
                <Typography variant="body2">{u.text}</Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">No entries yet.</Typography>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(goal)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Edit
          </Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(goal)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Delete
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}