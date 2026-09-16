"use client";

import { Box, Stack, TextField, IconButton, Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

export default function ParticipantsEditor({ participants, onChange }) {
  const updateField = (index, field) => (e) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: e.target.value };
    onChange(updated);
  };

  const addParticipant = () => onChange([...participants, { name: "", email: "", phone: "" }]);
  const removeParticipant = (index) => onChange(participants.filter((_, i) => i !== index));

  return (
    <Box>
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
        PARTICIPANTS (optional)
      </Typography>

      <Stack spacing={1.2}>
        {participants.map((p, index) => (
          <Stack key={index} direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="Name" value={p.name} onChange={updateField(index, "name")} sx={{ flex: 1 }} />
            <TextField size="small" label="Email" value={p.email} onChange={updateField(index, "email")} sx={{ flex: 1.3 }} />
            <TextField size="small" label="Phone" value={p.phone} onChange={updateField(index, "phone")} sx={{ flex: 1 }} />
            <IconButton size="small" onClick={() => removeParticipant(index)} color="error">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Button size="small" startIcon={<AddIcon />} onClick={addParticipant} sx={{ mt: 1, textTransform: "none", fontWeight: 650 }}>
        Add Participant
      </Button>
    </Box>
  );
}