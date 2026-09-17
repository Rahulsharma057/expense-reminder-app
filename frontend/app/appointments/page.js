"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Paper, Divider, MenuItem, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EventIcon from "@mui/icons-material/Event";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import SettingsIcon from "@mui/icons-material/Settings";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import AppointmentCard from "../../components/AppointmentCard";
import AppointmentTable from "../../components/AppointmentTable";
import BrandSettingsDialog from "../../components/BrandSettingsDialog";
import api from "../../lib/api";

const TYPES = ["", "Appointment", "Meeting", "Meeting with Food"];
const STATUSES = ["", "Scheduled", "Rescheduled", "Completed", "Cancelled"];

function AppointmentsInner() {
  const router = useRouter();

  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState("card");
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);

  const sentinelRef = useRef(null);

  const loadPage = (pageNum, replace) => {
    const setter = pageNum === 1 ? setLoading : setLoadingMore;
    setter(true);
    api
      .get("/appointments", { params: { page: pageNum, limit: 15, search, type, status } })
      .then((res) => {
        setAppointments((prev) => (replace ? res.data.appointments : [...prev, ...res.data.appointments]));
        setHasMore(res.data.pagination?.hasMore ?? false);
        setPage(pageNum);
      })
      .finally(() => setter(false));
  };

  useEffect(() => {
    const t = setTimeout(() => loadPage(1, true), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, status]);

  // Lazy loading — IntersectionObserver watches a sentinel div at the bottom
  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    loadPage(page + 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadingMore, hasMore, page, search, type, status]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleDelete = async (appointment) => {
    if (!window.confirm(`Delete "${appointment.title}"?`)) return;
    await api.delete(`/appointments/${appointment._id}`);
    loadPage(1, true);
  };

  const handleUpdated = () => loadPage(1, true);

  const clearFilters = () => { setSearch(""); setType(""); setStatus(""); };
  const hasFilters = search.trim() !== "" || type || status;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }} flexWrap="wrap" useFlexGap>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <EventIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Appointments</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>Schedule, track &amp; arrange</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<SettingsIcon sx={{ fontSize: 16 }} />} onClick={() => setBrandDialogOpen(true)} sx={{ minHeight: 38, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11, sm: 12 } }}>
              Signature &amp; Logo
            </Button>
            <Button variant="contained" size="small" startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />} onClick={() => router.push("/appointments/new")} sx={{ minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
              New
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by title, location or attendee..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 140, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "All Types"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
              <ToggleButtonGroup exclusive size="small" value={view} onChange={(_e, v) => v && setView(v)}>
                <ToggleButton value="card"><ViewModuleIcon fontSize="small" /></ToggleButton>
                <ToggleButton value="table"><ViewListIcon fontSize="small" /></ToggleButton>
              </ToggleButtonGroup>
              {hasFilters && <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "primary.light", fontWeight: 650 }}>Clear all</Button>}
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={30} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.25, fontSize: 12, color: "text.secondary" }}>Loading...</Typography>
          </Paper>
        ) : appointments.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <EventIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No appointments found</Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/appointments/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Schedule your first appointment
              </Button>
            )}
          </Paper>
        ) : view === "table" ? (
          <AppointmentTable appointments={appointments} onEdit={(a) => router.push(`/appointments/${a._id}`)} onDelete={handleDelete} onUpdated={handleUpdated} />
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {appointments.map((a) => (
              <AppointmentCard key={a._id} appointment={a} onEdit={(x) => router.push(`/appointments/${x._id}`)} onDelete={handleDelete} onUpdated={handleUpdated} />
            ))}
          </Stack>
        )}

        {/* Lazy-load sentinel */}
        <Box ref={sentinelRef} sx={{ height: 20, display: "flex", justifyContent: "center", alignItems: "center", mt: 1 }}>
          {loadingMore && <CircularProgress size={20} />}
        </Box>

        <Divider sx={{ mt: 2, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Appointments</Typography>
      </Container>

      <BrandSettingsDialog open={brandDialogOpen} onClose={() => setBrandDialogOpen(false)} />
    </Box>
  );
}

export default function AppointmentsPage() {
  return (
    <ProtectedRoute>
      <AppointmentsInner />
    </ProtectedRoute>
  );
}