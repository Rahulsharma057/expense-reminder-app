"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Typography, Stack, TextField, InputAdornment, Button, CircularProgress, Paper, Divider, MenuItem } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ShoppingListCard from "../../components/ShoppingListCard";
import NewListDialog from "../../components/NewListDialog";
import api from "../../lib/api";

const TYPES = ["", "Grocery", "Travel", "Outing", "Festival", "Custom"];

function ShoppingInner() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/shopping", { params: { search, type } }).then((res) => setLists(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, type]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 2.5 }, px: { xs: 1.25, sm: 2, md: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1.75 }}>
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF" }}>
              <ShoppingCartIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>Shopping Lists</Typography>
              <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: "text.secondary", display: { xs: "none", sm: "block" } }}>Grocery, travel, outings — with budget tracking</Typography>
            </Box>
          </Stack>
          <Button variant="contained" size="small" startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />} onClick={() => setDialogOpen(true)} sx={{ minHeight: 38, px: { xs: 1.4, sm: 2 }, borderRadius: 2, textTransform: "none", fontWeight: 700, fontSize: { xs: 11.5, sm: 12.5 }, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>
            New List
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ p: { xs: 1.25, sm: 1.75 }, mb: 2, borderRadius: { xs: 2.5, sm: 3 }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField fullWidth size="small" placeholder="Search lists..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 2, minWidth: 180 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} /></InputAdornment> }} />
            <TextField select size="small" label="Type" value={type} onChange={(e) => setType(e.target.value)} sx={{ minWidth: 130, flex: 1 }} SelectProps={{ displayEmpty: true }}>
              {TYPES.map((t) => <MenuItem key={t || "all"} value={t}>{t || "All"}</MenuItem>)}
            </TextField>
          </Stack>
        </Paper>

        {loading ? (
          <Paper elevation={0} sx={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}><CircularProgress size={28} /></Paper>
        ) : lists.length === 0 ? (
          <Paper elevation={0} sx={{ minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 3, border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
            <Typography color="text.secondary" sx={{ mb: 1 }}>No lists yet.</Typography>
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => setDialogOpen(true)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)" }}>Create your first list</Button>
          </Paper>
        ) : (
          <Stack spacing={1.1}>
            {lists.map((l) => <ShoppingListCard key={l._id} list={l} onClick={() => router.push(`/shopping/${l._id}`)} />)}
          </Stack>
        )}

        <Divider sx={{ mt: 3, opacity: 0.3 }} />
        <Typography sx={{ textAlign: "center", mt: 1.5, mb: 1, fontSize: 10, color: "text.secondary" }}>Shopping Lists</Typography>
      </Container>

      <NewListDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={(l) => { setDialogOpen(false); router.push(`/shopping/${l._id}`); }} />
    </Box>
  );
}

export default function ShoppingPage() {
  return (
    <ProtectedRoute>
      <ShoppingInner />
    </ProtectedRoute>
  );
}