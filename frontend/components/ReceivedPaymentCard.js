"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CallReceivedRoundedIcon from "@mui/icons-material/CallReceivedRounded";
import ReceivedPaymentDetailDialog from "./ReceivedPaymentDetailDialog";

const STATUS_COLORS = {
  unknown: "#94a3b8",
  pending: "#FBBF24",
  successful: "#4ADE80",
  failed: "#F87171",
};

export default function ReceivedPaymentCard({ payment, onEdit, onDelete }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const statusColor = STATUS_COLORS[payment.status] || STATUS_COLORS.unknown;

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setDetailOpen(true)}
        sx={{
          p: 1.8, border: "1px solid", borderColor: "divider",
          borderRadius: 3, bgcolor: "background.paper", cursor: "pointer",
          "&:hover": { borderColor: "rgba(16,185,129,0.5)" },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {payment.screenshotUrl ? (
            <Avatar src={payment.screenshotUrl} variant="rounded" sx={{ width: 52, height: 52, flexShrink: 0 }} />
          ) : (
            <Avatar variant="rounded" sx={{ width: 52, height: 52, bgcolor: "rgba(16,185,129,0.15)", color: "#059669", flexShrink: 0 }}>
              <CallReceivedRoundedIcon />
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} noWrap color="text.primary">
                  {payment.payerName || "Unknown payer"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {payment.transactionDate
                    ? new Date(payment.transactionDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                    : new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Typography>
              </Box>
              <Typography fontWeight={800} sx={{ color: "#059669", whiteSpace: "nowrap" }}>
                +₹{Number(payment.amount).toLocaleString("en-IN")}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip size="small" label={payment.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700, textTransform: "capitalize" }} />
              {payment.paymentApp && <Chip size="small" label={payment.paymentApp} variant="outlined" />}
              {payment.transactionId && <Chip size="small" label={`ID: ${payment.transactionId}`} variant="outlined" />}
            </Stack>

            {payment.note && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.6, color: "text.secondary", fontStyle: "italic" }} noWrap>
                {payment.note}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(payment); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(payment); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <ReceivedPaymentDetailDialog
        open={detailOpen}
        payment={payment}
        onClose={() => setDetailOpen(false)}
        onEdit={(p) => { setDetailOpen(false); onEdit(p); }}
        onDelete={(p) => { setDetailOpen(false); onDelete(p); }}
      />
    </>
  );
}
