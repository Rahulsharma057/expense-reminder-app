"use client";

import { Paper, Stack, Typography, Chip, LinearProgress } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";

const TYPE_COLORS = { Grocery: "#4ADE80", Travel: "#60A5FA", Outing: "#FBBF24", Festival: "#FB923C", Custom: "#A78BFA" };

export default function ShoppingListCard({ list, onClick }) {
  const color = TYPE_COLORS[list.type] || "#94a3b8";
  const { stats } = list;
  const donePercent = stats.totalItems ? Math.round((stats.purchasedCount / stats.totalItems) * 100) : 0;

  return (
    <Paper elevation={0} onClick={onClick} sx={{ p: 1.6, borderRadius: 3, border: "1px solid", borderColor: stats.overBudget ? "rgba(248,113,113,0.5)" : "divider", bgcolor: "background.paper", cursor: "pointer", "&:hover": { borderColor: "rgba(139,92,246,0.5)" } }}>
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Stack sx={{ width: 40, height: 40, flexShrink: 0, borderRadius: 2, bgcolor: `${color}26`, color, alignItems: "center", justifyContent: "center" }}>
          <ShoppingCartIcon fontSize="small" />
        </Stack>
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={800} noWrap>{list.title}</Typography>
          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            <Chip size="small" label={list.type} sx={{ bgcolor: `${color}26`, color, fontWeight: 700 }} />
            <Chip size="small" label={`${stats.purchasedCount}/${stats.totalItems} bought`} variant="outlined" />
            {list.budget > 0 && <Chip size="small" label={stats.overBudget ? `Over by ₹${(stats.totalActual - list.budget).toLocaleString("en-IN")}` : `₹${stats.totalActual.toLocaleString("en-IN")}/₹${list.budget.toLocaleString("en-IN")}`} sx={{ bgcolor: stats.overBudget ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)", color: stats.overBudget ? "#F87171" : "#4ADE80", fontWeight: 700 }} />}
          </Stack>
          <LinearProgress variant="determinate" value={donePercent} sx={{ mt: 1, height: 5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 } }} />
        </Stack>
      </Stack>
    </Paper>
  );
}