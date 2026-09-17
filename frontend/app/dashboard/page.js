"use client";

import { useState, useEffect } from "react";
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
  IconButton,
  Collapse,
} from "@mui/material";

import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import PaymentsRoundedIcon from "@mui/icons-material/Payments";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import StatCard from "../../components/StatCard";
import api from "../../lib/api";

// =============================================================
// COLLAPSIBLE SECTION
// =============================================================

function CollapsibleSection({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  chipLabel,
  isEmpty,
  emptyText,
  children,
}) {
  const [open, setOpen] = useState(false);

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        p: {
          xs: 1.4,
          sm: 1.75,
        },

        borderRadius: 3,

        border: "1px solid #F1E7B2",

        background:
          "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,252,235,0.95))",

        boxShadow:
          "0 8px 26px rgba(120,96,20,0.07)",

        backdropFilter: "blur(8px)",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        onClick={() => setOpen((o) => !o)}
        sx={{
          cursor: "pointer",
          minHeight: 40,
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
              width: {
                xs: 28,
                sm: 30,
              },

              height: {
                xs: 28,
                sm: 30,
              },

              flexShrink: 0,

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              borderRadius: 1.5,

              bgcolor: iconBg,

              color: iconColor,

              border:
                "1px solid rgba(202,138,4,0.12)",
            }}
          >
            {icon}
          </Box>

          <Box
            sx={{
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                fontSize: {
                  xs: 12.5,
                  sm: 13,
                },

                fontWeight: 750,

                color: "#3F3517",
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                fontSize: {
                  xs: 9.5,
                  sm: 10,
                },

                color: "#8A805E",
              }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{
            flexShrink: 0,
          }}
        >
          {chipLabel && (
            <Chip
              label={chipLabel}
              size="small"
              sx={{
                height: 22,

                fontSize: 9.5,

                fontWeight: 650,

                bgcolor:
                  "rgba(250,204,21,0.16)",

                color: "#9A6B00",

                border:
                  "1px solid rgba(202,138,4,0.15)",

                display: {
                  xs: "none",
                  sm: "flex",
                },
              }}
            />
          )}

          <IconButton
            size="small"
            sx={{
              transform: open
                ? "rotate(180deg)"
                : "rotate(0deg)",

              transition:
                "transform 0.2s",

              color: "#857950",
            }}
          >
            <ExpandMoreRoundedIcon
              fontSize="small"
            />
          </IconButton>
        </Stack>
      </Stack>

      <Collapse
        in={open}
        timeout={200}
      >
        <Divider
          sx={{
            my: 1.1,
            opacity: 0.5,
            borderColor: "#EBDFA4",
          }}
        />

        {isEmpty ? (
          <Box
            sx={{
              py: 2.5,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 11.5,
                color: "#948A66",
              }}
            >
              {emptyText}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Collapse>
    </Paper>
  );
}

// =============================================================
// TASK STATUS HELPERS
// =============================================================

const getTaskStatus = (status) => {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        color: "#15803D",
        bg: "rgba(34,197,94,0.12)",
        border: "#BBF7D0",
        icon: (
          <CheckCircleRoundedIcon
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };

    case "in-progress":
      return {
        label: "In Progress",
        color: "#B45309",
        bg: "rgba(245,158,11,0.13)",
        border: "#FDE68A",
        icon: (
          <PlayCircleOutlineRoundedIcon
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };

    default:
      return {
        label: "Pending",
        color: "#A16207",
        bg: "rgba(250,204,21,0.16)",
        border: "#FDE68A",
        icon: (
          <AccessTimeRoundedIcon
            sx={{
              fontSize: 14,
            }}
          />
        ),
      };
  }
};

// =============================================================
// DASHBOARD
// =============================================================

function DashboardInner() {
  const router = useRouter();

  const [summary, setSummary] =
    useState(null);

  const [tasks, setTasks] =
    useState([]);

  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [tasksLoading, setTasksLoading] =
    useState(true);

  // ===========================================================
  // LOAD DASHBOARD SUMMARY
  // ===========================================================

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setSummaryLoading(true);

        const response = await api.get(
          "/dashboard/summary"
        );

        setSummary(response.data);
      } catch (error) {
        console.error(
          "Dashboard summary error:",
          error
        );
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, []);

  // ===========================================================
  // LOAD TASKS
  // ===========================================================

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setTasksLoading(true);

        const response = await api.get(
          "/tasks/mine?limit=5"
        );

        const data = Array.isArray(
          response.data
        )
          ? response.data
          : response.data?.tasks || [];

        setTasks(data);
      } catch (error) {
        console.error(
          "Dashboard tasks error:",
          error
        );
      } finally {
        setTasksLoading(false);
      }
    };

    loadTasks();
  }, []);

  // ===========================================================
  // EXPENSE DATA
  // ===========================================================

  const diff = summary
    ? Number(
        summary.thisMonthTotal || 0
      ) -
      Number(
        summary.lastMonthTotal || 0
      )
    : 0;

  const isIncrease = diff >= 0;

  const formatMoney = (value) =>
    `₹${Number(value || 0).toLocaleString(
      "en-IN"
    )}`;

  // ===========================================================
  // TASK COUNTS
  // ===========================================================

  const pendingTasks = tasks.filter(
    (task) =>
      task?.status === "pending"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) =>
      task?.status === "in-progress"
  ).length;

  const completedTasks = tasks.filter(
    (task) =>
      task?.status === "completed"
  ).length;

  // ===========================================================
  // MAIN UI
  // ===========================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",

        position: "relative",

        overflow: "hidden",

        display: "flex",

        flexDirection: "column",

        bgcolor: "#FFFDF2",

        background: `
          radial-gradient(
            circle at 5% 10%,
            rgba(250,204,21,0.22) 0%,
            rgba(250,204,21,0) 23%
          ),

          radial-gradient(
            circle at 96% 22%,
            rgba(234,179,8,0.17) 0%,
            rgba(234,179,8,0) 24%
          ),

          radial-gradient(
            circle at 12% 78%,
            rgba(245,158,11,0.12) 0%,
            rgba(245,158,11,0) 22%
          ),

          radial-gradient(
            circle at 90% 82%,
            rgba(250,204,21,0.12) 0%,
            rgba(250,204,21,0) 21%
          ),

          linear-gradient(
            180deg,
            #FFF9D9 0%,
            #FFFDF2 36%,
            #FFFFFF 100%
          )
        `,
      }}
    >
      {/* =====================================================
          SUNFLOWER BACKGROUND
      ===================================================== */}

      {/* TOP LEFT */}
      <Box
        sx={{
          position: "fixed",

          top: {
            xs: 70,
            sm: 76,
          },

          left: {
            xs: -15,
            sm: 18,
          },

          fontSize: {
            xs: 70,
            sm: 100,
          },

          lineHeight: 1,

          opacity: 0.20,

          transform:
            "rotate(-16deg)",

          pointerEvents: "none",

          userSelect: "none",

          zIndex: 0,

          filter:
            "drop-shadow(0 8px 14px rgba(202,138,4,0.10))",
        }}
      >
        🌻
      </Box>

      {/* TOP RIGHT */}
      <Box
        sx={{
          position: "fixed",

          top: {
            xs: 110,
            sm: 120,
          },

          right: {
            xs: -16,
            sm: 24,
          },

          fontSize: {
            xs: 62,
            sm: 92,
          },

          lineHeight: 1,

          opacity: 0.14,

          transform:
            "rotate(14deg)",

          pointerEvents: "none",

          userSelect: "none",

          zIndex: 0,

          filter:
            "drop-shadow(0 8px 14px rgba(202,138,4,0.10))",
        }}
      >
        🌻
      </Box>

      {/* MID RIGHT */}
      <Box
        sx={{
          position: "fixed",

          top: "43%",

          right: {
            xs: -22,
            sm: 10,
          },

          fontSize: {
            xs: 58,
            sm: 82,
          },

          lineHeight: 1,

          opacity: 0.09,

          transform:
            "rotate(-10deg)",

          pointerEvents: "none",

          userSelect: "none",

          zIndex: 0,
        }}
      >
        🌻
      </Box>

      {/* BOTTOM LEFT */}
      <Box
        sx={{
          position: "fixed",

          bottom: {
            xs: 100,
            sm: 112,
          },

          left: {
            xs: "3%",
            sm: "12%",
          },

          fontSize: {
            xs: 50,
            sm: 70,
          },

          lineHeight: 1,

          opacity: 0.10,

          transform:
            "rotate(9deg)",

          pointerEvents: "none",

          userSelect: "none",

          zIndex: 0,
        }}
      >
        🌻
      </Box>

      {/* BOTTOM RIGHT */}
      <Box
        sx={{
          position: "fixed",

          bottom: {
            xs: 95,
            sm: 110,
          },

          right: {
            xs: -15,
            sm: 16,
          },

          fontSize: {
            xs: 72,
            sm: 100,
          },

          lineHeight: 1,

          opacity: 0.12,

          transform:
            "rotate(-12deg)",

          pointerEvents: "none",

          userSelect: "none",

          zIndex: 0,

          filter:
            "drop-shadow(0 8px 14px rgba(202,138,4,0.10))",
        }}
      >
        🌻
      </Box>

      {/* DOT PATTERN */}
      <Box
        sx={{
          position: "fixed",

          inset: 0,

          pointerEvents: "none",

          zIndex: 0,

          opacity: 0.32,

          backgroundImage: `
            radial-gradient(
              circle,
              rgba(202,138,4,0.15) 1px,
              transparent 1px
            )
          `,

          backgroundSize:
            "28px 28px",
        }}
      />

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <Box
        sx={{
          position: "relative",

          zIndex: 10,
        }}
      >
        <Navbar />
      </Box>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <Box
        sx={{
          position: "relative",

          zIndex: 1,

          flex: 1,

          display: "flex",

          flexDirection: "column",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            py: {
              xs: 1.25,
              sm: 2,
            },

            px: {
              xs: 1.25,
              sm: 2,
              md: 3,
            },

            flex: 1,
          }}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            sx={{
              mb: {
                xs: 1.5,
                sm: 1.75,
              },
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.1}
              sx={{
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: {
                    xs: 36,
                    sm: 42,
                  },

                  height: {
                    xs: 36,
                    sm: 42,
                  },

                  flexShrink: 0,

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "center",

                  borderRadius: 2.25,

                  background:
                    "linear-gradient(135deg, #FACC15, #EAB308)",

                  color: "#713F12",

                  boxShadow:
                    "0 7px 18px rgba(234,179,8,0.24)",

                  border:
                    "1px solid rgba(202,138,4,0.18)",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: {
                      xs: 19,
                      sm: 22,
                    },

                    lineHeight: 1,
                  }}
                >
                  🌻
                </Typography>
              </Box>

              <Box
                sx={{
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: {
                      xs: 17,
                      sm: 20,
                    },

                    lineHeight: 1.2,

                    fontWeight: 800,

                    color: "#3D3214",
                  }}
                >
                  Overview
                </Typography>

                <Typography
                  sx={{
                    fontSize: {
                      xs: 10,
                      sm: 11,
                    },

                    color: "#8A805E",

                    display: {
                      xs: "none",
                      sm: "block",
                    },
                  }}
                >
                  Quick snapshot of your finances and tasks
                </Typography>
              </Box>
            </Stack>

            {/* ADD EXPENSE */}
            <Button
              variant="contained"
              size="small"
              startIcon={
                <AddCircleIcon
                  sx={{
                    fontSize: {
                      xs: 16,
                      sm: 18,
                    },
                  }}
                />
              }
              onClick={() =>
                router.push(
                  "/expenses/new"
                )
              }
              sx={{
                flexShrink: 0,

                minHeight: {
                  xs: 36,
                  sm: 38,
                },

                px: {
                  xs: 1.4,
                  sm: 2,
                },

                borderRadius: 2,

                textTransform: "none",

                fontWeight: 700,

                fontSize: {
                  xs: 11.5,
                  sm: 12.5,
                },

                whiteSpace:
                  "nowrap",

                color: "#422006",

                background:
                  "linear-gradient(135deg, #FACC15, #EAB308)",

                boxShadow:
                  "0 6px 16px rgba(234,179,8,0.28)",

                border:
                  "1px solid rgba(202,138,4,0.14)",

                "&:hover": {
                  background:
                    "linear-gradient(135deg, #EAB308, #CA8A04)",
                },
              }}
            >
              Add Expense
            </Button>
          </Stack>

          {/* =================================================
              SUMMARY LOADING
          ================================================= */}

          {summaryLoading ? (
            <Paper
              elevation={0}
              sx={{
                minHeight: 220,

                display: "flex",

                flexDirection: "column",

                alignItems: "center",

                justifyContent: "center",

                borderRadius: 3,

                border:
                  "1px solid #F1E7B2",

                background:
                  "rgba(255,255,255,0.90)",

                boxShadow:
                  "0 8px 26px rgba(120,96,20,0.06)",
              }}
            >
              <CircularProgress
                size={28}
                thickness={4}
                sx={{
                  color: "#EAB308",
                }}
              />

              <Typography
                sx={{
                  mt: 1.1,

                  fontSize: 11.5,

                  color: "#8A805E",
                }}
              >
                Loading dashboard...
              </Typography>
            </Paper>
          ) : (
            <>
              {/* =================================================
                  EXPENSE STAT CARDS
              ================================================= */}

              <Grid
                container
                spacing={{
                  xs: 1,
                  sm: 1.25,
                }}
                sx={{
                  mb: {
                    xs: 1.5,
                    sm: 1.75,
                  },
                }}
              >
                {/* THIS MONTH */}
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={
                      <AccountBalanceWalletIcon />
                    }
                    label="This Month"
                    value={formatMoney(
                      summary?.thisMonthTotal
                    )}
                    color="#CA8A04"
                    bg="rgba(250,204,21,0.20)"
                  />
                </Grid>

                {/* DIFFERENCE */}
                <Grid item xs={6} sm={3}>
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
                        ? "#D97706"
                        : "#16A34A"
                    }
                    bg={
                      isIncrease
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(34,197,94,0.13)"
                    }
                  />
                </Grid>

                {/* PENDING REMINDERS */}
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={
                      <PendingActionsIcon />
                    }
                    label="Pending Reminders"
                    value={
                      summary?.pendingReminders ??
                      0
                    }
                    color="#D97706"
                    bg="rgba(245,158,11,0.16)"
                  />
                </Grid>

                {/* OVERDUE REMINDERS */}
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={
                      <WarningAmberIcon />
                    }
                    label="Overdue Reminders"
                    value={
                      summary?.overdueReminders ??
                      0
                    }
                    color="#EA580C"
                    bg="rgba(249,115,22,0.14)"
                  />
                </Grid>
              </Grid>

              {/* =================================================
                  TASK OVERVIEW
              ================================================= */}

              <Paper
                elevation={0}
                sx={{
                  mb: {
                    xs: 1.5,
                    sm: 1.75,
                  },

                  p: {
                    xs: 1.4,
                    sm: 1.75,
                  },

                  borderRadius: 3,

                  border:
                    "1px solid #F1E7B2",

                  background:
                    "linear-gradient(145deg, rgba(255,255,255,0.98), rgba(255,252,235,0.95))",

                  boxShadow:
                    "0 8px 26px rgba(120,96,20,0.07)",

                  backdropFilter:
                    "blur(8px)",
                }}
              >
                {/* TASK HEADER */}

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    mb: 1.25,
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
                        width: {
                          xs: 30,
                          sm: 34,
                        },

                        height: {
                          xs: 30,
                          sm: 34,
                        },

                        display: "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        borderRadius: 1.75,

                        bgcolor:
                          "rgba(250,204,21,0.19)",

                        color: "#CA8A04",

                        border:
                          "1px solid rgba(202,138,4,0.12)",
                      }}
                    >
                      <TaskAltRoundedIcon
                        sx={{
                          fontSize: {
                            xs: 17,
                            sm: 19,
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
                            xs: 13,
                            sm: 14,
                          },

                          fontWeight: 800,

                          color: "#3F3517",
                        }}
                      >
                        Task Overview
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: {
                            xs: 9.5,
                            sm: 10.5,
                          },

                          color: "#8A805E",
                        }}
                      >
                        Your latest tasks and progress
                      </Typography>
                    </Box>
                  </Stack>

                  <Button
                    size="small"
                    endIcon={
                      <ArrowForwardRoundedIcon
                        sx={{
                          fontSize:
                            15,
                        }}
                      />
                    }
                    onClick={() =>
                      router.push(
                        "/tasks"
                      )
                    }
                    sx={{
                      flexShrink: 0,

                      minWidth: "auto",

                      px: {
                        xs: 0.8,
                        sm: 1.1,
                      },

                      color: "#9A6B00",

                      textTransform:
                        "none",

                      fontWeight: 700,

                      fontSize: {
                        xs: 10,
                        sm: 11,
                      },

                      "&:hover": {
                        background:
                          "rgba(250,204,21,0.08)",
                      },
                    }}
                  >
                    View All
                  </Button>
                </Stack>

                {/* TASK SUMMARY NUMBERS */}

                <Grid
                  container
                  spacing={{
                    xs: 0.8,
                    sm: 1,
                  }}
                >
                  {/* PENDING */}
                  <Grid
                    item
                    xs={4}
                  >
                    <Box
                      sx={{
                        p: {
                          xs: 1,
                          sm: 1.2,
                        },

                        borderRadius: 2,

                        bgcolor:
                          "rgba(250,204,21,0.10)",

                        border:
                          "1px solid rgba(234,179,8,0.15)",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.6}
                      >
                        <AccessTimeRoundedIcon
                          sx={{
                            fontSize: 16,

                            color:
                              "#B77905",
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: {
                              xs: 9,
                              sm: 10,
                            },

                            color:
                              "#857950",
                          }}
                        >
                          Pending
                        </Typography>
                      </Stack>

                      <Typography
                        sx={{
                          mt: 0.35,

                          fontSize: {
                            xs: 20,
                            sm: 22,
                          },

                          lineHeight: 1,

                          fontWeight: 800,

                          color:
                            "#8A6100",
                        }}
                      >
                        {pendingTasks}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* IN PROGRESS */}
                  <Grid
                    item
                    xs={4}
                  >
                    <Box
                      sx={{
                        p: {
                          xs: 1,
                          sm: 1.2,
                        },

                        borderRadius: 2,

                        bgcolor:
                          "rgba(245,158,11,0.09)",

                        border:
                          "1px solid rgba(245,158,11,0.14)",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.6}
                      >
                        <PlayCircleOutlineRoundedIcon
                          sx={{
                            fontSize: 16,

                            color:
                              "#C06F00",
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: {
                              xs: 9,
                              sm: 10,
                            },

                            color:
                              "#857950",
                          }}
                        >
                          In Progress
                        </Typography>
                      </Stack>

                      <Typography
                        sx={{
                          mt: 0.35,

                          fontSize: {
                            xs: 20,
                            sm: 22,
                          },

                          lineHeight: 1,

                          fontWeight: 800,

                          color:
                            "#A85D00",
                        }}
                      >
                        {inProgressTasks}
                      </Typography>
                    </Box>
                  </Grid>

                  {/* COMPLETED */}
                  <Grid
                    item
                    xs={4}
                  >
                    <Box
                      sx={{
                        p: {
                          xs: 1,
                          sm: 1.2,
                        },

                        borderRadius: 2,

                        bgcolor:
                          "rgba(34,197,94,0.08)",

                        border:
                          "1px solid rgba(34,197,94,0.13)",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.6}
                      >
                        <CheckCircleRoundedIcon
                          sx={{
                            fontSize: 16,

                            color:
                              "#15803D",
                          }}
                        />

                        <Typography
                          sx={{
                            fontSize: {
                              xs: 9,
                              sm: 10,
                            },

                            color:
                              "#857950",
                          }}
                        >
                          Completed
                        </Typography>
                      </Stack>

                      <Typography
                        sx={{
                          mt: 0.35,

                          fontSize: {
                            xs: 20,
                            sm: 22,
                          },

                          lineHeight: 1,

                          fontWeight: 800,

                          color:
                            "#166534",
                        }}
                      >
                        {completedTasks}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* =================================================
                    RECENT TASKS
                ================================================= */}

                <Divider
                  sx={{
                    my: 1.35,

                    borderColor:
                      "#EEE3AD",
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    mb: 0.8,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: 11.5,
                        sm: 12,
                      },

                      fontWeight: 750,

                      color:
                        "#51431B",
                    }}
                  >
                    Recent Tasks
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 9.5,

                      color:
                        "#9B906A",
                    }}
                  >
                    Latest 5
                  </Typography>
                </Stack>

                {tasksLoading ? (
                  <Box
                    sx={{
                      py: 2.5,

                      display: "flex",

                      justifyContent:
                        "center",
                    }}
                  >
                    <CircularProgress
                      size={22}
                      thickness={4}
                      sx={{
                        color:
                          "#EAB308",
                      }}
                    />
                  </Box>
                ) : tasks.length === 0 ? (
                  <Box
                    sx={{
                      py: 2.5,

                      textAlign:
                        "center",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11.5,

                        color:
                          "#948A66",
                      }}
                    >
                      No tasks found.
                    </Typography>

                    <Button
                      size="small"
                      onClick={() =>
                        router.push(
                          "/tasks"
                        )
                      }
                      sx={{
                        mt: 0.8,

                        color:
                          "#A16207",

                        textTransform:
                          "none",

                        fontSize: 10.5,

                        fontWeight: 700,
                      }}
                    >
                      Open Tasks
                    </Button>
                  </Box>
                ) : (
                  <Stack spacing={0.7}>
                    {tasks
                      .slice(0, 5)
                      .map(
                        (
                          task,
                          index
                        ) => {
                          const status =
                            getTaskStatus(
                              task?.status
                            );

                          return (
                            <Box
                              key={
                                task?._id ||
                                index
                              }
                              onClick={() =>
                                router.push(
                                  `/tasks?task=${task._id}`
                                )
                              }
                              sx={{
                                p: {
                                  xs: 0.9,
                                  sm: 1,
                                },

                                borderRadius:
                                  1.8,

                                bgcolor:
                                  "rgba(255,252,235,0.68)",

                                border:
                                  "1px solid #F0E6B8",

                                cursor:
                                  "pointer",

                                transition:
                                  "all 0.18s ease",

                                "&:hover":
                                  {
                                    bgcolor:
                                      "#FFF8D7",

                                    borderColor:
                                      "#E3CC69",

                                    transform:
                                      "translateY(-1px)",
                                  },
                              }}
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                spacing={
                                  0.9
                                }
                              >
                                {/* NUMBER / ICON */}

                                <Box
                                  sx={{
                                    width: 26,

                                    height: 26,

                                    flexShrink: 0,

                                    display:
                                      "flex",

                                    alignItems:
                                      "center",

                                    justifyContent:
                                      "center",

                                    borderRadius:
                                      1.35,

                                    bgcolor:
                                      index ===
                                      0
                                        ? "rgba(250,204,21,0.22)"
                                        : "rgba(250,204,21,0.10)",

                                    color:
                                      "#A16207",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize:
                                        10,

                                      fontWeight:
                                        800,
                                    }}
                                  >
                                    {index +
                                      1}
                                  </Typography>
                                </Box>

                                {/* TASK TITLE */}

                                <Box
                                  sx={{
                                    minWidth: 0,

                                    flex: 1,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize:
                                        {
                                          xs: 11.5,
                                          sm: 12,
                                        },

                                      fontWeight:
                                        650,

                                      color:
                                        "#4B401D",

                                      overflow:
                                        "hidden",

                                      textOverflow:
                                        "ellipsis",

                                      whiteSpace:
                                        "nowrap",
                                    }}
                                  >
                                    {
                                      task?.title
                                    }
                                  </Typography>

                                  <Stack
                                    direction="row"
                                    spacing={
                                      0.8
                                    }
                                    sx={{
                                      mt: 0.2,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize:
                                          8.8,

                                        color:
                                          "#9A906D",

                                        overflow:
                                          "hidden",

                                        textOverflow:
                                          "ellipsis",

                                        whiteSpace:
                                          "nowrap",
                                      }}
                                    >
                                      {task?.mode ||
                                        "INDIVIDUAL"}
                                    </Typography>

                                    {task?.dueDate && (
                                      <>
                                        <Typography
                                          sx={{
                                            fontSize:
                                              8.8,

                                            color:
                                              "#C7BC94",
                                          }}
                                        >
                                          •
                                        </Typography>

                                        <Typography
                                          sx={{
                                            fontSize:
                                              8.8,

                                            color:
                                              "#9A906D",

                                            whiteSpace:
                                              "nowrap",
                                          }}
                                        >
                                          Due{" "}
                                          {
                                            task.dueDate
                                          }
                                        </Typography>
                                      </>
                                    )}
                                  </Stack>
                                </Box>

                                {/* STATUS */}

                                <Chip
                                  icon={
                                    status.icon
                                  }
                                  label={
                                    status.label
                                  }
                                  size="small"
                                  sx={{
                                    flexShrink:
                                      0,

                                    height: {
                                      xs: 23,
                                      sm: 25,
                                    },

                                    bgcolor:
                                      status.bg,

                                    color:
                                      status.color,

                                    border:
                                      `1px solid ${status.border}`,

                                    fontSize:
                                      {
                                        xs: 8.5,
                                        sm: 9,
                                      },

                                    fontWeight:
                                      700,

                                    "& .MuiChip-icon":
                                      {
                                        color:
                                          status.color,

                                        ml: 0.5,
                                      },

                                    "& .MuiChip-label":
                                      {
                                        px: {
                                          xs: 0.65,
                                          sm: 0.8,
                                        },
                                      },
                                  }}
                                />
                              </Stack>
                            </Box>
                          );
                        }
                      )}
                  </Stack>
                )}
              </Paper>

              {/* =================================================
                  INSIGHTS
              ================================================= */}

              <Grid
                container
                spacing={{
                  xs: 1.25,
                  sm: 1.5,
                }}
              >
                {/* TOP RECIPIENTS */}

                <Grid
                  item
                  xs={12}
                  md={6}
                >
                  <CollapsibleSection
                    icon={
                      <ReceiptLongRoundedIcon
                        sx={{
                          fontSize: 16,
                        }}
                      />
                    }
                    iconBg="rgba(250,204,21,0.20)"
                    iconColor="#CA8A04"
                    title="Top Recipients"
                    subtitle="Tap to view this month's spending"
                    chipLabel="This month"
                    isEmpty={
                      !summary
                        ?.topRecipients
                        ?.length
                    }
                    emptyText="No expenses yet this month."
                  >
                    <Stack spacing={0}>
                      {summary?.topRecipients?.map(
                        (r, index) => (
                          <Box
                            key={
                              r.name
                            }
                            sx={{
                              py: 0.85,

                              borderBottom:
                                index !==
                                summary
                                  .topRecipients
                                  .length -
                                  1
                                  ? "1px solid"
                                  : "none",

                              borderColor:
                                "#EFE5B5",
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
                                  minWidth:
                                    0,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 21,

                                    height: 21,

                                    flexShrink:
                                      0,

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
                                        ? "rgba(250,204,21,0.25)"
                                        : "rgba(250,204,21,0.08)",

                                    color:
                                      index ===
                                      0
                                        ? "#A16207"
                                        : "#8A805E",

                                    fontSize: 9.5,

                                    fontWeight:
                                      800,

                                    border:
                                      "1px solid rgba(202,138,4,0.10)",
                                  }}
                                >
                                  {index +
                                    1}
                                </Box>

                                <Typography
                                  sx={{
                                    minWidth:
                                      0,

                                    overflow:
                                      "hidden",

                                    textOverflow:
                                      "ellipsis",

                                    whiteSpace:
                                      "nowrap",

                                    fontSize: 12,

                                    fontWeight:
                                      550,

                                    color:
                                      "#4B401D",
                                  }}
                                >
                                  {
                                    r.name
                                  }
                                </Typography>
                              </Stack>

                              <Typography
                                sx={{
                                  flexShrink:
                                    0,

                                  fontSize: 12,

                                  fontWeight:
                                    750,

                                  color:
                                    "#3D3214",
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
                  </CollapsibleSection>
                </Grid>

                {/* PAYMENT MODE */}

                <Grid
                  item
                  xs={12}
                  md={6}
                >
                  <CollapsibleSection
                    icon={
                      <PaymentsRoundedIcon
                        sx={{
                          fontSize: 16,
                        }}
                      />
                    }
                    iconBg="rgba(245,158,11,0.16)"
                    iconColor="#D97706"
                    title="By Payment Mode"
                    subtitle="Tap to view how you paid"
                    chipLabel="Breakdown"
                    isEmpty={
                      !summary
                        ?.byMode
                        ?.length
                    }
                    emptyText="No expenses yet this month."
                  >
                    <Stack spacing={0.65}>
                      {summary?.byMode?.map(
                        (m) => (
                          <Box
                            key={m.mode}
                            sx={{
                              p: 1,

                              borderRadius:
                                1.75,

                              bgcolor:
                                "rgba(255,251,225,0.62)",

                              border:
                                "1px solid #F0E6B8",
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
                                  minWidth:
                                    0,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 7,

                                    height: 7,

                                    flexShrink:
                                      0,

                                    borderRadius:
                                      "50%",

                                    bgcolor:
                                      "#EAB308",

                                    boxShadow:
                                      "0 0 0 3px rgba(250,204,21,0.14)",
                                  }}
                                />

                                <Typography
                                  sx={{
                                    fontSize: 12,

                                    fontWeight:
                                      600,

                                    color:
                                      "#4B401D",

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
                                  flexShrink:
                                    0,

                                  fontSize: 12,

                                  fontWeight:
                                    750,

                                  color:
                                    "#3D3214",
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
                  </CollapsibleSection>
                </Grid>
              </Grid>
            </>
          )}
        </Container>

        {/* =====================================================
            QUICK ACTIONS
        ===================================================== */}

        <Box
          sx={{
            position: "sticky",

            bottom: 0,

            bgcolor:
              "rgba(255,253,242,0.94)",

            backdropFilter:
              "blur(14px)",

            borderTop:
              "1px solid #EFE3A8",

            pt: 1.1,

            pb:
              "calc(env(safe-area-inset-bottom, 0px) + 10px)",

            px: {
              xs: 1.25,
              sm: 2,
              md: 3,
            },

            boxShadow:
              "0 -8px 24px rgba(120,96,20,0.06)",
          }}
        >
          <Container
            maxWidth="lg"
            disableGutters
          >
            <Stack
              direction="row"
              spacing={{
                xs: 0.85,
                sm: 1,
              }}
            >
              {/* ADD */}

              <Button
                fullWidth
                variant="contained"
                startIcon={
                  <AddCircleIcon
                    sx={{
                      fontSize: {
                        xs: 18,
                        sm: 19,
                      },
                    }}
                  />
                }
                onClick={() =>
                  router.push(
                    "/expenses/new"
                  )
                }
                sx={{
                  minHeight: {
                    xs: 52,
                    sm: 54,
                  },

                  borderRadius: 2.25,

                  textTransform:
                    "none",

                  fontSize: {
                    xs: 12.5,
                    sm: 13.5,
                  },

                  fontWeight: 700,

                  color: "#422006",

                  background:
                    "linear-gradient(135deg, #FACC15, #EAB308)",

                  boxShadow:
                    "0 6px 16px rgba(234,179,8,0.28)",

                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #EAB308, #CA8A04)",
                  },
                }}
              >
                Add
              </Button>

              {/* EXPENSES */}

              <Button
                fullWidth
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon
                    sx={{
                      fontSize: 17,
                    }}
                  />
                }
                onClick={() =>
                  router.push(
                    "/expenses"
                  )
                }
                sx={{
                  minHeight: {
                    xs: 52,
                    sm: 54,
                  },

                  borderRadius: 2.25,

                  textTransform:
                    "none",

                  fontSize: {
                    xs: 12.5,
                    sm: 13.5,
                  },

                  fontWeight: 700,

                  color: "#9A6B00",

                  borderColor:
                    "#E7D987",

                  background:
                    "rgba(255,255,255,0.72)",

                  "&:hover": {
                    borderColor:
                      "#D6BE45",

                    background:
                      "#FFFBE7",
                  },
                }}
              >
                Expenses
              </Button>

              {/* REMINDERS */}

              <Button
                fullWidth
                variant="outlined"
                endIcon={
                  <ArrowForwardRoundedIcon
                    sx={{
                      fontSize: 17,
                    }}
                  />
                }
                onClick={() =>
                  router.push(
                    "/reminders"
                  )
                }
                sx={{
                  minHeight: {
                    xs: 52,
                    sm: 54,
                  },

                  borderRadius: 2.25,

                  textTransform:
                    "none",

                  fontSize: {
                    xs: 12.5,
                    sm: 13.5,
                  },

                  fontWeight: 700,

                  color: "#756B4B",

                  borderColor:
                    "#DDD5AE",

                  background:
                    "rgba(255,255,255,0.72)",

                  "&:hover": {
                    borderColor:
                      "#CFC28C",

                    background:
                      "#FFFDF2",
                  },
                }}
              >
                Reminders
              </Button>
            </Stack>
          </Container>
        </Box>
      </Box>
    </Box>
  );
}

// =============================================================
// PAGE EXPORT
// =============================================================

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  );
}