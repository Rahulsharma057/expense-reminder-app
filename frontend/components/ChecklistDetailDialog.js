"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button,
  LinearProgress, TextField, MenuItem, Checkbox,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CancelIcon from "@mui/icons-material/Cancel";
import ReplayIcon from "@mui/icons-material/Replay";
import { toast } from "react-toastify";
import api from "../lib/api";

const ITEM_STATUSES = ["Pending", "Done", "Partial", "Not Done"];
const ITEM_STATUS_COLORS = { Pending: "#94a3b8", Done: "#4ADE80", Partial: "#FBBF24", "Not Done": "#F87171" };

function ItemRow({ checklistId, item, onUpdated }) {
  const [status, setStatus] = useState(item.status);
  const [remarks, setRemarks] = useState(item.remarks || "");
  const [saving, setSaving] = useState(false);
  const [showRemarks, setShowRemarks] = useState(item.status === "Partial" || item.status === "Not Done");

  const save = async (newStatus, newRemarks) => {
    setSaving(true);
    try {
      const res = await api.patch(`/checklists/${checklistId}/items/${item._id}`, {
        status: newStatus ?? status,
        remarks: newRemarks ?? remarks,
      });
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update item.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    setShowRemarks(newStatus === "Partial" || newStatus === "Not Done");
    save(newStatus, undefined);
  };

  return (
    <Stack spacing={0.6} sx={{ py: 0.9, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Checkbox
          checked={status === "Done"}
          onChange={(e) => handleStatusChange({ target: { value: e.target.checked ? "Done" : "Pending" } })}
          sx={{ p: 0 }}
        />
        <Typography variant="body2" sx={{ flex: 1, textDecoration: status === "Done" ? "line-through" : "none", color: status === "Done" ? "text.secondary" : "text.primary" }}>
          {item.text}
        </Typography>
        <TextField select size="small" value={status} onChange={handleStatusChange} disabled={saving} sx={{ minWidth: 110 }}>
          {ITEM_STATUSES.map((s) => (
            <MenuItem key={s} value={s}>
              <Chip size="small" label={s} sx={{ bgcolor: `${ITEM_STATUS_COLORS[s]}26`, color: ITEM_STATUS_COLORS[s], fontWeight: 700, height: 20, fontSize: 10 }} />
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {showRemarks && (
        <TextField
          size="small" fullWidth placeholder="Remark — e.g. why not done / how much done"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onBlur={() => save(undefined, remarks)}
          sx={{ ml: 4.5 }}
        />
      )}
    </Stack>
  );
}

export default function ChecklistDetailDialog({ open, checklist, onClose, onEdit, onDelete, onUpdated }) {
  const [busy, setBusy] = useState(false);
  if (!checklist) return null;

  const isOverdue = checklist.dueDate && checklist.status === "Active" && new Date(checklist.dueDate) < new Date();

  const handleCancel = async () => {
    setBusy(true);
    try {
      const res = await api.patch(`/checklists/${checklist._id}/cancel`);
      toast.success("Checklist cancelled.");
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not cancel.");
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    try {
      const res = await api.patch(`/checklists/${checklist._id}/reopen`);
      toast.success("Checklist reopened.");
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not reopen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{checklist.title}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "divider" }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip size="small" label={checklist.type} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
          <Chip size="small" label={isOverdue ? "Overdue" : checklist.status} sx={{ fontWeight: 700 }} />
          {checklist.dueDate && <Chip size="small" label={`Due ${new Date(checklist.dueDate).toLocaleDateString("en-IN")}`} variant="outlined" />}
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate" value={checklist.progress?.percent ?? 0}
            sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 4 } }}
          />
          <Typography variant="caption" fontWeight={700}>{checklist.progress?.percent ?? 0}%</Typography>
        </Stack>

        {checklist.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{checklist.description}</Typography>
        )}

        {checklist.assignedTo?.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            Assigned to: {checklist.assignedTo.map((u) => u.name).join(", ")}
          </Typography>
        )}

        <Divider sx={{ mb: 1 }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>ITEMS</Typography>

        <Stack>
          {checklist.items.map((item) => (
            <ItemRow key={item._id} checklistId={checklist._id} item={item} onUpdated={onUpdated} />
          ))}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {checklist.status === "Active" ? (
          <Button fullWidth size="small" variant="outlined" color="error" startIcon={<CancelIcon />} disabled={busy} onClick={handleCancel} sx={{ textTransform: "none", borderRadius: 2, mb: 1 }}>
            Cancel Checklist
          </Button>
        ) : checklist.status === "Cancelled" ? (
          <Button fullWidth size="small" variant="outlined" startIcon={<ReplayIcon />} disabled={busy} onClick={handleReopen} sx={{ textTransform: "none", borderRadius: 2, mb: 1 }}>
            Reopen
          </Button>
        ) : null}

        <Stack direction="row" spacing={1}>
          <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(checklist)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Edit
          </Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(checklist)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Delete
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}