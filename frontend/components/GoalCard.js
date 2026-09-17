"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, LinearProgress, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import GoalDetailDialog from "./GoalDetailDialog";

const STATUS_COLORS = { "Not Started": "#94a3b8", "In Progress": "#60A5FA", Achieved: "#4ADE80", Delayed: "#F87171", Abandoned: "#FB923C" };

export default function GoalCard({ goal, onEdit, onDelete, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const statusColor = goal.isDelayed ? "#F87171" : (STATUS_COLORS[goal.status] || "#94a3b8");
  const statusLabel = goal.isDelayed ? "Delayed" : goal.status;

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setDetailOpen(true)}
        sx={{ p: 1.8, border: "1px solid", borderColor: goal.isDelayed ? "rgba(248,113,113,0.5)" : "divider", borderRadius: 3, bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, bgcolor: `${statusColor}26`, color: statusColor }}>
            <EmojiEventsIcon />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography fontWeight={800} noWrap color="text.primary">{goal.title}</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {goal.progress?.percent ?? 0}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate" value={goal.progress?.percent ?? 0}
              sx={{ mt: 0.8, height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 3 } }}
            />

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              {goal.category && <Chip size="small" label={goal.category} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />}
              <Chip size="small" label={statusLabel} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
              {goal.targetDate && <Chip size="small" label={new Date(goal.targetDate).toLocaleDateString("en-IN")} variant="outlined" />}
              {goal.progress?.total > 0 && <Chip size="small" label={`${goal.progress.remaining} baaki`} variant="outlined" />}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(goal); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(goal); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <GoalDetailDialog
        open={detailOpen}
        goal={goal}
        onClose={() => setDetailOpen(false)}
        onEdit={(g) => { setDetailOpen(false); onEdit(g); }}
        onDelete={(g) => { setDetailOpen(false); onDelete(g); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}