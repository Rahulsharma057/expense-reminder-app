"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import SentPaymentForm from "../SentPaymentForm";

function NewSentPaymentInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <SentPaymentForm mode="create" onDone={() => router.push("/sent-payments")} />
    </>
  );
}

export default function NewSentPaymentPage() {
  return (
    <ProtectedRoute>
      <NewSentPaymentInner />
    </ProtectedRoute>
  );
}
