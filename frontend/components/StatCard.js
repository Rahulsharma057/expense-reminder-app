"use client";

import { Paper, Box, Typography } from "@mui/material";

export default function StatCard({ icon, label, value, color, bg }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.1, sm: 1.5 },
        height: "100%",
        minHeight: { xs: 80, sm: 92 },
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 0.65,
      }}
    >
      <Box
        sx={{
          width: { xs: 28, sm: 34 },
          height: { xs: 28, sm: 34 },
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: bg,
          color,
          "& svg": { fontSize: { xs: 15, sm: 18 } },
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: 14.5, sm: 17 },
            fontWeight: 800,
            color: "text.primary",
            lineHeight: 1.2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            mt: 0.2,
            fontSize: { xs: 9, sm: 10.5 },
            color: "text.secondary",
            fontWeight: 600,
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}