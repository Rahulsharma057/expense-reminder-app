"use client";

import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Stack, FormGroup, FormControlLabel, Checkbox, Typography,
} from "@mui/material";
import { toast } from "react-toastify";
import api from "../lib/api";
import { downloadBlobResponse } from "../lib/download";

const COLUMN_OPTIONS = [
  { key: "date", label: "Date" },
  { key: "recipientName", label: "Recipient" },
  { key: "amount", label: "Amount" },
  { key: "mode", label: "Paid Via" },
  { key: "paidByOther", label: "Paid By (Other)" },
  { key: "transactionId", label: "Transaction ID" },
  { key: "reason", label: "Reason" },
  { key: "description", label: "Description" },
  { key: "remarks", label: "Remarks" },
  { key: "createdAt", label: "Added On" },
];

const DEFAULT_SELECTED = ["date", "recipientName", "amount", "mode", "reason"];

export default function ExcelExportDialog({ open, onClose }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(DEFAULT_SELECTED);
  const [downloading, setDownloading] = useState(false);

  const toggleColumn = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleDownload = async () => {
    if (!selected.length) {
      toast.error("Select at least one column.");
      return;
    }

    setDownloading(true);
    try {
      const res = await api.get("/expenses/export/excel", {
        params: { from, to, columns: selected.join(",") },
        responseType: "blob",
      });

      downloadBlobResponse(res, "expenses.xlsx");
      toast.success("Excel file downloaded.");
      onClose();
    } catch {
      toast.error("Could not generate Excel file.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Export to Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="From" type="date" fullWidth InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField label="To" type="date" fullWidth InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
          </Stack>

          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            COLUMNS TO INCLUDE
          </Typography>

          <FormGroup>
            {COLUMN_OPTIONS.map((col) => (
              <FormControlLabel
                key={col.key}
                control={<Checkbox checked={selected.includes(col.key)} onChange={() => toggleColumn(col.key)} size="small" />}
                label={col.label}
              />
            ))}
          </FormGroup>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleDownload} disabled={downloading}>
          {downloading ? "Preparing..." : "Download Excel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}