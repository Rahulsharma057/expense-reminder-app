"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventIcon from "@mui/icons-material/Event";
import AppointmentDetailDialog from "./AppointmentDetailDialog";

const STATUS_COLORS = { Scheduled: "#60A5FA", Rescheduled: "#FBBF24", Completed: "#4ADE80", Cancelled: "#F87171" };
const TYPE_COLORS = { Appointment: "#94a3b8", Meeting: "#60A5FA", "Meeting with Food": "#FB923C" };

export default function AppointmentCard({ appointment, onEdit, onDelete, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const statusColor = STATUS_COLORS[appointment.status] || "#94a3b8";
  const typeColor = TYPE_COLORS[appointment.type] || "#94a3b8";

  return (
    <>
      <Paper elevation={0} onClick={() => setDetailOpen(true)} sx={{ p: 1.8, border: "1px solid", borderColor: "divider", borderRadius: 3, bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: `${typeColor}26`, color: typeColor, flexShrink: 0 }}>
            <EventIcon />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} noWrap color="text.primary">{appointment.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(appointment.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} • {appointment.duration} min
            </Typography>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip size="small" label={appointment.type} sx={{ bgcolor: `${typeColor}26`, color: typeColor, fontWeight: 700 }} />
              <Chip size="small" label={appointment.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
              {appointment.attendees?.length > 0 && <Chip size="small" label={`${appointment.attendees.length} attendee(s)`} variant="outlined" />}
              {appointment.arrangementTotal > 0 && <Chip size="small" label={`₹${appointment.arrangementTotal.toLocaleString("en-IN")}`} variant="outlined" />}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(appointment); }}><EditIcon fontSize="small" /></IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(appointment); }}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        </Stack>
      </Paper>

      <AppointmentDetailDialog
        open={detailOpen}
        appointment={appointment}
        onClose={() => setDetailOpen(false)}
        onEdit={(a) => { setDetailOpen(false); onEdit(a); }}
        onDelete={(a) => { setDetailOpen(false); onDelete(a); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}