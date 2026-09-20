"use client";

import { Paper, Stack, Typography, Box } from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";
import LockIcon from "@mui/icons-material/Lock";

export default function NoteListRow({ note, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.2, borderRadius: 2.5, border: "1px solid", borderColor: "divider",
        bgcolor: note.color || "background.paper", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 1.2,
        "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
      }}
    >
      {note.pinned && <PushPinIcon fontSize="small" sx={{ color: note.color ? "#1A1625" : "primary.main", flexShrink: 0 }} />}
      {note.isLocked && <LockIcon fontSize="small" sx={{ color: note.color ? "#1A1625" : "text.secondary", flexShrink: 0 }} />}

      <Typography fontWeight={700} noWrap sx={{ minWidth: 120, color: note.color ? "#1A1625" : "text.primary" }}>
        {note.title || "(Untitled)"}
      </Typography>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2" noWrap
          sx={{ color: note.color ? "#332B45" : "text.secondary" }}
        >
          {note.isLocked ? "Locked note" : note.content}
        </Typography>
      </Box>

      <Typography variant="caption" sx={{ flexShrink: 0, color: note.color ? "#332B45" : "text.secondary" }}>
        {new Date(note.updatedAt).toLocaleDateString("en-IN")}
      </Typography>
    </Paper>
  );
}