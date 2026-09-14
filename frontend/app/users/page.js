"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Typography, Paper, Stack, TextField, Button, Alert,
  CircularProgress, List, ListItem, ListItemText, ListItemButton, Chip,
  IconButton, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";

const primaryButtonSx = {
  textTransform: "none",
  fontWeight: 700,
  borderRadius: 2.5,
  background: "linear-gradient(135deg,#7c3aed,#4c1d95)",
};

function UsersInner() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- edit / view dialog state ---
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", username: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  // --- reset password state (lives inside the same dialog) ---
  const [showResetField, setShowResetField] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

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

  const openUser = (u) => {
    setSelectedUser(u);
    setEditForm({ name: u.name, username: u.username });
    setEditError("");
    setShowResetField(false);
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
  };

  const closeDialog = () => setSelectedUser(null);

  const handleEditSave = async () => {
    if (!editForm.name.trim() || !editForm.username.trim()) {
      setEditError("Name and username are required.");
      return;
    }
    setEditSubmitting(true);
    setEditError("");
    try {
      await api.patch(`/users/${selectedUser._id}`, editForm);
      closeDialog();
      load();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Could not update this user.");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 4) {
      setResetError("Password must be at least 4 characters.");
      return;
    }
    setResetSubmitting(true);
    setResetError("");
    setResetSuccess("");
    try {
      await api.patch(`/users/${selectedUser._id}/reset-password`, { password: newPassword });
      setResetSuccess("Password updated.");
      setNewPassword("");
      setShowResetField(false);
    } catch (err) {
      setResetError(err?.response?.data?.message || "Could not reset the password.");
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Users</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Create a login for someone so they can post updates on the tasks you assign them.
          Tap a user to view, edit, or reset their password.
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
                sx={primaryButtonSx}
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
                    disablePadding
                    secondaryAction={
                      u.role !== "owner" && (
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleActive(u._id);
                          }}
                        >
                          {u.isActive ? <BlockIcon color="error" /> : <CheckCircleIcon color="success" />}
                        </IconButton>
                      )
                    }
                  >
                    <ListItemButton onClick={() => openUser(u)}>
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
                    </ListItemButton>
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </Container>

      {/* View / Edit / Reset-password dialog */}
      <Dialog open={!!selectedUser} onClose={closeDialog} fullWidth maxWidth="xs">
        {selectedUser && (
          <>
            <DialogTitle sx={{ fontWeight: 800 }}>
              {selectedUser.name}
              {selectedUser.role === "owner" && (
                <Chip size="small" label="owner" color="secondary" sx={{ ml: 1 }} />
              )}
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                {editError && <Alert severity="error" sx={{ borderRadius: 2 }}>{editError}</Alert>}

                <TextField
                  label="Name"
                  fullWidth
                  value={editForm.name}
                  disabled={selectedUser.role === "owner"}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
                <TextField
                  label="Username"
                  fullWidth
                  value={editForm.username}
                  disabled={selectedUser.role === "owner"}
                  onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                />

                {selectedUser.role !== "owner" && (
                  <>
                    <Divider />

                    {resetSuccess && <Alert severity="success" sx={{ borderRadius: 2 }}>{resetSuccess}</Alert>}
                    {resetError && <Alert severity="error" sx={{ borderRadius: 2 }}>{resetError}</Alert>}

                    {!showResetField ? (
                      <Button
                        startIcon={<LockResetIcon />}
                        onClick={() => setShowResetField(true)}
                        sx={{ textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}
                      >
                        Reset password
                      </Button>
                    ) : (
                      <Stack spacing={1}>
                        <TextField
                          label="New password"
                          fullWidth
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            disabled={resetSubmitting}
                            onClick={handleResetPassword}
                            sx={primaryButtonSx}
                          >
                            {resetSubmitting ? "Saving..." : "Save new password"}
                          </Button>
                          <Button
                            onClick={() => {
                              setShowResetField(false);
                              setNewPassword("");
                              setResetError("");
                            }}
                            sx={{ textTransform: "none" }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    )}
                  </>
                )}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={closeDialog} sx={{ textTransform: "none" }}>Close</Button>
              {selectedUser.role !== "owner" && (
                <Button
                  variant="contained"
                  disabled={editSubmitting}
                  onClick={handleEditSave}
                  sx={primaryButtonSx}
                >
                  {editSubmitting ? "Saving..." : "Save changes"}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
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