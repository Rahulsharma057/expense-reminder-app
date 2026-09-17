"use client";

import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import GoalForm from "../GoalForm";

function NewGoalInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <GoalForm mode="create" onDone={() => router.push("/goals")} />
    </>
  );
}

export default function NewGoalPage() {
  return (
    <ProtectedRoute>
      <NewGoalInner />
    </ProtectedRoute>
  );
}