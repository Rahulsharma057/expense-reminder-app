"use client";

import { useState } from "react";
import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton, AvatarGroup } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import UdhaarDetailDialog from "./UdhaarDetailDialog";

const STATUS_COLORS = { Pending: "#FBBF24", "Partially Returned": "#60A5FA", Returned: "#4ADE80" };

export default function UdhaarCard({ record, onEdit, onDelete, onUpdated }) {
  const [detailOpen, setDetailOpen] = useState(false);

  const isLent = record.type === "Lent";
  const typeColor = isLent ? "#F87171" : "#4ADE80";
  const isOverdueActive = record.isOverdue && record.status !== "Returned";
  const statusColor = isOverdueActive ? "#F87171" : (STATUS_COLORS[record.status] || "#94a3b8");
  const statusLabel = isOverdueActive ? "Overdue" : record.status;

  const displayAmount = record.category === "Cash"
    ? `₹${Number(record.amount).toLocaleString("en-IN")}`
    : `${record.itemQuantity ? `${record.itemQuantity} — ` : ""}${record.itemDescription}`;

  const photos = record.photos?.length ? record.photos : [];

  return (
    <>
      <Paper
        elevation={0}
        onClick={() => setDetailOpen(true)}
        sx={{
          p: 1.8, border: "1px solid", borderColor: isOverdueActive ? "rgba(248,113,113,0.5)" : "divider",
          borderRadius: 3, bgcolor: "background.paper", cursor: "pointer",
          "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {photos.length ? (
            <AvatarGroup max={2} sx={{ flexShrink: 0, "& .MuiAvatar-root": { width: 52, height: 52, borderRadius: 2 } }}>
              {photos.map((p) => <Avatar key={p.publicId} src={p.url} variant="rounded" />)}
            </AvatarGroup>
          ) : (
            <Avatar variant="rounded" sx={{ width: 52, height: 52, bgcolor: `${typeColor}26`, color: typeColor, flexShrink: 0 }}>
              {record.category === "Item" ? <Inventory2Icon /> : (isLent ? <CallMadeIcon /> : <CallReceivedIcon />)}
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} noWrap color="text.primary">{record.personName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(record.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Typography>
              </Box>
              <Typography fontWeight={800} sx={{ color: typeColor, whiteSpace: "nowrap", textAlign: "right", fontSize: record.category === "Item" ? 12 : 15, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayAmount}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip
                size="small"
                icon={isLent ? <CallMadeIcon sx={{ fontSize: 14 }} /> : <CallReceivedIcon sx={{ fontSize: 14 }} />}
                label={isLent ? "Lent" : "Borrowed"}
                sx={{ bgcolor: `${typeColor}26`, color: typeColor, fontWeight: 700 }}
              />
              <Chip size="small" label={statusLabel} sx={{ bgcolor: `${statusColor}26`, color: statusColor, fontWeight: 700 }} />
              {record.reason && <Chip size="small" label={record.reason} variant="outlined" />}
            </Stack>

            {record.expectedReturnDate && record.status !== "Returned" && (
              <Typography variant="caption" sx={{ display: "block", mt: 0.6, color: isOverdueActive ? "#F87171" : "text.secondary" }}>
                {isOverdueActive ? "Was due" : "Due"}: {new Date(record.expectedReturnDate).toLocaleDateString("en-IN")}
              </Typography>
            )}
          </Box>

          <Stack direction="row" spacing={0.25}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(record); }}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(record); }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>

      <UdhaarDetailDialog
        open={detailOpen}
        record={record}
        onClose={() => setDetailOpen(false)}
        onEdit={(r) => { setDetailOpen(false); onEdit(r); }}
        onDelete={(r) => { setDetailOpen(false); onDelete(r); }}
        onUpdated={(updated) => onUpdated?.(updated)}
      />
    </>
  );
}