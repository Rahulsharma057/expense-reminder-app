"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  CircularProgress,
  InputAdornment,
  TextField,
} from "@mui/material";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ChecklistRtlRoundedIcon from "@mui/icons-material/ChecklistRtlRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import HandshakeRoundedIcon from "@mui/icons-material/HandshakeRounded";
import VideocamRoundedIcon from "@mui/icons-material/VideocamRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import StickyNote2RoundedIcon from "@mui/icons-material/StickyNote2Rounded";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import TrackChangesRoundedIcon from "@mui/icons-material/TrackChangesRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import CelebrationRoundedIcon from "@mui/icons-material/CelebrationRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
// NOTE: NotificationsActiveRoundedIcon was previously imported TWICE in
// this file (once here, once further down near AutoAwesomeRoundedIcon).
// That's a duplicate-identifier error that fails the build outright —
// removed the second one. Both "Reminders" and "Random Msgs" below
// reuse this single import, which is fine; a component can be used in
// more than one place from one import.

import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";

import { getStoredUser, clearSession } from "../lib/auth";
// FIXED: the file is components/NotificationBell.jsx (capital N, capital
// B). The import here was "./Notificationbell" — wrong case. That loads
// fine on Windows/Mac (case-insensitive filesystems) but 404s on Linux/
// Vercel builds, which are case-sensitive. This is almost certainly why
// production was broken even though it worked locally.
import NotificationBell from "./NotificationBell";
import { uploadMyAvatar } from "../lib/userApi";

