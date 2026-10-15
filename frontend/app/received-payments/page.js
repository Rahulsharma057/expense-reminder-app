"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Chip, MenuItem, Paper, Divider, Grid,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CallReceivedRoundedIcon from "@mui/icons-material/CallReceivedRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ReceivedPaymentCard from "../../components/ReceivedPaymentCard";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

const STATUSES = ["", "unknown", "pending", "successful", "failed"];
const SOURCES = ["", "shared_image", "shared_text", "manual_upload"];

function ReceivedPaymentsInner() {
  const router = useRouter();

  const [records, setRecords] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/received-payments", { params: { page: pageNum, limit: 12, search, status, source } })
      .then((res) => {
        setRecords(res.data.records || []);
        setTotalAmount(res.data.totalAmount || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setPage(res.data.pagination?.page || 1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, source]);

  const handleDelete = async (payment) => {
    if (!window.confirm(`Delete the ₹${payment.amount} payment from ${payment.payerName || "this payer"}?`)) return;
    try {
      await api.delete(`/received-payments/${payment._id}`);
      load(page);
    } catch {
      toast.error("Could not delete this record.");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setSource("");
  };

  const hasFilters = search.trim() !== "" || status !== "" || source !== "";
  // Every saved record is "manually_confirmed" by the time it reaches the
  // database (nothing auto-saves), so "needs review" here means status
  // couldn't be determined from the screenshot/text, not that the user
  // never looked at it.
  const needsReviewCount = records.filter((r) => r.status === "unknown").length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        {/* HEADER */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #34D399, #059669)", color: "#FFFFFF" }}>
              <CallReceivedRoundedIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Received Payments</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
                Money received via UPI, bank transfer, cash or other modes
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined" size="small"
              startIcon={<SwapVertRoundedIcon sx={{ fontSize: 18 }} />}
              onClick={() => router.push("/transactions/import")}
              sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.2, sm: 1.75 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap" }}
            >
              Import Screenshot
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
              onClick={() => router.push("/received-payments/new")}
              sx={{ flexShrink: 0, minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, whiteSpace: "nowrap", background: "linear-gradient(135deg, #34D399, #059669)" }}
            >
              Add Payment
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={{ p: 1.5, mb: 1.75, borderRadius: 2.5, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
          <Typography variant="caption" color="text.secondary">
            Tip: on Android, install this app (Add to Home Screen in Chrome), then you can share a PhonePe/Google
            Pay/WhatsApp screenshot straight into it from the share menu — it'll ask you to confirm whether it was
            money received or sent. Haven't installed it yet, or want to do it from here? Use "Import Screenshot"
            above for the same direction-aware OCR flow, or "Add Payment" if you already know this was money you
            received.
          </Typography>
        </Paper>

        {/* SUMMARY STATS */}
        <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: 1.75 }}>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<CallReceivedRoundedIcon />} label="Total Received (shown)" value={`₹${totalAmount.toLocaleString("en-IN")}`} color="#059669" bg="rgba(16,185,129,0.15)" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<CallReceivedRoundedIcon />} label="Records Shown" value={records.length} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
          </Grid>
          <Grid item xs={6} sm={4}>
            <StatCard icon={<CallReceivedRoundedIcon />} label="Status Unknown (this page)" value={needsReviewCount} color="#FBBF24" bg="rgba(251,191,36,0.15)" />
          </Grid>
        </Grid>

        {/* SEARCH + FILTERS */}
        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack spacing={1.25}>
            <TextField
              fullWidth size="small" placeholder="Search by payer, receiver, transaction ID or note..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {STATUSES.map((s) => <MenuItem key={s || "all"} value={s}>{s || "All Statuses"}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Source" value={source} onChange={(e) => setSource(e.target.value)} sx={{ minWidth: 150, flex: 1 }} SelectProps={{ displayEmpty: true }}>
                {SOURCES.map((s) => <MenuItem key={s || "all"} value={s}>{s ? s.replace("_", " ") : "All Sources"}</MenuItem>)}
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
        ) : records.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <CallReceivedRoundedIcon sx={{ fontSize: 32, color: "#059669", opacity: 0.6, mb: 1 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 750, color: "text.primary" }}>No received payments yet</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 320, fontSize: 12, color: "text.secondary" }}>
              {hasFilters ? "Try changing your filters." : "Import a payment screenshot or add one manually."}
            </Typography>
            {!hasFilters && (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/received-payments/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #34D399, #059669)" }}>
                Add first payment
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.1, sm: 1.35 }}>
            {records.map((payment) => (
              <ReceivedPaymentCard
                key={payment._id}
                payment={payment}
                onEdit={(p) => router.push(`/received-payments/${p._id}`)}
                onDelete={handleDelete}
              />
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
          Expense Reminder • Received Payments
        </Typography>
      </Container>
    </Box>
  );
}

export default function ReceivedPaymentsPage() {
  return (
    <ProtectedRoute>
      <ReceivedPaymentsInner />
    </ProtectedRoute>
  );
}
