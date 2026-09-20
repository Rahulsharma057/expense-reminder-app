"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button, Avatar, CircularProgress } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { toast } from "react-toastify";
import api from "../lib/api";
import { downloadBlobResponse } from "../lib/download";
import ImageLightbox from "./ImageLightbox";
import RescheduleDialog from "./RescheduleDialog";
import FoodArrangementsChecklist from "./FoodArrangementsChecklist";

const STATUS_COLORS = { Scheduled: "#60A5FA", Rescheduled: "#FBBF24", Completed: "#4ADE80", Cancelled: "#F87171" };
const TYPE_COLORS = { Appointment: "#94a3b8", Meeting: "#60A5FA", "Meeting with Food": "#FB923C" };

const buildShareText = (a) => {
  const dt = new Date(a.dateTime);
  return (
    `📌 ${a.title} (${a.type})\n` +
    `When: ${dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}\n` +
    `Duration: ${a.duration} min\n` +
    (a.location ? `Where: ${a.location}\n` : "") +
    (a.attendees?.length ? `With: ${a.attendees.map((x) => x.name).join(", ")}\n` : "") +
    (a.description ? `Agenda: ${a.description}\n` : "")
  );
};

export default function AppointmentDetailDialog({ open, appointment, onClose, onEdit, onDelete, onUpdated }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!appointment) return null;

  const statusColor = STATUS_COLORS[appointment.status] || "#94a3b8";
  const typeColor = TYPE_COLORS[appointment.type] || "#94a3b8";
  const photos = appointment.photos || [];

  const shareOnWhatsApp = () => {
    const withPhone = appointment.attendees?.find((a) => a.phone);
    const phone = withPhone ? withPhone.phone.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildShareText(appointment))}`, "_blank");
  };
  const shareOnEmail = () => {
    const to = appointment.attendees?.filter((a) => a.email).map((a) => a.email).join(",") || "";
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(appointment.title)}&body=${encodeURIComponent(buildShareText(appointment))}`;
  };

  const handlePdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/appointments/${appointment._id}/pdf`, { responseType: "blob" });
      downloadBlobResponse(res, `${appointment.title}.pdf`);
      toast.info("PDF downloaded — attach it manually in WhatsApp/Email.");
    } catch {
      toast.error("Could not generate PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const changeStatus = async (status) => {
    setBusy(true);
    try {
      const res = await api.patch(`/appointments/${appointment._id}/status`, { status });
      toast.success(`Marked as ${status}.`);
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{appointment.title}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: "divider" }}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            <Chip size="small" label={appointment.type} sx={{ bgcolor: `${typeColor}26`, color: typeColor, fontWeight: 700 }} />
            <Chip size="small" label={appointment.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">When</Typography><Typography variant="body2" fontWeight={700}>{new Date(appointment.dateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Duration</Typography><Typography variant="body2" fontWeight={700}>{appointment.duration} min</Typography></Stack>
            {appointment.location && <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="body2" color="text.secondary">Where</Typography><Typography variant="body2" fontWeight={700} sx={{ textAlign: "right" }}>{appointment.location}</Typography></Stack>}
          </Stack>

          {appointment.attendees?.length > 0 && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.6 }}>ATTENDEES</Typography>
              <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                {appointment.attendees.map((a, i) => (
                  <Chip key={i} size="small" label={`${a.name}${a.isExternal ? " (Guest)" : ""}`} variant="outlined" />
                ))}
              </Stack>
            </>
          )}

          {appointment.description && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary">AGENDA</Typography>
              <Typography variant="body2" sx={{ mt: 0.4 }}>{appointment.description}</Typography>
            </>
          )}

          {appointment.arrangements?.length > 0 && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <FoodArrangementsChecklist
                appointmentId={appointment._id}
                arrangements={appointment.arrangements}
                onChange={() => {}}
                onSavedRemote={(updated) => onUpdated?.(updated)}
              />
            </>
          )}

          {appointment.notes && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary">NOTES</Typography>
              <Typography variant="body2" sx={{ mt: 0.4 }}>{appointment.notes}</Typography>
            </>
          )}

          {photos.length > 0 && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.6 }}>PHOTOS</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {photos.map((p, i) => (
                  <Avatar key={p.publicId} src={p.url} variant="rounded" onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }} sx={{ width: 64, height: 64, cursor: "pointer" }} />
                ))}
              </Stack>
            </>
          )}

          {appointment.rescheduleHistory?.length > 0 && (
            <>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.6 }}>RESCHEDULE HISTORY</Typography>
              {appointment.rescheduleHistory.map((r, i) => (
                <Typography key={i} variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Was: {new Date(r.previousDateTime).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{r.reason ? ` — ${r.reason}` : ""}
                </Typography>
              ))}
            </>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />} onClick={shareOnWhatsApp} sx={{ textTransform: "none", borderRadius: 2 }}>WhatsApp</Button>
            <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={shareOnEmail} sx={{ textTransform: "none", borderRadius: 2 }}>Email</Button>
            <Button size="small" variant="outlined" startIcon={downloadingPdf ? <CircularProgress size={14} /> : <PictureAsPdfIcon />} onClick={handlePdf} disabled={downloadingPdf} sx={{ textTransform: "none", borderRadius: 2 }}>PDF</Button>
            <Button size="small" variant="outlined" startIcon={<EventRepeatIcon />} onClick={() => setRescheduleOpen(true)} sx={{ textTransform: "none", borderRadius: 2 }}>Reschedule</Button>
          </Stack>

          {appointment.status !== "Completed" && appointment.status !== "Cancelled" && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button fullWidth size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />} disabled={busy} onClick={() => changeStatus("Completed")} sx={{ textTransform: "none", borderRadius: 2 }}>Completed</Button>
              <Button fullWidth size="small" variant="outlined" color="error" startIcon={<CancelIcon />} disabled={busy} onClick={() => changeStatus("Cancelled")} sx={{ textTransform: "none", borderRadius: 2 }}>Cancel</Button>
            </Stack>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(appointment)} sx={{ textTransform: "none", borderRadius: 2 }}>Edit</Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(appointment)} sx={{ textTransform: "none", borderRadius: 2 }}>Delete</Button>
          </Stack>
        </DialogContent>
      </Dialog>

      <ImageLightbox open={lightboxOpen} images={photos} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
      <RescheduleDialog
        open={rescheduleOpen}
        appointment={appointment}
        onClose={() => setRescheduleOpen(false)}
        onUpdated={(updated) => { setRescheduleOpen(false); onUpdated?.(updated); }}
      />
    </>
  );
}