"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress, InputAdornment,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import api from "../../lib/api";
import { saveSession } from "../../lib/auth";
import { enablePushNotifications } from "../../lib/push";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username: username.trim(), password });
      saveSession(res.data.token, res.data.user);
      enablePushNotifications().catch(() => {});
      router.replace("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        p: 2, background: "linear-gradient(135deg,#f3e8ff,#faf9fc)",
      }}
    >
      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 380, borderRadius: 4, border: "1px solid #ece9f5" }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography sx={{ fontSize: 40, mb: 1 }}>💜</Typography>
          <Typography variant="h5" fontWeight={800}>Welcome back</Typography>
          <Typography variant="body2" color="text.secondary">Sign in to continue</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" /></InputAdornment> }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              py: 1.3, borderRadius: 2.5, textTransform: "none", fontWeight: 800, fontSize: "1rem",
              background: "linear-gradient(135deg,#7c3aed,#4c1d95)",
              "&:hover": { background: "linear-gradient(135deg,#6d28d9,#3b1573)" },
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