/* =========================================================
   NAV STRUCTURE
   Grouped into sections instead of one 18-item flat list — with
   this many destinations, a flat list makes the drawer a long,
   directionless scroll on a phone. Grouping plus the search box
   below are what "responsive" means here: the same information,
   organized so it's still fast to use at 360px wide.
========================================================= */

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <DashboardRoundedIcon /> },
    ],
  },
  {
    title: "Work",
    items: [
      { label: "Tasks", href: "/tasks", icon: <ChecklistRtlRoundedIcon /> },
      { label: "Checklists", href: "/checklists", icon: <PlaylistAddCheckRoundedIcon /> },
      { label: "Meetings", href: "/meetings", icon: <VideocamRoundedIcon /> },
      { label: "Appointments", href: "/appointments", icon: <EventRoundedIcon /> },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Expenses", href: "/expenses", icon: <ReceiptLongRoundedIcon /> },
      { label: "Reminders", href: "/reminders", icon: <NotificationsActiveRoundedIcon /> },
      { label: "Udhaar Khata", href: "/udhaar", icon: <HandshakeRoundedIcon /> },
      { label: "Shopping", href: "/shopping", icon: <ShoppingCartRoundedIcon /> },
    ],
  },
  {
    title: "Personal Growth",
    items: [
      { label: "Goals", href: "/goals", icon: <EmojiEventsRoundedIcon /> },
      { label: "Habits", href: "/habits", icon: <TrackChangesRoundedIcon /> },
      { label: "Notes", href: "/notes", icon: <StickyNote2RoundedIcon /> },
      { label: "Mistakes", href: "/mistakes", icon: <ReportProblemRoundedIcon /> },
      { label: "Good & Bad", href: "/good-bad", icon: <AutoAwesomeRoundedIcon /> },
      { label: "Random Msgs", href: "/random-messages", icon: <NotificationsActiveRoundedIcon /> },
    ],
  },
  {
    title: "HR & Events",
    items: [
      { label: "Recruitment", href: "/recruitment", icon: <WorkOutlineRoundedIcon /> },
      { label: "Events", href: "/events", icon: <CelebrationRoundedIcon /> },
    ],
  },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  // =========================================================
  // DRAWER STATE
  // =========================================================
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navFilter, setNavFilter] = useState("");

  // =========================================================
  // USER STATE
  // =========================================================
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = getStoredUser();
    setUser(storedUser);
  }, []);

  // Reset the search box each time the drawer opens/closes so it
  // doesn't silently stay filtered next time.
  useEffect(() => {
    if (!drawerOpen) setNavFilter("");
  }, [drawerOpen]);

  // =========================================================
  // PROFILE PHOTO UPLOAD
  // =========================================================
  const avatarInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be under 4MB");
      return;
    }

    try {
      setAvatarUploading(true);
      const response = await uploadMyAvatar(file);

      const updatedUser = { ...user, ...response.data };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);

      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not update photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  // =========================================================
  // NAVIGATION ITEMS (grouped + role-gated "Users" section)
  // =========================================================

  const navGroups = useMemo(() => {
    const groups = NAV_GROUPS.map((group) => ({ ...group, items: [...group.items] }));

    // Owner AND superadmin both manage users — superadmin needs the
    // same "Users" screen to create owners, deactivate accounts, etc.
    if (user?.role === "owner" || user?.role === "superadmin") {
      groups.push({
        title: "Admin",
        items: [{ label: "Users", href: "/users", icon: <PeopleRoundedIcon /> }],
      });
    }

    return groups;
  }, [user?.role]);

  // Filters within groups by label, case-insensitive, and drops any
  // group that ends up empty — this is what keeps an 18+ item drawer
  // fast to use on a small screen instead of a long blind scroll.
  const filteredGroups = useMemo(() => {
    const query = navFilter.trim().toLowerCase();
    if (!query) return navGroups;

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(query)),
      }))
      .filter((group) => group.items.length > 0);
  }, [navGroups, navFilter]);

  // =========================================================
  // ACTIVE ROUTE
  // =========================================================
  const isActive = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
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

  const userName = user?.name?.trim() || user?.username?.trim() || "User";

  const userRole =
    user?.role === "owner" ? "Owner" : user?.role === "superadmin" ? "Superadmin" : "Member";

  return (
    <>
      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #5B21B6 100%)",
          boxShadow: "0 4px 18px rgba(76, 29, 149, 0.18)",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 60, sm: 66, md: 70 },
            // Slightly tighter horizontal padding at the very smallest
            // width so menu + brand + bell + avatar all still fit
            // without the toolbar itself needing to scroll.
            px: { xs: 0.75, sm: 2, md: 3 },
            gap: { xs: 0.5, sm: 1.5 },
          }}
        >
          {/* =================================================
              MENU BUTTON
          ================================================= */}
          <IconButton
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            sx={{
              width: { xs: 38, sm: 42 },
              height: { xs: 38, sm: 42 },
              flexShrink: 0,
              color: "#FFFFFF",
              borderRadius: 2,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
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
              gap: { xs: 0.6, sm: 1 },
              minWidth: 0,
              flex: 1,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Box
              sx={{
                width: { xs: 32, sm: 38 },
                height: { xs: 32, sm: 38 },
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <AccountBalanceWalletRoundedIcon sx={{ fontSize: { xs: 18, sm: 22 }, color: "#FFFFFF" }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#FFFFFF",
                  fontSize: { xs: 13, sm: 16, md: 17 },
                  lineHeight: 1.2,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Expense Reminder
              </Typography>

              {/* Subtitle drops out earlier (at 'sm' instead of only
                  'xs') to free up room for the bell + avatar on
                  narrow-but-not-tiny phones (~375-410px), where the
                  full row was tightest. */}
              <Typography
                sx={{
                  display: { xs: "none", md: "block" },
                  mt: 0.2,
                  color: "rgba(255,255,255,0.72)",
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
              NOTIFICATION BELL — visible on every breakpoint,
              it's the one thing worth reaching without opening
              the drawer.
          ================================================= */}
          <Box sx={{ flexShrink: 0, color: "#FFFFFF" }}>
            <NotificationBell />
          </Box>

          {/* =================================================
              DESKTOP USER PROFILE
          ================================================= */}
          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
              maxWidth: { sm: 220, md: 280 },
            }}
          >
            <Tooltip title="Change profile photo">
              <Box
                onClick={handleAvatarPick}
                sx={{
                  position: "relative",
                  cursor: "pointer",
                  flexShrink: 0,
                  "&:hover .avatar-camera-badge": { opacity: 1 },
                }}
              >
                <Avatar
                  src={user?.avatarUrl || undefined}
                  sx={{
                    width: { sm: 38, md: 40 },
                    height: { sm: 38, md: 40 },
                    bgcolor: "#FFFFFF",
                    color: "#6D28D9",
                    fontSize: 14,
                    fontWeight: 800,
                  }}
                >
                  {userInitial}
                </Avatar>

                {avatarUploading ? (
                  <Box
                    sx={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.45)",
                    }}
                  >
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                  </Box>
                ) : (
                  <Box
                    className="avatar-camera-badge"
                    sx={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.45)", opacity: 0, transition: "opacity 0.15s",
                    }}
                  >
                    <PhotoCameraRoundedIcon sx={{ fontSize: 16, color: "#fff" }} />
                  </Box>
                )}
              </Box>
            </Tooltip>

            <Box sx={{ minWidth: 0 }}>
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
                  color: "rgba(255,255,255,0.7)",
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
                display: { xs: "none", sm: "flex" },
                width: 40,
                height: 40,
                flexShrink: 0,
                ml: { sm: 0.5, md: 1 },
                color: "#FFFFFF",
                borderRadius: 2,
                "&:hover": { backgroundColor: "rgba(255,255,255,0.12)" },
              }}
            >
              <LogoutRoundedIcon fontSize="small" />
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
        ModalProps={{ keepMounted: true }}
        sx={{
          "& .MuiDrawer-paper": {
            width: { xs: "calc(100vw - 24px)", sm: 310 },
            maxWidth: 310,
            top: { xs: 60, sm: 66, md: 70 },
            height: { xs: "calc(100dvh - 60px)", sm: "calc(100dvh - 66px)", md: "calc(100dvh - 70px)" },
            boxSizing: "border-box",
            overflow: "hidden",
            border: "none",
            borderTopRightRadius: { xs: 18, sm: 20 },
            borderBottomRightRadius: { xs: 18, sm: 20 },
            backgroundColor: "#FFFFFF",
            boxShadow: "8px 0 30px rgba(15, 23, 42, 0.14)",
          },
        }}
      >
        <Box sx={{ width: "100%", height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* =================================================
              PROFILE HEADER
          ================================================= */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.75, sm: 2 },
              py: { xs: 1.75, sm: 2 },
              background: "linear-gradient(135deg, #F8F5FF 0%, #FFFFFF 100%)",
              borderBottom: "1px solid #EEF0F4",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <Tooltip title="Change profile photo">
                <Box
                  onClick={handleAvatarPick}
                  sx={{ position: "relative", cursor: "pointer", flexShrink: 0, "&:hover .avatar-camera-badge-2": { opacity: 1 } }}
                >
                  <Avatar
                    src={user?.avatarUrl || undefined}
                    sx={{
                      width: { xs: 44, sm: 46 },
                      height: { xs: 44, sm: 46 },
                      bgcolor: "#7C3AED",
                      color: "#FFFFFF",
                      fontSize: 17,
                      fontWeight: 800,
                      boxShadow: "0 6px 16px rgba(124,58,237,0.25)",
                    }}
                  >
                    {userInitial}
                  </Avatar>

                  {avatarUploading ? (
                    <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.45)" }}>
                      <CircularProgress size={17} sx={{ color: "#fff" }} />
                    </Box>
                  ) : (
                    <Box
                      className="avatar-camera-badge-2"
                      sx={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.45)", opacity: 0, transition: "opacity 0.15s" }}
                    >
                      <PhotoCameraRoundedIcon sx={{ fontSize: 17, color: "#fff" }} />
                    </Box>
                  )}
                </Box>
              </Tooltip>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    color: "#17151F",
                    fontSize: { xs: 14, sm: 15 },
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
                    mt: 0.6, height: 22, fontSize: 10.5, fontWeight: 700, textTransform: "capitalize",
                    bgcolor: "#F0E9FF", color: "#6D28D9", "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Box>

              <IconButton
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                sx={{
                  width: 34, height: 34, flexShrink: 0, color: "#777181", borderRadius: 1.75,
                  "&:hover": { backgroundColor: "#F5F3F8", color: "#5B21B6" },
                }}
              >
                <Typography component="span" sx={{ fontSize: 20, lineHeight: 1, fontWeight: 400 }}>×</Typography>
              </IconButton>
            </Box>
          </Box>

          {/* =================================================
              SEARCH — with 18+ destinations now, a quick filter
              is what actually keeps this usable one-handed on a
              phone instead of a long blind scroll.
          ================================================= */}
          <Box sx={{ flexShrink: 0, px: { xs: 1.5, sm: 2 }, pt: 1.5, pb: 0.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search menu..."
              value={navFilter}
              onChange={(event) => setNavFilter(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon sx={{ fontSize: 18, color: "#A9A2B5" }} />
                  </InputAdornment>
                ),
                endAdornment: navFilter ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setNavFilter("")} sx={{ p: 0.3 }}>
                      <CloseRoundedIcon sx={{ fontSize: 16, color: "#A9A2B5" }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5, bgcolor: "#FAF9FC", fontSize: 13.5 } }}
            />
          </Box>

          {/* =================================================
              SCROLLABLE MENU AREA — grouped sections
          ================================================= */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              px: { xs: 1.25, sm: 1.5 },
              py: 1,
              "&::-webkit-scrollbar": { width: 5 },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "#D8D2E8", borderRadius: 10 },
              "&::-webkit-scrollbar-thumb:hover": { backgroundColor: "#B8AED0" },
            }}
          >
            {filteredGroups.length === 0 ? (
              <Typography sx={{ px: 1, py: 3, textAlign: "center", fontSize: 13, color: "#9A94A6" }}>
                No matches for &quot;{navFilter}&quot;
              </Typography>
            ) : (
              filteredGroups.map((group, groupIndex) => (
                <Box key={group.title} sx={{ mb: groupIndex === filteredGroups.length - 1 ? 0 : 1.5 }}>
                  <Typography
                    sx={{
                      px: 1, mb: 0.7, mt: groupIndex === 0 ? 0 : 0.5,
                      color: "#9A94A6", fontSize: 10, fontWeight: 800,
                      textTransform: "uppercase", letterSpacing: 0.9,
                    }}
                  >
                    {group.title}
                  </Typography>

                  <List disablePadding sx={{ width: "100%" }}>
                    {group.items.map((item) => {
                      const active = isActive(item.href);

                      return (
                        <ListItemButton
                          key={item.href}
                          onClick={() => go(item.href)}
                          sx={{
                            width: "100%",
                            minHeight: { xs: 44, sm: 46 },
                            mb: 0.4,
                            px: 1.25,
                            borderRadius: 2,
                            color: active ? "#6D28D9" : "#4B4655",
                            backgroundColor: active ? "#F1EBFF" : "transparent",
                            position: "relative",
                            overflow: "hidden",
                            "&::before": active
                              ? {
                                  content: '""', position: "absolute", left: 0, top: "20%",
                                  width: 3, height: "60%", borderRadius: 5, backgroundColor: "#7C3AED",
                                }
                              : {},
                            "&:hover": { backgroundColor: active ? "#F1EBFF" : "#F8F6FC" },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: { xs: 36, sm: 38 }, color: active ? "#7C3AED" : "#777181", transition: "color 0.2s ease" }}>
                            {React.cloneElement(item.icon, { fontSize: "small" })}
                          </ListItemIcon>

                          <ListItemText
                            primary={item.label}
                            primaryTypographyProps={{
                              fontSize: { xs: 13, sm: 13.5 },
                              fontWeight: active ? 700 : 550,
                              noWrap: true,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Box>
              ))
            )}
          </Box>

          {/* =================================================
              BOTTOM ACCOUNT SECTION
          ================================================= */}
          <Box
            sx={{
              flexShrink: 0,
              px: { xs: 1.25, sm: 1.5 },
              pt: 1.25,
              pb: { xs: 1.5, sm: 1.75 },
              borderTop: "1px solid #EEF0F4",
              backgroundColor: "#FFFFFF",
              boxShadow: "0 -5px 15px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography sx={{ px: 1, mb: 0.75, color: "#9A94A6", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.9 }}>
              Account
            </Typography>

            <ListItemButton
              onClick={logout}
              sx={{ minHeight: 44, px: 1.25, borderRadius: 2, color: "#DC2626", "&:hover": { backgroundColor: "#FEF2F2" } }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: "#DC2626" }}>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: 14, fontWeight: 650, noWrap: true }} />
            </ListItemButton>

            <Typography sx={{ mt: 1.1, textAlign: "center", color: "#AAA5B3", fontSize: 10, fontWeight: 500 }}>
              Expense Reminder
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Shared hidden input for both avatar-click targets above. */}
      <input type="file" accept="image/*" hidden ref={avatarInputRef} onChange={handleAvatarChange} />
    </>
  );
}