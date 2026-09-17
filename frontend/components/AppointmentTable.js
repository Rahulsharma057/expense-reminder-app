"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Stack } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AppointmentDetailDialog from "./AppointmentDetailDialog";

const STATUS_COLORS = { Scheduled: "#60A5FA", Rescheduled: "#FBBF24", Completed: "#4ADE80", Cancelled: "#F87171" };

export default function AppointmentTable({ appointments, onEdit, onDelete, onUpdated }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Title", "Type", "Date & Time", "Duration", "Attendees", "Status", "Cost", ""].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700, color: "text.secondary", whiteSpace: "nowrap" }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.map((a) => (
              <TableRow key={a._id} hover onClick={() => setSelected(a)} sx={{ cursor: "pointer" }}>
                <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{new Date(a.dateTime).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                <TableCell>{a.duration} min</TableCell>
                <TableCell>{a.attendees?.length || 0}</TableCell>
                <TableCell>
                  <Chip size="small" label={a.status} sx={{ bgcolor: `${STATUS_COLORS[a.status]}26`, color: STATUS_COLORS[a.status], fontWeight: 700 }} />
                </TableCell>
                <TableCell>{a.arrangementTotal ? `₹${a.arrangementTotal.toLocaleString("en-IN")}` : "-"}</TableCell>
                <TableCell>
                  <Stack direction="row">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(a); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(a); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AppointmentDetailDialog
        open={!!selected}
        appointment={selected}
        onClose={() => setSelected(null)}
        onEdit={(a) => { setSelected(null); onEdit(a); }}
        onDelete={(a) => { setSelected(null); onDelete(a); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}