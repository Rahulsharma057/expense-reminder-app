"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Avatar,
  AvatarGroup,
  Select,
  MenuItem,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
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

// ============================================================
// HELPERS
// ============================================================

const PALETTE = [
  "#0ea5e9",
  "#16a34a",
  "#f97316",
  "#db2777",
  "#7c3aed",
  "#0d9488",
  "#ca8a04",
];

const colorForSender = (id) => {
  const str = String(id || "");
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }

  return PALETTE[hash % PALETTE.length];
};

const WALLPAPERS = {
  default: {
    label: "Lavender",
    bg: "linear-gradient(180deg, #f7f5fc, #efe9fb)",
  },
  doodle: {
    label: "Soft grid",
    bg: "repeating-linear-gradient(45deg, #f5f2fb, #f5f2fb 10px, #ece6f8 10px, #ece6f8 20px)",
  },
  mint: {
    label: "Mint",
    bg: "linear-gradient(180deg,#eafaf4,#dcf3ea)",
  },
  dark: {
    label: "Dark",
    bg: "linear-gradient(180deg,#221d33,#191527)",
  },
};

const dueInfo = (dueDate, status) => {
  if (!dueDate) return null;

  const due = new Date(dueDate);

  if (Number.isNaN(due.getTime())) {
    return null;
  }

  const today = new Date();

  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (due - today) / (1000 * 60 * 60 * 24)
  );

  if (status === "completed") {
    return {
      label: "Completed",
      color: "success",
    };
  }

  if (diffDays < 0) {
    return {
      label: `Overdue • ${dueDate}`,
      color: "error",
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      color: "warning",
    };
  }

  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      color: "warning",
    };
  }

  return {
    label: `Due ${dueDate}`,
    color: "default",
  };
};

const isSameId = (a, b) =>
  String(a?._id || a || "") === String(b?._id || b || "");

const mergeMessage = (messages, message) => {
  if (!message?._id) {
    return messages;
  }

  const exists = messages.some(
    (item) => String(item._id) === String(message._id)
  );

  if (exists) {
    return messages;
  }

  return [...messages, message];
};

// ============================================================
// TASK CHAT
// ============================================================

