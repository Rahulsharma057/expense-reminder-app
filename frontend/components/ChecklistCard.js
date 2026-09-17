"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, LinearProgress, IconButton, AvatarGroup, Avatar } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChecklistIcon from "@mui/icons-material/Checklist";
import ChecklistDetailDialog from "./ChecklistDetailDialog";

const TYPE_COLORS = { "One-time": "#60A5FA", Daily: "#4ADE80", Weekly: "#FBBF24" };
const STATUS_COLORS = { Active: "#60A5FA", Completed: "#4ADE80", Cancelled: "#F87171" };

export default function ChecklistCard({ checklist, onEdit, onDelete, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const typeColor = TYPE_COLORS[checklist.type] || "#94a3b8";
  const isOverdue = checklist.dueDate && checklist.status === "Active" && new Date(checklist.dueDate) < new Date();
  const statusColor = isOverdue ? "#F87171" : (STATUS_COLORS[checklist.status] || "#94a3b8");
  const statusLabel = isOverdue ? "Overdue" : checklist.status;

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setDetailOpen(true)}
        sx={{ p: 1.8, border: "1px solid", borderColor: isOverdue ? "rgba(248,113,113,0.5)" : "divider", borderRadius: 3, bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ width: 44, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, bgcolor: `${typeColor}26`, color: typeColor }}>
            <ChecklistIcon />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography fontWeight={800} noWrap color="text.primary">{checklist.title}</Typography>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {checklist.progress?.percent ?? 0}%
              </Typography>
            </Stack>

            <LinearProgress
              variant="determinate"
              value={checklist.progress?.percent ?? 0}
              sx={{ mt: 0.8, height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 3 } }}
            />

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip size="small" label={checklist.type} sx={{ bgcolor: `${typeColor}26`, color: typeColor, fontWeight: 700 }} />
              <Chip size="small" label={statusLabel} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
              {checklist.dueDate && <Chip size="small" label={`Due ${new Date(checklist.dueDate).toLocaleDateString("en-IN")}`} variant="outlined" />}
            </Stack>

            {checklist.assignedTo?.length > 0 && (
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.8 }}>
                <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 20, height: 20, fontSize: 10 } }}>
                  {checklist.assignedTo.map((u) => <Avatar key={u._id}>{u.name?.[0]?.toUpperCase()}</Avatar>)}
                </AvatarGroup>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {checklist.assignedTo.map((u) => u.name).join(", ")}
                </Typography>
              </Stack>
            )}
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(checklist); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(checklist); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <ChecklistDetailDialog
        open={detailOpen}
        checklist={checklist}
        onClose={() => setDetailOpen(false)}
        onEdit={(c) => { setDetailOpen(false); onEdit(c); }}
        onDelete={(c) => { setDetailOpen(false); onDelete(c); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}