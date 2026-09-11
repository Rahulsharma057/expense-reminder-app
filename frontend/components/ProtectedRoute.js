"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { getStoredUser } from "../lib/auth";

// ownerOnly=true restricts the page to the owner account (e.g. /users).
export default function ProtectedRoute({ children, ownerOnly = false }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const user = getStoredUser();

    if (!token || !user) {
      router.replace("/login");
      return;
    }
    if (ownerOnly && user.role !== "owner") {
      router.replace("/dashboard");
      return;
    }
    setChecked(true);
  }, [router, ownerOnly]);

  if (!checked) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return children;
}
