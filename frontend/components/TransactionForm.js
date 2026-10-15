"use client";

// Shared manual-entry + screenshot-OCR form for both Received and Sent
// payments. The direction is fixed by the page that renders this (there's
// no direction selector here — that only exists on the ambiguous
// shared-import review screen at app/transactions/import/page.js). Each
// direction-specific wrapper (ReceivedPaymentForm.js / SentPaymentForm.js)
// passes in its own labels/field name/API path so nothing about "payer"
// vs "payee" gets mixed up between the two.

import { useEffect, useRef, useState } from "react";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, InputAdornment, Avatar, IconButton,
} from "@mui/material";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

import { toast } from "react-toastify";
import { createWorker } from "tesseract.js";

import api from "../lib/api";
import { parseTransactionText } from "../lib/ocrParser";
import ImageLightbox from "./ImageLightbox";

const STATUSES = ["unknown", "pending", "successful", "failed"];
const STATUS_LABELS = { unknown: "Unknown", pending: "Pending", successful: "Successful", failed: "Failed" };

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

/**
 * config = {
 *   direction: "received" | "sent",
 *   apiBasePath: "/received-payments" | "/sent-payments",
 *   counterpartyField: "payerName" | "payeeName",
 *   counterpartyLabel: string,
 *   secondaryField: { field, label } | null  — e.g. received's optional "receiverName"
 *   amountLabel: string,
 *   icon: ReactNode,
 *   gradient: string,
 *   accentColor: string,
 *   title: { create, edit },
 *   successMessage: { create, edit },
 *   notFoundMessage: string,
 * }
 */
