"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Stack, TextField, Typography, LinearProgress, Chip, Divider, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import api from "../lib/api";

const toInputDate = (d) => new Date(d).toISOString().slice(0, 10);

export default function HabitStatsDialog({ open, habit, onClose }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(toInputDate(new Date()));
  const [stats, setStats] = useState(null);
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && habit) {
      const defaultFrom = new Date();
      defaultFrom.setDate(defaultFrom.getDate() - 29);
      setFrom(toInputDate(defaultFrom));
      setTo(toInputDate(new Date()));
    }
  }, [open, habit]);

  useEffect(() => {
    if (!open || !habit || !from || !to) return;
    setLoading(true);
    Promise.all([
      api.get(`/habits/${habit._id}/stats`, { params: { from, to } }),
      api.get(`/habits/${habit._id}/reasons`, { params: { from, to } }),
    ])
      .then(([statsRes, reasonsRes]) => { setStats(statsRes.data); setReasons(reasonsRes.data); })
      .finally(() => setLoading(false));
  }, [open, habit, from, to]);

  if (!habit) return null;

  const trendIcon = stats?.trend === "up" ? <TrendingUpIcon fontSize="small" /> : stats?.trend === "down" ? <TrendingDownIcon fontSize="small" /> : <TrendingFlatIcon fontSize="small" />;
  const goodTrend = habit.type === "Good" ? stats?.trend === "up" : stats?.trend === "down";
  const trendColor = stats?.trend === "same" ? "#94a3b8" : goodTrend ? "#4ADE80" : "#F87171";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {habit.title} — Trend
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
          <TextField size="small" type="date" label="From" fullWidth value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" fullWidth value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>

        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={24} /></Stack>
        ) : stats ? (
          <>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="h4" fontWeight={800}>{stats.current.percent}%</Typography>
              <Chip
                size="small" icon={trendIcon}
                label={`${stats.diff > 0 ? "+" : ""}${stats.diff}% vs previous period`}
                sx={{ bgcolor: `${trendColor}26`, color: trendColor, fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              {habit.type === "Good" ? "Success rate" : "Avoidance rate (higher is better)"} — {stats.current.successCount}/{stats.current.totalDays} days, {stats.current.loggedCount} logged
            </Typography>
            <LinearProgress
              variant="determinate" value={stats.current.percent}
              sx={{ height: 8, borderRadius: 4, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: trendColor, borderRadius: 4 } }}
            />

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
              MOST COMMON REASONS IN THIS PERIOD
            </Typography>
            {reasons.length ? (
              <Stack spacing={0.8}>
                {reasons.slice(0, 8).map((r) => (
                  <Stack key={r.reason} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ flex: 1 }}>{r.reason}</Typography>
                    <Chip size="small" label={r.count} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">No reasons logged in this period.</Typography>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}