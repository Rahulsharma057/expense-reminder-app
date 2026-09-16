"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, Button, Stack, MenuItem,
  Alert, CircularProgress, Avatar, IconButton, ToggleButtonGroup, ToggleButton,
} from "@mui/material";

import LinkIcon from "@mui/icons-material/Link";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";

import { toast } from "react-toastify";

import api from "../../lib/api";
import VoiceInputButton from "../../components/VoiceInputButton";
import ParticipantsEditor from "../../components/ParticipantsEditor";

const DURATIONS = [15, 30, 45, 60, 90, 120];
const REMINDERS = [
  { value: 0, label: "At time of meeting" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

const toDateTimeLocal = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export default function MeetingForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    subject: "", description: "", platform: "Jitsi Meet", meetingLink: "",
    dateTime: toDateTimeLocal(new Date(Date.now() + 30 * 60000)),
    duration: 30, reminderMinutesBefore: 30,
  });
  const [participants, setParticipants] = useState([]);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [removeBanner, setRemoveBanner] = useState(false);

  const [generatingLink, setGeneratingLink] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        subject: initialData.subject || "",
        description: initialData.description || "",
        platform: initialData.platform || "Jitsi Meet",
        meetingLink: initialData.meetingLink || "",
        dateTime: toDateTimeLocal(initialData.dateTime),
        duration: initialData.duration || 30,
        reminderMinutesBefore: initialData.reminderMinutesBefore ?? 30,
      });
      setParticipants(initialData.participants || []);
      setBannerPreview(initialData.banner?.url || "");
    }
  }, [isEdit, initialData]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerateJitsiLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await api.get("/meetings/generate-link");
      update("meetingLink")(res.data.link);
      update("platform")("Jitsi Meet");
      toast.success("Meeting link generated.");
    } catch {
      toast.error("Could not generate link.");
    } finally {
      setGeneratingLink(false);
    }
  };

  const openGoogleMeetNewTab = () => {
    update("platform")("Google Meet");
    window.open("https://meet.google.com/new", "_blank");
    toast.info("Google Meet mein naya tab khula — link copy karke neeche paste kar do.");
  };

  const handleBannerSelected = (file) => {
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview("");
    setRemoveBanner(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.subject.trim()) {
      setError("Subject is required.");
      toast.error("Subject is required.");
      return;
    }
    if (!form.meetingLink.trim()) {
      setError("Meeting link is required — generate one or paste it.");
      toast.error("Meeting link is required.");
      return;
    }
    if (!form.dateTime) {
      setError("Date & time is required.");
      toast.error("Date & time is required.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append("participants", JSON.stringify(participants.filter((p) => p.name || p.email || p.phone)));

      if (bannerFile) formData.append("banner", bannerFile);
      if (isEdit && removeBanner) formData.append("removeBanner", "true");

      if (isEdit) {
        await api.put(`/meetings/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Meeting updated.");
      } else {
        await api.post("/meetings", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Meeting scheduled.");
      }

      setTimeout(() => onDone?.(), 400);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save this meeting.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Meeting" : "Schedule Meeting"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Subject / Heading" required fullWidth
              placeholder="e.g. Client Discussion, Team Sync"
              value={form.subject}
              onChange={(e) => update("subject")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={(t) => update("subject")(form.subject ? `${form.subject} ${t}` : t)} /> }}
            />

            <TextField
              label="Description / Agenda (optional)" fullWidth multiline minRows={2}
              value={form.description}
              onChange={(e) => update("description")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={(t) => update("description")(form.description ? `${form.description} ${t}` : t)} /> }}
            />

            {/* PLATFORM */}
            <ToggleButtonGroup
              exclusive fullWidth size="small" value={form.platform}
              onChange={(_e, value) => value && update("platform")(value)}
              sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}
            >
              <ToggleButton value="Jitsi Meet">Jitsi Meet</ToggleButton>
              <ToggleButton value="Google Meet">Google Meet</ToggleButton>
              <ToggleButton value="Other">Other</ToggleButton>
            </ToggleButtonGroup>

            {/* LINK */}
            <TextField
              label="Meeting Link" required fullWidth
              placeholder="https://..."
              value={form.meetingLink}
              onChange={(e) => update("meetingLink")(e.target.value)}
              InputProps={{ startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small" variant="outlined" startIcon={generatingLink ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                onClick={handleGenerateJitsiLink} disabled={generatingLink}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Generate Free Link (Jitsi)
              </Button>
              <Button
                size="small" variant="outlined" startIcon={<OpenInNewIcon />}
                onClick={openGoogleMeetNewTab}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Open Google Meet (new tab)
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Google Meet link Google login se banta hai — naya tab khulega, wahan se link copy karke upar paste kar do.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Date & Time" type="datetime-local" required fullWidth
                value={form.dateTime}
                onChange={(e) => update("dateTime")(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField select label="Duration" fullWidth value={form.duration} onChange={(e) => update("duration")(e.target.value)}>
                {DURATIONS.map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
              </TextField>
            </Stack>

            <TextField select label="Reminder" fullWidth value={form.reminderMinutesBefore} onChange={(e) => update("reminderMinutesBefore")(e.target.value)}>
              {REMINDERS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
            </TextField>

            <ParticipantsEditor participants={participants} onChange={setParticipants} />

            {/* BANNER IMAGE */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                BANNER IMAGE (optional)
              </Typography>
              {bannerPreview ? (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar src={bannerPreview} variant="rounded" sx={{ width: 72, height: 72 }} />
                  <Button size="small" color="error" startIcon={<CloseIcon fontSize="small" />} onClick={clearBanner} sx={{ textTransform: "none" }}>
                    Remove
                  </Button>
                </Stack>
              ) : (
                <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2 }}>
                  Add Banner Image
                  <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={(e) => handleBannerSelected(e.target.files?.[0])} />
                </Button>
              )}
            </Box>

            <Button
              type="submit" variant="contained" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" } }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Schedule Meeting"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}