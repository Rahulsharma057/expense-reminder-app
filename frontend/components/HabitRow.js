"use client";

import { useState } from "react";
import { Paper, Stack, Typography, Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HabitLogDialog from "./HabitLogDialog";

export default function HabitRow({ item, date, onSaved }) {
  const [logOpen, setLogOpen] = useState(false);
  const { habit, log, success } = item;

  const statusColor = success === null ? "#94a3b8" : success ? "#4ADE80" : "#F87171";
  const statusLabel = success === null ? "Not logged" : success ? "Success" : "Missed";

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setLogOpen(true)}
        sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Stack sx={{ minWidth: 0 }}>
            <Typography fontWeight={700} noWrap>{habit.title}</Typography>
            <Chip size="small" label={habit.type} sx={{ mt: 0.4, height: 18, fontSize: 9.5, bgcolor: habit.type === "Good" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: habit.type === "Good" ? "#4ADE80" : "#F87171", fontWeight: 700 }} />
          </Stack>
          <Chip
            size="small"
            icon={success === null ? undefined : success ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <CancelIcon sx={{ fontSize: 14 }} />}
            label={statusLabel}
            sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }}
          />
        </Stack>
      </Paper>

      <HabitLogDialog
        open={logOpen}
        habit={habit}
        date={date}
        existingLog={log}
        onClose={() => setLogOpen(false)}
        onSaved={() => { setLogOpen(false); onSaved?.(); }}
      />
    </>
  );
}