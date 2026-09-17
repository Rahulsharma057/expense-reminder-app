"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ChecklistForm from "../ChecklistForm";

function NewChecklistInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <ChecklistForm mode="create" onDone={() => router.push("/checklists")} />
    </>
  );
}

export default function NewChecklistPage() {
  return (
    <ProtectedRoute>
      <NewChecklistInner />
    </ProtectedRoute>
  );
}