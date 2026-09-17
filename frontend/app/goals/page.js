"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Paper, Divider, MenuItem, Chip,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import GoalCard from "../../components/GoalCard";
import api from "../../lib/api";

const STATUSES = ["", "Not Started", "In Progress", "Achieved", "Delayed", "Abandoned"];

function GoalsInner() {
  const router = useRouter();

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/goals", { params: { search, status, delayed: delayedOnly || undefined, limit: 100 } })
      .then((res) => setGoals(res.data.goals || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, delayedOnly]);

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}"?`)) return;
    await api.delete(`/goals/${goal._id}`);
    load();
  };

  const clearFilters = () => { setSearch(""); setStatus(""); setDelayedOnly(false); };
  const hasFilters = search.trim() !== "" || status || delayedOnly;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <EmojiEventsIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Goals</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Track progress towards what matters
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained" size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
            onClick={() => router.push("/goals/new")}
            sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            New Goal
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by title..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
              <Chip
                icon={<FilterAltOutlinedIcon sx={{ fontSize: 16 }} />}
                label="Delayed only"
                onClick={() => setDelayedOnly((d) => !d)}
                sx={{ fontWeight: 700, cursor: "pointer", bgcolor: delayedOnly ? "rgba(248,113,113,0.2)" : "transparent", color: delayedOnly ? "#F87171" : "text.secondary", border: "1px solid", borderColor: delayedOnly ? "#F87171" : "divider" }}
              />
              {hasFilters && (
                <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "primary.light", fontWeight: 650 }}>
                  Clear all
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.25, fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
          </Paper>
        ) : goals.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <EmojiEventsIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No goals found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Set a goal and track your progress towards it."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/goals/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Create your first goal
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {goals.map((goal) => (
              <GoalCard key={goal._id} goal={goal} onEdit={(g) => router.push(`/goals/${g._id}`)} onDelete={handleDelete} onUpdated={load} />
            ))}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>
          Goal Tracker
        </Typography>
      </Container>
    </Box>
  );
}

export default function GoalsPage() {
  return (
    <ProtectedRoute>
      <GoalsInner />
    </ProtectedRoute>
  );
}