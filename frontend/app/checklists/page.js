"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Paper, Divider, MenuItem,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ChecklistIcon from "@mui/icons-material/Checklist";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ChecklistCard from "../../components/ChecklistCard";
import api from "../../lib/api";
import { enablePushNotifications } from "../../lib/push";
import { toast } from "react-toastify";

const TYPES = ["", "One-time", "Daily", "Weekly"];
const STATUSES = ["", "Active", "Completed", "Cancelled"];

function ChecklistsInner() {
  const router = useRouter();

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/checklists", { params: { page: pageNum, limit: 12, search, type, status } })
      .then((res) => {
        setChecklists(res.data.checklists || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setPage(res.data.pagination?.page || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type, status]);

  const handleDelete = async (checklist) => {
    if (!window.confirm(`Delete "${checklist.title}"?`)) return;
    await api.delete(`/checklists/${checklist._id}`);
    load(page);
  };

  const handleEnableNotifications = async () => {
    const result = await enablePushNotifications();
    if (result.ok) toast.success("Notifications enabled — you'll get alerts even when the app is closed.");
    else if (result.reason === "denied") toast.error("Notification permission denied.");
    else toast.error("Push notifications aren't supported in this browser.");
  };

  const clearFilters = () => { setSearch(""); setType(""); setStatus(""); };
  const hasFilters = search.trim() !== "" || type || status;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <ChecklistIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Checklists</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Assign, track &amp; complete tasks
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" size="small" startIcon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />}
              onClick={handleEnableNotifications}
              sx={{ minHeight: 38, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11, sm: 12 } }}
            >
              Notify
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
              onClick={() => router.push("/checklists/new")}
              sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}
            >
              New
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by title..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 120, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "All Types"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
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
        ) : checklists.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <ChecklistIcon sx={{ fontSize: 32, color: "primary.main", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No checklists found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Create a checklist and assign it to someone."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/checklists/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Create your first checklist
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {checklists.map((checklist) => (
              <ChecklistCard key={checklist._id} checklist={checklist} onEdit={(c) => router.push(`/checklists/${c._id}`)} onDelete={handleDelete} onUpdated={() => load(page)} />
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
          Checklist Manager
        </Typography>
      </Container>
    </Box>
  );
}

export default function ChecklistsPage() {
  return (
    <ProtectedRoute>
      <ChecklistsInner />
    </ProtectedRoute>
  );
}