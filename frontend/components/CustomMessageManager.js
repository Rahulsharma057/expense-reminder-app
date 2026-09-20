"use client";

import { useEffect, useState } from "react";
import { Box, Stack, TextField, MenuItem, IconButton, Typography, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function CustomMessageManager({ categories }) {
  const [templates, setTemplates] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0] || "");

  const load = () => api.get("/random-messages/templates").then((res) => setTemplates(res.data || []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    try {
      await api.post("/random-messages/templates", { text, category });
      setText("");
      load();
      toast.success("Added.");
    } catch {
      toast.error("Could not add.");
    }
  };

  const remove = async (id) => {
    await api.delete(`/random-messages/templates/${id}`);
    load();
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
        YOUR CUSTOM MESSAGES
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        <TextField size="small" fullWidth placeholder="Write your own message..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <TextField select size="small" value={category} onChange={(e) => setCategory(e.target.value)} sx={{ minWidth: 130 }}>
          {categories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <IconButton size="small" onClick={add} sx={{ border: "1px solid", borderColor: "divider" }}><AddIcon fontSize="small" /></IconButton>
      </Stack>

      <Stack spacing={0.75}>
        {templates.map((t) => (
          <Stack key={t._id} direction="row" alignItems="center" spacing={1}>
            <Chip size="small" label={t.category} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>{t.text}</Typography>
            <IconButton size="small" onClick={() => remove(t._id)}><DeleteIcon fontSize="small" /></IconButton>
          </Stack>
        ))}
        {templates.length === 0 && <Typography variant="caption" color="text.secondary">No custom messages yet — default ones will still be used for selected categories.</Typography>}
      </Stack>
    </Box>
  );
}