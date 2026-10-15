"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";

import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ReceivedPaymentForm from "../ReceivedPaymentForm";
import api from "../../../lib/api";

function EditReceivedPaymentInner() {
  const { id } = useParams();
  const router = useRouter();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/received-payments/${id}`).then((res) => setPayment(res.data)).finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ReceivedPaymentForm mode="edit" initialData={payment} onDone={() => router.push("/received-payments")} />
      )}
    </>
  );
}

export default function EditReceivedPaymentPage() {
  return (
    <ProtectedRoute>
      <EditReceivedPaymentInner />
    </ProtectedRoute>
  );
}
