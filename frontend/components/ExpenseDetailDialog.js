"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip,
  Avatar, Divider, Button, CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { toast } from "react-toastify";
import api from "../lib/api";
import { downloadBlobResponse } from "../lib/download";
import ImageLightbox from "./ImageLightbox";
import ClaimStatusDialog from "./ClaimStatusDialog";

const MODE_COLORS = { PhonePe: "#a78bfa", "Bank Transfer": "#60a5fa", Cash: "#4ade80", Other: "#fb923c" };
const CLAIM_COLORS = { "Not Claimed": "#F87171", Claimed: "#FBBF24", Received: "#4ADE80" };

const buildShareText = (expense) =>
  `Expense Details\n` +
  `Recipient: ${expense.recipientName}\n` +
  `Amount: Rs. ${Number(expense.amount).toLocaleString("en-IN")}\n` +
  `Date: ${new Date(expense.date).toLocaleDateString("en-IN")}\n` +
  `Paid Via: ${expense.mode}\n` +
  `Reason: ${expense.reason || "-"}\n` +
  `Status: ${expense.claimStatus || "Not Claimed"}`;

export default function ExpenseDetailDialog({ open, expense, onClose, onEdit, onDelete, onClaimUpdated }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  if (!expense) return null;

  const photos = expense.billPhotos?.length ? expense.billPhotos : [];
  const modeColor = MODE_COLORS[expense.mode] || "#94a3b8";
  const claimStatus = expense.claimStatus || "Not Claimed";
  const claimColor = CLAIM_COLORS[claimStatus] || "#94a3b8";

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleInvoiceDownload = async () => {
    setDownloadingInvoice(true);
    try {
      const res = await api.get(`/expenses/${expense._id}/invoice`, { responseType: "blob" });
      downloadBlobResponse(res, `invoice_${expense._id}.pdf`);
    } catch {
      toast.error("Could not download invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const shareOnWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(buildShareText(expense))}`, "_blank");
  const shareOnEmail = () => {
    const subject = encodeURIComponent(`Expense - ${expense.recipientName}`);
    const body = encodeURIComponent(buildShareText(expense));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const detailRows = [
    ["Amount", `₹${Number(expense.amount).toLocaleString("en-IN")}`],
    ["Date", new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
    ["Paid Via", expense.mode === "Other" && expense.paidByOther ? `Other — ${expense.paidByOther}` : expense.mode],
    ["Transaction ID", expense.transactionId || "-"],
    ["Reason", expense.reason || "-"],
  ];

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{expense.recipientName}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip size="small" label={expense.mode} sx={{ bgcolor: `${modeColor}26`, color: modeColor, fontWeight: 700 }} />
            <Chip
              size="small"
              label={claimStatus}
              onClick={() => setClaimDialogOpen(true)}
              sx={{ bgcolor: `${claimColor}26`, color: claimColor, fontWeight: 700, cursor: "pointer" }}
            />
          </Stack>

          <Stack spacing={1.1}>
            {detailRows.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: "right" }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>

          {expense.expectedReturnDate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Expected by: {new Date(expense.expectedReturnDate).toLocaleDateString("en-IN")}
            </Typography>
          )}
          {expense.claimRemark && (
            <Typography variant="body2" sx={{ mt: 0.5, fontStyle: "italic", color: "text.secondary" }}>
              {expense.claimRemark}
            </Typography>
          )}

          {expense.description && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700}>DESCRIPTION</Typography>
              <Typography variant="body2" sx={{ mt: 0.4 }}>{expense.description}</Typography>
            </>
          )}

          {expense.remarks && (
            <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic", color: "primary.light" }}>
              "{expense.remarks}"
            </Typography>
          )}

          {photos.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>
                BILL / SLIP PHOTOS
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {photos.map((photo, i) => (
                  <Avatar
                    key={photo.publicId}
                    src={photo.url}
                    variant="rounded"
                    onClick={() => openLightbox(i)}
                    sx={{ width: 64, height: 64, cursor: "pointer", "&:hover": { opacity: 0.85 } }}
                  />
                ))}
              </Stack>
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={downloadingInvoice ? <CircularProgress size={14} /> : <DownloadIcon />} onClick={handleInvoiceDownload} disabled={downloadingInvoice} sx={{ textTransform: "none", borderRadius: 2 }}>
              Invoice PDF
            </Button>
            <Button size="small" variant="outlined" startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />} onClick={shareOnWhatsApp} sx={{ textTransform: "none", borderRadius: 2 }}>
              WhatsApp
            </Button>
            <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={shareOnEmail} sx={{ textTransform: "none", borderRadius: 2 }}>
              Email
            </Button>
            <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={() => setClaimDialogOpen(true)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Claim
            </Button>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(expense)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Edit
            </Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(expense)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Delete
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <ImageLightbox open={lightboxOpen} images={photos} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />

      <ClaimStatusDialog
        open={claimDialogOpen}
        expense={expense}
        onClose={() => setClaimDialogOpen(false)}
        onUpdated={(updated) => { setClaimDialogOpen(false); onClaimUpdated?.(updated); }}
      />
    </>
  );
}