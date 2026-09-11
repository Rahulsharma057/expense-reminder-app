
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Button,
  Divider,
} from "@mui/material";

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

function DashboardInner() {
  const router = useRouter();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // LOAD DASHBOARD
  // =========================================================
  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => {
        setSummary(res.data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // =========================================================
  // MONTHLY DIFFERENCE
  // =========================================================
  const diff = summary
    ? summary.thisMonthTotal -
      summary.lastMonthTotal
    : 0;

  const isIncrease = diff >= 0;

  // =========================================================
  // FORMAT MONEY
  // =========================================================
  const formatMoney = (value) => {
    return `₹${(value || 0).toLocaleString(
      "en-IN"
    )}`;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",

        background:
          "linear-gradient(180deg, #FAF9FF 0%, #FFFFFF 45%, #FFFFFF 100%)",
      }}
    >
      <Navbar />

      <Container
        maxWidth="lg"
        sx={{
          py: {
            xs: 2,
            sm: 2.5,
            md: 3,
          },

          px: {
            xs: 1.5,
            sm: 2,
            md: 3,
          },
        }}
      >
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}
        <Paper
          elevation={0}
          sx={{
            mb: 2.25,

            p: {
              xs: 1.75,
              sm: 2.25,
              md: 2.5,
            },

            borderRadius: {
              xs: 2.5,
              sm: 3,
            },

            border:
              "1px solid #EDE9FE",

            background:
              "linear-gradient(135deg, #FFFFFF 0%, #FAF7FF 100%)",

            boxShadow:
              "0 8px 30px rgba(76,29,149,0.06)",
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "flex-start",
              sm: "center",
            }}
            spacing={1.5}
          >
            {/* TITLE */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              sx={{
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: {
                    xs: 42,
                    sm: 46,
                  },

                  height: {
                    xs: 42,
                    sm: 46,
                  },

                  flexShrink: 0,

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",

                  borderRadius: 2.25,

                  background:
                    "linear-gradient(135deg, #7C3AED, #5B21B6)",

                  color: "#FFFFFF",

                  boxShadow:
                    "0 7px 18px rgba(124,58,237,0.22)",
                }}
              >
                <AccountBalanceWalletIcon
                  sx={{
                    fontSize: {
                      xs: 22,
                      sm: 24,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: {
                      xs: 20,
                      sm: 22,
                      md: 24,
                    },

                    lineHeight: 1.2,

                    fontWeight: 800,

                    color: "#17151F",
                  }}
                >
                  Overview
                </Typography>

                <Typography
                  sx={{
                    mt: 0.35,

                    fontSize: {
                      xs: 11.5,
                      sm: 12.5,
                    },

                    color: "#777181",
                  }}
                >
                  Quick snapshot of your finances
                </Typography>
              </Box>
            </Stack>

            {/* QUICK ADD */}
            <Button
              variant="contained"
              startIcon={
                <AddCircleIcon
                  sx={{
                    fontSize:
                      "20px !important",
                  }}
                />
              }
              onClick={() =>
                router.push(
                  "/expenses/new"
                )
              }
              sx={{
                width: {
                  xs: "100%",
                  sm: "auto",
                },

                minHeight: 44,

                px: 2,

                borderRadius: 2.25,

                textTransform: "none",

                fontWeight: 700,

                fontSize: 13,

                background:
                  "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",

                boxShadow:
                  "0 7px 18px rgba(124,58,237,0.22)",

                "&:hover": {
                  background:
                    "linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)",
                },
              }}
            >
              Add Expense
            </Button>
          </Stack>
        </Paper>

        {/* =====================================================
            LOADING
        ===================================================== */}
        {loading ? (
          <Paper
            elevation={0}
            sx={{
              minHeight: 360,

              display: "flex",
              flexDirection: "column",

              alignItems: "center",
              justifyContent: "center",

              borderRadius: 3,

              border:
                "1px solid #EDEAF2",

              backgroundColor: "#FFFFFF",
            }}
          >
            <CircularProgress
              size={36}
              thickness={4}
              sx={{
                color: "#7C3AED",
              }}
            />

            <Typography
              sx={{
                mt: 1.5,
                fontSize: 12,
                color: "#8B8497",
              }}
            >
              Loading dashboard...
            </Typography>
          </Paper>
        ) : (
          <>
            {/* =================================================
                STAT CARDS
            ================================================= */}
            <Grid
              container
              spacing={{
                xs: 1.25,
                sm: 1.75,
                md: 2,
              }}
              sx={{
                mb: {
                  xs: 2,
                  sm: 2.5,
                  md: 3,
                },
              }}
            >
              {/* THIS MONTH */}
              <Grid
                size={{
                  xs: 6,
                  sm: 3,
                }}
              >
                <StatCard
                  icon={
                    <AccountBalanceWalletIcon />
                  }
                  label="This Month"
                  value={formatMoney(
                    summary?.thisMonthTotal
                  )}
                  color="#7C3AED"
                  bg="#F3E8FF"
                />
              </Grid>

              {/* DIFFERENCE */}
              <Grid
                size={{
                  xs: 6,
                  sm: 3,
                }}
              >
                <StatCard
                  icon={
                    isIncrease ? (
                      <TrendingUpRoundedIcon />
                    ) : (
                      <TrendingDownRoundedIcon />
                    )
                  }
                  label={
                    isIncrease
                      ? "More than last month"
                      : "Less than last month"
                  }
                  value={formatMoney(
                    Math.abs(diff)
                  )}
                  color={
                    isIncrease
                      ? "#DC2626"
                      : "#16A34A"
                  }
                  bg={
                    isIncrease
                      ? "#FEE2E2"
                      : "#DCFCE7"
                  }
                />
              </Grid>

              {/* PENDING */}
              <Grid
                size={{
                  xs: 6,
                  sm: 3,
                }}
              >
                <StatCard
                  icon={
                    <PendingActionsIcon />
                  }
                  label="Pending Tasks"
                  value={
                    summary?.pendingReminders ??
                    0
                  }
                  color="#2563EB"
                  bg="#DBEAFE"
                />
              </Grid>

              {/* OVERDUE */}
              <Grid
                size={{
                  xs: 6,
                  sm: 3,
                }}
              >
                <StatCard
                  icon={
                    <WarningAmberIcon />
                  }
                  label="Overdue Tasks"
                  value={
                    summary?.overdueReminders ??
                    0
                  }
                  color="#EA580C"
                  bg="#FFEDD5"
                />
              </Grid>
            </Grid>

            {/* =================================================
                INSIGHTS
            ================================================= */}
            <Grid
              container
              spacing={{
                xs: 1.5,
                sm: 2,
              }}
            >
              {/* =================================================
                  TOP RECIPIENTS
              ================================================= */}
              <Grid
                size={{
                  xs: 12,
                  md: 6,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    height: "100%",

                    p: {
                      xs: 1.75,
                      sm: 2.25,
                    },

                    borderRadius: 3,

                    border:
                      "1px solid #E9E6F0",

                    backgroundColor:
                      "#FFFFFF",

                    boxShadow:
                      "0 6px 24px rgba(15,23,42,0.045)",
                  }}
                >
                  {/* CARD HEADER */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      mb: 1.75,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,

                          flexShrink: 0,

                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",

                          borderRadius: 1.75,

                          bgcolor: "#F3E8FF",

                          color: "#7C3AED",
                        }}
                      >
                        <ReceiptLongRoundedIcon
                          sx={{
                            fontSize: 19,
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 14,

                            fontWeight: 750,

                            color: "#27222F",
                          }}
                        >
                          Top Recipients
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.15,

                            fontSize: 10.5,

                            color: "#96909F",
                          }}
                        >
                          This month's spending
                        </Typography>
                      </Box>
                    </Stack>

                    <Chip
                      label="This month"
                      size="small"
                      sx={{
                        height: 25,

                        flexShrink: 0,

                        fontSize: 10,

                        fontWeight: 650,

                        bgcolor: "#F5F3FF",

                        color: "#6D28D9",

                        border:
                          "1px solid #E9E2FF",

                        "& .MuiChip-label": {
                          px: 1,
                        },
                      }}
                    />
                  </Stack>

                  <Divider
                    sx={{
                      mb: 1.25,
                    }}
                  />

                  {summary?.topRecipients
                    ?.length ? (
                    <Stack spacing={0}>
                      {summary.topRecipients.map(
                        (r, index) => (
                          <Box
                            key={r.name}
                            sx={{
                              py: 1.15,

                              borderBottom:
                                index !==
                                summary
                                  .topRecipients
                                  .length -
                                  1
                                  ? "1px solid #F0EEF3"
                                  : "none",
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              spacing={1}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{
                                  minWidth: 0,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,

                                    flexShrink: 0,

                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",

                                    borderRadius:
                                      "50%",

                                    bgcolor:
                                      index ===
                                      0
                                        ? "#F3E8FF"
                                        : "#F7F6F9",

                                    color:
                                      index ===
                                      0
                                        ? "#7C3AED"
                                        : "#777181",

                                    fontSize: 10,

                                    fontWeight: 800,
                                  }}
                                >
                                  {index + 1}
                                </Box>

                                <Typography
                                  sx={{
                                    minWidth: 0,

                                    overflow:
                                      "hidden",

                                    textOverflow:
                                      "ellipsis",

                                    whiteSpace:
                                      "nowrap",

                                    fontSize: 12.5,

                                    fontWeight:
                                      550,

                                    color:
                                      "#4B4655",
                                  }}
                                >
                                  {r.name}
                                </Typography>
                              </Stack>

                              <Typography
                                sx={{
                                  flexShrink: 0,

                                  fontSize: 12.5,

                                  fontWeight: 750,

                                  color:
                                    "#27222F",
                                }}
                              >
                                {formatMoney(
                                  r.total
                                )}
                              </Typography>
                            </Stack>
                          </Box>
                        )
                      )}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        py: 4,

                        textAlign:
                          "center",
                      }}
                    >
                      <ReceiptLongRoundedIcon
                        sx={{
                          fontSize: 30,
                          color: "#D0CBD8",
                        }}
                      />

                      <Typography
                        sx={{
                          mt: 1,

                          fontSize: 12,

                          color:
                            "#8B8497",
                        }}
                      >
                        No expenses yet this
                        month.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* =================================================
                  PAYMENT MODES
              ================================================= */}
              <Grid
                size={{
                  xs: 12,
                  md: 6,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    height: "100%",

                    p: {
                      xs: 1.75,
                      sm: 2.25,
                    },

                    borderRadius: 3,

                    border:
                      "1px solid #E9E6F0",

                    backgroundColor:
                      "#FFFFFF",

                    boxShadow:
                      "0 6px 24px rgba(15,23,42,0.045)",
                  }}
                >
                  {/* HEADER */}
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      mb: 1.75,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,

                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",

                          borderRadius: 1.75,

                          bgcolor: "#EEF2FF",

                          color: "#4F46E5",
                        }}
                      >
                        <PaymentsRoundedIcon
                          sx={{
                            fontSize: 19,
                          }}
                        />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: 14,

                            fontWeight: 750,

                            color: "#27222F",
                          }}
                        >
                          By Payment Mode
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.15,

                            fontSize: 10.5,

                            color: "#96909F",
                          }}
                        >
                          How you paid this month
                        </Typography>
                      </Box>
                    </Stack>

                    <Chip
                      label="Breakdown"
                      size="small"
                      sx={{
                        height: 25,

                        fontSize: 10,

                        fontWeight: 650,

                        bgcolor: "#F5F3FF",

                        color: "#6D28D9",

                        border:
                          "1px solid #E9E2FF",

                        "& .MuiChip-label": {
                          px: 1,
                        },
                      }}
                    />
                  </Stack>

                  <Divider
                    sx={{
                      mb: 1.5,
                    }}
                  />

                  {summary?.byMode?.length ? (
                    <Stack
                      spacing={1}
                    >
                      {summary.byMode.map(
                        (m) => (
                          <Box
                            key={m.mode}
                            sx={{
                              p: 1.25,

                              borderRadius: 2,

                              bgcolor:
                                "#FAFAFC",

                              border:
                                "1px solid #F0EEF4",
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              spacing={1}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={1}
                                sx={{
                                  minWidth: 0,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,

                                    flexShrink: 0,

                                    borderRadius:
                                      "50%",

                                    bgcolor:
                                      "#7C3AED",
                                  }}
                                />

                                <Typography
                                  sx={{
                                    fontSize:
                                      12.5,

                                    fontWeight:
                                      600,

                                    color:
                                      "#4B4655",

                                    overflow:
                                      "hidden",

                                    textOverflow:
                                      "ellipsis",

                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {m.mode}
                                </Typography>
                              </Stack>

                              <Typography
                                sx={{
                                  flexShrink: 0,

                                  fontSize:
                                    12.5,

                                  fontWeight:
                                    750,

                                  color:
                                    "#27222F",
                                }}
                              >
                                {formatMoney(
                                  m.total
                                )}
                              </Typography>
                            </Stack>
                          </Box>
                        )
                      )}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        py: 4,

                        textAlign:
                          "center",
                      }}
                    >
                      <PaymentsRoundedIcon
                        sx={{
                          fontSize: 30,
                          color: "#D0CBD8",
                        }}
                      />

                      <Typography
                        sx={{
                          mt: 1,

                          fontSize: 12,

                          color:
                            "#8B8497",
                        }}
                      >
                        No expenses yet this
                        month.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>

            {/* =================================================
                QUICK ACTIONS
            ================================================= */}
            <Paper
              elevation={0}
              sx={{
                mt: {
                  xs: 1.5,
                  sm: 2,
                },

                p: {
                  xs: 1.5,
                  sm: 1.75,
                },

                borderRadius: 3,

                border:
                  "1px solid #E9E6F0",

                backgroundColor:
                  "#FFFFFF",

                boxShadow:
                  "0 6px 24px rgba(15,23,42,0.04)",
              }}
            >
              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={1}
              >
                {/* ADD EXPENSE */}
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    <AddCircleIcon />
                  }
                  onClick={() =>
                    router.push(
                      "/expenses/new"
                    )
                  }
                  sx={{
                    minHeight: 44,

                    borderRadius: 2,

                    textTransform: "none",

                    fontSize: 13,

                    fontWeight: 700,

                    background:
                      "linear-gradient(135deg, #7C3AED, #5B21B6)",

                    boxShadow: "none",

                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #6D28D9, #4C1D95)",

                      boxShadow: "none",
                    },
                  }}
                >
                  Add Expense
                </Button>

                {/* VIEW EXPENSES */}
                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={
                    <ArrowForwardRoundedIcon />
                  }
                  onClick={() =>
                    router.push(
                      "/expenses"
                    )
                  }
                  sx={{
                    minHeight: 44,

                    borderRadius: 2,

                    textTransform: "none",

                    fontSize: 13,

                    fontWeight: 700,

                    color: "#6D28D9",

                    borderColor:
                      "#DDD6FE",

                    "&:hover": {
                      borderColor:
                        "#A78BFA",

                      backgroundColor:
                        "#FAF8FF",
                    },
                  }}
                >
                  View Expenses
                </Button>

                {/* REMINDERS */}
                <Button
                  fullWidth
                  variant="outlined"
                  endIcon={
                    <ArrowForwardRoundedIcon />
                  }
                  onClick={() =>
                    router.push(
                      "/reminders"
                    )
                  }
                  sx={{
                    minHeight: 44,

                    borderRadius: 2,

                    textTransform: "none",

                    fontSize: 13,

                    fontWeight: 700,

                    color: "#4B4655",

                    borderColor:
                      "#E1DEE7",

                    "&:hover": {
                      borderColor:
                        "#C9C4D1",

                      backgroundColor:
                        "#FAFAFC",
                    },
                  }}
                >
                  View Reminders
                </Button>
              </Stack>
            </Paper>

            {/* =================================================
                FOOTER
            ================================================= */}
            <Typography
              sx={{
                textAlign: "center",

                mt: 2,

                mb: 1,

                fontSize: 10,

                color: "#AAA5B3",
              }}
            >
              Expense Reminder • Manage
              your money smarter
            </Typography>
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
