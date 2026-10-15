"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import SentPaymentForm from "../SentPaymentForm";
import api from "../../../lib/api";

function EditSentPaymentInner() {
  const { id } = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sent-payments/${id}`).then((res) => setPayment(res.data)).finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <SentPaymentForm mode="edit" initialData={payment} onDone={() => router.push("/sent-payments")} />
      )}
    </>
  );
}

export default function EditSentPaymentPage() {
  return (
    <ProtectedRoute>
      <EditSentPaymentInner />
    </ProtectedRoute>
  );
}
