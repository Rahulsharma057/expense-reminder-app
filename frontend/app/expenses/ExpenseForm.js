
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  Avatar,
  Autocomplete,
} from "@mui/material";

import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import CloseIcon from "@mui/icons-material/Close";

import { toast } from "react-toastify";

import api from "../../lib/api";

const MODES = ["Cash", "PhonePe", "Bank Transfer", "Other"];

const toDateInputValue = (value) => {
  const d = value ? new Date(value) : new Date();

  const offset = d.getTimezoneOffset();

  const local = new Date(
    d.getTime() - offset * 60 * 1000
  );

  return local.toISOString().slice(0, 10);
};

export default function ExpenseForm({
  mode = "create",
  initialData = null,
  onDone,
}) {
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

  const [photoFile, setPhotoFile] = useState(null);

  const [photoPreview, setPhotoPreview] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // LOAD RECIPIENT SUGGESTIONS
  // =========================================================
  useEffect(() => {
    api
      .get("/expenses/suggestions/recipients")
      .then((res) => {
        setRecipientOptions(res.data || []);
      })
      .catch(() => {
        // Suggestions are optional.
      });
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

      setPhotoPreview(initialData.billPhoto?.url || "");
    }
  }, [isEdit, initialData]);

  // =========================================================
  // FORM UPDATE
  // =========================================================
  const update = (key) => (value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // =========================================================
  // PHOTO
  // =========================================================
  const handlePhotoSelected = (file) => {
    if (!file) return;

    setPhotoFile(file);

    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // SUCCESS TOAST SEQUENCE
  // =========================================================
  const showSuccessSequence = () => {
    toast.success(
      isEdit
        ? "Expense updated successfully"
        : "Expense added successfully"
    );

    setTimeout(() => {
      toast.success(
        isEdit
          ? "Your expense changes have been saved"
          : "Your expense has been saved"
      );
    }, 2500);

    setTimeout(() => {
      toast.success("Great! Everything is up to date");
    }, 5000);

    setTimeout(() => {
      toast.success("I love you Bhumiii ❤️");
    }, 7500);
  };

  // =========================================================
  // SUBMIT
  // =========================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------
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

    if (
      form.mode === "Other" &&
      !form.paidByOther.trim()
    ) {
      const message =
        'Please say who paid on your behalf (e.g. "via Rahul\'s UPI").';

      setError(message);

      toast.error(message);

      return;
    }

    setSubmitting(true);

    try {
      // -----------------------------------------
      // FORM DATA
      // -----------------------------------------
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (photoFile) {
        formData.append("billPhoto", photoFile);
      }

      // -----------------------------------------
      // CREATE / EDIT
      // -----------------------------------------
      if (isEdit) {
        await api.put(
          `/expenses/${initialData._id}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        await api.post(
          "/expenses",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      // -----------------------------------------
      // SUCCESS
      // -----------------------------------------
      showSuccessSequence();

      // Give first toast a moment before navigation.
      setTimeout(() => {
        onDone?.();
      }, 700);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        "Could not save this expense.";

      setError(message);

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: {
          xs: 2,
          sm: 3,
        },
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}
      <Typography
        variant="h5"
        fontWeight={800}
        sx={{
          mb: 2,
          color: "#211A2D",
        }}
      >
        {isEdit ? "Edit Expense" : "Add Expense"}
      </Typography>

      {/* =====================================================
          ERROR
      ===================================================== */}
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 2,
          }}
        >
          {error}
        </Alert>
      )}

      {/* =====================================================
          FORM CARD
      ===================================================== */}
      <Paper
        elevation={0}
        sx={{
          p: {
            xs: 1.75,
            sm: 3,
          },

          border: "1px solid #ECE9F5",

          borderRadius: {
            xs: 2.5,
            sm: 3,
          },

          backgroundColor: "#FFFFFF",

          boxShadow:
            "0 8px 30px rgba(76, 29, 149, 0.05)",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit}
        >
          <Stack spacing={2}>
            {/* =================================================
                RECIPIENT
            ================================================= */}
            <Autocomplete
              freeSolo
              options={recipientOptions}
              inputValue={form.recipientName}
              onInputChange={(_e, value) =>
                update("recipientName")(value)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Given to (recipient name)"
                  required
                  fullWidth
                />
              )}
            />

            {/* =================================================
                AMOUNT
            ================================================= */}
            <TextField
              label="Amount"
              type="number"
              required
              fullWidth
              value={form.amount}
              onChange={(e) =>
                update("amount")(e.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CurrencyRupeeIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {/* =================================================
                MODE + DATE
            ================================================= */}
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
            >
              <TextField
                select
                label="Paid via"
                fullWidth
                value={form.mode}
                onChange={(e) =>
                  update("mode")(e.target.value)
                }
              >
                {MODES.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Date"
                type="date"
                fullWidth
                value={form.date}
                onChange={(e) =>
                  update("date")(e.target.value)
                }
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Stack>

            {/* =================================================
                OTHER PAYMENT
            ================================================= */}
            {form.mode === "Other" && (
              <TextField
                label="Who paid on your behalf?"
                fullWidth
                placeholder="e.g. via Rahul's UPI / Papa's account"
                value={form.paidByOther}
                onChange={(e) =>
                  update("paidByOther")(e.target.value)
                }
              />
            )}

            {/* =================================================
                TRANSACTION ID
            ================================================= */}
            <TextField
              label="Transaction ID (optional)"
              fullWidth
              value={form.transactionId}
              onChange={(e) =>
                update("transactionId")(e.target.value)
              }
            />

            {/* =================================================
                REASON
            ================================================= */}
            <TextField
              label="Reason (why?)"
              fullWidth
              placeholder="e.g. groceries, medicine, gift"
              value={form.reason}
              onChange={(e) =>
                update("reason")(e.target.value)
              }
            />

            {/* =================================================
                DESCRIPTION
            ================================================= */}
            <TextField
              label="Description (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) =>
                update("description")(e.target.value)
              }
            />

            {/* =================================================
                REMARKS
            ================================================= */}
            <TextField
              label="Remarks (optional)"
              fullWidth
              multiline
              minRows={2}
              value={form.remarks}
              onChange={(e) =>
                update("remarks")(e.target.value)
              }
            />

            {/* =================================================
                BILL PHOTO
            ================================================= */}
            <Box>
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 0.8,
                }}
              >
                BILL / SLIP PHOTO
              </Typography>

              {photoPreview ? (
                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                >
                  <Avatar
                    src={photoPreview}
                    variant="rounded"
                    sx={{
                      width: 72,
                      height: 72,
                    }}
                  />

                  <Button
                    size="small"
                    color="error"
                    startIcon={
                      <CloseIcon fontSize="small" />
                    }
                    onClick={removePhoto}
                    sx={{
                      textTransform: "none",
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              ) : (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AddAPhotoIcon />}
                  sx={{
                    textTransform: "none",
                    borderRadius: 2,
                  }}
                >
                  Take / Choose Photo

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      handlePhotoSelected(
                        e.target.files?.[0]
                      )
                    }
                  />
                </Button>
              )}
            </Box>

            {/* =================================================
                SUBMIT
            ================================================= */}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              startIcon={
                submitting ? (
                  <CircularProgress
                    size={16}
                    color="inherit"
                  />
                ) : null
              }
              sx={{
                py: 1.2,

                borderRadius: 2.5,

                textTransform: "none",

                fontWeight: 800,

                background:
                  "linear-gradient(135deg,#7c3aed,#4c1d95)",

                boxShadow:
                  "0 8px 18px rgba(124,58,237,0.20)",

                "&:hover": {
                  background:
                    "linear-gradient(135deg,#6d28d9,#3b0764)",

                  boxShadow:
                    "0 10px 22px rgba(124,58,237,0.25)",
                },
              }}
            >
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save Changes"
                : "Add Expense"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
