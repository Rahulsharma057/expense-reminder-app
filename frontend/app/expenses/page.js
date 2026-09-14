"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Chip, MenuItem, Paper, Divider,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ExpenseCard from "../../components/ExpenseCard";
import ExcelExportDialog from "../../components/ExcelExportDialog";
import api from "../../lib/api";
import { downloadBlobResponse } from "../../lib/download";

const MODES = ["", "PhonePe", "Bank Transfer", "Cash", "Other"];
const CLAIM_ACTIONS = ["Not Claimed", "Claimed", "Received"];

function ExpensesInner() {
  const router = useRouter();

  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const load = (pageNum = 1) => {
    setLoading(true);
    api
      .get("/expenses", { params: { page: pageNum, limit: 12, search, mode } })
      .then((res) => {
        setExpenses(res.data.expenses || []);
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
  }, [search, mode]);

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete the ₹${expense.amount} entry for ${expense.recipientName}?`)) return;
    await api.delete(`/expenses/${expense._id}`);
    load(page);
  };

  const clearFilters = () => {
    setSearch("");
    setMode("");
    setPage(1);
  };

  const handleReportDownload = async () => {
    setReportDownloading(true);
    try {
      const res = await api.get("/expenses/report/pdf", { responseType: "blob" });
      downloadBlobResponse(res, "expense_report.pdf");
    } catch {
      toast.error("Could not download PDF report.");
    } finally {
      setReportDownloading(false);
    }
  };

  const toggleSelectMode = () => {
    setSelectMode((m) => !m);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleLongPress = (id) => {
    setSelectMode(true);
    setSelectedIds([id]);
  };

  const handleBulkClaim = async (claimStatus) => {
    if (!selectedIds.length) return;
    setBulkUpdating(true);
    try {
      await api.patch("/expenses/bulk/claim", { ids: selectedIds, claimStatus });
      toast.success(`Marked ${selectedIds.length} expense(s) as ${claimStatus}.`);
      setSelectMode(false);
      setSelectedIds([]);
      load(page);
    } catch {
      toast.error("Could not update claim status.");
    } finally {
      setBulkUpdating(false);
    }
  };

  const hasFilters = search.trim() !== "" || mode !== "";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 2.5, md: 3 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* PAGE HEADER */}
        <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 2.25, md: 2.5 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={{ xs: 1.75, sm: 2 }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                <Box sx={{ width: 38, height: 38, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
                  <ReceiptLongRoundedIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: { xs: 20, sm: 22, md: 24 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary", whiteSpace: "nowrap" }}>Expenses</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: { xs: 11.5, sm: 12.5 }, color: "text.secondary" }}>Track and manage your expenses</Typography>
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" alignItems="center" justifyContent={{ xs: "space-between", sm: "flex-end" }} spacing={1} flexWrap="wrap" useFlexGap>
              <Box sx={{ minWidth: { xs: 0, sm: 125 }, px: { xs: 1.25, sm: 1.5 }, py: 0.9, borderRadius: 2, bgcolor: "rgba(139,92,246,0.12)", border: "1px solid", borderColor: "divider" }}>
                <Typography sx={{ fontSize: 9.5, color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>Total shown</Typography>
                <Typography sx={{ mt: 0.15, fontSize: { xs: 14, sm: 16 }, fontWeight: 800, color: "primary.light", whiteSpace: "nowrap" }}>₹{totalAmount.toLocaleString("en-IN")}</Typography>
              </Box>

              <Button variant={selectMode ? "contained" : "outlined"} size="small" startIcon={<PlaylistAddCheckIcon />} onClick={toggleSelectMode} sx={{ textTransform: "none", borderRadius: 2, whiteSpace: "nowrap" }}>
                {selectMode ? "Cancel Select" : "Select"}
              </Button>

              <Button variant="outlined" size="small" startIcon={<GridOnIcon />} onClick={() => setExcelDialogOpen(true)} sx={{ textTransform: "none", borderRadius: 2, whiteSpace: "nowrap" }}>
                Excel
              </Button>

              <Button variant="outlined" size="small" startIcon={reportDownloading ? <CircularProgress size={14} /> : <PictureAsPdfIcon />} onClick={handleReportDownload} disabled={reportDownloading} sx={{ textTransform: "none", borderRadius: 2, whiteSpace: "nowrap" }}>
                Report PDF
              </Button>

              <Button
                variant="contained"
                startIcon={<AddCircleIcon sx={{ fontSize: "20px !important" }} />}
                onClick={() => router.push("/expenses/new")}
                sx={{
                  minHeight: { xs: 43, sm: 46 }, px: { xs: 1.75, sm: 2.25 }, borderRadius: 2.25, textTransform: "none",
                  fontWeight: 700, fontSize: { xs: 13, sm: 14 }, whiteSpace: "nowrap",
                  background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                }}
              >
                Add Expense
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* BULK SELECT BAR */}
        {selectMode && (
          <Paper elevation={0} sx={{ p: 1.25, mb: 1.75, borderRadius: 2.5, border: "1px solid", borderColor: "primary.main", bgcolor: "background.paper", display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, mr: 1 }}>
              {selectedIds.length} selected — mark as:
            </Typography>
            {CLAIM_ACTIONS.map((status) => (
              <Button key={status} size="small" variant="outlined" disabled={!selectedIds.length || bulkUpdating} onClick={() => handleBulkClaim(status)} sx={{ textTransform: "none", borderRadius: 2 }}>
                {bulkUpdating ? <CircularProgress size={14} /> : status}
              </Button>
            ))}
            <Button size="small" onClick={toggleSelectMode} sx={{ ml: "auto", textTransform: "none" }}>Cancel</Button>
          </Paper>
        )}

        {/* SEARCH + FILTER */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 1.75, md: 2 }, mb: 2.25, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ xs: "stretch", sm: "center" }}>
            <TextField
              fullWidth size="small" placeholder="Search by name, reason or transaction ID..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }}
            />
            <TextField select size="small" value={mode} onChange={(e) => setMode(e.target.value)} sx={{ width: { xs: "100%", sm: 185 }, flexShrink: 0 }} SelectProps={{ displayEmpty: true }}>
              {MODES.map((m) => <MenuItem key={m || "all"} value={m}>{m || "All payment modes"}</MenuItem>)}
            </TextField>
            <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.6, px: 1.25, color: "primary.light", whiteSpace: "nowrap" }}>
              <FilterAltOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 650 }}>Filter</Typography>
            </Box>
            {hasFilters && <Button onClick={clearFilters} sx={{ minHeight: 40, flexShrink: 0, px: 1.25, borderRadius: 1.75, color: "primary.light", textTransform: "none", fontSize: 12, fontWeight: 650 }}>Clear</Button>}
          </Stack>

          {hasFilters && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 1.25, pt: 1.25, borderTop: "1px solid", borderColor: "divider" }}>
              <Typography sx={{ fontSize: 11, color: "text.secondary", alignSelf: "center", mr: 0.25 }}>Active:</Typography>
              {search && <Chip label={`Search: ${search}`} size="small" onDelete={() => setSearch("")} sx={{ height: 27, fontSize: 10.5, bgcolor: "rgba(139,92,246,0.15)", color: "primary.light" }} />}
              {mode && <Chip label={mode} size="small" onDelete={() => setMode("")} sx={{ height: 27, fontSize: 10.5, bgcolor: "rgba(139,92,246,0.15)", color: "primary.light" }} />}
            </Stack>
          )}
        </Paper>

        {!loading && expenses.length > 0 && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25, px: 0.25 }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <PaymentsRoundedIcon sx={{ fontSize: 17, color: "primary.main" }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>Recent expenses</Typography>
            </Stack>
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{expenses.length} shown</Typography>
          </Stack>
        )}

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <CircularProgress size={34} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.5, fontSize: 12, color: "text.secondary" }}>Loading expenses...</Typography>
          </Paper>
        ) : expenses.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", px: 2, borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <Box sx={{ width: 68, height: 68, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "rgba(139,92,246,0.15)", color: "primary.main", mb: 1.5 }}>
              <ReceiptLongRoundedIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography sx={{ fontSize: 17, fontWeight: 750, color: "text.primary" }}>No expenses found</Typography>
            <Typography sx={{ mt: 0.5, maxWidth: 360, fontSize: 12, lineHeight: 1.6, color: "text.secondary" }}>
              {hasFilters ? "Try changing your search or payment mode filter." : "Start tracking your expenses by adding your first expense."}
            </Typography>
            {hasFilters ? (
              <Button onClick={clearFilters} sx={{ mt: 2, textTransform: "none", fontWeight: 700, color: "primary.light", borderRadius: 2 }}>Clear filters</Button>
            ) : (
              <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => router.push("/expenses/new")} sx={{ mt: 2, textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
                Add your first expense
              </Button>
            )}
          </Paper>
        ) : (
          <Stack spacing={{ xs: 1.25, sm: 1.5 }}>
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onEdit={(e) => router.push(`/expenses/${e._id}`)}
                onDelete={handleDelete}
                onClaimUpdated={() => load(page)}
                selectable={selectMode}
                selected={selectedIds.includes(expense._id)}
                onToggleSelect={toggleSelect}
                onLongPress={handleLongPress}
              />
            ))}
          </Stack>
        )}

        {!loading && totalPages > 1 && (
          <Paper elevation={0} sx={{ mt: 2.5, py: 1.25, display: "flex", justifyContent: "center", borderRadius: 2.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Pagination count={totalPages} page={page} onChange={(_event, value) => load(value)} shape="rounded" siblingCount={0} boundaryCount={1} />
          </Paper>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>
          Expense Reminder • Manage your money smarter
        </Typography>
      </Container>

      <ExcelExportDialog open={excelDialogOpen} onClose={() => setExcelDialogOpen(false)} />
    </Box>
  );
}

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesInner />
    </ProtectedRoute>
  );
}