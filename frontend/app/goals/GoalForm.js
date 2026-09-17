"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, Button, Stack, MenuItem,
  Alert, CircularProgress, Slider,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../lib/api";
import MilestonesEditor from "../../components/MilestonesEditor";

const STATUSES = ["Not Started", "In Progress", "Achieved", "Delayed", "Abandoned"];

const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function GoalForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({ title: "", description: "", category: "", targetDate: "", status: "Not Started", progressPercent: 0 });
  const [milestones, setMilestones] = useState([{ text: "" }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "",
        targetDate: initialData.targetDate ? toDateInputValue(initialData.targetDate) : "",
        status: initialData.status || "Not Started",
        progressPercent: initialData.progressPercent || 0,
      });
      setMilestones(initialData.milestones?.length ? initialData.milestones : [{ text: "" }]);
    }
  }, [isEdit, initialData]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Title is required.");
      toast.error("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanMilestones = milestones.filter((m) => m.text.trim());
      const payload = { ...form, milestones: JSON.stringify(cleanMilestones) };

      if (isEdit) {
        await api.put(`/goals/${initialData._id}`, payload);
        toast.success("Goal updated.");
      } else {
        await api.post("/goals", payload);
        toast.success("Goal created.");
      }

      setTimeout(() => onDone?.(), 400);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save goal.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasMilestones = milestones.filter((m) => m.text.trim()).length > 0;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Goal" : "New Goal"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="Goal Title" required fullWidth value={form.title} onChange={(e) => update("title")(e.target.value)} placeholder="e.g. Learn Next.js, Save ₹50,000" />

            <TextField label="Description (optional)" fullWidth multiline minRows={2} value={form.description} onChange={(e) => update("description")(e.target.value)} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Category (optional)" fullWidth placeholder="e.g. Career, Health, Finance" value={form.category} onChange={(e) => update("category")(e.target.value)} />
              <TextField label="Target date (optional)" type="date" fullWidth value={form.targetDate} onChange={(e) => update("targetDate")(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>

            <TextField select label="Status" fullWidth value={form.status} onChange={(e) => update("status")(e.target.value)}>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>

            <MilestonesEditor milestones={milestones} onChange={setMilestones} />

            {!hasMilestones && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
                  MANUAL PROGRESS: {form.progressPercent}%
                </Typography>
                <Slider
                  value={form.progressPercent}
                  onChange={(_e, value) => update("progressPercent")(value)}
                  sx={{ color: "primary.main" }}
                />
              </Box>
            )}

            <Button
              type="submit" variant="contained" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" } }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Goal"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}