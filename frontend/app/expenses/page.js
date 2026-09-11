"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Typography, Stack, TextField, InputAdornment, Button,
  CircularProgress, Pagination, Chip, MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ExpenseCard from "../../components/ExpenseCard";
import api from "../../lib/api";

const MODES = ["", "PhonePe", "Bank Transfer", "Cash", "Other"];

function ExpensesInner() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={800}>Expenses</Typography>
            <Typography variant="body2" color="text.secondary">
              Total shown: ₹{totalAmount.toLocaleString("en-IN")}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => router.push("/expenses/new")}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2.5, background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
          >
            Add
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, reason, transaction ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField
            select
            size="small"
            sx={{ minWidth: { xs: "100%", sm: 160 } }}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            {MODES.map((m) => (
              <MenuItem key={m || "all"} value={m}>{m || "All modes"}</MenuItem>
            ))}
          </TextField>
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : expenses.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography color="text.secondary">No expenses found.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onEdit={(e) => router.push(`/expenses/${e._id}`)}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}

        {!loading && totalPages > 1 && (
          <Stack direction="row" justifyContent="center" sx={{ mt: 3 }}>
            <Pagination count={totalPages} page={page} onChange={(_e, v) => load(v)} shape="rounded" />
          </Stack>
        )}
      </Container>
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
