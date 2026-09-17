"use client";

import { useEffect, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, Button, Stack,
  Alert, CircularProgress, ToggleButtonGroup, ToggleButton,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../../lib/api";
import ChecklistItemsEditor from "../../components/ChecklistItemsEditor";
import AssigneePicker from "../../components/AssigneePicker";

const TYPES = ["One-time", "Daily", "Weekly"];

const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ChecklistForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({ title: "", description: "", type: "One-time", dueDate: "" });
  const [items, setItems] = useState([{ text: "" }]);
  const [assignedTo, setAssignedTo] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        title: initialData.title || "",
        description: initialData.description || "",
        type: initialData.type || "One-time",
        dueDate: initialData.dueDate ? toDateInputValue(initialData.dueDate) : "",
      });
      setItems(initialData.items?.length ? initialData.items : [{ text: "" }]);
      setAssignedTo((initialData.assignedTo || []).map((u) => u._id || u));
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
    const cleanItems = items.filter((i) => i.text.trim());
    if (!cleanItems.length) {
      setError("Add at least one checklist item.");
      toast.error("Add at least one checklist item.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        dueDate: form.dueDate,
        items: JSON.stringify(cleanItems),
        assignedTo: JSON.stringify(assignedTo),
      };

      if (isEdit) {
        await api.put(`/checklists/${initialData._id}`, payload);
        toast.success("Checklist updated.");
      } else {
        await api.post("/checklists", payload);
        toast.success("Checklist created.");
      }

      setTimeout(() => onDone?.(), 400);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save checklist.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Checklist" : "New Checklist"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField label="Title" required fullWidth value={form.title} onChange={(e) => update("title")(e.target.value)} placeholder="e.g. Daily Opening Checklist" />

            <TextField label="Description (optional)" fullWidth multiline minRows={2} value={form.description} onChange={(e) => update("description")(e.target.value)} />

            <ToggleButtonGroup
              exclusive fullWidth size="small" value={form.type}
              onChange={(_e, value) => value && update("type")(value)}
              sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}
            >
              {TYPES.map((t) => <ToggleButton key={t} value={t}>{t}</ToggleButton>)}
            </ToggleButtonGroup>
            <Typography variant="caption" color="text.secondary">
              Daily/Weekly checklists auto-reset (all items back to Pending) every day / week.
            </Typography>

            <TextField label="Due date (optional)" type="date" fullWidth value={form.dueDate} onChange={(e) => update("dueDate")(e.target.value)} InputLabelProps={{ shrink: true }} />

            <AssigneePicker selectedIds={assignedTo} onChange={setAssignedTo} />

            <ChecklistItemsEditor items={items} onChange={setItems} />

            <Button
              type="submit" variant="contained" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" } }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Checklist"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}