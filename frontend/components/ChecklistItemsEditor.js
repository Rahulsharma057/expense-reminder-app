"use client";

import { Box, Stack, TextField, IconButton, Button, Typography, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export default function ChecklistItemsEditor({ items, onChange }) {
  const updateText = (index) => (e) => {
    const updated = [...items];
    updated[index] = { ...updated[index], text: e.target.value };
    onChange(updated);
  };

  const addItem = () => onChange([...items, { text: "" }]);
  const removeItem = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">CHECKLIST ITEMS</Typography>
        <Chip size="small" label={items.length} sx={{ height: 20, fontSize: 10 }} />
      </Stack>

      <Stack spacing={1}>
        {items.map((item, index) => (
          <Stack key={item._id || index} direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18 }}>{index + 1}.</Typography>
            <TextField size="small" fullWidth placeholder="e.g. Submit report" value={item.text} onChange={updateText(index)} />
            <IconButton size="small" onClick={() => removeItem(index)} color="error" disabled={items.length <= 1}>
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