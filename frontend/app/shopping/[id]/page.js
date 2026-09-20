"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box, Container, Typography, Stack, Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, Button, CircularProgress, IconButton, Chip, LinearProgress, Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-toastify";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ShoppingItemRow from "../../../components/ShoppingItemRow";
import api from "../../../lib/api";

function ListDetailInner() {
  const { id } = useParams();
  const router = useRouter();

  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newPrice, setNewPrice] = useState("");
  const [budgetInput, setBudgetInput] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/shopping/${id}`).then((res) => { setList(res.data); setBudgetInput(res.data.budget || ""); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const addItem = async () => {
    if (!newName.trim()) return;
    const res = await api.post(`/shopping/${id}/items`, { name: newName, quantity: newQty, estimatedPrice: newPrice || 0 });
    setList((prev) => ({ ...prev, items: [...prev.items, res.data.item], stats: res.data.stats }));
    setNewName(""); setNewQty("1"); setNewPrice("");
  };

  const handleItemUpdated = (updatedRes) => {
    setList((prev) => ({ ...prev, stats: updatedRes.stats, items: prev.items.map((i) => (i._id === updatedRes.item._id ? updatedRes.item : i)) }));
  };
  const handleItemDeleted = (res, itemId) => {
    setList((prev) => ({ ...prev, stats: res.stats, items: prev.items.filter((i) => i._id !== itemId) }));
  };

  const saveBudget = async () => {
    const res = await api.put(`/shopping/${id}`, { budget: budgetInput || 0 });
    setList(res.data);
    toast.success("Budget updated.");
  };

  const deleteList = async () => {
    if (!window.confirm(`Delete "${list.title}" and all its items?`)) return;
    await api.delete(`/shopping/${id}`);
    toast.success("List deleted.");
    router.push("/shopping");
  };

  if (loading || !list) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  const { stats } = list;
  const donePercent = stats.totalItems ? Math.round((stats.purchasedCount / stats.totalItems) * 100) : 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <IconButton size="small" onClick={() => router.push("/shopping")}><ArrowBackIcon fontSize="small" /></IconButton>
          <Typography sx={{ fontSize: { xs: 17, sm: 20 }, fontWeight: 800, color: "text.primary", flex: 1 }} noWrap>{list.title}</Typography>
          <IconButton size="small" color="error" onClick={deleteList}><DeleteIcon fontSize="small" /></IconButton>
        </Stack>

        <Paper elevation={0} sx={{ p: 1.6, mb: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 1 }}>
            <Chip label={list.type} sx={{ fontWeight: 700 }} />
            <Chip label={`${stats.purchasedCount}/${stats.totalItems} bought`} variant="outlined" />
            <Stack direction="row" spacing={0.75} alignItems="center">
              <TextField size="small" label="Budget" type="number" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} sx={{ width: 120 }} />
              <Button size="small" variant="outlined" onClick={saveBudget} sx={{ textTransform: "none" }}>Set</Button>
            </Stack>
          </Stack>

          <LinearProgress variant="determinate" value={donePercent} sx={{ height: 6, borderRadius: 3, bgcolor: "rgba(255,255,255,0.06)", "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 3 } }} />

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">Estimated: ₹{stats.totalEstimated.toLocaleString("en-IN")}</Typography>
            <Typography variant="caption" sx={{ color: stats.overBudget ? "#F87171" : "text.secondary", fontWeight: stats.overBudget ? 700 : 400 }}>
              Spent: ₹{stats.totalActual.toLocaleString("en-IN")}{list.budget > 0 ? ` / ₹${list.budget.toLocaleString("en-IN")}` : ""}
              {stats.overBudget && " — Over Budget!"}
            </Typography>
          </Stack>
        </Paper>

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">✓</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Item</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Qty</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Est. Price</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "text.secondary" }}>Actual Price</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.items.map((item) => (
                <ShoppingItemRow
                  key={item._id} listId={id} item={item}
                  onUpdated={handleItemUpdated}
                  onDeleted={(res) => handleItemDeleted(res, item._id)}
                />
              ))}
              <TableRow>
                <TableCell />
                <TableCell><TextField variant="standard" placeholder="Add item..." value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addItem()} InputProps={{ disableUnderline: true }} fullWidth /></TableCell>
                <TableCell><TextField variant="standard" placeholder="1" value={newQty} onChange={(e) => setNewQty(e.target.value)} InputProps={{ disableUnderline: true }} sx={{ width: 60 }} /></TableCell>
                <TableCell><TextField variant="standard" type="number" placeholder="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} InputProps={{ disableUnderline: true }} sx={{ width: 70 }} /></TableCell>
                <TableCell />
                <TableCell padding="checkbox"><IconButton size="small" onClick={addItem}><AddIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ opacity: 0.3 }} />
      </Container>
    </Box>
  );
}

export default function ListDetailPage() {
  return (
    <ProtectedRoute>
      <ListDetailInner />
    </ProtectedRoute>
  );
}