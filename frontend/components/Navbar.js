"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AppBar, Toolbar, Typography, IconButton, Box, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Avatar, Divider, Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import GroupIcon from "@mui/icons-material/Group";
import LogoutIcon from "@mui/icons-material/Logout";
import { getStoredUser, clearSession } from "../lib/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: <DashboardIcon /> },
  { label: "Expenses", href: "/expenses", icon: <ReceiptLongIcon /> },
  { label: "Reminders", href: "/reminders", icon: <NotificationsActiveIcon /> },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const user = getStoredUser();

  const items = user?.role === "owner"
    ? [...NAV_ITEMS, { label: "Users", href: "/users", icon: <GroupIcon /> }]
    : NAV_ITEMS;

  const go = (href) => {
    setOpen(false);
    router.push(href);
  };

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: "#7c3aed", background: "linear-gradient(135deg,#7c3aed,#4c1d95)" }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800, fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            💜 Expenses & Reminders
          </Typography>
          {user && (
            <Chip
              size="small"
              avatar={<Avatar sx={{ bgcolor: "rgba(255,255,255,0.25)" }}>{user.name?.[0]?.toUpperCase()}</Avatar>}
              label={user.name}
              sx={{ color: "white", display: { xs: "none", sm: "flex" }, bgcolor: "rgba(255,255,255,0.15)" }}
            />
          )}
          <IconButton color="inherit" onClick={logout} title="Sign out">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2.5, background: "linear-gradient(135deg,#7c3aed,#4c1d95)", color: "white" }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.25)", mb: 1 }}>{user?.name?.[0]?.toUpperCase()}</Avatar>
            <Typography fontWeight={800}>{user?.name}</Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {user?.role === "owner" ? "Owner" : "Member"} · @{user?.username}
            </Typography>
          </Box>
          <List sx={{ py: 1 }}>
            {items.map((item) => (
              <ListItemButton
                key={item.href}
                selected={pathname === item.href}
                onClick={() => go(item.href)}
                sx={{
                  mx: 1, my: 0.3, borderRadius: 2,
                  "&.Mui-selected": { bgcolor: "#f3e8ff", color: "#6d28d9" },
                }}
              >
                <ListItemIcon sx={{ color: pathname === item.href ? "#6d28d9" : "inherit" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List>
            <ListItemButton onClick={logout} sx={{ mx: 1, my: 0.3, borderRadius: 2 }}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Sign out" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
    </>
  );
}
