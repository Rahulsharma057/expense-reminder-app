"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, MenuItem } from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";

const CLAIM_STATUSES = ["Not Claimed", "Claimed", "Received"];

export default function ClaimStatusDialog({ open, expense, onClose, onUpdated }) {
  const [claimStatus, setClaimStatus] = useState("Not Claimed");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [claimRemark, setClaimRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setClaimStatus(expense.claimStatus || "Not Claimed");
      setExpectedReturnDate(
        expense.expectedReturnDate ? new Date(expense.expectedReturnDate).toISOString().slice(0, 10) : ""
      );
      setClaimRemark(expense.claimRemark || "");
    }
  }, [expense, open]);

  const handleSave = async () => {
    if (!expense?._id) return;

    setSaving(true);
    try {
      const res = await api.patch(`/expenses/${expense._id}/claim`, {
        claimStatus,
        expectedReturnDate: expectedReturnDate || null,
        claimRemark,
      });
      toast.success("Claim status updated.");
      onUpdated?.(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update claim status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Update Claim Status</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="Status" fullWidth value={claimStatus} onChange={(e) => setClaimStatus(e.target.value)}>
            {CLAIM_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Expected date (kab bola tha aayega)"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />

          <TextField
            label="Remark (follow-up notes)"
            fullWidth
            multiline
            minRows={2}
            placeholder="e.g. 10 Sep ko bola tha, 15 Sep tak dega, abhi tak nahi aaya"
            value={claimRemark}
            onChange={(e) => setClaimRemark(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}