"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Box, Container, Grid, Typography, Paper, Stack, Chip, CircularProgress,
  Button, Divider, IconButton, Collapse,
} from "@mui/material";

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

// =============================================================
// Collapsible section — header always visible, content hidden
// until the arrow / header is tapped. Mobile-friendly accordion.
// =============================================================
function CollapsibleSection({ icon, iconBg, iconColor, title, subtitle, chipLabel, isEmpty, emptyText, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Paper
      elevation={0}
      sx={{ height: "100%", p: { xs: 1.4, sm: 1.75 }, borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        onClick={() => setOpen((o) => !o)}
        sx={{ cursor: "pointer", minHeight: 40 }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          <Box sx={{ width: { xs: 28, sm: 30 }, height: { xs: 28, sm: 30 }, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 1.5, bgcolor: iconBg, color: iconColor }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: { xs: 12.5, sm: 13 }, fontWeight: 750, color: "text.primary" }}>{title}</Typography>
            <Typography sx={{ fontSize: { xs: 9.5, sm: 10 }, color: "text.secondary" }}>{subtitle}</Typography>
          </Box>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          {chipLabel && (
            <Chip label={chipLabel} size="small" sx={{ height: 22, fontSize: 9.5, fontWeight: 650, bgcolor: "rgba(139,92,246,0.15)", color: "primary.light", display: { xs: "none", sm: "flex" } }} />
          )}
          <IconButton
            size="small"
            sx={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", color: "text.secondary" }}
          >
            <ExpandMoreRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse in={open} timeout={200}>
        <Divider sx={{ my: 1.1, opacity: 0.5 }} />
        {isEmpty ? (
          <Box sx={{ py: 2.5, textAlign: "center" }}>
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{emptyText}</Typography>
          </Box>
        ) : (
          children
        )}
      </Collapse>
    </Paper>
  );
}

function DashboardInner() {
  const router = useRouter();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .finally(() => setLoading(false));
  }, []);

  const diff = summary ? summary.thisMonthTotal - summary.lastMonthTotal : 0;
  const isIncrease = diff >= 0;

  const formatMoney = (value) => `₹${(value || 0).toLocaleString("en-IN")}`;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 1.25, sm: 2 },
          px: { xs: 1.25, sm: 2, md: 3 },
          flex: 1,
        }}
      >
        {/* HEADER — title + Add Expense button side by side */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ mb: { xs: 1.5, sm: 1.75 } }}
        >
          <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, flexShrink: 0, display: "flex", alignItems: "center",
                justifyContent: "center", borderRadius: 2,
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)", color: "#FFFFFF",
              }}
            >
              <AccountBalanceWalletIcon sx={{ fontSize: { xs: 17, sm: 19 } }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: 17, sm: 20 }, lineHeight: 1.2, fontWeight: 800, color: "text.primary" }}>
                Overview
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: 10, sm: 11 }, color: "text.secondary",
                  display: { xs: "none", sm: "block" },
                }}
              >
                Quick snapshot of your finances
              </Typography>
            </Box>
          </Stack>

          <Button
            variant="contained"
            size="small"
            startIcon={<AddCircleIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
            onClick={() => router.push("/expenses/new")}
            sx={{
              flexShrink: 0,
              minHeight: { xs: 36, sm: 38 },
              px: { xs: 1.4, sm: 2 },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              fontSize: { xs: 11.5, sm: 12.5 },
              whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
              boxShadow: "0 6px 16px rgba(139,92,246,0.28)",
            }}
          >
            Add Expense
          </Button>
        </Stack>

        {loading ? (
          <Paper
            elevation={0}
            sx={{
              minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", borderRadius: 3, border: "1px solid", borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <CircularProgress size={28} thickness={4} sx={{ color: "primary.main" }} />
            <Typography sx={{ mt: 1.1, fontSize: 11.5, color: "text.secondary" }}>Loading dashboard...</Typography>
          </Paper>
        ) : (
          <>
            {/* STAT CARDS — 2 per row on mobile, 4 on tablet+ (MUI v5 Grid API) */}
            <Grid container spacing={{ xs: 1, sm: 1.25 }} sx={{ mb: { xs: 1.5, sm: 1.75 } }}>
              <Grid item xs={6} sm={3}>
                <StatCard icon={<AccountBalanceWalletIcon />} label="This Month" value={formatMoney(summary?.thisMonthTotal)} color="#A78BFA" bg="rgba(139,92,246,0.15)" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={isIncrease ? <TrendingUpRoundedIcon /> : <TrendingDownRoundedIcon />}
                  label={isIncrease ? "More than last month" : "Less than last month"}
                  value={formatMoney(Math.abs(diff))}
                  color={isIncrease ? "#F87171" : "#4ADE80"}
                  bg={isIncrease ? "rgba(248,113,113,0.15)" : "rgba(74,222,128,0.15)"}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard icon={<PendingActionsIcon />} label="Pending Tasks" value={summary?.pendingReminders ?? 0} color="#60A5FA" bg="rgba(96,165,250,0.15)" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard icon={<WarningAmberIcon />} label="Overdue Tasks" value={summary?.overdueReminders ?? 0} color="#FB923C" bg="rgba(251,146,60,0.15)" />
              </Grid>
            </Grid>

            {/* COLLAPSIBLE INSIGHTS — stacked on mobile, side-by-side on md+ */}
            <Grid container spacing={{ xs: 1.25, sm: 1.5 }}>
              <Grid item xs={12} md={6}>
                <CollapsibleSection
                  icon={<ReceiptLongRoundedIcon sx={{ fontSize: 16 }} />}
                  iconBg="rgba(139,92,246,0.15)"
                  iconColor="primary.main"
                  title="Top Recipients"
                  subtitle="Tap to view this month's spending"
                  chipLabel="This month"
                  isEmpty={!summary?.topRecipients?.length}
                  emptyText="No expenses yet this month."
                >
                  <Stack spacing={0}>
                    {summary?.topRecipients?.map((r, index) => (
                      <Box key={r.name} sx={{ py: 0.85, borderBottom: index !== summary.topRecipients.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                            <Box
                              sx={{
                                width: 21, height: 21, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                borderRadius: "50%", bgcolor: index === 0 ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                                color: index === 0 ? "primary.light" : "text.secondary", fontSize: 9.5, fontWeight: 800,
                              }}
                            >
                              {index + 1}
                            </Box>
                            <Typography sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 550, color: "text.primary" }}>
                              {r.name}
                            </Typography>
                          </Stack>
                          <Typography sx={{ flexShrink: 0, fontSize: 12, fontWeight: 750, color: "text.primary" }}>
                            {formatMoney(r.total)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CollapsibleSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <CollapsibleSection
                  icon={<PaymentsRoundedIcon sx={{ fontSize: 16 }} />}
                  iconBg="rgba(99,102,241,0.15)"
                  iconColor="#A5B4FC"
                  title="By Payment Mode"
                  subtitle="Tap to view how you paid"
                  chipLabel="Breakdown"
                  isEmpty={!summary?.byMode?.length}
                  emptyText="No expenses yet this month."
                >
                  <Stack spacing={0.65}>
                    {summary?.byMode?.map((m) => (
                      <Box key={m.mode} sx={{ p: 1, borderRadius: 1.75, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                            <Box sx={{ width: 7, height: 7, flexShrink: 0, borderRadius: "50%", bgcolor: "primary.main" }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {m.mode}
                            </Typography>
                          </Stack>
                          <Typography sx={{ flexShrink: 0, fontSize: 12, fontWeight: 750, color: "text.primary" }}>
                            {formatMoney(m.total)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </CollapsibleSection>
              </Grid>
            </Grid>
          </>
        )}
      </Container>

      {/* QUICK ACTIONS — sticky bottom bar, taller buttons, safe-area aware */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          bgcolor: "background.default",
          borderTop: "1px solid",
          borderColor: "divider",
          pt: 1.1,
          pb: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
          px: { xs: 1.25, sm: 2, md: 3 },
        }}
      >
        <Container maxWidth="lg" disableGutters>
          <Stack direction="row" spacing={{ xs: 0.85, sm: 1 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<AddCircleIcon sx={{ fontSize: { xs: 18, sm: 19 } }} />}
              onClick={() => router.push("/expenses/new")}
              sx={{
                minHeight: { xs: 52, sm: 54 },
                borderRadius: 2.25,
                textTransform: "none",
                fontSize: { xs: 12.5, sm: 13.5 },
                fontWeight: 700,
                background: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
                boxShadow: "0 6px 16px rgba(139,92,246,0.28)",
              }}
            >
              Add
            </Button>

            <Button
              fullWidth
              variant="outlined"
              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />}
              onClick={() => router.push("/expenses")}
              sx={{
                minHeight: { xs: 52, sm: 54 },
                borderRadius: 2.25,
                textTransform: "none",
                fontSize: { xs: 12.5, sm: 13.5 },
                fontWeight: 700,
                color: "primary.light",
              }}
            >
              Expenses
            </Button>

            <Button
              fullWidth
              variant="outlined"
              endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />}
              onClick={() => router.push("/reminders")}
              sx={{
                minHeight: { xs: 52, sm: 54 },
                borderRadius: 2.25,
                textTransform: "none",
                fontSize: { xs: 12.5, sm: 13.5 },
                fontWeight: 700,
                color: "text.secondary",
              }}
            >
              Reminders
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  );
}