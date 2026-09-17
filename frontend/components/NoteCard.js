"use client";

import { Paper, Typography, Stack, IconButton, Box } from "@mui/material";
import PushPinIcon from "@mui/icons-material/PushPin";
import LockIcon from "@mui/icons-material/Lock";

export default function NoteCard({ note, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 1.5, borderRadius: 3, border: "1px solid", borderColor: "divider",
        bgcolor: note.color || "background.paper", cursor: "pointer", minHeight: 120,
        display: "flex", flexDirection: "column", "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Typography fontWeight={700} noWrap sx={{ flex: 1, color: note.color ? "#1A1625" : "text.primary" }}>
          {note.title || "(Untitled)"}
        </Typography>
        {note.pinned && <PushPinIcon fontSize="small" sx={{ color: note.color ? "#1A1625" : "primary.main", flexShrink: 0 }} />}
      </Stack>

      {note.isLocked ? (
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 1, opacity: 0.7 }}>
          <LockIcon sx={{ fontSize: 16, color: note.color ? "#1A1625" : "text.secondary" }} />
          <Typography variant="caption" sx={{ color: note.color ? "#1A1625" : "text.secondary" }}>Locked</Typography>
        </Stack>
      ) : (
        <Typography
          variant="body2"
          sx={{
            mt: 1, color: note.color ? "#332B45" : "text.secondary", flex: 1,
            display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden",
            whiteSpace: "pre-wrap",
          }}
        >
          {note.content}
        </Typography>
      )}
    </Paper>
  );
}