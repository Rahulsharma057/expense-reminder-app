
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import api from "../../lib/api";
import { saveSession } from "../../lib/auth";
import { enablePushNotifications } from "../../lib/push";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        username: username.trim(),
        password,
      });

      saveSession(res.data.token, res.data.user);

      enablePushNotifications().catch(() => {});

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to sign in. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 5 },

        background:
          "linear-gradient(135deg, #faf7ff 0%, #f6f1ff 48%, #eef2ff 100%)",
      }}
    >
      {/* Decorative Background Shapes */}
      <Box
        sx={{
          position: "absolute",
          width: { xs: 220, sm: 360 },
          height: { xs: 220, sm: 360 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.13) 0%, rgba(124,58,237,0) 70%)",
          top: { xs: -100, sm: -140 },
          right: { xs: -80, sm: -100 },
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          width: { xs: 250, sm: 420 },
          height: { xs: 250, sm: 420 },
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 70%)",
          bottom: { xs: -130, sm: -180 },
          left: { xs: -100, sm: -150 },
          pointerEvents: "none",
        }}
      />

      {/* Main Container */}
      <Box
        sx={{
          width: "100%",
          maxWidth: 1040,
          position: "relative",
          zIndex: 1,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            overflow: "hidden",
            borderRadius: { xs: 3, sm: 4 },
            border: "1px solid rgba(124,58,237,0.10)",
            backgroundColor: "#ffffff",
            boxShadow: "0 24px 70px rgba(67, 35, 120, 0.10)",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "0.9fr 1.1fr",
              },
              minHeight: { md: 590 },
            }}
          >
            {/* =========================
                LEFT BRAND PANEL
            ========================= */}
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                p: 5,
                color: "#fff",

                background:
                  "linear-gradient(145deg, #7c3aed 0%, #5b21b6 55%, #3b0764 100%)",
              }}
            >
              {/* Decorative circles */}
              <Box
                sx={{
                  position: "absolute",
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  top: -90,
                  right: -90,
                }}
              />

              <Box
                sx={{
                  position: "absolute",
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.10)",
                  bottom: -70,
                  left: -70,
                }}
              />

              <Box sx={{ position: "relative", zIndex: 1 }}>
                {/* Logo */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 4,

                    backgroundColor: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 25,
                      fontWeight: 900,
                      color: "#fff",
                    }}
                  >
                    ₹
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: { md: 32, lg: 36 },
                    fontWeight: 900,
                    lineHeight: 1.15,
                    letterSpacing: "-0.8px",
                    mb: 2,
                  }}
                >
                  Take control of
                  <br />
                  your expenses.
                </Typography>

                <Typography
                  sx={{
                    fontSize: 15,
                    lineHeight: 1.8,
                    maxWidth: 360,
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  Manage your expenses, stay on top of reminders, and keep
                  your financial activity organized — all from one simple
                  dashboard.
                </Typography>
              </Box>

              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  p: 1.5,
                  borderRadius: 2.5,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <ShieldOutlinedIcon
                  sx={{
                    fontSize: 20,
                    color: "rgba(255,255,255,0.9)",
                  }}
                />

                <Typography
                  variant="body2"
                  sx={{
                    color: "rgba(255,255,255,0.78)",
                    fontWeight: 500,
                  }}
                >
                  Secure and simple expense management
                </Typography>
              </Box>
            </Box>

            {/* =========================
                RIGHT LOGIN PANEL
            ========================= */}
            <Box
              sx={{
                p: {
                  xs: 3,
                  sm: 5,
                  md: 5.5,
                  lg: 6,
                },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* Mobile Logo */}
              <Box
                sx={{
                  display: { xs: "flex", md: "none" },
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 3,
                }}
              >
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: 3,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
                    boxShadow: "0 10px 25px rgba(124,58,237,0.25)",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 27,
                      fontWeight: 900,
                      color: "#fff",
                    }}
                  >
                    ₹
                  </Typography>
                </Box>
              </Box>

              {/* Welcome */}
              <Box sx={{ mb: 3.5 }}>
                <Typography
                  sx={{
                    color: "#7c3aed",
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.7px",
                    textTransform: "uppercase",
                    mb: 1,
                  }}
                >
                  Welcome back 👋
                </Typography>

                <Typography
                  sx={{
                    fontSize: { xs: 28, sm: 32 },
                    fontWeight: 900,
                    color: "#17121f",
                    letterSpacing: "-0.7px",
                    lineHeight: 1.15,
                    mb: 1,
                  }}
                >
                  Good to see you again
                </Typography>

                <Typography
                  sx={{
                    fontSize: 14.5,
                    color: "#6b6475",
                    lineHeight: 1.6,
                  }}
                >
                  Sign in to continue managing your expenses and reminders.
                </Typography>
              </Box>

              {/* Error */}
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2.5,
                    borderRadius: 2,
                    fontSize: 13,
                    alignItems: "center",
                    border: "1px solid #fecaca",
                    backgroundColor: "#fff7f7",
                  }}
                >
                  {error}
                </Alert>
              )}

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit}>
                {/* Username */}
                <TextField
                  fullWidth
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                  sx={{
                    mb: 2,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2.2,
                      backgroundColor: "#faf9fc",

                      "& fieldset": {
                        borderColor: "#e7e2ee",
                      },

                      "&:hover fieldset": {
                        borderColor: "#b79ae8",
                      },

                      "&.Mui-focused fieldset": {
                        borderColor: "#7c3aed",
                        borderWidth: 1.5,
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#7c3aed",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlineIcon
                          sx={{
                            fontSize: 21,
                            color: "#8c8497",
                          }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Password */}
                <TextField
                  fullWidth
                  label="Password"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  sx={{
                    mb: 3,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2.2,
                      backgroundColor: "#faf9fc",

                      "& fieldset": {
                        borderColor: "#e7e2ee",
                      },

                      "&:hover fieldset": {
                        borderColor: "#b79ae8",
                      },

                      "&.Mui-focused fieldset": {
                        borderColor: "#7c3aed",
                        borderWidth: 1.5,
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#7c3aed",
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon
                          sx={{
                            fontSize: 21,
                            color: "#8c8497",
                          }}
                        />
                      </InputAdornment>
                    ),

                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          disabled={loading}
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
                        >
                          {showPassword ? (
                            <VisibilityOffOutlinedIcon fontSize="small" />
                          ) : (
                            <VisibilityOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Login Button */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  endIcon={
                    !loading ? (
                      <ArrowForwardRoundedIcon />
                    ) : null
                  }
                  startIcon={
                    loading ? (
                      <CircularProgress
                        size={18}
                        color="inherit"
                      />
                    ) : null
                  }
                  sx={{
                    minHeight: 52,
                    borderRadius: 2.2,
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.98rem",

                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",

                    boxShadow:
                      "0 10px 25px rgba(124,58,237,0.22)",

                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
                      boxShadow:
                        "0 12px 28px rgba(124,58,237,0.28)",
                    },

                    "&:disabled": {
                      background: "#c4b5d9",
                      color: "#fff",
                    },
                  }}
                >
                  {loading ? "Signing you in..." : "Sign In"}
                </Button>
              </Box>

              {/* Bottom Info */}
              <Box sx={{ mt: 3.5 }}>
                <Divider sx={{ mb: 2.5 }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.8,
                  }}
                >
                  <ShieldOutlinedIcon
                    sx={{
                      fontSize: 16,
                      color: "#8b7a9e",
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#817889",
                      fontSize: 12,
                    }}
                  >
                    Your account information is kept secure
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Footer */}
        <Typography
          align="center"
          sx={{
            mt: 2.5,
            fontSize: 12,
            color: "#8b8394",
          }}
        >
          Expense Reminder • Stay organized, stay in control
        </Typography>
      </Box>
    </Box>
  );
}
