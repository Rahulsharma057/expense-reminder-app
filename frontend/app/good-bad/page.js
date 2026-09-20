"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Paper, Divider, MenuItem, Grid, Chip, IconButton, LinearProgress,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import { toast } from "react-toastify";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";
import GoodBadEntryDialog from "../../components/GoodBadEntryDialog";
import api from "../../lib/api";

const TYPES = ["", "Good", "Bad"];

function GoodBadInner() {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [defaultType, setDefaultType] = useState("Good");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/good-bad", { params: { search, type, limit: 100 } }),
      api.get("/good-bad/summary"),
    ]).then(([entriesRes, summaryRes]) => {
      setEntries(entriesRes.data.entries || []);
      setSummary(summaryRes.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type]);

  const openNew = (t) => { setEditingEntry(null); setDefaultType(t); setDialogOpen(true); };
  const openEdit = (entry) => { setEditingEntry(entry); setDialogOpen(true); };
  const handleSaved = () => { setDialogOpen(false); load(); };

  const handleDelete = async (entry) => {
    if (!window.confirm("Delete this entry?")) return;
    await api.delete(`/good-bad/${entry._id}`);
    toast.success("Deleted.");
    load();
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <AutoAwesomeIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Good &amp; Bad Things</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>A running log of what went right and wrong</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" color="success" startIcon={<SentimentSatisfiedAltIcon sx={{ fontSize: 17 }} />} onClick={() => openNew("Good")} sx={{ minHeight: 38, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 11.5 }}>Good</Button>
            <Button variant="outlined" size="small" color="error" startIcon={<SentimentDissatisfiedIcon sx={{ fontSize: 17 }} />} onClick={() => openNew("Bad")} sx={{ minHeight: 38, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: 11.5 }}>Bad</Button>
          </Stack>
        </Stack>

        {summary && (
          <>
            <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.25 }}>
              <Grid item xs={4}><StatCard icon={<SentimentSatisfiedAltIcon />} label="Good" value={summary.goodCount} color="#4ADE80" bg="rgba(74,222,128,0.15)" /></Grid>
              <Grid item xs={4}><StatCard icon={<SentimentDissatisfiedIcon />} label="Bad" value={summary.badCount} color="#F87171" bg="rgba(248,113,113,0.15)" /></Grid>
              <Grid item xs={4}><StatCard icon={<AutoAwesomeIcon />} label="Good %" value={`${summary.goodPercent}%`} color="#A78BFA" bg="rgba(139,92,246,0.15)" /></Grid>
            </Grid>
            <LinearProgress
              variant="determinate" value={summary.goodPercent}
              sx={{ mb: 2, height: 8, borderRadius: 4, bgcolor: "rgba(248,113,113,0.25)", "& .MuiLinearProgress-bar": { bgcolor: "#4ADE80", borderRadius: 4 } }}
            />
          </>
        )}

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField fullWidth size="small" placeholder="Search entries..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 2, minWidth: 180 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }} />
            <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
              {TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "All"}</MenuItem>)}
            </TextField>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}><CircularProgress size={28} /></Paper>
        ) : entries.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <Typography color="text.secondary">No entries yet.</Typography>
          </Paper>
        ) : (
          <Stack spacing={1}>
            {entries.map((entry) => (
              <Paper key={entry._id} elevation={0} sx={{ p: 1.4, borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                <Stack direction="row" alignItems="flex-start" spacing={1.2}>
                  <Chip size="small" label={entry.type} sx={{ bgcolor: entry.type === "Good" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)", color: entry.type === "Good" ? "#4ADE80" : "#F87171", fontWeight: 700, flexShrink: 0 }} />
                  <Stack sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2">{entry.text}</Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">{new Date(entry.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Typography>
                      {entry.category && <Chip size="small" label={entry.category} variant="outlined" sx={{ height: 18, fontSize: 9.5 }} />}
                    </Stack>
                  </Stack>
                  <Stack direction="row">
                    <IconButton size="small" onClick={() => openEdit(entry)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(entry)}><DeleteIcon fontSize="small" /></IconButton>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Good &amp; Bad Things Journal</Typography>
      </Container>

      <GoodBadEntryDialog open={dialogOpen} entry={editingEntry} defaultType={defaultType} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
    </Box>
  );
}

export default function GoodBadPage() {
  return (
    <ProtectedRoute>
      <GoodBadInner />
    </ProtectedRoute>
  );
}