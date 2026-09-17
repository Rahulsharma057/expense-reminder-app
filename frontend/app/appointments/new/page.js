"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import AppointmentForm from "../AppointmentForm";

function NewAppointmentInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <AppointmentForm mode="create" onDone={() => router.push("/appointments")} />
    </>
  );
}

export default function NewAppointmentPage() {
  return (
    <ProtectedRoute>
      <NewAppointmentInner />
    </ProtectedRoute>
  );
}