"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ExpenseForm from "../ExpenseForm";

function NewExpenseInner() {
  const router = useRouter();
  return (
    <>
      <Navbar />
      <ExpenseForm mode="create" onDone={() => router.push("/expenses")} />
    </>
  );
}

export default function NewExpensePage() {
  return (
    <ProtectedRoute>
      <NewExpenseInner />
    </ProtectedRoute>
  );
}
