"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack, Alert, CircularProgress,
} from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import api from "../../../lib/api";
import { getStoredUser } from "../../../lib/auth";

function defaultDueDateTime() {
  const d = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function NewReminderInner() {
  const router = useRouter();
  const currentUser = getStoredUser();

  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDateTime());
  const [assignedTo, setAssignedTo] = useState(currentUser?._id || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users").then((res) => {
      setUsers(res.data || []);
      if (!assignedTo && res.data?.length) setAssignedTo(res.data[0]._id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Title is required.");
    if (!dueDate) return setError("Pick a due date/time.");

    setSubmitting(true);
    try {
      await api.post("/reminders", { title: title.trim(), description, dueDate, assignedTo });
      router.push("/reminders");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not create this reminder.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 2 }}>New Reminder</Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: "1px solid #ece9f5", borderRadius: 3 }}>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Title" required fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
              <TextField
                label="Description (optional)"
                fullWidth
                multiline
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                label="Due date & time"
                type="datetime-local"
                required
                fullWidth
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="Assign to"
                fullWidth
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                {users.map((u) => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.name} {u._id === currentUser?._id ? "(me)" : ""}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
              >
                {submitting ? "Creating..." : "Create Reminder"}
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </>
  );
}

export default function NewReminderPage() {
  return (
    <ProtectedRoute>
      <NewReminderInner />
    </ProtectedRoute>
  );
}
