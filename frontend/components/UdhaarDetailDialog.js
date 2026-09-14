"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Avatar, Divider, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ReplayIcon from "@mui/icons-material/Replay";
import { toast } from "react-toastify";
import api from "../lib/api";
import ImageLightbox from "./ImageLightbox";
import MarkReturnDialog from "./MarkReturnDialog";

const STATUS_COLORS = { Pending: "#FBBF24", "Partially Returned": "#60A5FA", Returned: "#4ADE80" };

const buildShareText = (record) => {
  const amountLine = record.category === "Cash"
    ? `Amount: Rs. ${Number(record.amount).toLocaleString("en-IN")}`
    : `Item: ${record.itemQuantity ? `${record.itemQuantity} — ` : ""}${record.itemDescription}`;

  return (
    `Udhaar Record\n` +
    `${record.type === "Lent" ? "Given to" : "Taken from"}: ${record.personName}\n` +
    `${amountLine}\n` +
    `Date: ${new Date(record.date).toLocaleDateString("en-IN")}\n` +
    `Status: ${record.status}` +
    (record.expectedReturnDate ? `\nDue: ${new Date(record.expectedReturnDate).toLocaleDateString("en-IN")}` : "")
  );
};

export default function UdhaarDetailDialog({ open, record, onClose, onEdit, onDelete, onUpdated }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reopening, setReopening] = useState(false);

  if (!record) return null;

  const isLent = record.type === "Lent";
  const typeColor = isLent ? "#F87171" : "#4ADE80";
  const isOverdueActive = record.isOverdue && record.status !== "Returned";
  const statusColor = isOverdueActive ? "#F87171" : (STATUS_COLORS[record.status] || "#94a3b8");
  const photos = record.photos?.length ? record.photos : [];

  const openLightbox = (i) => { setLightboxIndex(i); setLightboxOpen(true); };

  const shareOnWhatsApp = () => {
    const phone = record.contactNumber ? record.contactNumber.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildShareText(record))}`, "_blank");
  };
  const shareOnEmail = () => {
    const subject = encodeURIComponent(`Udhaar - ${record.personName}`);
    const body = encodeURIComponent(buildShareText(record));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleReopen = async () => {
    setReopening(true);
    try {
      const res = await api.patch(`/udhaar/${record._id}/reopen`);
      toast.success("Marked as pending again.");
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update.");
    } finally {
      setReopening(false);
    }
  };

  const detailRows = [
    [record.category === "Cash" ? "Amount" : "Item", record.category === "Cash" ? `₹${Number(record.amount).toLocaleString("en-IN")}` : `${record.itemQuantity ? `${record.itemQuantity} — ` : ""}${record.itemDescription}`],
    ["Date", new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })],
    ["Expected Return", record.expectedReturnDate ? new Date(record.expectedReturnDate).toLocaleDateString("en-IN") : "-"],
    ["Actual Return", record.actualReturnDate ? new Date(record.actualReturnDate).toLocaleDateString("en-IN") : "-"],
    ["Contact", record.contactNumber || "-"],
    ["Reason", record.reason || "-"],
  ];

  if (record.category === "Cash" && record.returnedAmount > 0) {
    detailRows.splice(1, 0, ["Returned So Far", `₹${Number(record.returnedAmount).toLocaleString("en-IN")}`]);
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{record.personName}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Chip size="small" label={isLent ? "Lent" : "Borrowed"} sx={{ bgcolor: `${typeColor}26`, color: typeColor, fontWeight: 700 }} />
            <Chip size="small" label={isOverdueActive ? "Overdue" : record.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
          </Stack>

          <Stack spacing={1.1}>
            {detailRows.map(([label, value]) => (
              <Stack key={label} direction="row" justifyContent="space-between" gap={2}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ textAlign: "right" }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>

          {record.remarks && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700}>REMARKS</Typography>
              <Typography variant="body2" sx={{ mt: 0.4, fontStyle: "italic" }}>{record.remarks}</Typography>
            </>
          )}

          {photos.length > 0 && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: "block", mb: 1 }}>PROOF PHOTOS</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {photos.map((photo, i) => (
                  <Avatar key={photo.publicId} src={photo.url} variant="rounded" onClick={() => openLightbox(i)} sx={{ width: 64, height: 64, cursor: "pointer", "&:hover": { opacity: 0.85 } }} />
                ))}
              </Stack>
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />} onClick={shareOnWhatsApp} sx={{ textTransform: "none", borderRadius: 2 }}>
              WhatsApp
            </Button>
            <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={shareOnEmail} sx={{ textTransform: "none", borderRadius: 2 }}>
              Email
            </Button>
            {record.status !== "Returned" ? (
              <Button size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />} onClick={() => setReturnDialogOpen(true)} sx={{ textTransform: "none", borderRadius: 2 }}>
                Mark Returned
              </Button>
            ) : (
              <Button size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={handleReopen} disabled={reopening} sx={{ textTransform: "none", borderRadius: 2 }}>
                Reopen
              </Button>
            )}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(record)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Edit
            </Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(record)} sx={{ textTransform: "none", borderRadius: 2 }}>
              Delete
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <ImageLightbox open={lightboxOpen} images={photos} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />

      <MarkReturnDialog
        open={returnDialogOpen}
        record={record}
        onClose={() => setReturnDialogOpen(false)}
        onUpdated={(updated) => { setReturnDialogOpen(false); onUpdated?.(updated); }}
      />
    </>
  );
}