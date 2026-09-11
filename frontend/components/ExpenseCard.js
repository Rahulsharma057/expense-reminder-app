"use client";

import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";

const MODE_COLORS = {
  PhonePe: "#5f259f",
  "Bank Transfer": "#2563eb",
  Cash: "#16a34a",
  Other: "#ea580c",
};

export default function ExpenseCard({ expense, onEdit, onDelete }) {
  const modeColor = MODE_COLORS[expense.mode] || "#64748b";

  return (
    <Paper elevation={0} sx={{ p: 1.8, border: "1px solid #ece9f5", borderRadius: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        {expense.billPhoto?.url ? (
          <Avatar
            src={expense.billPhoto.url}
            variant="rounded"
            sx={{ width: 56, height: 56, flexShrink: 0 }}
          />
        ) : (
          <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: "#f3e8ff", color: "#7c3aed", flexShrink: 0 }}>
            <ReceiptIcon />
          </Avatar>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={800} noWrap>{expense.recipientName}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </Typography>
            </Box>
            <Typography fontWeight={800} sx={{ color: "#7c3aed", whiteSpace: "nowrap" }}>
              ₹{Number(expense.amount).toLocaleString("en-IN")}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
            <Chip
              size="small"
              label={expense.mode === "Other" && expense.paidByOther ? `Via ${expense.paidByOther}` : expense.mode}
              sx={{ bgcolor: `${modeColor}1a`, color: modeColor, fontWeight: 700 }}
            />
            {expense.reason && <Chip size="small" label={expense.reason} variant="outlined" />}
            {expense.transactionId && (
              <Chip size="small" label={`Txn: ${expense.transactionId}`} variant="outlined" />
            )}
          </Stack>

          {expense.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8 }}>
              {expense.description}
            </Typography>
          )}
          {expense.remarks && (
            <Typography variant="body2" sx={{ mt: 0.4, fontStyle: "italic", color: "#7c3aed" }}>
              "{expense.remarks}"
            </Typography>
          )}
        </Box>

        <Stack spacing={0.5}>
          <IconButton size="small" onClick={() => onEdit(expense)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onDelete(expense)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
}
