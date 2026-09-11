
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Box,
  Container,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Button,
  CircularProgress,
  Pagination,
  Chip,
  MenuItem,
  Paper,
  Divider,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import ExpenseCard from "../../components/ExpenseCard";
import api from "../../lib/api";

const MODES = [
  "",
  "PhonePe",
  "Bank Transfer",
  "Cash",
  "Other",
];

function ExpensesInner() {
  const router = useRouter();

  const [expenses, setExpenses] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // =========================================================
  // LOAD EXPENSES
  // =========================================================
  const load = (pageNum = 1) => {
    setLoading(true);

    api
      .get("/expenses", {
        params: {
          page: pageNum,
          limit: 12,
          search,
          mode,
        },
      })
      .then((res) => {
        setExpenses(res.data.expenses || []);

        setTotalAmount(
          res.data.totalAmount || 0
        );

        setTotalPages(
          res.data.pagination?.totalPages || 1
        );

        setPage(
          res.data.pagination?.page || 1
        );
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // =========================================================
  // SEARCH / FILTER
  // =========================================================
  useEffect(() => {
    const t = setTimeout(() => {
      load(1);
    }, 350);

    return () => clearTimeout(t);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mode]);

  // =========================================================
  // DELETE
  // =========================================================
  const handleDelete = async (expense) => {
    if (
      !window.confirm(
        `Delete the ₹${expense.amount} entry for ${expense.recipientName}?`
      )
    ) {
      return;
    }

    await api.delete(
      `/expenses/${expense._id}`
    );

    load(page);
  };

  // =========================================================
  // CLEAR FILTERS
  // =========================================================
  const clearFilters = () => {
    setSearch("");
    setMode("");
    setPage(1);
  };

  const hasFilters =
    search.trim() !== "" || mode !== "";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #FAF9FF 0%, #FFFFFF 45%)",
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
            p: {
              xs: 1.75,
              sm: 2.25,
              md: 2.5,
            },

            mb: 2,

            borderRadius: {
              xs: 2.5,
              sm: 3,
            },

            border:
              "1px solid #EDE9FE",

            background:
              "linear-gradient(135deg, #FFFFFF 0%, #FAF7FF 100%)",

            boxShadow:
              "0 8px 30px rgba(76, 29, 149, 0.06)",
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            justifyContent="space-between"
            alignItems={{
              xs: "stretch",
              sm: "center",
            }}
            spacing={{
              xs: 1.75,
              sm: 2,
            }}
          >
            {/* TITLE */}
            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",

                    borderRadius: 2,

                    background:
                      "linear-gradient(135deg, #7C3AED, #5B21B6)",

                    color: "#FFFFFF",

                    boxShadow:
                      "0 6px 15px rgba(124,58,237,0.2)",
                  }}
                >
                  <ReceiptLongRoundedIcon
                    fontSize="small"
                  />
                </Box>

                <Box sx={{ minWidth: 0 }}>
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

                      whiteSpace: "nowrap",
                    }}
                  >
                    Expenses
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.25,

                      fontSize: {
                        xs: 11.5,
                        sm: 12.5,
                      },

                      color: "#777181",
                    }}
                  >
                    Track and manage your expenses
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* TOTAL + ADD */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent={{
                xs: "space-between",
                sm: "flex-end",
              }}
              spacing={1}
            >
              <Box
                sx={{
                  minWidth: {
                    xs: 0,
                    sm: 125,
                  },

                  px: {
                    xs: 1.25,
                    sm: 1.5,
                  },

                  py: 0.9,

                  borderRadius: 2,

                  backgroundColor: "#F5F3FF",

                  border:
                    "1px solid #E9E2FF",
                }}
              >
                <Typography
                  sx={{
                    fontSize: 9.5,
                    color: "#8A8396",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Total shown
                </Typography>

                <Typography
                  sx={{
                    mt: 0.15,

                    fontSize: {
                      xs: 14,
                      sm: 16,
                    },

                    fontWeight: 800,

                    color: "#5B21B6",

                    whiteSpace: "nowrap",
                  }}
                >
                  ₹
                  {totalAmount.toLocaleString(
                    "en-IN"
                  )}
                </Typography>
              </Box>

              <Button
                variant="contained"
                startIcon={
                  <AddCircleIcon
                    sx={{
                      fontSize: "20px !important",
                    }}
                  />
                }
                onClick={() =>
                  router.push("/expenses/new")
                }
                sx={{
                  minHeight: {
                    xs: 43,
                    sm: 46,
                  },

                  px: {
                    xs: 1.75,
                    sm: 2.25,
                  },

                  borderRadius: 2.25,

                  textTransform: "none",

                  fontWeight: 700,

                  fontSize: {
                    xs: 13,
                    sm: 14,
                  },

                  whiteSpace: "nowrap",

                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",

                  boxShadow:
                    "0 7px 18px rgba(124,58,237,0.22)",

                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)",

                    boxShadow:
                      "0 9px 22px rgba(124,58,237,0.28)",
                  },
                }}
              >
                Add Expense
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* =====================================================
            SEARCH + FILTER
        ===================================================== */}
        <Paper
          elevation={0}
          sx={{
            p: {
              xs: 1.5,
              sm: 1.75,
              md: 2,
            },

            mb: 2.25,

            borderRadius: {
              xs: 2.5,
              sm: 3,
            },

            border:
              "1px solid #E9E7EF",

            backgroundColor: "#FFFFFF",

            boxShadow:
              "0 5px 22px rgba(15,23,42,0.045)",
          }}
        >
          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={1.25}
            alignItems={{
              xs: "stretch",
              sm: "center",
            }}
          >
            {/* SEARCH */}
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name, reason or transaction ID..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      sx={{
                        fontSize: 20,
                        color: "#8B8497",
                      }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 44,

                  borderRadius: 2,

                  backgroundColor: "#FAFAFC",

                  "& fieldset": {
                    borderColor: "#E5E2EA",
                  },

                  "&:hover fieldset": {
                    borderColor: "#C4B5FD",
                  },

                  "&.Mui-focused fieldset": {
                    borderColor: "#7C3AED",
                    borderWidth: 1,
                  },
                },

                "& input": {
                  fontSize: 13,

                  "&::placeholder": {
                    color: "#9A94A6",
                    opacity: 1,
                  },
                },
              }}
            />

            {/* MODE */}
            <TextField
              select
              size="small"
              value={mode}
              onChange={(e) =>
                setMode(e.target.value)
              }
              sx={{
                width: {
                  xs: "100%",
                  sm: 185,
                },

                flexShrink: 0,

                "& .MuiOutlinedInput-root": {
                  minHeight: 44,

                  borderRadius: 2,

                  backgroundColor: "#FAFAFC",

                  "& fieldset": {
                    borderColor: "#E5E2EA",
                  },

                  "&:hover fieldset": {
                    borderColor: "#C4B5FD",
                  },

                  "&.Mui-focused fieldset": {
                    borderColor: "#7C3AED",
                  },
                },

                "& .MuiSelect-select": {
                  fontSize: 13,
                },
              }}
              SelectProps={{
                displayEmpty: true,
              }}
            >
              {MODES.map((m) => (
                <MenuItem
                  key={m || "all"}
                  value={m}
                >
                  {m || "All payment modes"}
                </MenuItem>
              ))}
            </TextField>

            {/* FILTER ICON / LABEL */}
            <Box
              sx={{
                display: {
                  xs: "none",
                  sm: "flex",
                },

                alignItems: "center",

                gap: 0.6,

                px: 1.25,

                color: "#7C3AED",

                whiteSpace: "nowrap",
              }}
            >
              <FilterAltOutlinedIcon
                sx={{ fontSize: 18 }}
              />

              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 650,
                }}
              >
                Filter
              </Typography>
            </Box>

            {/* CLEAR */}
            {hasFilters && (
              <Button
                onClick={clearFilters}
                sx={{
                  minHeight: 40,

                  flexShrink: 0,

                  px: 1.25,

                  borderRadius: 1.75,

                  color: "#6D28D9",

                  textTransform: "none",

                  fontSize: 12,

                  fontWeight: 650,

                  "&:hover": {
                    backgroundColor: "#F5F3FF",
                  },
                }}
              >
                Clear
              </Button>
            )}
          </Stack>

          {/* ACTIVE FILTER */}
          {hasFilters && (
            <Stack
              direction="row"
              spacing={0.75}
              flexWrap="wrap"
              sx={{
                mt: 1.25,
                pt: 1.25,
                borderTop:
                  "1px solid #F0EEF4",
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  color: "#8B8497",
                  alignSelf: "center",
                  mr: 0.25,
                }}
              >
                Active:
              </Typography>

              {search && (
                <Chip
                  label={`Search: ${search}`}
                  size="small"
                  onDelete={() =>
                    setSearch("")
                  }
                  sx={{
                    height: 27,
                    fontSize: 10.5,
                    bgcolor: "#F5F3FF",
                    color: "#6D28D9",
                    border:
                      "1px solid #E9E2FF",
                  }}
                />
              )}

              {mode && (
                <Chip
                  label={mode}
                  size="small"
                  onDelete={() =>
                    setMode("")
                  }
                  sx={{
                    height: 27,
                    fontSize: 10.5,
                    bgcolor: "#F5F3FF",
                    color: "#6D28D9",
                    border:
                      "1px solid #E9E2FF",
                  }}
                />
              )}
            </Stack>
          )}
        </Paper>

        {/* =====================================================
            RESULTS HEADER
        ===================================================== */}
        {!loading && expenses.length > 0 && (
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{
              mb: 1.25,
              px: 0.25,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
            >
              <PaymentsRoundedIcon
                sx={{
                  fontSize: 17,
                  color: "#7C3AED",
                }}
              />

              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#4B4655",
                }}
              >
                Recent expenses
              </Typography>
            </Stack>

            <Typography
              sx={{
                fontSize: 11,
                color: "#96909F",
              }}
            >
              {expenses.length} shown
            </Typography>
          </Stack>
        )}

        {/* =====================================================
            LOADING
        ===================================================== */}
        {loading ? (
          <Paper
            elevation={0}
            sx={{
              minHeight: 300,

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
              size={34}
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
              Loading expenses...
            </Typography>
          </Paper>
        ) : expenses.length === 0 ? (
          /* ===================================================
             EMPTY STATE
          =================================================== */
          <Paper
            elevation={0}
            sx={{
              minHeight: 320,

              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",

              textAlign: "center",

              px: 2,

              borderRadius: 3,

              border:
                "1px dashed #DCD6E8",

              background:
                "linear-gradient(180deg, #FFFFFF 0%, #FBFAFF 100%)",
            }}
          >
            <Box
              sx={{
                width: 68,
                height: 68,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: "50%",

                bgcolor: "#F3EFFF",

                color: "#7C3AED",

                mb: 1.5,
              }}
            >
              <ReceiptLongRoundedIcon
                sx={{
                  fontSize: 32,
                }}
              />
            </Box>

            <Typography
              sx={{
                fontSize: 17,
                fontWeight: 750,
                color: "#27222F",
              }}
            >
              No expenses found
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                maxWidth: 360,
                fontSize: 12,
                lineHeight: 1.6,
                color: "#8B8497",
              }}
            >
              {hasFilters
                ? "Try changing your search or payment mode filter."
                : "Start tracking your expenses by adding your first expense."}
            </Typography>

            {hasFilters ? (
              <Button
                onClick={clearFilters}
                sx={{
                  mt: 2,

                  textTransform: "none",

                  fontWeight: 700,

                  color: "#6D28D9",

                  borderRadius: 2,

                  "&:hover": {
                    backgroundColor: "#F5F3FF",
                  },
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button
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
                  mt: 2,

                  textTransform: "none",

                  fontWeight: 700,

                  borderRadius: 2,

                  background:
                    "linear-gradient(135deg, #7C3AED, #5B21B6)",

                  "&:hover": {
                    background:
                      "linear-gradient(135deg, #6D28D9, #4C1D95)",
                  },
                }}
              >
                Add your first expense
              </Button>
            )}
          </Paper>
        ) : (
          /* ===================================================
             EXPENSE LIST
          =================================================== */
          <Stack
            spacing={{
              xs: 1.25,
              sm: 1.5,
            }}
          >
            {expenses.map((expense) => (
              <ExpenseCard
                key={expense._id}
                expense={expense}
                onEdit={(e) =>
                  router.push(
                    `/expenses/${e._id}`
                  )
                }
                onDelete={handleDelete}
              />
            ))}
          </Stack>
        )}

        {/* =====================================================
            PAGINATION
        ===================================================== */}
        {!loading && totalPages > 1 && (
          <Paper
            elevation={0}
            sx={{
              mt: 2.5,

              py: 1.25,

              display: "flex",
              justifyContent: "center",

              borderRadius: 2.5,

              border:
                "1px solid #EDEAF2",

              backgroundColor: "#FFFFFF",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_event, value) =>
                load(value)
              }
              shape="rounded"
              siblingCount={0}
              boundaryCount={1}
              sx={{
                "& .MuiPaginationItem-root": {
                  minWidth: 34,
                  height: 34,

                  borderRadius: 1.5,

                  fontSize: 12,

                  color: "#5F586B",
                },

                "& .MuiPaginationItem-root.Mui-selected":
                  {
                    color: "#FFFFFF",

                    backgroundColor:
                      "#7C3AED",

                    fontWeight: 700,

                    "&:hover": {
                      backgroundColor:
                        "#6D28D9",
                    },
                  },
              }}
            />
          </Paper>
        )}

        {/* =====================================================
            FOOTER SPACE
        ===================================================== */}
        <Divider
          sx={{
            mt: 3,
            opacity: 0.5,
          }}
        />

        <Typography
          sx={{
            textAlign: "center",

            mt: 1.5,

            mb: 1,

            fontSize: 10,

            color: "#AAA5B3",
          }}
        >
          Expense Reminder • Manage your money smarter
        </Typography>
      </Container>
    </Box>
  );
}

export default function ExpensesPage() {
  return (
    <ProtectedRoute>
      <ExpensesInner />
    </ProtectedRoute>
  );
}
