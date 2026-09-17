"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import AppointmentForm from "../AppointmentForm";
import api from "../../../lib/api";

function EditAppointmentInner() {
  const { id } = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const isNewRoute = id === "new";

  useEffect(() => {
    if (isNewRoute) { router.replace("/appointments/new"); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/appointments/${id}`).then((res) => { if (!cancelled) setAppointment(res.data); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isNewRoute, router]);

  if (isNewRoute) return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;

  return (
    <>
      <Navbar />
      {loading ? <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box> : <AppointmentForm mode="edit" initialData={appointment} onDone={() => router.push("/appointments")} />}
    </>
  );
}

export default function EditAppointmentPage() {
  return (
    <ProtectedRoute>
      <EditAppointmentInner />
    </ProtectedRoute>
  );
}