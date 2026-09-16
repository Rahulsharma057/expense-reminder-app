"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge, IconButton, Menu, MenuItem, Typography, Box, Stack,
  CircularProgress, Divider, Button,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { getSocket } from "../lib/socket";

const PURPLE = "#7C3AED";

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// Drop this in your Navbar, e.g.: <NotificationBell />
// Requires the notificationRoutes.js backend routes to be mounted at
// /api/notifications, and myId to already be logged in.
export default function NotificationBell() {
  const router = useRouter();

  const [anchor, setAnchor] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const socketRef = useRef(null);

  const loadUnreadCount = async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      setUnreadCount(response.data?.count || 0);
    } catch {
      // Silent — the badge just won't update this cycle.
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notifications?limit=20");
      setNotifications(response.data?.notifications || []);
      setUnreadCount(response.data?.unreadCount || 0);
      setLoaded(true);
    } catch {
      // Keep whatever was there before on failure.
    } finally {
      setLoading(false);
    }
  };

  // Poll once on mount so the badge is right even before any socket
  // event arrives, and keep a slow fallback poll in case the socket
  // connection drops silently.
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Live updates: every "notification" socket event (already emitted
  // by taskController/messageController for every notification type)
  // bumps the badge instantly without waiting for the next poll.
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onNotification = () => {
      setUnreadCount((count) => count + 1);
      // If the dropdown is currently open, refresh the list too.
      if (anchor) loadNotifications();
    };

    socket.on("notification", onNotification);
    return () => socket.off("notification", onNotification);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const openMenu = (event) => {
    setAnchor(event.currentTarget);
    if (!loaded) loadNotifications();
    else loadNotifications(); // always refresh on open — cheap call
  };

  const closeMenu = () => setAnchor(null);

  const markAllRead = async () => {
    setNotifications((previous) => previous.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      loadNotifications();
    }
  };

  const openNotification = async (notification) => {
    if (!notification.read) {
      setNotifications((previous) =>
        previous.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
      api.patch(`/notifications/${notification._id}/read`).catch(() => {});
    }

    closeMenu();

    if (notification.task?._id) {
      router.push(`/tasks?open=${notification.task._id}`);
    }
  };

  return (
    <>
      {/* color: "inherit" picks up whatever color the parent sets —
          works on the purple navbar (white) and anywhere else (dark). */}
      <IconButton onClick={openMenu} sx={{ color: "inherit" }}>
        <Badge
          badgeContent={unreadCount}
          max={99}
          sx={{ "& .MuiBadge-badge": { bgcolor: PURPLE, color: "#fff", fontWeight: 700 } }}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={closeMenu}
        PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 3, mt: 1 } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.2 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>Notifications</Typography>

          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 15 }} />}
              onClick={markAllRead}
              sx={{ textTransform: "none", fontSize: 11.5, fontWeight: 700, color: PURPLE }}
            >
              Mark all read
            </Button>
          )}
        </Stack>

        <Divider />

        {loading && !notifications.length ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress size={22} sx={{ color: PURPLE }} />
          </Stack>
        ) : !notifications.length ? (
          <Stack alignItems="center" sx={{ py: 5, px: 2 }}>
            <NotificationsIcon sx={{ fontSize: 34, color: "#D8D1E5", mb: 1 }} />
            <Typography sx={{ fontSize: 13, color: "#948DA0" }}>
              You&apos;re all caught up
            </Typography>
          </Stack>
        ) : (
          notifications.map((notification) => (
            <MenuItem
              key={notification._id}
              onClick={() => openNotification(notification)}
              sx={{
                whiteSpace: "normal",
                alignItems: "flex-start",
                py: 1.2,
                px: 2,
                bgcolor: notification.read ? "transparent" : "#F7F3FF",
                borderLeft: notification.read ? "3px solid transparent" : `3px solid ${PURPLE}`,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: notification.read ? 600 : 800 }}>
                  {notification.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11.5, color: "#6F6880", mt: 0.2,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}
                >
                  {notification.message}
                </Typography>
                <Typography sx={{ fontSize: 10, color: "#A79FB5", mt: 0.4 }}>
                  {timeAgo(notification.createdAt)}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </>
  );
}