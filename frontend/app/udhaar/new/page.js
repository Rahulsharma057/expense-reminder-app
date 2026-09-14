"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import UdhaarForm from "../UdhaarForm";

function NewUdhaarInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <UdhaarForm mode="create" onDone={() => router.push("/udhaar")} />
    </>
  );
}

export default function NewUdhaarPage() {
  return (
    <ProtectedRoute>
      <NewUdhaarInner />
    </ProtectedRoute>
  );
}