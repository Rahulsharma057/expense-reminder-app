"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ExpenseForm from "../ExpenseForm";
import api from "../../../lib/api";

function EditExpenseInner() {
  const { id } = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/expenses/${id}`)
      .then((res) => setExpense(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ExpenseForm mode="edit" initialData={expense} onDone={() => router.push("/expenses")} />
      )}
    </>
  );
}

export default function EditExpensePage() {
  return (
    <ProtectedRoute>
      <EditExpenseInner />
    </ProtectedRoute>
  );
}
