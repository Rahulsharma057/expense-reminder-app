"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Chip, Divider, Button, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VideocamIcon from "@mui/icons-material/Videocam";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailIcon from "@mui/icons-material/Email";
import EventIcon from "@mui/icons-material/Event";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { toast } from "react-toastify";
import api from "../lib/api";
import { downloadICS } from "../lib/ics";

const STATUS_COLORS = { Scheduled: "#60A5FA", Completed: "#4ADE80", Cancelled: "#F87171" };

const buildShareText = (meeting) => {
  const dt = new Date(meeting.dateTime);
  return (
    `📅 ${meeting.subject}\n` +
    `When: ${dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}\n` +
    `Duration: ${meeting.duration} min\n` +
    (meeting.description ? `Details: ${meeting.description}\n` : "") +
    `Join here: ${meeting.meetingLink}`
  );
};

export default function MeetingDetailDialog({ open, meeting, onClose, onEdit, onDelete, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  if (!meeting) return null;

  const statusColor = STATUS_COLORS[meeting.status] || "#94a3b8";
  const dt = new Date(meeting.dateTime);
  const isPast = dt < new Date();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meetingLink);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  const shareOnEmail = () => {
    const to = meeting.participants?.filter((p) => p.email).map((p) => p.email).join(",") || "";
    const subject = encodeURIComponent(meeting.subject);
    const body = encodeURIComponent(buildShareText(meeting));
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const shareOnWhatsApp = () => {
    const withPhone = meeting.participants?.find((p) => p.phone);
    const phone = withPhone ? withPhone.phone.replace(/\D/g, "") : "";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildShareText(meeting))}`, "_blank");
  };

  const changeStatus = async (status) => {
    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("status", status);
      const res = await api.put(`/meetings/${meeting._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Marked as ${status}.`);
      onUpdated?.(res.data);
    } catch {
      toast.error("Could not update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography fontWeight={800} noWrap sx={{ pr: 2 }}>{meeting.subject}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "divider" }}>
        {meeting.banner?.url && (
          <Avatar src={meeting.banner.url} variant="rounded" sx={{ width: "100%", height: 140, borderRadius: 2, mb: 1.5 }} />
        )}

        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip size="small" label={meeting.platform} sx={{ bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700 }} />
          <Chip size="small" label={isPast && meeting.status === "Scheduled" ? "Past" : meeting.status} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
        </Stack>

        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">When</Typography>
            <Typography variant="body2" fontWeight={700}>{dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Duration</Typography>
            <Typography variant="body2" fontWeight={700}>{meeting.duration} min</Typography>
          </Stack>
          {meeting.participants?.length > 0 && (
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">Participants</Typography>
              <Typography variant="body2" fontWeight={700} sx={{ textAlign: "right" }}>
                {meeting.participants.map((p) => p.name || p.email || p.phone).join(", ")}
              </Typography>
            </Stack>
          )}
        </Stack>

        {meeting.description && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="text.secondary" fontWeight={700}>DESCRIPTION</Typography>
            <Typography variant="body2" sx={{ mt: 0.4 }}>{meeting.description}</Typography>
          </>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Button
          fullWidth variant="contained" startIcon={<VideocamIcon />}
          href={meeting.meetingLink} target="_blank" rel="noopener noreferrer"
          sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700, mb: 1, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)" }}
        >
          Join Now
        </Button>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyLink} sx={{ textTransform: "none", borderRadius: 2 }}>
            Copy Link
          </Button>
          <Button size="small" variant="outlined" startIcon={<WhatsAppIcon sx={{ color: "#25D366" }} />} onClick={shareOnWhatsApp} sx={{ textTransform: "none", borderRadius: 2 }}>
            WhatsApp
          </Button>
          <Button size="small" variant="outlined" startIcon={<EmailIcon />} onClick={shareOnEmail} sx={{ textTransform: "none", borderRadius: 2 }}>
            Email
          </Button>
          <Button size="small" variant="outlined" startIcon={<EventIcon />} onClick={() => downloadICS(meeting)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Add to Calendar
          </Button>
        </Stack>

        {meeting.status === "Scheduled" && (
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button fullWidth size="small" variant="outlined" color="success" startIcon={<CheckCircleIcon />} disabled={updating} onClick={() => changeStatus("Completed")} sx={{ textTransform: "none", borderRadius: 2 }}>
              Completed
            </Button>
            <Button fullWidth size="small" variant="outlined" color="error" startIcon={<CancelIcon />} disabled={updating} onClick={() => changeStatus("Cancelled")} sx={{ textTransform: "none", borderRadius: 2 }}>
              Cancel
            </Button>
          </Stack>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(meeting)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Edit
          </Button>
          <Button fullWidth variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => onDelete(meeting)} sx={{ textTransform: "none", borderRadius: 2 }}>
            Delete
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}