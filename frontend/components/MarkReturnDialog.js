"use client";

import { useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Typography } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function MarkReturnDialog({ open, record, onClose, onUpdated }) {
  const [returnedAmount, setReturnedAmount] = useState("");
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  if (!record) return null;

  const isCash = record.category === "Cash";
  const remainingBefore = isCash ? Math.max(record.amount - (record.returnedAmount || 0), 0) : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/udhaar/${record._id}/return`, {
        returnedAmount: isCash ? (returnedAmount || remainingBefore) : undefined,
        actualReturnDate,
        remarks,
      });
      toast.success("Marked as returned.");
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark as Returned</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {isCash ? (
            <TextField
              label={`Amount returned (max ₹${remainingBefore.toLocaleString("en-IN")})`}
              type="number"
              fullWidth
              placeholder={String(remainingBefore)}
              value={returnedAmount}
              onChange={(e) => setReturnedAmount(e.target.value)}
              helperText="Leave blank to mark full amount as returned"
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {record.itemDescription} will be marked fully returned.
            </Typography>
          )}
          <TextField
            label="Return date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={actualReturnDate}
            onChange={(e) => setActualReturnDate(e.target.value)}
          />
          <TextField
            label="Remark (optional)"
            fullWidth
            multiline
            minRows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}