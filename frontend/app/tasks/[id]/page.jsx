"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Box, Container, Typography, Paper, Stack, TextField, IconButton, Chip,
  CircularProgress, Alert, Avatar, AvatarGroup, Select, MenuItem, Menu,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/PhotoCamera";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import CelebrationIcon from "@mui/icons-material/Celebration";
import ProtectedRoute from "../../../components/ProtectedRoute";
import Navbar from "../../../components/Navbar";
import api from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import { getStoredUser } from "../../../lib/auth";

// Photos are stored on Cloudinary, so msg.photoUrl is already a full,
// ready-to-use https URL — no origin prefix needed.

const PALETTE = ["#0ea5e9", "#16a34a", "#f97316", "#db2777", "#7c3aed", "#0d9488", "#ca8a04"];
const colorForSender = (id) => {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

const WALLPAPERS = {
  default: { label: "Lavender", bg: "linear-gradient(180deg, #f7f5fc, #efe9fb)" },
  doodle: { label: "Soft grid", bg: "repeating-linear-gradient(45deg, #f5f2fb, #f5f2fb 10px, #ece6f8 10px, #ece6f8 20px)" },
  mint: { label: "Mint", bg: "linear-gradient(180deg,#eafaf4,#dcf3ea)" },
  dark: { label: "Dark", bg: "linear-gradient(180deg,#221d33,#191527)" },
};

const dueInfo = (dueDate, status) => {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / (1000 * 60 * 60 * 24));

  if (status === "completed") return { label: `Completed`, color: "success" };
  if (diffDays < 0) return { label: `Overdue • ${dueDate}`, color: "error" };
  if (diffDays === 0) return { label: "Due today", color: "warning" };
  if (diffDays === 1) return { label: "Due tomorrow", color: "warning" };
  return { label: `Due ${dueDate}`, color: "default" };
};

const isSameId = (a, b) => String(a?._id || a || "") === String(b?._id || b || "");

