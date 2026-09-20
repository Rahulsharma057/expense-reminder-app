"use client";

import { Alert, Typography } from "@mui/material";

export default function ConflictWarning({ conflicts }) {
  if (!conflicts?.length) return null;

  return (
    <Alert severity="warning" sx={{ borderRadius: 2 }}>
      <Typography variant="body2" fontWeight={700}>Time conflict — already scheduled at this time:</Typography>
      {conflicts.map((c) => (
        <Typography key={c.id} variant="caption" sx={{ display: "block" }}>
          {c.title} — {new Date(c.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
        </Typography>
      ))}
    </Alert>
  );
}