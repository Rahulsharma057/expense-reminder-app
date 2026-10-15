"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Avatar, Divider, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageLightbox from "./ImageLightbox";

const STATUS_COLORS = {
  unknown: "#94a3b8",
  pending: "#FBBF24",
  successful: "#4ADE80",
  failed: "#F87171",
};

export default function ReceivedPaymentDetailDialog({ open, payment, onClose, onEdit, onDelete }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!payment) return null;

  const statusColor = STATUS_COLORS[payment.status] || STATUS_COLORS.unknown;

  const detailRows = [
    ["Amount", `₹${Number(payment.amount).toLocaleString("en-IN")}`],
    ["Received from", payment.payerName || "-"],
    ["Received by", payment.receiverName || "-"],
    ["Paid via / app", payment.paymentApp || "-"],
    ["Payment method", payment.paymentMethod || "-"],
    ["Transaction ID", payment.transactionId || "-"],
    ...(payment.rrn ? [["RRN / UTR", payment.rrn]] : []),
    ...(payment.referenceNumber ? [["Reference Number", payment.referenceNumber]] : []),
    ["Date", payment.transactionDate ? new Date(payment.transactionDate).toLocaleDateString("en-IN") : "-"],
    ["Source", payment.source?.replace("_", " ") || "-"],
    ["Verification", payment.verificationStatus === "manually_confirmed" ? "Confirmed by you" : "Unverified"],
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{payment.payerName || "Received Payment"}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip size="small" label={payment.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700, textTransform: "capitalize" }} />
          </Stack>

          <Stack spacing={1.1}>
            {detailRows.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: "right" }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>

          {payment.note && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700}>NOTE</Typography>
              <Typography variant="body2" sx={{ mt: 0.4, fontStyle: "italic" }}>{payment.note}</Typography>
            </>
          )}

          {payment.screenshotUrl && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>SCREENSHOT</Typography>
              <Avatar
                src={payment.screenshotUrl}
                variant="rounded"
                onClick={() => setLightboxOpen(true)}
                sx={{ width: 80, height: 80, cursor: "pointer", "&:hover": { opacity: 0.85 } }}
              />
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1}>
            <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(payment)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Edit
            </Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(payment)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Delete
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        open={lightboxOpen}
        images={payment.screenshotUrl ? [{ url: payment.screenshotUrl }] : []}
        startIndex={0}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
