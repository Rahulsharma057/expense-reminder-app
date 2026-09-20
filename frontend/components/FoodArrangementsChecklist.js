"use client";

import { useState } from "react";
import { Box, Stack, TextField, IconButton, Button, Typography, Checkbox, MenuItem, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";

const CATEGORIES = ["Food", "Logistics", "Stationery", "Travel", "Other"];

// appointmentId is null while creating a new appointment (local-only editing).
// Once the appointment exists, checkbox toggles save instantly via PATCH so
// you can keep tracking what's arranged over time.
export default function FoodArrangementsChecklist({ appointmentId, arrangements, onChange, onSavedRemote }) {
  const [savingId, setSavingId] = useState(null);

  const updateLocal = (index, field, value) => {
    const updated = [...arrangements];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addItem = () => onChange([...arrangements, { text: "", category: "Food", cost: 0, status: "Pending" }]);
  const removeItem = (index) => onChange(arrangements.filter((_, i) => i !== index));

  const toggleChecked = async (index) => {
    const item = arrangements[index];
    const newStatus = item.status === "Arranged" ? "Pending" : "Arranged";
    updateLocal(index, "status", newStatus);

    if (appointmentId && item._id) {
      setSavingId(item._id);
      try {
        const res = await api.patch(`/appointments/${appointmentId}/arrangements/${item._id}`, { status: newStatus });
        onSavedRemote?.(res.data);
      } catch {
        toast.error("Could not save.");
        updateLocal(index, "status", item.status); // revert
      } finally {
        setSavingId(null);
      }
    }
  };

  const saveCostBlur = async (index) => {
    const item = arrangements[index];
    if (appointmentId && item._id) {
      try {
        const res = await api.patch(`/appointments/${appointmentId}/arrangements/${item._id}`, { cost: item.cost });
        onSavedRemote?.(res.data);
      } catch {
        toast.error("Could not save cost.");
      }
    }
  };

  const total = arrangements.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
  const arrangedCount = arrangements.filter((a) => a.status === "Arranged").length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">FOOD &amp; ARRANGEMENTS</Typography>
        <Stack direction="row" spacing={0.75}>
          {arrangements.length > 0 && <Chip size="small" label={`${arrangedCount}/${arrangements.length} done`} sx={{ bgcolor: "rgba(74,222,128,0.15)", color: "#4ADE80", fontWeight: 700 }} />}
          {total > 0 && <Chip size="small" label={`₹${total.toLocaleString("en-IN")}`} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />}
        </Stack>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Add what to arrange, check it off once it's done — checkboxes save automatically so you can track completion later.
      </Typography>

      <Stack spacing={1}>
        {arrangements.map((a, index) => (
          <Stack key={a._id || index} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Checkbox
              size="small" checked={a.status === "Arranged"} onChange={() => toggleChecked(index)}
              disabled={savingId === a._id} sx={{ p: 0.5 }}
            />
            <TextField
              size="small" placeholder="e.g. Lunch for 10 people" value={a.text}
              onChange={(e) => updateLocal(index, "text", e.target.value)}
              sx={{ flex: 2, minWidth: 140, "& input": { textDecoration: a.status === "Arranged" ? "line-through" : "none" } }}
            />
            <TextField select size="small" value={a.category} onChange={(e) => updateLocal(index, "category", e.target.value)} sx={{ minWidth: 110 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField
              size="small" type="number" placeholder="Cost" value={a.cost}
              onChange={(e) => updateLocal(index, "cost", e.target.value)}
              onBlur={() => saveCostBlur(index)}
              sx={{ width: 90 }}
            />
            <IconButton size="small" onClick={() => removeItem(index)} color="error">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1, textTransform: "none", fontWeight: 650 }}>
        Add Item
      </Button>
    </Box>
  );
}