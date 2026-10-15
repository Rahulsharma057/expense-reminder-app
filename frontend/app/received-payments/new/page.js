"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ReceivedPaymentForm from "../ReceivedPaymentForm";

function NewReceivedPaymentInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <ReceivedPaymentForm mode="create" onDone={() => router.push("/received-payments")} />
    </>
  );
}

export default function NewReceivedPaymentPage() {
  return (
    <ProtectedRoute>
      <NewReceivedPaymentInner />
    </ProtectedRoute>
  );
}
