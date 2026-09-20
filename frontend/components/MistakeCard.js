"use client";

import { useState } from "react";
import { Paper, Stack, Typography, Chip, IconButton } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { toast } from "react-toastify";
import api from "../lib/api";
import MistakeDetailDialog from "./MistakeDetailDialog";

const SEVERITY_COLORS = { Minor: "#60A5FA", Moderate: "#FBBF24", Serious: "#F87171" };

export default function MistakeCard({ mistake, onEdit, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [quickLogging, setQuickLogging] = useState(false);
  const severityColor = SEVERITY_COLORS[mistake.severity] || "#94a3b8";

  const quickLog = async (e) => {
    e.stopPropagation();
    setQuickLogging(true);
    try {
      await api.post(`/mistakes/${mistake._id}/occurrences`, { date: new Date().toISOString() });
      toast.success("Logged — happened again today.");
      onUpdated?.();
    } catch {
      toast.error("Could not log.");
    } finally {
      setQuickLogging(false);
    }
  };

  return (
    <>
      <Paper elevation={0} onClick={() => setDetailOpen(true)} sx={{ p: 1.6, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}>
        <Stack direction="row" spacing={1.2} alignItems="flex-start">
          <Stack sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: `${severityColor}26`, color: severityColor, alignItems: "center", justifyContent: "center" }}>
            <ReportProblemIcon fontSize="small" />
          </Stack>

          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography fontWeight={800} noWrap>{mistake.title}</Typography>
              <Chip size="small" label={`${mistake.occurrenceCount || 0}×`} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 800, flexShrink: 0 }} />
            </Stack>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
              <Chip size="small" label={mistake.personName || mistake.personType} variant="outlined" />
              {mistake.category?.name && <Chip size="small" label={mistake.category.name} sx={{ bgcolor: `${mistake.category.color}26`, color: mistake.category.color, fontWeight: 650 }} />}
              {mistake.status === "Resolved" && <Chip size="small" label="Resolved" sx={{ bgcolor: "rgba(74,222,128,0.15)", color: "#4ADE80", fontWeight: 700 }} />}
            </Stack>
            {mistake.lastOccurred && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                Last: {new Date(mistake.lastOccurred).toLocaleDateString("en-IN")}
              </Typography>
            )}
          </Stack>

          <IconButton size="small" onClick={quickLog} disabled={quickLogging} title="Log another occurrence">
            <AddCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Paper>

      <MistakeDetailDialog
        open={detailOpen}
        mistake={mistake}
        onClose={() => setDetailOpen(false)}
        onEdit={(m) => { setDetailOpen(false); onEdit(m); }}
        onUpdated={() => onUpdated?.()}
      />
    </>
  );
}