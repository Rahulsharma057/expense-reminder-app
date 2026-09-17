"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import ChecklistForm from "../ChecklistForm";
import api from "../../../lib/api";

function EditChecklistInner() {
  const { id } = useParams();
  const router = useRouter();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const isNewRoute = id === "new";

  useEffect(() => {
    if (isNewRoute) {
      router.replace("/checklists/new");
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get(`/checklists/${id}`)
      .then((res) => { if (!cancelled) setChecklist(res.data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, isNewRoute, router]);

  if (isNewRoute) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <>
      <Navbar />
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ChecklistForm mode="edit" initialData={checklist} onDone={() => router.push("/checklists")} />
      )}
    </>
  );
}

export default function EditChecklistPage() {
  return (
    <ProtectedRoute>
      <EditChecklistInner />
    </ProtectedRoute>
  );
}