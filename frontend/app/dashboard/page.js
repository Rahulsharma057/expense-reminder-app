"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box, Container, Grid, Typography, Paper, Stack, Chip, CircularProgress, Button,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

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

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>Overview</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Quick snapshot of this month
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<AccountBalanceWalletIcon />}
                  label="This Month"
                  value={`₹${(summary?.thisMonthTotal || 0).toLocaleString("en-IN")}`}
                  color="#7c3aed"
                  bg="#f3e8ff"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<CalendarMonthIcon />}
                  label={diff >= 0 ? "More than last month" : "Less than last month"}
                  value={`₹${Math.abs(diff).toLocaleString("en-IN")}`}
                  color={diff >= 0 ? "#dc2626" : "#16a34a"}
                  bg={diff >= 0 ? "#fee2e2" : "#dcfce7"}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<PendingActionsIcon />}
                  label="Pending Tasks"
                  value={summary?.pendingReminders ?? 0}
                  color="#2563eb"
                  bg="#dbeafe"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<WarningAmberIcon />}
                  label="Overdue Tasks"
                  value={summary?.overdueReminders ?? 0}
                  color="#ea580c"
                  bg="#ffedd5"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #ece9f5", borderRadius: 3, height: "100%" }}>
                  <Typography fontWeight={700} sx={{ mb: 1.5 }}>Top Recipients (this month)</Typography>
                  {summary?.topRecipients?.length ? (
                    <Stack spacing={1}>
                      {summary.topRecipients.map((r) => (
                        <Stack key={r.name} direction="row" justifyContent="space-between">
                          <Typography variant="body2">{r.name}</Typography>
                          <Typography variant="body2" fontWeight={700}>₹{r.total.toLocaleString("en-IN")}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No expenses yet this month.</Typography>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2.2, border: "1px solid #ece9f5", borderRadius: 3, height: "100%" }}>
                  <Typography fontWeight={700} sx={{ mb: 1.5 }}>By Payment Mode</Typography>
                  {summary?.byMode?.length ? (
                    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>
                      {summary.byMode.map((m) => (
                        <Chip key={m.mode} label={`${m.mode}: ₹${m.total.toLocaleString("en-IN")}`} />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">No expenses yet this month.</Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<AddCircleIcon />}
                onClick={() => router.push("/expenses/new")}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2.5, background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
              >
                Add Expense
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push("/reminders")}
                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2.5 }}
              >
                View Reminders
              </Button>
            </Stack>
          </>
        )}
      </Container>
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
