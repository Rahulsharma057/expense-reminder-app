"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, Button, Stack,
  Alert, CircularProgress, InputAdornment, Avatar, IconButton, Chip,
  ToggleButtonGroup, ToggleButton,
} from "@mui/material";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import PhoneIcon from "@mui/icons-material/Phone";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";

import { toast } from "react-toastify";

import api from "../../lib/api";
import VoiceInputButton from "../../components/VoiceInputButton";
import ImageLightbox from "../../components/ImageLightbox";

const MAX_PHOTOS = 5;

const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

export default function UdhaarForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    personName: "", contactNumber: "", type: "Lent", category: "Cash",
    amount: "", itemDescription: "", itemQuantity: "",
    date: toDateInputValue(new Date()), expectedReturnDate: "", reason: "", remarks: "",
  });

  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPhotoCount = existingPhotos.length + newPhotoFiles.length;
  const lightboxImages = [...existingPhotos.map((p) => ({ url: p.url })), ...newPhotoPreviews.map((url) => ({ url }))];

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        personName: initialData.personName || "",
        contactNumber: initialData.contactNumber || "",
        type: initialData.type || "Lent",
        category: initialData.category || "Cash",
        amount: String(initialData.amount ?? ""),
        itemDescription: initialData.itemDescription || "",
        itemQuantity: initialData.itemQuantity || "",
        date: toDateInputValue(initialData.date),
        expectedReturnDate: initialData.expectedReturnDate ? toDateInputValue(initialData.expectedReturnDate) : "",
        reason: initialData.reason || "",
        remarks: initialData.remarks || "",
      });
      setExistingPhotos(initialData.photos || []);
    }
  }, [isEdit, initialData]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const appendVoiceText = (key) => (spokenText) => {
    setForm((prev) => ({ ...prev, [key]: prev[key] ? `${prev[key]} ${spokenText}` : spokenText }));
  };

  const handlePhotosSelected = (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;
    const spaceLeft = MAX_PHOTOS - totalPhotoCount;
    if (spaceLeft <= 0) {
      toast.error(`You can attach at most ${MAX_PHOTOS} photos.`);
      return;
    }
    const toAdd = incoming.slice(0, spaceLeft);
    setNewPhotoFiles((prev) => [...prev, ...toAdd]);
    setNewPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewPhoto = (index) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };
  const removeExistingPhoto = (publicId) => {
    setExistingPhotos((prev) => prev.filter((p) => p.publicId !== publicId));
    setRemovedPhotoIds((prev) => [...prev, publicId]);
  };
  const openLightboxAt = (index) => { setLightboxIndex(index); setLightboxOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.personName.trim()) {
      setError("Person name is required.");
      toast.error("Person name is required.");
      return;
    }
    if (form.category === "Cash" && (!form.amount || Number(form.amount) <= 0)) {
      setError("Enter a valid amount.");
      toast.error("Enter a valid amount.");
      return;
    }
    if (form.category === "Item" && !form.itemDescription.trim()) {
      setError("Describe the item.");
      toast.error("Describe the item.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      newPhotoFiles.forEach((file) => formData.append("photos", file));

      if (isEdit) {
        formData.append("removedPhotoIds", JSON.stringify(removedPhotoIds));
        await api.put(`/udhaar/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Record updated.");
      } else {
        await api.post("/udhaar", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Record added.");
      }

      setTimeout(() => onDone?.(), 400);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save this record.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Udhaar Entry" : "Add Udhaar Entry"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper elevation={0} sx={{ p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper" }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* TYPE TOGGLE */}
            <ToggleButtonGroup
              exclusive fullWidth value={form.type}
              onChange={(_e, value) => value && update("type")(value)}
              sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, py: 1, "&.Mui-selected": { color: "#fff" } } }}
            >
              <ToggleButton value="Lent" sx={{ "&.Mui-selected": { bgcolor: "#F87171", "&:hover": { bgcolor: "#EF4444" } } }}>
                <CallMadeIcon sx={{ mr: 0.8, fontSize: 18 }} /> I Gave (Lent)
              </ToggleButton>
              <ToggleButton value="Borrowed" sx={{ "&.Mui-selected": { bgcolor: "#4ADE80", "&:hover": { bgcolor: "#22C55E" } } }}>
                <CallReceivedIcon sx={{ mr: 0.8, fontSize: 18 }} /> I Took (Borrowed)
              </ToggleButton>
            </ToggleButtonGroup>

            {/* CATEGORY TOGGLE */}
            <ToggleButtonGroup
              exclusive fullWidth size="small" value={form.category}
              onChange={(_e, value) => value && update("category")(value)}
              sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700 } }}
            >
              <ToggleButton value="Cash">Cash</ToggleButton>
              <ToggleButton value="Item">Item / Saaman</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              label={form.type === "Lent" ? "Given to (person name)" : "Taken from (person name)"}
              required fullWidth
              value={form.personName}
              onChange={(e) => update("personName")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("personName")} /> }}
            />

            <TextField
              label="Contact number (optional)"
              fullWidth
              value={form.contactNumber}
              onChange={(e) => update("contactNumber")(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment> }}
            />

            {form.category === "Cash" ? (
              <TextField
                label="Amount" type="number" required fullWidth
                value={form.amount}
                onChange={(e) => update("amount")(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
              />
            ) : (
              <>
                <TextField
                  label="What item?" required fullWidth
                  placeholder="e.g. Drill machine, folding chairs"
                  value={form.itemDescription}
                  onChange={(e) => update("itemDescription")(e.target.value)}
                  InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("itemDescription")} /> }}
                />
                <TextField
                  label="Quantity (optional)" fullWidth
                  placeholder="e.g. 2 chairs, 1 piece"
                  value={form.itemQuantity}
                  onChange={(e) => update("itemQuantity")(e.target.value)}
                />
              </>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Date" type="date" fullWidth value={form.date} onChange={(e) => update("date")(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Expected return date (optional)" type="date" fullWidth value={form.expectedReturnDate} onChange={(e) => update("expectedReturnDate")(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>

            <TextField
              label="Reason (why?)" fullWidth
              placeholder="e.g. emergency, function, personal use"
              value={form.reason}
              onChange={(e) => update("reason")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("reason")} /> }}
            />

            <TextField
              label="Remarks (optional)" fullWidth multiline minRows={2}
              placeholder="Any follow-up notes"
              value={form.remarks}
              onChange={(e) => update("remarks")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("remarks")} /> }}
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">PROOF PHOTOS (optional)</Typography>
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
                    <input ref={fileInputRef} type="file" hidden multiple accept="image/*" capture="environment" onChange={(e) => { handlePhotosSelected(e.target.files); e.target.value = ""; }} />
                  </Button>
                )}
              </Stack>
            </Box>

            <Button
              type="submit" variant="contained" disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800, background: "linear-gradient(135deg,#8B5CF6,#6D28D9)", "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" } }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Entry"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <ImageLightbox open={lightboxOpen} images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
    </Container>
  );
}