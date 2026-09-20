"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, Button, Stack,
  Alert, CircularProgress, Avatar, IconButton, ToggleButtonGroup, ToggleButton, Chip,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../../lib/api";
import VoiceInputButton from "../../components/VoiceInputButton";
import AttendeesEditor from "../../components/AttendeesEditor";
import FoodArrangementsChecklist from "../../components/FoodArrangementsChecklist";
import ImageLightbox from "../../components/ImageLightbox";
import ConflictWarning from "../../components/ConflictWarning";

const TYPES = ["Appointment", "Meeting", "Meeting with Food"];
const MAX_PHOTOS = 5;

const toDateTimeLocal = (value) => {
  const d = value ? new Date(value) : new Date(Date.now() + 30 * 60000);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
};

export default function AppointmentForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ title: "", description: "", type: "Appointment", dateTime: toDateTimeLocal(), duration: 30, location: "", notes: "" });
  const [attendees, setAttendees] = useState([]);
  const [arrangements, setArrangements] = useState([]);

  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [conflicts, setConflicts] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPhotoCount = existingPhotos.length + newPhotoFiles.length;
  const lightboxImages = [...existingPhotos.map((p) => ({ url: p.url })), ...newPhotoPreviews.map((url) => ({ url }))];

  const isMeeting = form.type === "Meeting" || form.type === "Meeting with Food";
  const isMeetingWithFood = form.type === "Meeting with Food";

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        title: initialData.title || "",
        description: initialData.description || "",
        type: initialData.type || "Appointment",
        dateTime: toDateTimeLocal(initialData.dateTime),
        duration: initialData.duration || 30,
        location: initialData.location || "",
        notes: initialData.notes || "",
      });
      setAttendees(initialData.attendees || []);
      setArrangements(initialData.arrangements || []);
      setExistingPhotos(initialData.photos || []);
    }
  }, [isEdit, initialData]);

  // Debounced conflict check whenever date/duration changes
  useEffect(() => {
    if (!form.dateTime) return;
    const t = setTimeout(() => {
      api
        .get("/appointments/check-conflict", { params: { dateTime: form.dateTime, duration: form.duration, excludeId: isEdit ? initialData?._id : undefined } })
        .then((res) => setConflicts(res.data.conflicts || []))
        .catch(() => setConflicts([]));
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.dateTime, form.duration]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleTypeChange = (value) => {
    update("type")(value);
    if (value !== "Meeting with Food") setArrangements([]); // arrangements only relevant for this type
  };

  const handlePhotosSelected = (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    const spaceLeft = MAX_PHOTOS - totalPhotoCount;
    if (spaceLeft <= 0) { toast.error(`Max ${MAX_PHOTOS} photos.`); return; }
    const toAdd = incoming.slice(0, spaceLeft);
    setNewPhotoFiles((prev) => [...prev, ...toAdd]);
    setNewPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };
  const removeNewPhoto = (index) => { setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index)); setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index)); };
  const removeExistingPhoto = (publicId) => { setExistingPhotos((prev) => prev.filter((p) => p.publicId !== publicId)); setRemovedPhotoIds((prev) => [...prev, publicId]); };
  const openLightboxAt = (index) => { setLightboxIndex(index); setLightboxOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) { setError("Title is required."); toast.error("Title is required."); return; }
    if (!form.dateTime) { setError("Date & time is required."); toast.error("Date & time is required."); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append("attendees", JSON.stringify(attendees));
      formData.append("arrangements", JSON.stringify(arrangements.filter((a) => a.text?.trim())));
      newPhotoFiles.forEach((file) => formData.append("photos", file));

      let saved;
      if (isEdit) {
        formData.append("removedPhotoIds", JSON.stringify(removedPhotoIds));
        const res = await api.put(`/appointments/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        saved = res.data;
        toast.success("Updated.");
      } else {
        const res = await api.post("/appointments", formData, { headers: { "Content-Type": "multipart/form-data" } });
        saved = res.data;
        toast.success("Scheduled.");
      }
      setTimeout(() => onDone?.(saved), 400);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save.";
      setError(message); toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Appointment" : "New Appointment"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* TYPE — decides which fields below appear */}
            <ToggleButtonGroup exclusive fullWidth size="small" value={form.type} onChange={(_e, v) => v && handleTypeChange(v)} sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, fontSize: 11.5 } }}>
              {TYPES.map((t) => <ToggleButton key={t} value={t}>{t}</ToggleButton>)}
            </ToggleButtonGroup>

            <TextField
              label="Title" required fullWidth placeholder={form.type === "Appointment" ? "e.g. Doctor Visit" : "e.g. Client Discussion"}
              value={form.title} onChange={(e) => update("title")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={(t) => update("title")(form.title ? `${form.title} ${t}` : t)} /> }}
            />

            {/* Agenda — only for Meeting / Meeting with Food */}
            {isMeeting && (
              <TextField
                label="Agenda / Description" fullWidth multiline minRows={2}
                value={form.description} onChange={(e) => update("description")(e.target.value)}
                InputProps={{ endAdornment: <VoiceInputButton onResult={(t) => update("description")(form.description ? `${form.description} ${t}` : t)} /> }}
              />
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Date & Time" type="datetime-local" required fullWidth value={form.dateTime} onChange={(e) => update("dateTime")(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Duration (min)" type="number" fullWidth value={form.duration} onChange={(e) => update("duration")(e.target.value)} />
            </Stack>

            <ConflictWarning conflicts={conflicts} />

            <TextField label="Location (optional)" fullWidth placeholder="e.g. Office, Online, Client's place" value={form.location} onChange={(e) => update("location")(e.target.value)} />

            <AttendeesEditor attendees={attendees} onChange={setAttendees} />

            {/* Food & Arrangements — only for Meeting with Food */}
            {isMeetingWithFood && (
              <FoodArrangementsChecklist
                appointmentId={isEdit ? initialData?._id : null}
                arrangements={arrangements}
                onChange={setArrangements}
              />
            )}

            <TextField label="Notes (optional)" fullWidth multiline minRows={2} value={form.notes} onChange={(e) => update("notes")(e.target.value)} />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">PHOTOS (optional)</Typography>
                <Chip size="small" label={`${totalPhotoCount}/${MAX_PHOTOS}`} sx={{ height: 20, fontSize: 10 }} />
              </Stack>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                {existingPhotos.map((photo, i) => (
                  <Box key={photo.publicId} sx={{ position: "relative" }}>
                    <Avatar src={photo.url} variant="rounded" onClick={() => openLightboxAt(i)} sx={{ width: 72, height: 72, cursor: "pointer" }} />
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeExistingPhoto(photo.publicId); }} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
                {newPhotoPreviews.map((preview, index) => (
                  <Box key={preview} sx={{ position: "relative" }}>
                    <Avatar src={preview} variant="rounded" onClick={() => openLightboxAt(existingPhotos.length + index)} sx={{ width: 72, height: 72, cursor: "pointer" }} />
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeNewPhoto(index); }} sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
                {totalPhotoCount < MAX_PHOTOS && (
                  <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2, height: 72 }}>
                    Add Photo
                    <input ref={fileInputRef} type="file" hidden multiple accept="image/*" onChange={(e) => { handlePhotosSelected(e.target.files); e.target.value = ""; }} />
                  </Button>
                )}
              </Stack>
            </Box>

            <Button
              type="submit" variant="contained" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" } }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Schedule"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <ImageLightbox open={lightboxOpen} images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
    </Container>
  );
}