"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, InputAdornment, Avatar, Autocomplete, IconButton, Chip,
} from "@mui/material";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { toast } from "react-toastify";
import { createWorker } from "tesseract.js";

import api from "../../lib/api";
import VoiceInputButton from "../../components/VoiceInputButton";
import AddRecipientDialog from "../../components/AddRecipientDialog";
import ImageLightbox from "../../components/ImageLightbox";

const MODES = ["Cash", "PhonePe", "Bank Transfer", "Other"];
const MAX_PHOTOS = 5;

const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

export default function ExpenseForm({ mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    recipientName: "",
    amount: "",
    transactionId: "",
    date: toDateInputValue(new Date()),
    reason: "",
    description: "",
    remarks: "",
    mode: "Cash",
    paidByOther: "",
  });

  const [recipientOptions, setRecipientOptions] = useState([]);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);

  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const totalPhotoCount = existingPhotos.length + newPhotoFiles.length;
  const lightboxImages = [
    ...existingPhotos.map((p) => ({ url: p.url })),
    ...newPhotoPreviews.map((url) => ({ url })),
  ];

  // =========================================================
  // LOAD RECIPIENT SUGGESTIONS
  // =========================================================
  const loadRecipients = () => {
    api
      .get("/expenses/suggestions/recipients")
      .then((res) => setRecipientOptions(res.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadRecipients();
  }, []);

  // =========================================================
  // LOAD EDIT DATA
  // =========================================================
  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        recipientName: initialData.recipientName || "",
        amount: String(initialData.amount ?? ""),
        transactionId: initialData.transactionId || "",
        date: toDateInputValue(initialData.date),
        reason: initialData.reason || "",
        description: initialData.description || "",
        remarks: initialData.remarks || "",
        mode: initialData.mode || "Cash",
        paidByOther: initialData.paidByOther || "",
      });

      setExistingPhotos(initialData.billPhotos || []);
    }
  }, [isEdit, initialData]);

  // =========================================================
  // FORM UPDATE
  // =========================================================
  const update = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const appendVoiceText = (key) => (spokenText) => {
    setForm((prev) => ({ ...prev, [key]: prev[key] ? `${prev[key]} ${spokenText}` : spokenText }));
  };

  // =========================================================
  // BILL RECOGNITION (OCR) — reads the bill photo, guesses the amount.
  // Free, runs entirely in the browser (tesseract.js) — no API key.
  // =========================================================
  const runReceiptOcr = async (file) => {
    setOcrLoading(true);
    setDetectedAmount(null);
    try {
      const worker = await createWorker("eng");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const matches = text.match(/(?:rs\.?|inr|₹)?\s?\d[\d,]*(?:\.\d{1,2})?/gi) || [];
      const numbers = matches
        .map((m) => parseFloat(m.replace(/[^\d.]/g, "")))
        .filter((n) => !isNaN(n) && n > 0 && n < 10000000);

      if (numbers.length) {
        setDetectedAmount(Math.max(...numbers));
      }
    } catch {
      // Best-effort — fail silently, user can type the amount manually.
    } finally {
      setOcrLoading(false);
    }
  };

  // =========================================================
  // PHOTOS
  // =========================================================
  const handlePhotosSelected = (files) => {
    const incoming = Array.from(files || []);
    if (!incoming.length) return;

    const spaceLeft = MAX_PHOTOS - totalPhotoCount;
    if (spaceLeft <= 0) {
      toast.error(`You can attach at most ${MAX_PHOTOS} photos.`);
      return;
    }

    const toAdd = incoming.slice(0, spaceLeft);
    if (incoming.length > toAdd.length) {
      toast.error(`Only ${spaceLeft} more photo(s) can be added (max ${MAX_PHOTOS}).`);
    }

    const isFirstPhoto = totalPhotoCount === 0;

    setNewPhotoFiles((prev) => [...prev, ...toAdd]);
    setNewPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);

    if (isFirstPhoto) {
      runReceiptOcr(toAdd[0]);
    }
  };

  const removeNewPhoto = (index) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingPhoto = (publicId) => {
    setExistingPhotos((prev) => prev.filter((p) => p.publicId !== publicId));
    setRemovedPhotoIds((prev) => [...prev, publicId]);
  };

  const openLightboxAt = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const applyDetectedAmount = () => {
    update("amount")(String(detectedAmount));
    setDetectedAmount(null);
  };

  // =========================================================
  // SUCCESS TOAST SEQUENCE
  // =========================================================
  const showSuccessSequence = () => {
    toast.success(isEdit ? "Expense updated successfully" : "Expense added successfully");
    setTimeout(() => {
      toast.success(isEdit ? "Your expense changes have been saved" : "Your expense has been saved");
    }, 2500);
    setTimeout(() => toast.success("Great! Everything is up to date"), 5000);
    setTimeout(() => toast.success("I love you Bhumiii ❤️"), 7500);
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.recipientName.trim()) {
      setError("Recipient name is required.");
      toast.error("Recipient name is required.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter a valid amount.");
      toast.error("Enter a valid amount.");
      return;
    }
    if (form.mode === "Other" && !form.paidByOther.trim()) {
      const message = 'Please say who paid on your behalf (e.g. "via Rahul\'s UPI").';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      newPhotoFiles.forEach((file) => formData.append("billPhotos", file));

      if (isEdit) {
        formData.append("removedPhotoIds", JSON.stringify(removedPhotoIds));
        await api.put(`/expenses/${initialData._id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      } else {
        await api.post("/expenses", formData, { headers: { "Content-Type": "multipart/form-data" } });
      }

      showSuccessSequence();
      setTimeout(() => onDone?.(), 700);
    } catch (err) {
      const message = err?.response?.data?.message || "Could not save this expense.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 2, color: "text.primary" }}>
        {isEdit ? "Edit Expense" : "Add Expense"}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.75, sm: 3 }, border: "1px solid", borderColor: "divider",
          borderRadius: { xs: 2.5, sm: 3 }, backgroundColor: "background.paper",
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
        }}
      >
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* RECIPIENT */}
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Autocomplete
                freeSolo
                fullWidth
                options={recipientOptions}
                inputValue={form.recipientName}
                onInputChange={(_e, value) => update("recipientName")(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Given to (recipient name)"
                    required
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {params.InputProps.endAdornment}
                          <VoiceInputButton onResult={appendVoiceText("recipientName")} />
                        </>
                      ),
                    }}
                  />
                )}
              />
              <IconButton onClick={() => setAddRecipientOpen(true)} sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }} title="Add new recipient">
                <PersonAddAlt1Icon fontSize="small" />
              </IconButton>
            </Stack>

            {/* AMOUNT */}
            <TextField
              label="Amount"
              type="number"
              required
              fullWidth
              value={form.amount}
              onChange={(e) => update("amount")(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            />

            {/* MODE + DATE */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField select label="Paid via" fullWidth value={form.mode} onChange={(e) => update("mode")(e.target.value)}>
                {MODES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField label="Date" type="date" fullWidth value={form.date} onChange={(e) => update("date")(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>

            {form.mode === "Other" && (
              <TextField label="Who paid on your behalf?" fullWidth placeholder="e.g. via Rahul's UPI / Papa's account" value={form.paidByOther} onChange={(e) => update("paidByOther")(e.target.value)} />
            )}

            <TextField label="Transaction ID (optional)" fullWidth value={form.transactionId} onChange={(e) => update("transactionId")(e.target.value)} />

            <TextField
              label="Reason (why?)"
              fullWidth
              placeholder="e.g. groceries, medicine, gift"
              value={form.reason}
              onChange={(e) => update("reason")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("reason")} /> }}
            />

            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) => update("description")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("description")} /> }}
            />

            <TextField
              label="Remarks (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.remarks}
              onChange={(e) => update("remarks")(e.target.value)}
              InputProps={{ endAdornment: <VoiceInputButton onResult={appendVoiceText("remarks")} /> }}
            />

            {/* BILL PHOTOS */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">BILL / SLIP PHOTOS</Typography>
                <Chip size="small" label={`${totalPhotoCount}/${MAX_PHOTOS}`} sx={{ height: 20, fontSize: 10 }} />
              </Stack>

              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
                {existingPhotos.map((photo, i) => (
                  <Box key={photo.publicId} sx={{ position: "relative" }}>
                    <Avatar src={photo.url} variant="rounded" onClick={() => openLightboxAt(i)} sx={{ width: 72, height: 72, cursor: "pointer" }} />
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeExistingPhoto(photo.publicId); }}
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}

                {newPhotoPreviews.map((preview, index) => (
                  <Box key={preview} sx={{ position: "relative" }}>
                    <Avatar src={preview} variant="rounded" onClick={() => openLightboxAt(existingPhotos.length + index)} sx={{ width: 72, height: 72, cursor: "pointer" }} />
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeNewPhoto(index); }}
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}

                {totalPhotoCount < MAX_PHOTOS && (
                  <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2, height: 72 }}>
                    Add Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      multiple
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => { handlePhotosSelected(e.target.files); e.target.value = ""; }}
                    />
                  </Button>
                )}
              </Stack>

              {ocrLoading && (
                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1.2 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">Reading amount from bill...</Typography>
                </Stack>
              )}

              {detectedAmount && !ocrLoading && (
                <Chip
                  size="small"
                  icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                  label={`Detected ₹${detectedAmount.toLocaleString("en-IN")} — tap to use`}
                  onClick={applyDetectedAmount}
                  onDelete={() => setDetectedAmount(null)}
                  sx={{ mt: 1.2, bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", fontWeight: 700, cursor: "pointer" }}
                />
              )}
            </Box>

            {/* SUBMIT */}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800,
                background: "linear-gradient(135deg,#8B5CF6,#6D28D9)",
                boxShadow: "0 8px 18px rgba(139,92,246,0.30)",
                "&:hover": { background: "linear-gradient(135deg,#7C3AED,#5B21B6)" },
              }}
            >
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Expense"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      <AddRecipientDialog
        open={addRecipientOpen}
        onClose={() => setAddRecipientOpen(false)}
        onAdded={(name) => { loadRecipients(); update("recipientName")(name); }}
      />

      <ImageLightbox open={lightboxOpen} images={lightboxImages} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
    </Container>
  );
}