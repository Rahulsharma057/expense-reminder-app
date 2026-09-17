"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack, Avatar, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import api from "../lib/api";

export default function BrandSettingsDialog({ open, onClose }) {
  const [orgName, setOrgName] = useState("");
  const [signatoryName, setSignatoryName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get("/brand-settings").then((res) => {
        setOrgName(res.data.orgName || "");
        setSignatoryName(res.data.signatoryName || "");
        setLogoPreview(res.data.logo?.url || "");
        setSignaturePreview(res.data.signature?.url || "");
      }).catch(() => {});
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("orgName", orgName);
      formData.append("signatoryName", signatoryName);
      if (logoFile) formData.append("logo", logoFile);
      if (signatureFile) formData.append("signature", signatureFile);
      if (removeLogo) formData.append("removeLogo", "true");
      if (removeSignature) formData.append("removeSignature", "true");

      await api.put("/brand-settings", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Saved — har PDF mein ab yeh apne aap lagega.");
      onClose();
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Signature &amp; Logo
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Ek baar set karo — har appointment PDF mein automatically lag jayega.
        </Typography>

        <Stack spacing={2}>
          <TextField size="small" label="Organization Name (optional)" fullWidth value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <TextField size="small" label="Signatory Name (optional)" fullWidth value={signatoryName} onChange={(e) => setSignatoryName(e.target.value)} />

          <Stack spacing={0.8}>
            <Typography variant="caption" fontWeight={700}>LOGO</Typography>
            {logoPreview ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={logoPreview} variant="rounded" sx={{ width: 60, height: 60 }} />
                <Button size="small" color="error" onClick={() => { setLogoPreview(""); setLogoFile(null); setRemoveLogo(true); }}>Remove</Button>
              </Stack>
            ) : (
              <Button size="small" variant="outlined" component="label" sx={{ textTransform: "none", alignSelf: "flex-start" }}>
                Upload Logo
                <input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); setRemoveLogo(false); } }} />
              </Button>
            )}
          </Stack>

          <Stack spacing={0.8}>
            <Typography variant="caption" fontWeight={700}>SIGNATURE</Typography>
            {signaturePreview ? (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={signaturePreview} variant="rounded" sx={{ width: 90, height: 45 }} />
                <Button size="small" color="error" onClick={() => { setSignaturePreview(""); setSignatureFile(null); setRemoveSignature(true); }}>Remove</Button>
              </Stack>
            ) : (
              <Button size="small" variant="outlined" component="label" sx={{ textTransform: "none", alignSelf: "flex-start" }}>
                Upload Signature
                <input type="file" hidden accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSignatureFile(f); setSignaturePreview(URL.createObjectURL(f)); setRemoveSignature(false); } }} />
              </Button>
            )}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}