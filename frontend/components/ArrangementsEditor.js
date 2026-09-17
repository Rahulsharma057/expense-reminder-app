"use client";

import { Box, Stack, TextField, IconButton, Button, Typography, MenuItem, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

const CATEGORIES = ["Food", "Logistics", "Stationery", "Travel", "Other"];

export default function ArrangementsEditor({ arrangements, onChange }) {
  const update = (index, field) => (e) => {
    const updated = [...arrangements];
    updated[index] = { ...updated[index], [field]: e.target.value };
    onChange(updated);
  };

  const addItem = () => onChange([...arrangements, { text: "", category: "Other", cost: 0, status: "Pending" }]);
  const removeItem = (index) => onChange(arrangements.filter((_, i) => i !== index));

  const total = arrangements.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          ARRANGEMENTS (kya lana hai, kharcha)
        </Typography>
        {total > 0 && <Chip size="small" label={`Total: ₹${total.toLocaleString("en-IN")}`} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />}
      </Stack>

      <Stack spacing={1}>
        {arrangements.map((a, index) => (
          <Stack key={index} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField size="small" placeholder="e.g. Lunch for 10 people" value={a.text} onChange={update(index, "text")} sx={{ flex: 2, minWidth: 140 }} />
            <TextField select size="small" value={a.category} onChange={update(index, "category")} sx={{ minWidth: 110 }}>
              {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField size="small" type="number" placeholder="Cost" value={a.cost} onChange={update(index, "cost")} sx={{ width: 90 }} />
            <TextField select size="small" value={a.status} onChange={update(index, "status")} sx={{ minWidth: 110 }}>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Arranged">Arranged</MenuItem>
            </TextField>
            <IconButton size="small" onClick={() => removeItem(index)} color="error">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mt: 1, textTransform: "none", fontWeight: 650 }}>
        Add Item to Arrange
      </Button>
    </Box>
  );
}