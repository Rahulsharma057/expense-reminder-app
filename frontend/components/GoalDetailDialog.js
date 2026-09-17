"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button,
  LinearProgress, TextField, MenuItem, Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { toast } from "react-toastify";
import api from "../lib/api";

const MILESTONE_COLORS = { Pending: "#94a3b8", Done: "#4ADE80" };
const STATUS_COLORS = { "Not Started": "#94a3b8", "In Progress": "#60A5FA", Achieved: "#4ADE80", Delayed: "#F87171", Abandoned: "#FB923C" };

function MilestoneRow({ goalId, milestone, onUpdated }) {
  const [status, setStatus] = useState(milestone.status);
  const [remarks, setRemarks] = useState(milestone.remarks || "");
  const [showRemarks, setShowRemarks] = useState(!!milestone.remarks);
  const [saving, setSaving] = useState(false);

  const save = async (newStatus, newRemarks) => {
    setSaving(true);
    try {
      const res = await api.patch(`/goals/${goalId}/milestones/${milestone._id}`, {
        status: newStatus ?? status,
        remarks: newRemarks ?? remarks,
      });
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update milestone.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={0.6} sx={{ py: 0.9, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Checkbox
          checked={status === "Done"}
          onChange={(e) => { const s = e.target.checked ? "Done" : "Pending"; setStatus(s); save(s, undefined); }}
          sx={{ p: 0 }}
        />
        <Typography variant="body2" sx={{ flex: 1, textDecoration: status === "Done" ? "line-through" : "none", color: status === "Done" ? "text.secondary" : "text.primary" }}>
          {milestone.text}
        </Typography>
        <Button size="small" onClick={() => setShowRemarks((s) => !s)} sx={{ textTransform: "none", fontSize: 11, minWidth: 0 }}>
          {showRemarks ? "Hide note" : "+ Note"}
        </Button>
      </Stack>
      {showRemarks && (
        <TextField
          size="small" fullWidth placeholder="Kyu nahi hua / kitna hua — note likho"
          value={remarks} onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => save(undefined, remarks)} disabled={saving}
          sx={{ ml: 4.5 }}
        />
      )}
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
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {goal.progress.done} done, {goal.progress.remaining} baaki, {goal.progress.total} total milestones
          </Typography>
        )}

        {goal.description && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{goal.description}</Typography>}

        {goal.milestones?.length > 0 && (
          <>
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>MILESTONES</Typography>
            <Stack>
              {goal.milestones.map((m) => (
                <MilestoneRow key={m._id} goalId={goal._id} milestone={m} onUpdated={onUpdated} />
              ))}
            </Stack>
          </>
        )}

        <Divider sx={{ my: 1.5 }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
          UPDATES / REMARKS LOG
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <TextField
            size="small" fullWidth placeholder="e.g. Kal 2 ghante kaam kiya, client se baat nahi ho payi"
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
          <Typography variant="caption" color="text.secondary">Koi update abhi tak nahi.</Typography>
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