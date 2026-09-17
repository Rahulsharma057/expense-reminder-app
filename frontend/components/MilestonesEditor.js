"use client";

import { Box, Stack, TextField, IconButton, Button, Typography, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export default function MilestonesEditor({ milestones, onChange }) {
  const updateText = (index) => (e) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], text: e.target.value };
    onChange(updated);
  };

  const addMilestone = () => onChange([...milestones, { text: "" }]);
  const removeMilestone = (index) => onChange(milestones.filter((_, i) => i !== index));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">MILESTONES / STEPS (optional)</Typography>
        <Chip size="small" label={milestones.length} sx={{ height: 20, fontSize: 10 }} />
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Milestones daaloge toh progress % auto-calculate hoga. Nahi daaloge toh neeche manual % set kar sakte ho.
      </Typography>

      <Stack spacing={1}>
        {milestones.map((m, index) => (
          <Stack key={m._id || index} direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 18 }}>{index + 1}.</Typography>
            <TextField size="small" fullWidth placeholder="e.g. Research complete" value={m.text} onChange={updateText(index)} />
            <IconButton size="small" onClick={() => removeMilestone(index)} color="error">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" startIcon={<AddIcon />} onClick={addMilestone} sx={{ mt: 1, textTransform: "none", fontWeight: 650 }}>
        Add Milestone
      </Button>
    </Box>
  );
}