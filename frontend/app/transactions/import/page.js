"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box, Container, Paper, Typography, TextField, MenuItem, Button, Stack,
  Alert, CircularProgress, InputAdornment, Avatar, IconButton,
  ToggleButton, ToggleButtonGroup,
} from "@mui/material";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CallReceivedRoundedIcon from "@mui/icons-material/CallReceivedRounded";
import CallMadeRoundedIcon from "@mui/icons-material/CallMadeRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";

import { toast } from "react-toastify";
import { createWorker } from "tesseract.js";

import api from "../../../lib/api";
import { parseTransactionText } from "../../../lib/ocrParser";
import { getSharedDraft, clearSharedDraft } from "../../../lib/shareDraft";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ImageLightbox from "../../../components/ImageLightbox";

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

function ImportTransactionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);

  // direction is intentionally null until either auto-detected with
  // confidence or the user picks one — nothing can be saved without it.
  const [direction, setDirection] = useState(null);
  const [directionAutoDetected, setDirectionAutoDetected] = useState(false);

  // Both payeeName and payerName are tracked independently (a screenshot
  // can show "Paid To X" AND "Paid By Y" at once) — the direction toggle
  // just decides which one is shown/sent, it never discards the other.
  const [form, setForm] = useState({
    payeeName: "",
    payerName: "",
    amount: "",
    transactionId: "",
    rrn: "",
    referenceNumber: "",
    transactionDate: "",
    paymentMethod: "",
    paymentApp: "",
    status: "unknown",
    note: "",
  });

  const [source, setSource] = useState("manual_upload");
  const [extractedText, setExtractedText] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const [amountWarning, setAmountWarning] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  // =========================================================
  // APPLY PARSED RESULTS — direction is only set if not already chosen by
  // the user. payeeName/payerName/references only fill blanks, never
  // overwrite something the user already typed.
  // =========================================================
  const applyParsed = (parsed) => {
    if (parsed.direction && direction === null) {
      setDirection(parsed.direction);
      setDirectionAutoDetected(true);
    }

    setForm((prev) => ({
      ...prev,
      amount: prev.amount || (parsed.amount ? String(parsed.amount) : prev.amount),
      payeeName: prev.payeeName || parsed.payeeName || prev.payeeName,
      payerName: prev.payerName || parsed.payerName || prev.payerName,
      transactionId: prev.transactionId || parsed.transactionId || prev.transactionId,
      rrn: prev.rrn || parsed.rrn || prev.rrn,
      referenceNumber: prev.referenceNumber || parsed.referenceNumber || prev.referenceNumber,
      transactionDate: prev.transactionDate || toDateInputValue(parsed.transactionDate) || prev.transactionDate,
      paymentApp: prev.paymentApp || parsed.paymentApp || prev.paymentApp,
      status: prev.status === "unknown" ? parsed.status : prev.status,
    }));

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
      applyParsed(parseTransactionText(text));
    } catch {
      // Best-effort — fail silently, user fills the form manually.
    } finally {
      setOcrLoading(false);
    }
  };

  // =========================================================
  // LOAD SHARED DRAFT (from the Android share sheet, staged by the
  // service worker) — or show a manual-import notice if there isn't one.
  //
  // This always checks IndexedDB for a pending draft, regardless of the
  // `?shared=` query param — that param can legitimately get lost (e.g.
  // the user wasn't logged in yet, got bounced to /login, and the
  // ?shared=1 on the original URL doesn't survive that redirect; see
  // ProtectedRoute.js / login/page.js for the return-to-this-page logic).
  // The draft itself lives in IndexedDB independent of the URL, so it's
  // still picked up here whenever the user actually lands on this page.
  // =========================================================
  useEffect(() => {
    const shared = searchParams.get("shared");

    if (shared === "error" || shared === "unsupported") {
      setShareNotice(
        "Couldn't auto-import what was shared. Please attach the screenshot or paste the text below, or fill in the details manually."
      );
      return;
    }

    (async () => {
      const draft = await getSharedDraft();
      if (!draft) {
        // Only show "nothing came through" when the user arrived
        // expecting a share to have worked — a plain visit via "Import
        // Screenshot" (no ?shared= at all) is the normal manual-entry
        // path and isn't an error.
        if (shared) {
          setShareNotice(
            "Nothing came through from the share. Please attach the screenshot below, or fill in the details manually."
          );
        }
        return;
      }

      if (draft.file) {
        setSource("shared_image");
        setScreenshotFile(draft.file);
        setScreenshotPreview(URL.createObjectURL(draft.file));
        await runOcr(draft.file);
      }

      // Some apps share a "title" and/or a "url" alongside (or instead
      // of) plain text — e.g. a deep link to a receipt. Fold whatever is
      // present into one block so the parser can scan all of it, and so
      // the user can see exactly what was shared even if nothing in it
      // was recognizable.
      const sharedText = [draft.title, draft.text, draft.url].filter(Boolean).join("\n");

      if (sharedText) {
        setSource(draft.file ? "shared_image" : "shared_text");
        setExtractedText((prev) => prev || sharedText);
        applyParsed(parseTransactionText(sharedText));
      }

      await clearSharedDraft();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // MANUAL SCREENSHOT UPLOAD — fallback path, works with or without the
  // share sheet, in any browser.
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

    setSource("manual_upload");
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
    runOcr(file);
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview("");
  };

  // =========================================================
  // DIRECTION CHANGE — the one thing the user must confirm. Both names
  // were already extracted independently, so switching direction just
  // changes which one is shown/required — nothing needs re-parsing.
  // =========================================================
  const handleDirectionChange = (_e, value) => {
    if (!value) return;
    setDirection(value);
    setDirectionAutoDetected(false);
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!direction) {
      setError("Please choose whether this was money you received or money you sent.");
      toast.error("Please select Received or Sent before saving.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter a valid amount.");
      toast.error("Enter a valid amount.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("amount", form.amount);
      formData.append("transactionId", form.transactionId);
      formData.append("rrn", form.rrn);
      formData.append("referenceNumber", form.referenceNumber);
      formData.append("transactionDate", form.transactionDate);
      formData.append("paymentMethod", form.paymentMethod);
      formData.append("paymentApp", form.paymentApp);
      formData.append("status", form.status);
      formData.append("note", form.note);
      formData.append("source", source);
      formData.append("extractedText", extractedText || "");
      if (screenshotFile) formData.append("screenshot", screenshotFile);

      if (direction === "received") {
        formData.append("payerName", form.payerName);
        await api.post("/received-payments", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Received payment saved.");
        router.push("/received-payments");
      } else {
        formData.append("payeeName", form.payeeName);
        await api.post("/sent-payments", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Sent payment saved.");
        router.push("/sent-payments");
      }
    } catch (err) {
      if (err?.response?.status === 409) {
        const message = err.response.data?.message || "A record with this transaction ID already exists.";
        setError(message);
        toast.error(message);
      } else {
        const message = err?.response?.data?.message || "Could not save this transaction.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const detectedNamesHint = [
    form.payeeName && `Paid to ${form.payeeName}`,
    form.payerName && `Paid by ${form.payerName}`,
  ].filter(Boolean).join(" · ");

  return (
    <>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: { xs: 2, sm: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 2, background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#fff" }}>
            <SwapVertRoundedIcon fontSize="small" />
          </Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: "text.primary" }}>
            Import Transaction
          </Typography>
        </Stack>

        {shareNotice && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>{shareNotice}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {amountWarning && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAmountWarning("")}>
            {amountWarning}
          </Alert>
        )}

        {autoFilled && (
          <Alert severity="warning" icon={<AutoAwesomeIcon fontSize="small" />} sx={{ mb: 2, borderRadius: 2 }}>
            Fields below were auto-filled from the screenshot/shared text using on-device OCR — a best-effort guess
            only.{" "}
            {directionAutoDetected
              ? "The direction (Received/Sent) was guessed too — please double-check it."
              : "The direction couldn't be guessed confidently — please choose one below."}{" "}
            Nothing is saved until you press "Confirm & Save".
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
              {/* DIRECTION — the one required choice */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                  DIRECTION {!direction && "(required)"}
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={direction}
                  onChange={handleDirectionChange}
                  sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, py: 1.1 } }}
                >
                  <ToggleButton value="received" sx={{ "&.Mui-selected": { bgcolor: "rgba(16,185,129,0.18)", color: "#059669" } }}>
                    <CallReceivedRoundedIcon fontSize="small" sx={{ mr: 0.75 }} /> Received Money
                  </ToggleButton>
                  <ToggleButton value="sent" sx={{ "&.Mui-selected": { bgcolor: "rgba(220,38,38,0.12)", color: "#DC2626" } }}>
                    <CallMadeRoundedIcon fontSize="small" sx={{ mr: 0.75 }} /> Sent Money
                  </ToggleButton>
                </ToggleButtonGroup>

                {!direction && detectedNamesHint && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.8 }}>
                    Detected in the screenshot: {detectedNamesHint} — choose a direction above to continue.
                  </Typography>
                )}
              </Box>

              {/* SCREENSHOT */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.8 }}>
                  SCREENSHOT (OPTIONAL)
                </Typography>

                <Stack direction="row" spacing={1.2} alignItems="center">
                  {screenshotPreview ? (
                    <Box sx={{ position: "relative" }}>
                      <Avatar src={screenshotPreview} variant="rounded" onClick={() => setLightboxOpen(true)} sx={{ width: 84, height: 84, cursor: "pointer" }} />
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
                label="Amount"
                type="number"
                required
                fullWidth
                value={form.amount}
                onChange={(e) => update("amount")(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
              />

              {direction && (
                direction === "sent" ? (
                  <TextField
                    label="Sent to (payee)"
                    fullWidth
                    value={form.payeeName}
                    onChange={(e) => update("payeeName")(e.target.value)}
                  />
                ) : (
                  <TextField
                    label="Received from (payer)"
                    fullWidth
                    value={form.payerName}
                    onChange={(e) => update("payerName")(e.target.value)}
                  />
                )
              )}

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
                disabled={submitting || !direction}
                startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                sx={{
                  py: 1.2, borderRadius: 2.5, textTransform: "none", fontWeight: 800,
                  background: direction === "sent"
                    ? "linear-gradient(135deg,#F87171,#DC2626)"
                    : "linear-gradient(135deg,#34D399,#059669)",
                  "&.Mui-disabled": { opacity: 0.6 },
                }}
              >
                {submitting ? "Saving..." : !direction ? "Choose a direction to continue" : "Confirm & Save"}
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                This only records what you confirm here — it does not verify the transaction with any bank or
                payment provider.
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>

      <ImageLightbox
        open={lightboxOpen}
        images={screenshotPreview ? [{ url: screenshotPreview }] : []}
        startIndex={0}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

export default function ImportTransactionPage() {
  return (
    <ProtectedRoute>
      <ImportTransactionInner />
    </ProtectedRoute>
  );
}