export default function TransactionForm({ config, mode = "create", initialData = null, onDone }) {
  const isEdit = mode === "edit";
  const fileInputRef = useRef(null);

  const baseFields = {
    [config.counterpartyField]: "",
    amount: "",
    transactionId: "",
    rrn: "",
    referenceNumber: "",
    transactionDate: "",
    paymentMethod: "",
    paymentApp: "",
    status: "unknown",
    note: "",
  };
  if (config.secondaryField) baseFields[config.secondaryField.field] = "";

  const [form, setForm] = useState(baseFields);

  const [extractedText, setExtractedText] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [amountWarning, setAmountWarning] = useState("");

  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [removeScreenshot, setRemoveScreenshot] = useState(false);

  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  // =========================================================
  // LOAD EDIT DATA
  // =========================================================
  useEffect(() => {
    if (isEdit && initialData) {
      const next = {
        [config.counterpartyField]: initialData[config.counterpartyField] || "",
        amount: String(initialData.amount ?? ""),
        transactionId: initialData.transactionId || "",
        rrn: initialData.rrn || "",
        referenceNumber: initialData.referenceNumber || "",
        transactionDate: toDateInputValue(initialData.transactionDate),
        paymentMethod: initialData.paymentMethod || "",
        paymentApp: initialData.paymentApp || "",
        status: initialData.status || "unknown",
        note: initialData.note || "",
      };
      if (config.secondaryField) {
        next[config.secondaryField.field] = initialData[config.secondaryField.field] || "";
      }
      setForm(next);
      setExtractedText(initialData.extractedText || "");
      setScreenshotUrl(initialData.screenshotUrl || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, initialData]);

  // =========================================================
  // APPLY OCR RESULTS — only fills blanks, never overwrites what the
  // user already typed. Everything stays editable afterward.
  //
  // The parser always extracts BOTH a payee and a payer name when present
  // (a screenshot can show "Paid To X" and "Paid By Y" at once) — this
  // page's direction is already fixed, so it just picks whichever of the
  // two corresponds to "the other party" for that direction.
  // =========================================================
  const applyParsedFields = (parsed) => {
    const primaryName = config.direction === "sent" ? parsed.payeeName : parsed.payerName;
    const secondaryName = config.direction === "sent" ? parsed.payerName : parsed.payeeName;

    setForm((prev) => {
      const next = {
        ...prev,
        amount: prev.amount || (parsed.amount ? String(parsed.amount) : prev.amount),
        transactionId: prev.transactionId || parsed.transactionId || prev.transactionId,
        rrn: prev.rrn || parsed.rrn || prev.rrn,
        referenceNumber: prev.referenceNumber || parsed.referenceNumber || prev.referenceNumber,
        transactionDate: prev.transactionDate || toDateInputValue(parsed.transactionDate) || prev.transactionDate,
        paymentApp: prev.paymentApp || parsed.paymentApp || prev.paymentApp,
        status: prev.status === "unknown" ? parsed.status : prev.status,
      };
      next[config.counterpartyField] = prev[config.counterpartyField] || primaryName || prev[config.counterpartyField];
      if (config.secondaryField) {
        next[config.secondaryField.field] = prev[config.secondaryField.field] || secondaryName || prev[config.secondaryField.field];
      }
      return next;
    });

    setAutoFilled(true);
    if (parsed.amountWarning) setAmountWarning(parsed.amountWarning);
  };

  // =========================================================
  // OCR — free, entirely client-side via tesseract.js.
  // =========================================================
  const runOcr = async (file) => {
    setOcrLoading(true);
    try {
      const worker = await createWorker("eng");
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      setExtractedText((prev) => prev || text);
      applyParsedFields(parseTransactionText(text));
    } catch {
      // Best-effort — fail silently, user fills the form manually.
    } finally {
      setOcrLoading(false);
    }
  };

  // =========================================================
  // SCREENSHOT UPLOAD (manual — works in any browser, installed or not;
  // this is the fallback for when the Android share sheet isn't used)
  // =========================================================
  const handleFileSelected = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setRemoveScreenshot(false);
    runOcr(file);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview("");
    if (screenshotUrl) setRemoveScreenshot(true);
    setScreenshotUrl("");
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter a valid amount.");
      toast.error("Enter a valid amount.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append("source", isEdit ? initialData?.source || "manual_upload" : "manual_upload");
      formData.append("extractedText", extractedText || "");
      if (screenshotFile) formData.append("screenshot", screenshotFile);
      if (isEdit && removeScreenshot) formData.append("removeScreenshot", "true");

      if (isEdit) {
        await api.put(`${config.apiBasePath}/${initialData._id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(config.successMessage.edit);
      } else {
        await api.post(config.apiBasePath, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success(config.successMessage.create);
      }

      onDone?.();
    } catch (err) {
      if (err?.response?.status === 409) {
        const message = err.response.data?.message || "A record with this transaction ID already exists.";
        setError(message);
        toast.error(message);
      } else {
        const message = err?.response?.data?.message || config.notFoundMessage;
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const currentPreview = screenshotPreview || (!removeScreenshot ? screenshotUrl : "");

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Box sx={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: config.gradient, color: "#fff" }}>
          {config.icon}
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ color: "text.primary" }}>
          {isEdit ? config.title.edit : config.title.create}
        </Typography>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {autoFilled && (
        <Alert severity="warning" icon={<AutoAwesomeIcon fontSize="small" />} sx={{ mb: 2, borderRadius: 2 }}>
          Some fields were auto-filled from the screenshot using on-device OCR. This is a best-effort guess —
          please check every value before saving. Nothing is saved until you press "Confirm & Save".
        </Alert>
      )}

      {amountWarning && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAmountWarning("")}>
          {amountWarning}
        </Alert>
      )}

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
            {/* SCREENSHOT */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                PAYMENT SCREENSHOT (OPTIONAL)
              </Typography>

              <Stack direction="row" spacing={1.2} alignItems="center">
                {currentPreview ? (
                  <Box sx={{ position: "relative" }}>
                    <Avatar src={currentPreview} variant="rounded" onClick={() => setLightboxOpen(true)} sx={{ width: 84, height: 84, cursor: "pointer" }} />
                    <IconButton
                      size="small"
                      onClick={clearScreenshot}
                      sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "#fff", width: 22, height: 22, "&:hover": { bgcolor: "error.dark" } }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ) : (
                  <Button variant="outlined" component="label" startIcon={<AddAPhotoIcon />} sx={{ textTransform: "none", borderRadius: 2, height: 84 }}>
                    Upload Screenshot
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={(e) => {
                        handleFileSelected(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </Button>
                )}

                {ocrLoading && (
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    <CircularProgress size={14} />
                    <Typography variant="caption" color="text.secondary">Reading screenshot...</Typography>
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* AMOUNT */}
            <TextField
              label={config.amountLabel}
              type="number"
              required
              fullWidth
              value={form.amount}
              onChange={(e) => update("amount")(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={config.counterpartyLabel}
                fullWidth
                value={form[config.counterpartyField]}
                onChange={(e) => update(config.counterpartyField)(e.target.value)}
              />
              {config.secondaryField && (
                <TextField
                  label={config.secondaryField.label}
                  fullWidth
                  value={form[config.secondaryField.field]}
                  onChange={(e) => update(config.secondaryField.field)(e.target.value)}
                />
              )}
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Paid via / app" fullWidth placeholder="e.g. PhonePe, Google Pay" value={form.paymentApp} onChange={(e) => update("paymentApp")(e.target.value)} />
              <TextField label="Payment method (optional)" fullWidth placeholder="e.g. UPI, Bank Transfer" value={form.paymentMethod} onChange={(e) => update("paymentMethod")(e.target.value)} />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Date (optional)" type="date" fullWidth value={form.transactionDate} onChange={(e) => update("transactionDate")(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField select label="Status" fullWidth value={form.status} onChange={(e) => update("status")(e.target.value)}>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
              </TextField>
            </Stack>

            <TextField label="Transaction ID (optional)" fullWidth value={form.transactionId} onChange={(e) => update("transactionId")(e.target.value)} />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="RRN / UTR (optional)" fullWidth value={form.rrn} onChange={(e) => update("rrn")(e.target.value)} />
              <TextField label="Reference Number (optional)" fullWidth value={form.referenceNumber} onChange={(e) => update("referenceNumber")(e.target.value)} />
            </Stack>

            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              placeholder='e.g. "September rent", "Loan repayment"'
              value={form.note}
              onChange={(e) => update("note")(e.target.value)}
            />

            {extractedText && (
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "rgba(139,92,246,0.06)", border: "1px dashed", borderColor: "divider" }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RAW EXTRACTED TEXT (for your reference only)</Typography>
                <Typography variant="caption" sx={{ display: "block", mt: 0.5, whiteSpace: "pre-wrap", color: "text.secondary" }}>
                  {extractedText}
                </Typography>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{
                py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800,
                background: config.gradient,
                boxShadow: `0 8px 18px ${config.accentColor}4D`,
              }}
            >
              {submitting ? "Saving..." : "Confirm & Save"}
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
              This only records what you confirm here — it does not verify the transaction with any bank or
              payment provider.
            </Typography>
          </Stack>
        </Box>
      </Paper>

      <ImageLightbox
        open={lightboxOpen}
        images={currentPreview ? [{ url: currentPreview }] : []}
        startIndex={0}
        onClose={() => setLightboxOpen(false)}
      />
    </Container>
  );
}
