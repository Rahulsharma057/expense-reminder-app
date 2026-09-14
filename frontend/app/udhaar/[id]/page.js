"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import UdhaarForm from "../UdhaarForm";
import api from "../../../lib/api";

function EditUdhaarInner() {
  const { id } = useParams();
  const router = useRouter();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/udhaar/${id}`).then((res) => setRecord(res.data)).finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <UdhaarForm mode="edit" initialData={record} onDone={() => router.push("/udhaar")} />
      )}
    </>
  );
}

export default function EditUdhaarPage() {
  return (
    <ProtectedRoute>
      <EditUdhaarInner />
    </ProtectedRoute>
  );
}