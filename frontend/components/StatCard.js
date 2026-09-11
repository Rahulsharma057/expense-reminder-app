"use client";

import { Paper, Box, Typography } from "@mui/material";

export default function StatCard({ icon, label, value, color = "#7c3aed", bg = "#f3e8ff" }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: "1px solid #ece9f5", borderRadius: 3, height: "100%" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44, height: 44, borderRadius: 2.5, bgcolor: bg, color,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.15rem", lineHeight: 1.3 }} noWrap>
            {value}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
