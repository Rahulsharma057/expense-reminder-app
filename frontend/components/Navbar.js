"use client";

import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Divider,
  Tooltip,
} from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ChecklistRtlRoundedIcon from "@mui/icons-material/ChecklistRtlRounded";

import { usePathname, useRouter } from "next/navigation";

import { getStoredUser, clearSession } from "../lib/auth";

import NotificationBell from "./Notificationbell";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // =========================================================
  // DRAWER STATE
  // =========================================================
  const [drawerOpen, setDrawerOpen] = useState(false);

  // =========================================================
  // USER STATE
  // =========================================================
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
  }, []);

  // =========================================================
  // NAVIGATION ITEMS
  // =========================================================
  const NAV_ITEMS = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <DashboardRoundedIcon />,
    },
    {
      label: "Tasks",
      href: "/tasks",
      icon: <ChecklistRtlRoundedIcon />,
    },
    {
      label: "Expenses",
      href: "/expenses",
      icon: <ReceiptLongRoundedIcon />,
    },
  
    {
      label: "Reminders",
      href: "/reminders",
      icon: <NotificationsActiveRoundedIcon />,
    },
          {
      label: "Udhaar Khata",
      href: "/udhaar",
      icon: <ChecklistRtlRoundedIcon />,
    },
        {
      label: "Meetings",
      href: "/meetings",
      icon: <ChecklistRtlRoundedIcon />,
    },
  ];

  // Owner AND superadmin both manage users now — superadmin needs the
  // same "Users" screen to create owners, deactivate accounts, etc.
  if (user?.role === "owner" || user?.role === "superadmin") {
    NAV_ITEMS.push({
      label: "Users",
      href: "/users",
      icon: <PeopleRoundedIcon />,
    });
  }

  // =========================================================
  // ACTIVE ROUTE
  // =========================================================
  const isActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return (
      pathname === href ||
      pathname.startsWith(`${href}/`)
    );
  };

  // =========================================================
  // NAVIGATION
  // =========================================================
  const go = (href) => {
    setDrawerOpen(false);
    router.push(href);
  };

  // =========================================================
  // LOGOUT
  // =========================================================
  const logout = () => {
    setDrawerOpen(false);
    clearSession();
    router.replace("/login");
  };

  // =========================================================
  // USER INITIAL
  // =========================================================
  const userInitial =
    user?.name?.trim()?.[0]?.toUpperCase() ||
    user?.username?.trim()?.[0]?.toUpperCase() ||
    "U";

  const userName =
    user?.name?.trim() ||
    user?.username?.trim() ||
    "User";

  const userRole =
    user?.role === "owner"
      ? "Owner"
      : user?.role === "superadmin"
      ? "Superadmin"
      : "Member";

  return (
    <>
      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background:
            "linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #5B21B6 100%)",

          boxShadow:
            "0 4px 18px rgba(76, 29, 149, 0.18)",

          zIndex: (theme) =>
            theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: {
              xs: 60,
              sm: 66,
              md: 70,
            },

            px: {
              xs: 1,
              sm: 2,
              md: 3,
            },

            gap: {
              xs: 1,
              sm: 1.5,
            },
          }}
        >
          {/* =================================================
              MENU BUTTON
          ================================================= */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            sx={{
              width: {
                xs: 40,
                sm: 42,
              },

              height: {
                xs: 40,
                sm: 42,
              },

              flexShrink: 0,

              color: "#FFFFFF",

              borderRadius: 2,

              "&:hover": {
                backgroundColor:
                  "rgba(255,255,255,0.12)",
              },
            }}
          >
            <MenuRoundedIcon />
          </IconButton>

          {/* =================================================
              BRAND
          ================================================= */}
          <Box
            onClick={() => go("/dashboard")}
            sx={{
              display: "flex",
              alignItems: "center",

              gap: {
                xs: 0.75,
                sm: 1,
              },

              minWidth: 0,
              flex: 1,

              cursor: "pointer",

              userSelect: "none",
            }}
          >
            <Box
              sx={{
                width: {
                  xs: 34,
                  sm: 38,
                },

                height: {
                  xs: 34,
                  sm: 38,
                },

                flexShrink: 0,

                display: "flex",
                alignItems: "center",
                justifyContent: "center",

                borderRadius: 2,

                backgroundColor:
                  "rgba(255,255,255,0.16)",

                border:
                  "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <AccountBalanceWalletRoundedIcon
                sx={{
                  fontSize: {
                    xs: 20,
                    sm: 22,
                  },

                  color: "#FFFFFF",
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
                  color: "#FFFFFF",

                  fontSize: {
                    xs: 14,
                    sm: 16,
                    md: 17,
                  },

                  lineHeight: 1.2,

                  fontWeight: 800,

                  whiteSpace: "nowrap",

                  overflow: "hidden",

                  textOverflow: "ellipsis",
                }}
              >
                Expense Reminder
              </Typography>

              <Typography
                sx={{
                  display: {
                    xs: "none",
                    sm: "block",
                  },

                  mt: 0.2,

                  color:
                    "rgba(255,255,255,0.72)",

                  fontSize: 10.5,

                  fontWeight: 500,

                  whiteSpace: "nowrap",

                  overflow: "hidden",

                  textOverflow: "ellipsis",
                }}
              >
                Manage your expenses smartly
              </Typography>
            </Box>
          </Box>

          {/* =================================================
              NOTIFICATION BELL
              Visible on every breakpoint — it's the one thing
              worth reaching without opening the drawer.
          ================================================= */}
          <Box sx={{ flexShrink: 0, color: "#FFFFFF" }}>
            <NotificationBell />
          </Box>

          {/* =================================================
              DESKTOP USER PROFILE
          ================================================= */}
          <Box
            sx={{
              display: {
                xs: "none",
                sm: "flex",
              },

              alignItems: "center",

              gap: 1,

              flexShrink: 0,

              maxWidth: {
                sm: 220,
                md: 280,
              },
            }}
          >
            <Avatar
              sx={{
                width: {
                  sm: 38,
                  md: 40,
                },

                height: {
                  sm: 38,
                  md: 40,
                },

                bgcolor: "#FFFFFF",

                color: "#6D28D9",

                fontSize: 14,

                fontWeight: 800,

                flexShrink: 0,
              }}
            >
              {userInitial}
            </Avatar>

            <Box
              sx={{
                minWidth: 0,
              }}
            >
              <Typography
                sx={{
                  color: "#FFFFFF",

                  fontSize: 13,

                  fontWeight: 700,

                  whiteSpace: "nowrap",

                  overflow: "hidden",

                  textOverflow: "ellipsis",
                }}
              >
                {userName}
              </Typography>

              <Typography
                sx={{
                  color:
                    "rgba(255,255,255,0.7)",

                  fontSize: 10.5,

                  textTransform: "capitalize",

                  whiteSpace: "nowrap",
                }}
              >
                {userRole}
              </Typography>
            </Box>
          </Box>

          {/* =================================================
              DESKTOP LOGOUT
          ================================================= */}
          <Tooltip title="Sign out">
            <IconButton
              onClick={logout}
              sx={{
                display: {
                  xs: "none",
                  sm: "flex",
                },

                width: 40,
                height: 40,

                flexShrink: 0,

                ml: {
                  sm: 0.5,
                  md: 1,
                },

                color: "#FFFFFF",

                borderRadius: 2,

                "&:hover": {
                  backgroundColor:
                    "rgba(255,255,255,0.12)",
                },
              }}
            >
              <LogoutRoundedIcon
                fontSize="small"
              />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* =====================================================
          MOBILE / SIDEBAR DRAWER
      ===================================================== */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          "& .MuiDrawer-paper": {
            width: {
              xs: "calc(100vw - 24px)",
              sm: 310,
            },

            maxWidth: 310,

            /*
             * IMPORTANT:
             * Drawer navbar ke neeche se start hoga.
             */
            top: {
              xs: 60,
              sm: 66,
              md: 70,
            },

            /*
             * Remaining viewport height only.
             */
            height: {
              xs: "calc(100dvh - 60px)",
              sm: "calc(100dvh - 66px)",
              md: "calc(100dvh - 70px)",
            },

            boxSizing: "border-box",

            overflow: "hidden",

            border: "none",

            borderTopRightRadius: {
              xs: 18,
              sm: 20,
            },

            borderBottomRightRadius: {
              xs: 18,
              sm: 20,
            },

            backgroundColor: "#FFFFFF",

            boxShadow:
              "8px 0 30px rgba(15, 23, 42, 0.14)",
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",

            minHeight: 0,

            display: "flex",
            flexDirection: "column",

            overflow: "hidden",
          }}
        >
          {/* =================================================
              PROFILE HEADER
          ================================================= */}
          <Box
            sx={{
              flexShrink: 0,

              px: {
                xs: 1.75,
                sm: 2,
              },

              py: {
                xs: 1.75,
                sm: 2,
              },

              background:
                "linear-gradient(135deg, #F8F5FF 0%, #FFFFFF 100%)",

              borderBottom:
                "1px solid #EEF0F4",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",

                gap: 1.25,

                minWidth: 0,
              }}
            >
              {/* Avatar */}
              <Avatar
                sx={{
                  width: {
                    xs: 44,
                    sm: 46,
                  },

                  height: {
                    xs: 44,
                    sm: 46,
                  },

                  flexShrink: 0,

                  bgcolor: "#7C3AED",

                  color: "#FFFFFF",

                  fontSize: 17,

                  fontWeight: 800,

                  boxShadow:
                    "0 6px 16px rgba(124,58,237,0.25)",
                }}
              >
                {userInitial}
              </Avatar>

              {/* User information */}
              <Box
                sx={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <Typography
                  sx={{
                    color: "#17151F",

                    fontSize: {
                      xs: 14,
                      sm: 15,
                    },

                    fontWeight: 750,

                    lineHeight: 1.3,

                    whiteSpace: "nowrap",

                    overflow: "hidden",

                    textOverflow: "ellipsis",
                  }}
                >
                  {userName}
                </Typography>

                <Chip
                  label={userRole}
                  size="small"
                  sx={{
                    mt: 0.6,

                    height: 22,

                    fontSize: 10.5,

                    fontWeight: 700,

                    textTransform: "capitalize",

                    bgcolor: "#F0E9FF",

                    color: "#6D28D9",

                    "& .MuiChip-label": {
                      px: 1,
                    },
                  }}
                />
              </Box>

              {/* Close button */}
              <IconButton
                onClick={() =>
                  setDrawerOpen(false)
                }
                aria-label="Close menu"
                sx={{
                  width: 34,
                  height: 34,

                  flexShrink: 0,

                  color: "#777181",

                  borderRadius: 1.75,

                  "&:hover": {
                    backgroundColor: "#F5F3F8",
                    color: "#5B21B6",
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontSize: 20,
                    lineHeight: 1,
                    fontWeight: 400,
                  }}
                >
                  ×
                </Typography>
              </IconButton>
            </Box>
          </Box>

          {/* =================================================
              SCROLLABLE MENU AREA
          ================================================= */}
          <Box
            sx={{
              flex: 1,

              minHeight: 0,

              overflowY: "auto",
              overflowX: "hidden",

              px: {
                xs: 1.25,
                sm: 1.5,
              },

              py: 1.5,

              /*
               * Custom scrollbar
               */
              "&::-webkit-scrollbar": {
                width: 5,
              },

              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },

              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#D8D2E8",
                borderRadius: 10,
              },

              "&::-webkit-scrollbar-thumb:hover": {
                backgroundColor: "#B8AED0",
              },
            }}
          >
            <Typography
              sx={{
                px: 1,

                mb: 1,

                color: "#9A94A6",

                fontSize: 10,

                fontWeight: 800,

                textTransform: "uppercase",

                letterSpacing: 0.9,
              }}
            >
              Main Menu
            </Typography>

            <List
              disablePadding
              sx={{
                width: "100%",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = isActive(
                  item.href
                );

                return (
                  <ListItemButton
                    key={item.href}
                    onClick={() =>
                      go(item.href)
                    }
                    sx={{
                      width: "100%",

                      minHeight: {
                        xs: 46,
                        sm: 48,
                      },

                      mb: 0.6,

                      px: 1.25,

                      borderRadius: 2,

                      color: active
                        ? "#6D28D9"
                        : "#4B4655",

                      backgroundColor: active
                        ? "#F1EBFF"
                        : "transparent",

                      position: "relative",

                      overflow: "hidden",

                      "&::before": active
                        ? {
                            content: '""',

                            position:
                              "absolute",

                            left: 0,

                            top: "20%",

                            width: 3,

                            height: "60%",

                            borderRadius: 5,

                            backgroundColor:
                              "#7C3AED",
                          }
                        : {},

                      "&:hover": {
                        backgroundColor: active
                          ? "#F1EBFF"
                          : "#F8F6FC",
                      },

                      transition:
                        "all 0.2s ease",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: {
                          xs: 38,
                          sm: 40,
                        },

                        color: active
                          ? "#7C3AED"
                          : "#777181",

                        transition:
                          "color 0.2s ease",
                      }}
                    >
                      {React.cloneElement(
                        item.icon,
                        {
                          fontSize: "small",
                        }
                      )}
                    </ListItemIcon>

                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: {
                          xs: 13.5,
                          sm: 14,
                        },

                        fontWeight: active
                          ? 700
                          : 550,

                        noWrap: true,

                        overflow: "hidden",

                        textOverflow:
                          "ellipsis",
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>

          {/* =================================================
              BOTTOM ACCOUNT SECTION
          ================================================= */}
          <Box
            sx={{
              flexShrink: 0,

              px: {
                xs: 1.25,
                sm: 1.5,
              },

              pt: 1.25,

              pb: {
                xs: 1.5,
                sm: 1.75,
              },

              borderTop:
                "1px solid #EEF0F4",

              backgroundColor: "#FFFFFF",

              boxShadow:
                "0 -5px 15px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography
              sx={{
                px: 1,

                mb: 0.75,

                color: "#9A94A6",

                fontSize: 10,

                fontWeight: 800,

                textTransform: "uppercase",

                letterSpacing: 0.9,
              }}
            >
              Account
            </Typography>

            {/* Logout */}
            <ListItemButton
              onClick={logout}
              sx={{
                minHeight: 44,

                px: 1.25,

                borderRadius: 2,

                color: "#DC2626",

                "&:hover": {
                  backgroundColor: "#FEF2F2",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,

                  color: "#DC2626",
                }}
              >
                <LogoutRoundedIcon
                  fontSize="small"
                />
              </ListItemIcon>

              <ListItemText
                primary="Sign out"
                primaryTypographyProps={{
                  fontSize: 14,

                  fontWeight: 650,

                  noWrap: true,
                }}
              />
            </ListItemButton>

            <Typography
              sx={{
                mt: 1.1,

                textAlign: "center",

                color: "#AAA5B3",

                fontSize: 10,

                fontWeight: 500,
              }}
            >
              Expense Reminder
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}