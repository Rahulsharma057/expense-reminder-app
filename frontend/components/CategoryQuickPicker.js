"use client";

import { useEffect, useState } from "react";
import { Box, Stack, Chip, TextField, IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import api from "../lib/api";

const PRESETS = ["Relationship", "Work", "Communication", "Time Management", "Finance", "Health", "Study", "Habits"];
const PRESET_COLORS = ["#F87171", "#60A5FA", "#FBBF24", "#4ADE80", "#A78BFA", "#FB923C", "#38BDF8", "#F472B6"];

export default function CategoryQuickPicker({ selectedId, onChange }) {
  const [categories, setCategories] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const load = () => {
    api.get("/mistakes/categories").then((res) => setCategories(res.data || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const selectedName = categories.find((c) => c._id === selectedId)?.name;

  const pickOrCreate = async (name, color) => {
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) { onChange(existing._id); return; }
    try {
      const res = await api.post("/mistakes/categories", { name, color });
      setCategories((prev) => [...prev, res.data]);
      onChange(res.data._id);
    } catch { /* ignore */ }
  };

  const addCustom = async () => {
    if (!newName.trim()) return;
    await pickOrCreate(newName.trim(), "#8B5CF6");
    setNewName("");
    setAdding(false);
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        CATEGORY
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
        {PRESETS.map((p, i) => (
          <Chip
            key={p}
            label={p}
            onClick={() => pickOrCreate(p, PRESET_COLORS[i])}
            sx={{
              fontWeight: 700, cursor: "pointer",
              bgcolor: selectedName === p ? `${PRESET_COLORS[i]}33` : "transparent",
              color: selectedName === p ? PRESET_COLORS[i] : "text.secondary",
              border: "1px solid", borderColor: selectedName === p ? PRESET_COLORS[i] : "divider",
            }}
          />
        ))}
        {categories.filter((c) => !PRESETS.includes(c.name)).map((c) => (
          <Chip
            key={c._id}
            label={c.name}
            onClick={() => onChange(c._id)}
            sx={{
              fontWeight: 700, cursor: "pointer",
              bgcolor: selectedId === c._id ? `${c.color}33` : "transparent",
              color: selectedId === c._id ? c.color : "text.secondary",
              border: "1px solid", borderColor: selectedId === c._id ? c.color : "divider",
            }}
          />
        ))}

        {adding ? (
          <Stack direction="row" spacing={0.5}>
            <TextField size="small" autoFocus placeholder="Category name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} sx={{ width: 140 }} />
            <IconButton size="small" onClick={addCustom} sx={{ border: "1px solid", borderColor: "divider" }}><AddIcon fontSize="small" /></IconButton>
          </Stack>
        ) : (
          <IconButton size="small" onClick={() => setAdding(true)} sx={{ border: "1px solid", borderColor: "divider" }}>
            <AddIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}