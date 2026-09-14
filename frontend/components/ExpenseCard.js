"use client";

import { useRef, useState } from "react";
import { Paper, Box, Stack, Typography, Chip, Avatar, IconButton, AvatarGroup, Checkbox } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ImageLightbox from "./ImageLightbox";
import ExpenseDetailDialog from "./ExpenseDetailDialog";

const MODE_COLORS = { PhonePe: "#a78bfa", "Bank Transfer": "#60a5fa", Cash: "#4ade80", Other: "#fb923c" };
const CLAIM_COLORS = { "Not Claimed": "#F87171", Claimed: "#FBBF24", Received: "#4ADE80" };

export default function ExpenseCard({
  expense, onEdit, onDelete, onClaimUpdated,
  selectable = false, selected = false, onToggleSelect, onLongPress,
}) {
  const modeColor = MODE_COLORS[expense.mode] || "#94a3b8";
  const claimStatus = expense.claimStatus || "Not Claimed";
  const claimColor = CLAIM_COLORS[claimStatus] || "#94a3b8";

  const [detailOpen, setDetailOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const pressTimer = useRef(null);

  const photos = expense.billPhotos?.length ? expense.billPhotos : [];

  const handlePointerDown = () => {
    if (selectable) return;
    pressTimer.current = setTimeout(() => onLongPress?.(expense._id), 500);
  };
  const clearPressTimer = () => clearTimeout(pressTimer.current);

  const handleCardClick = () => {
    if (selectable) {
      onToggleSelect?.(expense._id);
    } else {
      setDetailOpen(true);
    }
  };

  const handlePhotoClick = (e, index) => {
    e.stopPropagation();
    if (selectable) return;
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <Paper
        elevation={0}
        onPointerDown={handlePointerDown}
        onPointerUp={clearPressTimer}
        onPointerLeave={clearPressTimer}
        onClick={handleCardClick}
        sx={{
          p: 1.8, border: "1px solid", borderColor: selected ? "primary.main" : "divider",
          borderRadius: 3, bgcolor: "background.paper", cursor: "pointer",
          transition: "border-color 0.15s, transform 0.1s",
          "&:hover": { borderColor: "rgba(139,92,246,0.5)" },
          "&:active": { transform: "scale(0.997)" },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          {selectable && (
            <Checkbox checked={selected} onChange={() => onToggleSelect?.(expense._id)} onClick={(e) => e.stopPropagation()} sx={{ p: 0, mt: 0.5 }} />
          )}

          {photos.length ? (
            <AvatarGroup max={3} sx={{ flexShrink: 0, "& .MuiAvatar-root": { width: 56, height: 56, borderRadius: 2, cursor: "pointer" } }}>
              {photos.map((p, i) => (
                <Avatar key={p.publicId} src={p.url} variant="rounded" onClick={(e) => handlePhotoClick(e, i)} />
              ))}
            </AvatarGroup>
          ) : (
            <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: "rgba(139,92,246,0.15)", color: "primary.main", flexShrink: 0 }}>
              <ReceiptIcon />
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} noWrap color="text.primary">{expense.recipientName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </Typography>
              </Box>
              <Typography fontWeight={800} sx={{ color: "primary.main", whiteSpace: "nowrap" }}>
                ₹{Number(expense.amount).toLocaleString("en-IN")}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.8 }}>
              <Chip size="small" label={expense.mode === "Other" && expense.paidByOther ? `Via ${expense.paidByOther}` : expense.mode} sx={{ bgcolor: `${modeColor}26`, color: modeColor, fontWeight: 700 }} />
              {expense.reason && <Chip size="small" label={expense.reason} variant="outlined" />}
              <Chip size="small" label={claimStatus} sx={{ bgcolor: `${claimColor}26`, color: claimColor, fontWeight: 700 }} />
            </Stack>
          </Box>

          {!selectable && (
            <Stack direction="row" spacing={0.25}>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(expense); }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(expense); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </Paper>

      <ExpenseDetailDialog
        open={detailOpen}
        expense={expense}
        onClose={() => setDetailOpen(false)}
        onEdit={(e) => { setDetailOpen(false); onEdit(e); }}
        onDelete={(e) => { setDetailOpen(false); onDelete(e); }}
        onClaimUpdated={() => onClaimUpdated?.()}
      />

      <ImageLightbox open={lightboxOpen} images={photos} startIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
    </>
  );
}