function TaskChatInner() {
  const { id } = useParams();
  // Read once on mount — localStorage isn't available during SSR,
  // so this starts null and fills in right after the page mounts.
  const [user, setUser] = useState(null);
  useEffect(() => setUser(getStoredUser()), []);

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [wallpaper, setWallpaper] = useState("default");
  const [darkMode, setDarkMode] = useState(false);

  const [congrats, setCongrats] = useState(null); // { title, by }

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // ---- load saved theme/wallpaper (device-level preference) ----
  useEffect(() => {
    const savedWallpaper = window.localStorage.getItem("chatWallpaper");
    const savedTheme = window.localStorage.getItem("chatDark");
    if (savedWallpaper && WALLPAPERS[savedWallpaper]) setWallpaper(savedWallpaper);
    if (savedTheme) setDarkMode(savedTheme === "1");
  }, []);

  const pickWallpaper = (key) => {
    setWallpaper(key);
    window.localStorage.setItem("chatWallpaper", key);
  };
  const toggleDark = () => {
    setDarkMode((d) => {
      window.localStorage.setItem("chatDark", !d ? "1" : "0");
      return !d;
    });
  };

  // ---- ask for browser notification permission once ----
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ---- load task ----
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/tasks/${id}`);
      setTask(res.data);
      api.patch(`/tasks/${id}/messages/seen`).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load this task.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ---- realtime ----
  useEffect(() => {
    if (!id || !user?._id) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit("join", user._id);
    socket.emit("joinTask", id);

    const onNewMessage = (payload) => {
      if (String(payload.taskId) !== String(id)) return;
      setTask((prev) => {
        if (!prev) return prev;
        const exists = prev.messages.some((m) => m._id === payload.message._id);
        if (exists) return prev;
        return { ...prev, messages: [...prev.messages, payload.message] };
      });

      if (!isSameId(payload.message.sender, user._id) && document.hidden) {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(payload.message.senderName || "New message", {
            body: payload.message.photoUrl ? "📷 Sent a photo" : payload.message.text,
          });
        }
      }
    };

    const onMessageEdited = (payload) => {
      if (String(payload.taskId) !== String(id)) return;
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) =>
            m._id === payload.messageId ? { ...m, text: payload.text, editedAt: payload.editedAt } : m
          ),
        };
      });
    };

    const onStatusUpdated = (payload) => {
      if (String(payload.taskId) !== String(id)) return;
      setTask((prev) => (prev ? { ...prev, status: payload.status } : prev));
    };

    const onTaskCompleted = (payload) => {
      if (String(payload.taskId) !== String(id)) return;
      setCongrats({ title: payload.title, by: payload.completedBy });
    };

    socket.on("newMessage", onNewMessage);
    socket.on("messageEdited", onMessageEdited);
    socket.on("statusUpdated", onStatusUpdated);
    socket.on("taskCompleted", onTaskCompleted);

    return () => {
      socket.emit("leaveTask", id);
      socket.off("newMessage", onNewMessage);
      socket.off("messageEdited", onMessageEdited);
      socket.off("statusUpdated", onStatusUpdated);
      socket.off("taskCompleted", onTaskCompleted);
    };
  }, [id, user?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task?.messages?.length]);

  // ---- actions ----
  const sendText = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const body = text.trim();
    setText("");
    try {
      const res = await api.post(`/tasks/${id}/messages`, { text: body });
      setTask((prev) => {
        if (!prev) return prev;
        const exists = prev.messages.some((m) => m._id === res.data._id);
        if (exists) return prev;
        return { ...prev, messages: [...prev.messages, res.data] };
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append("photo", file);
    setSending(true);
    try {
      const res = await api.post(`/tasks/${id}/messages/photo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTask((prev) => {
        if (!prev) return prev;
        const exists = prev.messages.some((m) => m._id === res.data._id);
        if (exists) return prev;
        return { ...prev, messages: [...prev.messages, res.data] };
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Photo could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status) => {
    const prevStatus = task.status;
    setTask((prev) => ({ ...prev, status }));
    try {
      const res = await api.patch(`/tasks/${id}/status`, { status });
      if (status === "completed" && prevStatus !== "completed") {
        setCongrats({ title: res.data.title, by: user?.name });
      }
    } catch (err) {
      setTask((prev) => ({ ...prev, status: prevStatus }));
      setError(err?.response?.data?.message || "Could not update status.");
    }
  };

  const startEdit = (msg) => {
    setEditingId(msg._id);
    setEditingText(msg.text);
  };

  const saveEdit = async () => {
    if (!editingText.trim()) return;
    try {
      const res = await api.patch(`/tasks/${id}/messages/${editingId}`, { text: editingText.trim() });
      setTask((prev) => ({
        ...prev,
        messages: prev.messages.map((m) => (m._id === editingId ? { ...m, ...res.data } : m)),
      }));
      setEditingId(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not edit message (24 hour limit may have passed).");
    }
  };

  const isGroup = task?.mode === "GROUP";
  const currentDueInfo = task ? dueInfo(task.dueDate, task.status) : null;
  const wallpaperBg = WALLPAPERS[wallpaper]?.bg;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: darkMode ? "#141020" : "background.default" }}>
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error && !task ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        ) : task ? (
          <>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 1.5, border: "1px solid #ece9f5", borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={800} noWrap>{task.title}</Typography>
                  {task.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {task.description}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip size="small" label={task.mode} />
                    {currentDueInfo && (
                      <Chip size="small" label={currentDueInfo.label} color={currentDueInfo.color} />
                    )}
                    {task.recurrence?.enabled && (
                      <Chip size="small" variant="outlined" label={`Repeats ${task.recurrence.frequency}`} />
                    )}
                  </Stack>
                </Box>
                <IconButton onClick={(e) => setSettingsAnchor(e.currentTarget)}>
                  <SettingsIcon />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
                <Select
                  size="small"
                  value={task.status}
                  onChange={(e) => changeStatus(e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                </Select>

                {isGroup && (
                  <AvatarGroup max={5} sx={{ "& .MuiAvatar-root": { width: 28, height: 28, fontSize: 13 } }}>
                    {task.participants.map((p) => (
                      <Tooltip title={p.name} key={p._id}>
                        <Avatar sx={{ bgcolor: colorForSender(p._id) }}>{p.name?.[0]}</Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                )}
              </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }} onClose={() => setError("")}>{error}</Alert>}

            {/* Chat area */}
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #ece9f5",
                borderRadius: 3,
                p: 1.5,
                height: "56vh",
                overflowY: "auto",
                background: wallpaperBg,
              }}
            >
              <Stack spacing={1}>
                {task.messages.map((msg) => {
                  const own = isSameId(msg.sender, user?._id);
                  const senderId = msg.sender?._id || msg.sender;
                  const canEdit =
                    own && (Date.now() - new Date(msg.createdAt).getTime()) / 36e5 < 24;

                  return (
                    <Box key={msg._id} sx={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start" }}>
                      <Box sx={{ maxWidth: "78%" }}>
                        {isGroup && !own && (
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{ color: colorForSender(senderId), ml: 1 }}
                          >
                            {msg.senderName}
                          </Typography>
                        )}
                        <Paper
                          elevation={0}
                          sx={{
                            px: 1.5,
                            py: 1,
                            borderRadius: 3,
                            borderTopRightRadius: own ? 4 : 3,
                            borderTopLeftRadius: own ? 3 : 4,
                            bgcolor: own ? "#7c3aed" : darkMode ? "#2a2440" : "#fff",
                            color: own ? "#fff" : darkMode ? "#f1edff" : "text.primary",
                          }}
                        >
                          {editingId === msg._id ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <TextField
                                size="small"
                                autoFocus
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                sx={{ bgcolor: "#fff", borderRadius: 1, minWidth: 160 }}
                              />
                              <IconButton size="small" onClick={saveEdit}><CheckIcon fontSize="small" sx={{ color: "#fff" }} /></IconButton>
                              <IconButton size="small" onClick={() => setEditingId(null)}><CloseIcon fontSize="small" sx={{ color: "#fff" }} /></IconButton>
                            </Stack>
                          ) : (
                            <>
                              {msg.photoUrl && (
                                <Box
                                  component="img"
                                  src={msg.photoUrl}
                                  sx={{ maxWidth: "100%", borderRadius: 2, mb: msg.text ? 0.5 : 0, display: "block" }}
                                />
                              )}
                              {msg.text && <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{msg.text}</Typography>}
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center" sx={{ mt: 0.25 }}>
                                {msg.editedAt && (
                                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 10 }}>edited</Typography>
                                )}
                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: 10 }}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </Typography>
                                {canEdit && (
                                  <IconButton size="small" onClick={() => startEdit(msg)} sx={{ p: 0.25 }}>
                                    <EditIcon sx={{ fontSize: 13, color: own ? "#fff" : "inherit", opacity: 0.8 }} />
                                  </IconButton>
                                )}
                              </Stack>
                            </>
                          )}
                        </Paper>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={bottomRef} />
              </Stack>
            </Paper>

            {/* Composer */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={(e) => sendPhoto(e.target.files?.[0])}
              />
              <IconButton onClick={() => fileInputRef.current?.click()} disabled={sending}>
                <AttachFileIcon />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                placeholder="Message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendText())}
                sx={{ bgcolor: "#fff", borderRadius: 3 }}
              />
              <IconButton
                onClick={sendText}
                disabled={sending || !text.trim()}
                sx={{ bgcolor: "#7c3aed", color: "#fff", "&:hover": { bgcolor: "#5b21b6" } }}
              >
                <SendIcon fontSize="small" />
              </IconButton>
            </Stack>
          </>
        ) : null}
      </Container>

      {/* Settings menu: theme + wallpaper */}
      <Menu anchorEl={settingsAnchor} open={!!settingsAnchor} onClose={() => setSettingsAnchor(null)}>
        <MenuItem onClick={toggleDark}>{darkMode ? "Switch to light theme" : "Switch to dark theme"}</MenuItem>
        <Typography variant="caption" sx={{ px: 2, pt: 1, display: "block", color: "text.secondary" }}>
          Wallpaper
        </Typography>
        {Object.entries(WALLPAPERS).map(([key, w]) => (
          <MenuItem key={key} selected={wallpaper === key} onClick={() => pickWallpaper(key)}>
            <Box sx={{ width: 16, height: 16, borderRadius: 1, background: w.bg, mr: 1, border: "1px solid #ddd" }} />
            {w.label}
          </MenuItem>
        ))}
      </Menu>

      {/* Completion congrats popup */}
      <Dialog open={!!congrats} onClose={() => setCongrats(null)}>
        <DialogTitle sx={{ textAlign: "center" }}>
          <CelebrationIcon sx={{ fontSize: 40, color: "#7c3aed" }} />
        </DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Typography variant="h6" fontWeight={800}>Task Completed! 🎉</Typography>
          <Typography color="text.secondary">
            "{congrats?.title}" {congrats?.by ? `— marked done by ${congrats.by}` : ""}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
          <Button variant="contained" onClick={() => setCongrats(null)} sx={{ textTransform: "none", borderRadius: 2.5 }}>
            Nice!
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function TaskChatPage() {
  return (
    <ProtectedRoute>
      <TaskChatInner />
    </ProtectedRoute>
  );
}