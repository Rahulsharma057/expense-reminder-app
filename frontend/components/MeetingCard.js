"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VideocamIcon from "@mui/icons-material/Videocam";
import MeetingDetailDialog from "./MeetingDetailDialog";

const STATUS_COLORS = { Scheduled: "#60A5FA", Completed: "#4ADE80", Cancelled: "#F87171" };

export default function MeetingCard({ meeting, onEdit, onDelete, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const dt = new Date(meeting.dateTime);
  const isPast = dt < new Date();
  const effectiveStatus = isPast && meeting.status === "Scheduled" ? "Past" : meeting.status;
  const statusColor = effectiveStatus === "Past" ? "#94a3b8" : (STATUS_COLORS[meeting.status] || "#94a3b8");

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setDetailOpen(true)}
        sx={{ p: 1.8, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {meeting.banner?.url ? (
            <Avatar src={meeting.banner.url} variant="rounded" sx={{ width: 56, height: 56, flexShrink: 0 }} />
          ) : (
            <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: "rgba(139,92,246,0.15)", color: "primary.main", flexShrink: 0 }}>
              <VideocamIcon />
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} noWrap color="text.primary">{meeting.subject}</Typography>
            <Typography variant="caption" color="text.secondary">
              {dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} • {meeting.duration} min
            </Typography>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip size="small" label={meeting.platform} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
              <Chip size="small" label={effectiveStatus} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
              {meeting.participants?.length > 0 && (
                <Chip size="small" label={`${meeting.participants.length} participant(s)`} variant="outlined" />
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(meeting); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(meeting); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <MeetingDetailDialog
        open={detailOpen}
        meeting={meeting}
        onClose={() => setDetailOpen(false)}
        onEdit={(m) => { setDetailOpen(false); onEdit(m); }}
        onDelete={(m) => { setDetailOpen(false); onDelete(m); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}