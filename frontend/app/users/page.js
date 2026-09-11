"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Stack, TextField, Button, Alert,
  CircularProgress, List, ListItem, ListItemText, Chip, IconButton, Divider,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";

function UsersInner() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/users").then((res) => setUsers(res.data || [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.username.trim() || !form.password) {
      setError("Fill in name, username and password.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/users", form);
      setSuccess(`Login created for ${form.name} — username: ${form.username.toLowerCase()}`);
      setForm({ name: "", username: "", password: "" });
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create this login.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id) => {
    await api.patch(`/users/${id}/toggle-active`);
    load();
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Users</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Create a login for someone so they can post updates on the tasks you assign them.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: "1px solid #ece9f5", borderRadius: 3, mb: 3 }}>
          <Typography fontWeight={700} sx={{ mb: 1.5 }}>
            <PersonAddAlt1Icon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
            Add a new login
          </Typography>
          <Box component="form" onSubmit={handleCreate}>
            <Stack spacing={1.5}>
              <TextField label="Name" fullWidth value={form.name} onChange={update("name")} />
              <TextField label="Username" fullWidth value={form.username} onChange={update("username")} />
              <TextField label="Password" fullWidth value={form.password} onChange={update("password")} />
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2.5, background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
              >
                {submitting ? "Creating..." : "Create Login"}
              </Button>
            </Stack>
          </Box>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 1, sm: 1.5 }, border: "1px solid #ece9f5", borderRadius: 3 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <List disablePadding>
              {users.map((u, i) => (
                <Box key={u._id}>
                  {i > 0 && <Divider component="li" />}
                  <ListItem
                    secondaryAction={
                      u.role !== "owner" && (
                        <IconButton edge="end" onClick={() => toggleActive(u._id)}>
                          {u.isActive ? <BlockIcon color="error" /> : <CheckCircleIcon color="success" />}
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700}>{u.name}</Typography>
                          <Chip size="small" label={u.role} color={u.role === "owner" ? "secondary" : "default"} />
                          {!u.isActive && <Chip size="small" label="Deactivated" color="error" variant="outlined" />}
                        </Stack>
                      }
                      secondary={`@${u.username}`}
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute ownerOnly>
      <UsersInner />
    </ProtectedRoute>
  );
}
