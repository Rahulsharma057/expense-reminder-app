"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress, Stack, Button, Container, Chip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import EditNoteIcon from "@mui/icons-material/EditNote";
import { toast } from "react-toastify";

import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ExpenseForm from "../ExpenseForm";
import ClaimStatusDialog from "../../../components/ClaimStatusDialog";
import api from "../../../lib/api";
import { downloadBlobResponse } from "../../../lib/download";

const CLAIM_COLORS = { "Not Claimed": "#F87171", Claimed: "#FBBF24", Received: "#4ADE80" };

function EditExpenseInner() {
  const { id } = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);

  useEffect(() => {
    api.get(`/expenses/${id}`).then((res) => setExpense(res.data)).finally(() => setLoading(false));
  }, [id]);

  const handleInvoiceDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/expenses/${id}/invoice`, { responseType: "blob" });
      downloadBlobResponse(res, `invoice_${id}.pdf`);
    } catch {
      toast.error("Could not download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Container maxWidth="sm" sx={{ pt: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center" flexWrap="wrap" useFlexGap>
              {expense?.claimStatus && (
                <Chip
                  label={expense.claimStatus}
                  size="small"
                  sx={{ bgcolor: `${CLAIM_COLORS[expense.claimStatus]}26`, color: CLAIM_COLORS[expense.claimStatus], fontWeight: 700 }}
                />
              )}
              <Button size="small" variant="outlined" startIcon={<EditNoteIcon />} onClick={() => setClaimDialogOpen(true)} sx={{ textTransform: "none", borderRadius: 2 }}>
                Update Claim
              </Button>
              <Button
                size="small" variant="outlined"
                startIcon={downloading ? <CircularProgress size={14} /> : <DownloadIcon />}
                onClick={handleInvoiceDownload} disabled={downloading}
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Download PDF
              </Button>
            </Stack>
          </Container>

          <ExpenseForm mode="edit" initialData={expense} onDone={() => router.push("/expenses")} />

          <ClaimStatusDialog
            open={claimDialogOpen}
            expense={expense}
            onClose={() => setClaimDialogOpen(false)}
            onUpdated={(updated) => { setExpense(updated); setClaimDialogOpen(false); }}
          />
        </>
      )}
    </>
  );
}

export default function EditExpensePage() {
  return (
    <ProtectedRoute>
      <EditExpenseInner />
    </ProtectedRoute>
  );
}