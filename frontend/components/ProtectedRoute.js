"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { getStoredUser } from "../lib/auth";
import { rememberReturnTo } from "../lib/postLoginRedirect";

// ownerOnly=true restricts the page to the owner account (e.g. /users).
export default function ProtectedRoute({ children, ownerOnly = false }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const user = getStoredUser();

    if (!token || !user) {
      // Remember where the user was trying to go — e.g. the shared-import
      // review screen (/transactions/import?shared=1) — so login can send
      // them back here instead of the default dashboard. The actual
      // shared payload itself is already safe in IndexedDB regardless
      // (see lib/shareDraft.js); this just makes sure the page that reads
      // it back is the one they land on after signing in.
      rememberReturnTo(window.location.pathname + window.location.search);

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
