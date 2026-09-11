"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Typography, Stack, Button, CircularProgress, Paper, Chip,
  Tabs, Tab, TextField, IconButton, Divider,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";
import { getStoredUser } from "../../lib/auth";
import { enablePushNotifications } from "../../lib/push";

function ReminderCard({ reminder, currentUser, onStatusChange, onAddUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [updateText, setUpdateText] = useState("");
  const [posting, setPosting] = useState(false);

  const isOverdue = reminder.status === "pending" && new Date(reminder.dueDate) < new Date();
  const canManage = currentUser?.role === "owner" || String(reminder.assignedTo?._id) === String(currentUser?._id);
  const canDelete = currentUser?.role === "owner" || String(reminder.createdBy?._id) === String(currentUser?._id);

  const submitUpdate = async () => {
    if (!updateText.trim()) return;
    setPosting(true);
    await onAddUpdate(reminder._id, updateText.trim());
    setUpdateText("");
    setPosting(false);
  };

  return (
    <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #ece9f5", borderRadius: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800}>{reminder.title}</Typography>
          <Typography variant="caption" color="text.secondary">
            Due {new Date(reminder.dueDate).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" · "}Assigned to {reminder.assignedTo?.name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.6} alignItems="center">
          {isOverdue && <Chip size="small" label="Overdue" color="error" />}
          <Chip
            size="small"
            label={reminder.status === "done" ? "Done" : "Pending"}
            color={reminder.status === "done" ? "success" : "default"}
            variant={reminder.status === "done" ? "filled" : "outlined"}
          />
        </Stack>
      </Stack>

      {reminder.description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {reminder.description}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 1.2 }} flexWrap="wrap" useFlexGap>
        {canManage && (
          <Button
            size="small"
            variant={reminder.status === "done" ? "outlined" : "contained"}
            startIcon={<CheckCircleIcon fontSize="small" />}
            onClick={() => onStatusChange(reminder._id, reminder.status === "done" ? "pending" : "done")}
            sx={{ textTransform: "none" }}
          >
            {reminder.status === "done" ? "Mark Pending" : "Mark Done"}
          </Button>
        )}
        <Button
          size="small"
          variant="text"
          endIcon={open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          onClick={() => setOpen((v) => !v)}
          sx={{ textTransform: "none" }}
        >
          Updates ({reminder.updates?.length || 0})
        </Button>
        {canDelete && (
          <IconButton size="small" color="error" onClick={() => onDelete(reminder._id)} sx={{ ml: "auto" }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {open && (
        <Box sx={{ mt: 1.2 }}>
          <Divider sx={{ mb: 1.2 }} />
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            {(reminder.updates || []).length === 0 && (
              <Typography variant="caption" color="text.secondary">No updates yet.</Typography>
            )}
            {(reminder.updates || []).map((u, i) => (
              <Box key={i} sx={{ bgcolor: "#faf9fc", p: 1, borderRadius: 2 }}>
                <Typography variant="body2">{u.text}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {u.postedBy?.name} · {new Date(u.createdAt).toLocaleString("en-IN")}
                </Typography>
              </Box>
            ))}
          </Stack>

          {canManage && (
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Post an update..."
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitUpdate()}
              />
              <IconButton color="primary" onClick={submitUpdate} disabled={posting}>
                <SendIcon />
              </IconButton>
            </Stack>
          )}
        </Box>
      )}
    </Paper>
  );
}

function RemindersInner() {
  const router = useRouter();
  const currentUser = getStoredUser();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  const load = () => {
    setLoading(true);
    api
      .get("/reminders", { params: { status: tab === "all" ? undefined : tab } })
      .then((res) => setReminders(res.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);
  useEffect(() => { enablePushNotifications().catch(() => {}); }, []);

  const handleStatusChange = async (id, status) => {
    await api.patch(`/reminders/${id}/status`, { status });
    load();
  };
  const handleAddUpdate = async (id, text) => {
    await api.post(`/reminders/${id}/updates`, { text });
    load();
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this reminder?")) return;
    await api.delete(`/reminders/${id}`);
    load();
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800}>Reminders</Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => router.push("/reminders/new")}
            sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2.5, background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
          >
            New
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab value="pending" label="Pending" />
          <Tab value="done" label="Done" />
          <Tab value="all" label="All" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : reminders.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography color="text.secondary">Nothing here yet.</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {reminders.map((r) => (
              <ReminderCard
                key={r._id}
                reminder={r}
                currentUser={currentUser}
                onStatusChange={handleStatusChange}
                onAddUpdate={handleAddUpdate}
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}

export default function RemindersPage() {
  return (
    <ProtectedRoute>
      <RemindersInner />
    </ProtectedRoute>
  );
}
