"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Chip, MenuItem, Paper, Divider, Grid,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HandshakeIcon from "@mui/icons-material/Handshake";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import UdhaarCard from "../../components/UdhaarCard";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

const TYPES = ["", "Lent", "Borrowed"];
const CATEGORIES = ["", "Cash", "Item"];
const STATUSES = ["", "Pending", "Partially Returned", "Returned"];

function UdhaarInner() {
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadSummary = () => {
    api.get("/udhaar/summary").then((res) => setSummary(res.data)).catch(() => {});
  };

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/udhaar", { params: { page: pageNum, limit: 12, search, type, category, status, from, to, overdue: overdueOnly || undefined } })
      .then((res) => {
        setRecords(res.data.records || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setPage(res.data.pagination?.page || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSummary(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, category, status, overdueOnly, from, to]);

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete this ${record.type.toLowerCase()} entry for ${record.personName}?`)) return;
    await api.delete(`/udhaar/${record._id}`);
    load(page);
    loadSummary();
  };

  const handleUpdated = () => { load(page); loadSummary(); };

  const clearFilters = () => {
    setSearch(""); setType(""); setCategory(""); setStatus(""); setOverdueOnly(false); setFrom(""); setTo("");
  };

  const hasFilters = search.trim() !== "" || type || category || status || overdueOnly || from || to;
  const formatMoney = (v) => `₹${(v || 0).toLocaleString("en-IN")}`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        {/* HEADER */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <HandshakeIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Udhaar</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Track money &amp; items lent or borrowed
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained" size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
            onClick={() => router.push("/udhaar/new")}
            sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
          >
            Add Entry
          </Button>
        </Stack>

        {/* SUMMARY STATS */}
        <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.75 }}>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<HandshakeIcon />} label="To Receive (Lent)" value={formatMoney(summary?.totalLentPending)} color="#F87171" bg="rgba(248,113,113,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<HandshakeIcon />} label="To Pay (Borrowed)" value={formatMoney(summary?.totalBorrowedPending)} color="#4ADE80" bg="rgba(74,222,128,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<HandshakeIcon />} label="Pending Entries" value={summary?.pendingCount ?? 0} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <StatCard icon={<HandshakeIcon />} label="Overdue" value={summary?.overdueCount ?? 0} color="#FB923C" bg="rgba(251,146,60,0.15)" />
          </Grid>
        </Grid>

        {/* SEARCH + FILTERS */}
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by name, reason or item..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 110, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "All Types"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Category" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 110, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {CATEGORIES.map((c) => <MenuItem key={c || "all"} value={c}>{c || "All Categories"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} sx={{ minWidth: 140, flex: 1 }} />
              <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} sx={{ minWidth: 140, flex: 1 }} />
              <Chip
                icon={<FilterAltOutlinedIcon sx={{ fontSize: 16 }} />}
                label="Overdue only"
                onClick={() => setOverdueOnly((o) => !o)}
                sx={{ fontWeight: 700, cursor: "pointer", bgcolor: overdueOnly ? "rgba(248,113,113,0.2)" : "transparent", color: overdueOnly ? "#F87171" : "text.secondary", border: "1px solid", borderColor: overdueOnly ? "#F87171" : "divider" }}
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
        ) : records.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <HandshakeIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No records found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Track money or items you've lent or borrowed."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/udhaar/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Add first entry
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {records.map((record) => (
              <UdhaarCard key={record._id} record={record} onEdit={(r) => router.push(`/udhaar/${r._id}`)} onDelete={handleDelete} onUpdated={handleUpdated} />
            ))}
          </Stack>
        )}

        {!loading && totalPages > 1 && (
          <Paper elevation={0} sx={{ mt: 2.5, py: 1.25, display: "flex", justifyContent: "center", borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Pagination count={totalPages} page={page} onChange={(_e, value) => load(value)} shape="rounded" siblingCount={0} boundaryCount={1} />
          </Paper>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>
          Expense Reminder • Udhaar Manager
        </Typography>
      </Container>
    </Box>
  );
}

export default function UdhaarPage() {
  return (
    <ProtectedRoute>
      <UdhaarInner />
    </ProtectedRoute>
  );
}