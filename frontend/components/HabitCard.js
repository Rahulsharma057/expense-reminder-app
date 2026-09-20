"use client";

import { useEffect, useState } from "react";
import { Paper, Stack, Typography, IconButton, LinearProgress } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import BarChartIcon from "@mui/icons-material/BarChart";
import api from "../lib/api";

const toInputDate = (d) => new Date(d).toISOString().slice(0, 10);

export default function HabitCard({ habit, onEdit, onViewStats }) {
  const [percent, setPercent] = useState(null);

  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    api
      .get(`/habits/${habit._id}/stats`, { params: { from: toInputDate(from), to: toInputDate(to) } })
      .then((res) => setPercent(res.data.current.percent))
      .catch(() => {});
  }, [habit._id]);

  const color = habit.type === "Good" ? "#4ADE80" : "#F87171";

  return (
    <Paper elevation={0} sx={{ p: 1.6, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Stack sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={800} noWrap>{habit.title}</Typography>
          {habit.description && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>{habit.description}</Typography>}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate" value={percent ?? 0}
              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }}
            />
            <Typography variant="caption" fontWeight={700}>{percent === null ? "-" : `${percent}%`}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.3 }}>Last 7 days</Typography>
        </Stack>
        <Stack direction="row">
          <IconButton size="small" onClick={() => onViewStats(habit)}><BarChartIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => onEdit(habit)}><EditIcon fontSize="small" /></IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}