function TaskChatInner() {
  const { id } = useParams();

  const [user, setUser] = useState(null);

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

  const [congrats, setCongrats] = useState(null);

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  // ==========================================================
  // USER
  // ==========================================================

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // ==========================================================
  // SAVED CHAT THEME
  // ==========================================================

  useEffect(() => {
    const savedWallpaper =
      window.localStorage.getItem("chatWallpaper");

    const savedTheme =
      window.localStorage.getItem("chatDark");

    if (
      savedWallpaper &&
      WALLPAPERS[savedWallpaper]
    ) {
      setWallpaper(savedWallpaper);
    }

    if (savedTheme) {
      setDarkMode(savedTheme === "1");
    }
  }, []);

  const pickWallpaper = (key) => {
    setWallpaper(key);
    window.localStorage.setItem(
      "chatWallpaper",
      key
    );
  };

  const toggleDark = () => {
    setDarkMode((current) => {
      const next = !current;

      window.localStorage.setItem(
        "chatDark",
        next ? "1" : "0"
      );

      return next;
    });
  };

  // ==========================================================
  // NOTIFICATION PERMISSION
  // ==========================================================

  useEffect(() => {
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // ==========================================================
  // LOAD TASK + MESSAGES
  // ==========================================================

  const load = async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const [taskRes, messagesRes] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get(`/tasks/${id}/messages?limit=30`),
      ]);

      const messages =
        messagesRes.data?.messages || [];

      setTask({
        ...taskRes.data,
        messages,
      });

      // Mark messages as seen.
      api
        .patch(`/tasks/${id}/messages/seen`)
        .catch(() => {});
    } catch (err) {
      console.error("Task chat load error:", err);

      setError(
        err?.response?.data?.message ||
          "Could not load this task."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      load();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ==========================================================
  // SOCKET / REALTIME
  // ==========================================================

  useEffect(() => {
    if (!id || !user?._id) {
      return;
    }

    const socket = getSocket();

    socketRef.current = socket;

    socket.emit("join", user._id);
    socket.emit("joinTask", id);

    const onNewMessage = (payload) => {
      if (
        String(payload?.taskId) !== String(id)
      ) {
        return;
      }

      const incomingMessage = payload?.message;

      if (!incomingMessage) {
        return;
      }

      setTask((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: mergeMessage(
            prev.messages || [],
            incomingMessage
          ),
        };
      });

      // Browser notification when tab is hidden.
      if (
        !isSameId(
          incomingMessage.sender,
          user._id
        ) &&
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        new Notification(
          incomingMessage.senderName ||
            "New message",
          {
            body: incomingMessage.photoUrl
              ? "📷 Sent a photo"
              : incomingMessage.text ||
                "New message",
          }
        );
      }
    };

    const onMessageEdited = (payload) => {
      if (
        String(payload?.taskId) !== String(id)
      ) {
        return;
      }

      setTask((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: (prev.messages || []).map(
            (message) =>
              String(message._id) ===
              String(payload.messageId)
                ? {
                    ...message,
                    text: payload.text,
                    editedAt:
                      payload.editedAt,
                  }
                : message
          ),
        };
      });
    };

    const onStatusUpdated = (payload) => {
      if (
        String(payload?.taskId) !== String(id)
      ) {
        return;
      }

      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: payload.status,
            }
          : prev
      );
    };

    const onTaskCompleted = (payload) => {
      if (
        String(payload?.taskId) !== String(id)
      ) {
        return;
      }

      setCongrats({
        title: payload.title,
        by: payload.completedBy,
      });
    };

    socket.on(
      "newMessage",
      onNewMessage
    );

    socket.on(
      "messageEdited",
      onMessageEdited
    );

    socket.on(
      "statusUpdated",
      onStatusUpdated
    );

    socket.on(
      "taskCompleted",
      onTaskCompleted
    );

    return () => {
      socket.emit("leaveTask", id);

      socket.off(
        "newMessage",
        onNewMessage
      );

      socket.off(
        "messageEdited",
        onMessageEdited
      );

      socket.off(
        "statusUpdated",
        onStatusUpdated
      );

      socket.off(
        "taskCompleted",
        onTaskCompleted
      );
    };
  }, [id, user?._id]);

  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [task?.messages?.length]);

  // ==========================================================
  // SEND TEXT
  // ==========================================================

  const sendText = async () => {
    if (!text.trim() || sending) {
      return;
    }

    setSending(true);

    const body = text.trim();

    setText("");

    try {
      const res = await api.post(
        `/tasks/${id}/messages`,
        {
          text: body,
        }
      );

      setTask((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: mergeMessage(
            prev.messages || [],
            res.data
          ),
        };
      });
    } catch (err) {
      setText(body);

      setError(
        err?.response?.data?.message ||
          "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };

  // ==========================================================
  // SEND PHOTO
  // ==========================================================

  const sendPhoto = async (file) => {
    if (!file || sending) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image.");
      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "Image size must be less than 5MB."
      );
      return;
    }

    const form = new FormData();

    form.append("photo", file);

    setSending(true);
    setError("");

    try {
      const res = await api.post(
        `/tasks/${id}/messages/photo`,
        form,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setTask((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: mergeMessage(
            prev.messages || [],
            res.data
          ),
        };
      });
    } catch (err) {
      console.error(
        "Photo upload error:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Photo could not be sent."
      );
    } finally {
      setSending(false);

      // Important: allow selecting the
      // same image again.
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ==========================================================
  // CHANGE STATUS
  // ==========================================================

  const changeStatus = async (status) => {
    if (!task) return;

    const previousStatus = task.status;

    setTask((prev) =>
      prev
        ? {
            ...prev,
            status,
          }
        : prev
    );

    try {
      const res = await api.patch(
        `/tasks/${id}/status`,
        {
          status,
        }
      );

      if (
        status === "completed" &&
        previousStatus !== "completed"
      ) {
        setCongrats({
          title: res.data.title,
          by: user?.name,
        });
      }
    } catch (err) {
      setTask((prev) =>
        prev
          ? {
              ...prev,
              status: previousStatus,
            }
          : prev
      );

      setError(
        err?.response?.data?.message ||
          "Could not update status."
      );
    }
  };

  // ==========================================================
  // EDIT MESSAGE
  // ==========================================================

  const startEdit = (msg) => {
    if (!msg?.text) {
      return;
    }

    setEditingId(msg._id);
    setEditingText(msg.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (
      !editingId ||
      !editingText.trim()
    ) {
      return;
    }

    try {
      const res = await api.patch(
        `/tasks/${id}/messages/${editingId}`,
        {
          text: editingText.trim(),
        }
      );

      setTask((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          messages: (prev.messages || []).map(
            (message) =>
              String(message._id) ===
              String(editingId)
                ? {
                    ...message,
                    ...res.data,
                  }
                : message
          ),
        };
      });

      cancelEdit();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Could not edit message (24 hour limit may have passed)."
      );
    }
  };

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================

  const isGroup =
    task?.mode === "GROUP";

  const currentDueInfo = task
    ? dueInfo(
        task.dueDate,
        task.status
      )
    : null;

  const wallpaperBg =
    WALLPAPERS[wallpaper]?.bg;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: darkMode
          ? "#141020"
          : "background.default",
      }}
    >
      <Navbar />

      <Container
        maxWidth="sm"
        sx={{ py: 2 }}
      >
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 6,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        ) : error && !task ? (
          <Alert
            severity="error"
            sx={{ borderRadius: 2 }}
          >
            {error}
          </Alert>
        ) : task ? (
          <>
            {/* ==================================================
                TASK HEADER
            ================================================== */}

            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 1.5,
                border:
                  "1px solid #ece9f5",
                borderRadius: 3,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
              >
                <Box
                  sx={{
                    minWidth: 0,
                    pr: 1,
                  }}
                >
                  <Typography
                    fontWeight={800}
                    noWrap
                  >
                    {task.title}
                  </Typography>

                  {task.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {task.description}
                    </Typography>
                  )}

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <Chip
                      size="small"
                      label={task.mode}
                    />

                    {currentDueInfo && (
                      <Chip
                        size="small"
                        label={
                          currentDueInfo.label
                        }
                        color={
                          currentDueInfo.color
                        }
                      />
                    )}

                    {task.recurrence
                      ?.enabled && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`Repeats ${task.recurrence.frequency}`}
                      />
                    )}
                  </Stack>
                </Box>

                <IconButton
                  onClick={(event) =>
                    setSettingsAnchor(
                      event.currentTarget
                    )
                  }
                >
                  <SettingsIcon />
                </IconButton>
              </Stack>

              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ mt: 1.5 }}
              >
                <Select
                  size="small"
                  value={
                    task.status || "pending"
                  }
                  onChange={(event) =>
                    changeStatus(
                      event.target.value
                    )
                  }
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="pending">
                    Pending
                  </MenuItem>

                  <MenuItem value="in-progress">
                    In progress
                  </MenuItem>

                  <MenuItem value="completed">
                    Completed
                  </MenuItem>
                </Select>

                {isGroup && (
                  <AvatarGroup
                    max={5}
                    sx={{
                      "& .MuiAvatar-root": {
                        width: 28,
                        height: 28,
                        fontSize: 13,
                      },
                    }}
                  >
                    {(task.participants ||
                      []).map((participant) => (
                      <Tooltip
                        title={
                          participant.name ||
                          "User"
                        }
                        key={
                          participant._id
                        }
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              colorForSender(
                                participant._id
                              ),
                          }}
                        >
                          {participant.name?.[0] ||
                            "U"}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                )}
              </Stack>
            </Paper>

            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                }}
                onClose={() =>
                  setError("")
                }
              >
                {error}
              </Alert>
            )}

            {/* ==================================================
                CHAT
            ================================================== */}

            <Paper
              elevation={0}
              sx={{
                border:
                  "1px solid #ece9f5",
                borderRadius: 3,
                p: 1.5,
                height: "56vh",
                overflowY: "auto",
                background:
                  wallpaperBg,
              }}
            >
              <Stack spacing={1}>
                {(task.messages || []).map(
                  (msg) => {
                    const own = isSameId(
                      msg.sender,
                      user?._id
                    );

                    const senderId =
                      msg.sender?._id ||
                      msg.sender;

                    const createdTime =
                      new Date(
                        msg.createdAt
                      ).getTime();

                    const canEdit =
                      own &&
                      !Number.isNaN(
                        createdTime
                      ) &&
                      (Date.now() -
                        createdTime) /
                        36e5 <
                        24;

                    return (
                      <Box
                        key={msg._id}
                        sx={{
                          display: "flex",
                          justifyContent:
                            own
                              ? "flex-end"
                              : "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: "78%",
                          }}
                        >
                          {isGroup &&
                            !own && (
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                sx={{
                                  color:
                                    colorForSender(
                                      senderId
                                    ),
                                  ml: 1,
                                }}
                              >
                                {msg.senderName ||
                                  "User"}
                              </Typography>
                            )}

                          <Paper
                            elevation={0}
                            sx={{
                              px: 1.5,
                              py: 1,
                              borderRadius: 3,
                              borderTopRightRadius:
                                own
                                  ? 4
                                  : 3,
                              borderTopLeftRadius:
                                own
                                  ? 3
                                  : 4,
                              bgcolor: own
                                ? "#7c3aed"
                                : darkMode
                                  ? "#2a2440"
                                  : "#fff",
                              color: own
                                ? "#fff"
                                : darkMode
                                  ? "#f1edff"
                                  : "text.primary",
                            }}
                          >
                            {editingId ===
                            msg._id ? (
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                              >
                                <TextField
                                  size="small"
                                  autoFocus
                                  value={
                                    editingText
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setEditingText(
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  sx={{
                                    bgcolor:
                                      "#fff",
                                    borderRadius: 1,
                                    minWidth: 160,
                                  }}
                                />

                                <IconButton
                                  size="small"
                                  onClick={
                                    saveEdit
                                  }
                                >
                                  <CheckIcon
                                    fontSize="small"
                                    sx={{
                                      color:
                                        "#fff",
                                    }}
                                  />
                                </IconButton>

                                <IconButton
                                  size="small"
                                  onClick={
                                    cancelEdit
                                  }
                                >
                                  <CloseIcon
                                    fontSize="small"
                                    sx={{
                                      color:
                                        "#fff",
                                    }}
                                  />
                                </IconButton>
                              </Stack>
                            ) : (
                              <>
                                {/* Cloudinary photo URL */}
                                {msg.photoUrl && (
                                  <Box
                                    component="img"
                                    src={
                                      msg.photoUrl
                                    }
                                    alt="Chat attachment"
                                    loading="lazy"
                                    sx={{
                                      maxWidth:
                                        "100%",
                                      maxHeight:
                                        320,
                                      objectFit:
                                        "contain",
                                      borderRadius: 2,
                                      mb: msg.text
                                        ? 0.5
                                        : 0,
                                      display:
                                        "block",
                                    }}
                                  />
                                )}

                                {msg.text && (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      whiteSpace:
                                        "pre-wrap",
                                      wordBreak:
                                        "break-word",
                                    }}
                                  >
                                    {msg.text}
                                  </Typography>
                                )}

                                <Stack
                                  direction="row"
                                  spacing={0.5}
                                  justifyContent="flex-end"
                                  alignItems="center"
                                  sx={{
                                    mt: 0.25,
                                  }}
                                >
                                  {msg.editedAt && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        opacity: 0.7,
                                        fontSize: 10,
                                      }}
                                    >
                                      edited
                                    </Typography>
                                  )}

                                  <Typography
                                    variant="caption"
                                    sx={{
                                      opacity: 0.7,
                                      fontSize: 10,
                                    }}
                                  >
                                    {new Date(
                                      msg.createdAt
                                    ).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute:
                                          "2-digit",
                                      }
                                    )}
                                  </Typography>

                                  {canEdit && (
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        startEdit(
                                          msg
                                        )
                                      }
                                      sx={{
                                        p: 0.25,
                                      }}
                                    >
                                      <EditIcon
                                        sx={{
                                          fontSize: 13,
                                          color:
                                            own
                                              ? "#fff"
                                              : "inherit",
                                          opacity: 0.8,
                                        }}
                                      />
                                    </IconButton>
                                  )}
                                </Stack>
                              </>
                            )}
                          </Paper>
                        </Box>
                      </Box>
                    );
                  }
                )}

                <div ref={bottomRef} />
              </Stack>
            </Paper>

            {/* ==================================================
                COMPOSER
            ================================================== */}

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1.5 }}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                ref={fileInputRef}
                onChange={(event) =>
                  sendPhoto(
                    event.target.files?.[0]
                  )
                }
              />

              <IconButton
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={sending}
              >
                <AttachFileIcon />
              </IconButton>

              <TextField
                fullWidth
                size="small"
                placeholder="Message"
                value={text}
                onChange={(event) =>
                  setText(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendText();
                  }
                }}
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 3,
                }}
              />

              <IconButton
                onClick={sendText}
                disabled={
                  sending ||
                  !text.trim()
                }
                sx={{
                  bgcolor: "#7c3aed",
                  color: "#fff",
                  "&:hover": {
                    bgcolor: "#5b21b6",
                  },
                }}
              >
                {sending ? (
                  <CircularProgress
                    size={18}
                    sx={{
                      color: "#fff",
                    }}
                  />
                ) : (
                  <SendIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
          </>
        ) : null}
      </Container>

      {/* ========================================================
          SETTINGS
      ======================================================== */}

      <Menu
        anchorEl={settingsAnchor}
        open={!!settingsAnchor}
        onClose={() =>
          setSettingsAnchor(null)
        }
      >
        <MenuItem
          onClick={toggleDark}
        >
          {darkMode
            ? "Switch to light theme"
            : "Switch to dark theme"}
        </MenuItem>

        <Typography
          variant="caption"
          sx={{
            px: 2,
            pt: 1,
            display: "block",
            color: "text.secondary",
          }}
        >
          Wallpaper
        </Typography>

        {Object.entries(WALLPAPERS).map(
          ([key, wallpaperItem]) => (
            <MenuItem
              key={key}
              selected={
                wallpaper === key
              }
              onClick={() =>
                pickWallpaper(key)
              }
            >
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  borderRadius: 1,
                  background:
                    wallpaperItem.bg,
                  mr: 1,
                  border:
                    "1px solid #ddd",
                }}
              />

              {wallpaperItem.label}
            </MenuItem>
          )
        )}
      </Menu>

      {/* ========================================================
          COMPLETION POPUP
      ======================================================== */}

      <Dialog
        open={!!congrats}
        onClose={() =>
          setCongrats(null)
        }
      >
        <DialogTitle
          sx={{
            textAlign: "center",
          }}
        >
          <CelebrationIcon
            sx={{
              fontSize: 40,
              color: "#7c3aed",
            }}
          />
        </DialogTitle>

        <DialogContent
          sx={{
            textAlign: "center",
          }}
        >
          <Typography
            variant="h6"
            fontWeight={800}
          >
            Task Completed! 🎉
          </Typography>

          <Typography color="text.secondary">
            "{congrats?.title}"
            {congrats?.by
              ? ` — marked done by ${congrats.by}`
              : ""}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: "center",
            pb: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={() =>
              setCongrats(null)
            }
            sx={{
              textTransform: "none",
              borderRadius: 2.5,
            }}
          >
            Nice!
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ============================================================
// PAGE
// ============================================================

export default function TaskChatPage() {
  return (
    <ProtectedRoute>
      <TaskChatInner />
    </ProtectedRoute>
  );
}