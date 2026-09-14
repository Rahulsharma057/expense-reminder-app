"use client";

import { useEffect, useState } from "react";
import { Modal, Box, IconButton, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function ImageLightbox({ open, images = [], startIndex = 0, onClose }) {
  const [index, setIndex] = useState(startIndex);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  if (!images.length) return null;
  const current = images[index];

  const goPrev = (e) => {
    e.stopPropagation();
    setIndex((i) => (i - 1 + images.length) % images.length);
  };
  const goNext = (e) => {
    e.stopPropagation();
    setIndex((i) => (i + 1) % images.length);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const res = await fetch(current.url, { mode: "cors" });
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `bill-photo-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(current.url, "_blank");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box
        onClick={onClose}
        sx={{
          width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.92)", outline: "none",
        }}
      >
        <Stack
          direction="row" justifyContent="space-between" alignItems="center"
          sx={{ position: "absolute", top: 0, left: 0, right: 0, p: 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography sx={{ color: "#fff", fontSize: 13 }}>
            {images.length > 1 ? `${index + 1} / ${images.length}` : ""}
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton onClick={handleDownload} disabled={downloading} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}>
              <DownloadIcon />
            </IconButton>
            <IconButton onClick={onClose} sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>

        {images.length > 1 && (
          <IconButton onClick={goPrev} sx={{ position: "absolute", left: 8, color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}>
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        )}

        <Box
          component="img"
          src={current.url}
          alt="Bill photo"
          onClick={(e) => e.stopPropagation()}
          sx={{ maxWidth: "92vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 2 }}
        />

        {images.length > 1 && (
          <IconButton onClick={goNext} sx={{ position: "absolute", right: 8, color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}>
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        )}
      </Box>
    </Modal>
  );
}