"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Paper, Divider, MenuItem, Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import MistakeCard from "../../components/MistakeCard";
import MistakeFormDialog from "../../components/MistakeFormDialog";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

const PERSON_TYPES = ["", "Self", "TeamMember", "Other"];
const STATUSES = ["", "Open", "Resolved"];
const SEVERITIES = ["", "Minor", "Moderate", "Serious"];

function MistakesInner() {
  const [mistakes, setMistakes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [personType, setPersonType] = useState("");
  const [personUser, setPersonUser] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingMistake, setEditingMistake] = useState(null);

  const loadSummary = () => api.get("/mistakes/summary").then((res) => setSummary(res.data)).catch(() => {});
  const loadRefs = () => {
    api.get("/mistakes/categories").then((res) => setCategories(res.data || [])).catch(() => {});
    api.get("/mistakes/people").then((res) => setPeople(res.data || [])).catch(() => {});
  };

  const loadMistakes = () => {
    setLoading(true);
    api
      .get("/mistakes", { params: { search, personType, personUser, category, status, severity, limit: 100 } })
      .then((res) => setMistakes(res.data.mistakes || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSummary(); loadRefs(); }, []);
  useEffect(() => {
    const t = setTimeout(loadMistakes, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, personType, personUser, category, status, severity]);

  const openNew = () => { setEditingMistake(null); setFormOpen(true); };
  const openEdit = (m) => { setEditingMistake(m); setFormOpen(true); };
  const handleSaved = () => { setFormOpen(false); loadMistakes(); loadSummary(); };
  const handleUpdated = () => { loadMistakes(); loadSummary(); };

  const clearFilters = () => { setSearch(""); setPersonType(""); setPersonUser(""); setCategory(""); setStatus(""); setSeverity(""); };
  const hasFilters = search.trim() !== "" || personType || personUser || category || status || severity;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <ReportProblemIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Mistake Tracker</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>Notice patterns, stop repeating them</Typography>
            </Box>
          </Stack>

          <Button variant="contained" size="small" startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />} onClick={openNew} sx={{ minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
            Log Mistake
          </Button>
        </Stack>

        {summary && (
          <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.75 }}>
            <Grid item xs={6} sm={3}><StatCard icon={<ReportProblemIcon />} label="Total Mistakes" value={summary.totalMistakes} color="#A78BFA" bg="rgba(139,92,246,0.15)" /></Grid>
            <Grid item xs={6} sm={3}><StatCard icon={<ReportProblemIcon />} label="Total Repeats" value={summary.totalOccurrences} color="#F87171" bg="rgba(248,113,113,0.15)" /></Grid>
            <Grid item xs={6} sm={3}><StatCard icon={<ReportProblemIcon />} label="This Month" value={summary.thisMonthOccurrences} color="#FB923C" bg="rgba(251,146,60,0.15)" /></Grid>
            <Grid item xs={6} sm={3}><StatCard icon={<ReportProblemIcon />} label="Still Open" value={summary.openCount} color="#60A5FA" bg="rgba(96,165,250,0.15)" /></Grid>
          </Grid>
        )}

        {summary?.mostRepeated?.length > 0 && (
          <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>MOST REPEATED</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {summary.mostRepeated.map((m) => (
                <Paper key={m._id} elevation={0} sx={{ px: 1.2, py: 0.7, borderRadius: 2, bgcolor: "rgba(248,113,113,0.1)", border: "1px solid", borderColor: "rgba(248,113,113,0.3)" }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{m.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{m.personName} — {m.occurrenceCount}× repeated</Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>
        )}

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search mistakes..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Who" value={personType} onChange={(e) => { setPersonType(e.target.value); setPersonUser(""); }} sx={{ minWidth: 120, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {PERSON_TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "Everyone"}</MenuItem>)}
              </TextField>
              {personType === "TeamMember" && (
                <TextField select size="small" label="Person" value={personUser} onChange={(e) => setPersonUser(e.target.value)} sx={{ minWidth: 140, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                  <MenuItem value="">All</MenuItem>
                  {people.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
                </TextField>
              )}
              <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                <MenuItem value="">All</MenuItem>
                {categories.map((c) => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} sx={{ minWidth: 120, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {SEVERITIES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 120, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All"}</MenuItem>)}
              </TextField>
              {hasFilters && <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "primary.light", fontWeight: 650 }}>Clear all</Button>}
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
          </Paper>
        ) : mistakes.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <ReportProblemIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>Nothing logged</Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={openNew} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Log your first mistake
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {mistakes.map((m) => (
              <MistakeCard key={m._id} mistake={m} onEdit={openEdit} onUpdated={handleUpdated} />
            ))}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Mistake Tracker</Typography>
      </Container>

      <MistakeFormDialog
        open={formOpen}
        mistake={editingMistake}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
        onDeleted={handleSaved}
      />
    </Box>
  );
}

export default function MistakesPage() {
  return (
    <ProtectedRoute>
      <MistakesInner />
    </ProtectedRoute>
  );
}