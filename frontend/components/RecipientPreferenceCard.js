"use client";

import { useState } from "react";
import { Paper, Stack, Typography, Chip, TextField, MenuItem, Switch, Button, Avatar } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { toast } from "react-toastify";
import api from "../lib/api";

const FREQUENCIES = [
  { value: 60, label: "Every hour" },
  { value: 120, label: "Every 2 hours" },
  { value: 180, label: "Every 3 hours" },
  { value: 360, label: "Every 6 hours" },
  { value: 1440, label: "Once a day" },
];

export default function RecipientPreferenceCard({ recipient, categories, existingPref, onSaved }) {
  const [selectedCategories, setSelectedCategories] = useState(existingPref?.categories || []);
  const [frequency, setFrequency] = useState(existingPref?.frequencyMinutes || 60);
  const [active, setActive] = useState(existingPref?.active ?? false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const save = async (overrideActive) => {
    setSaving(true);
    try {
      await api.post("/random-messages/preferences", {
        recipientUser: recipient._id,
        categories: selectedCategories,
        frequencyMinutes: frequency,
        active: overrideActive !== undefined ? overrideActive : active,
      });
      toast.success(`Saved for ${recipient.name}.`);
      onSaved?.();
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = (checked) => {
    setActive(checked);
    save(checked);
  };

  const sendNow = async () => {
    if (!existingPref?._id) { toast.error("Save first before testing."); return; }
    setSending(true);
    try {
      await api.post(`/random-messages/preferences/${existingPref._id}/send-now`);
      toast.success("Sent a test message.");
    } catch {
      toast.error("Could not send.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 1.6, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2 }}>
        <Avatar sx={{ width: 34, height: 34, fontSize: 13, bgcolor: "primary.main" }}>{recipient.name?.[0]?.toUpperCase()}</Avatar>
        <Typography fontWeight={700} sx={{ flex: 1 }}>{recipient.name}</Typography>
        <Switch checked={active} onChange={(e) => handleToggleActive(e.target.checked)} disabled={saving} />
      </Stack>

      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.6 }}>CATEGORIES TO SEND</Typography>
      <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mb: 1.2 }}>
        {categories.map((cat) => (
          <Chip
            key={cat} label={cat} size="small" onClick={() => toggleCategory(cat)}
            sx={{ fontWeight: 700, cursor: "pointer", bgcolor: selectedCategories.includes(cat) ? "rgba(139,92,246,0.2)" : "transparent", color: selectedCategories.includes(cat) ? "primary.light" : "text.secondary", border: "1px solid", borderColor: selectedCategories.includes(cat) ? "primary.main" : "divider" }}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField select size="small" label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} sx={{ flex: 1 }}>
          {FREQUENCIES.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
        </TextField>
        <Button size="small" variant="outlined" onClick={() => save()} disabled={saving} sx={{ textTransform: "none" }}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {existingPref?._id && (
          <Button size="small" variant="outlined" startIcon={<SendIcon sx={{ fontSize: 14 }} />} onClick={sendNow} disabled={sending} sx={{ textTransform: "none" }}>
            Test
          </Button>
        )}
      </Stack>
    </Paper>
  );
}