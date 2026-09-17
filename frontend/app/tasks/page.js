"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Alert, Avatar, AvatarGroup, Badge, Box, Button, Checkbox, Chip,
  CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, LinearProgress, Menu,
  MenuItem, Paper, Select, Stack, TextField, Tooltip, Typography,
} from "@mui/material";

import {
  Add, ArrowBack, Check, CheckCircle, Close, Delete, Done, DoneAll,
  Download, Edit, ExpandLess, ExpandMore, Groups, Image as ImageIcon,
  MoreVert, PushPin, PushPinOutlined, Refresh, Repeat, Send, TaskAlt,
  AccessTime, PlaylistAddCheck, SettingsRounded,
} from "@mui/icons-material";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";

/* =========================================================
   CONSTANTS
========================================================= */

const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const MODE_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual", description: "Assign to one person" },
  { value: "SEPARATE", label: "Separate", description: "A private copy for each person" },
  { value: "GROUP", label: "Group", description: "One shared task and one shared chat" },
];

const RECURRENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "#6B7280" },
  { value: "medium", label: "Medium", color: "#B45309" },
  { value: "high", label: "High", color: "#DC2626" },
];

// NEW: chat wallpapers, restored from the old standalone chat page.
const WALLPAPERS = {
  default: { label: "Lavender", bg: "linear-gradient(180deg, #f7f5fc, #efe9fb)" },
  doodle: { label: "Soft grid", bg: "repeating-linear-gradient(45deg, #f5f2fb, #f5f2fb 10px, #ece6f8 10px, #ece6f8 20px)" },
  mint: { label: "Mint", bg: "linear-gradient(180deg,#eafaf4,#dcf3ea)" },
  peach: { label: "Peach", bg: "linear-gradient(180deg,#fff3ea,#ffe6d8)" },
  dark: { label: "Midnight", bg: "linear-gradient(180deg,#221d33,#191527)" },
};

const PALETTE = ["#0ea5e9", "#16a34a", "#f97316", "#db2777", "#7c3aed", "#0d9488", "#ca8a04"];

/* =========================================================
   HELPERS
========================================================= */

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const sameId = (a, b) => {
  const x = getId(a);
  const y = getId(b);
  return Boolean(x) && x === y;
};

const getUserName = (user) => {
  if (!user) return "User";
  if (typeof user === "string") return user;
  return user.name || user.username || user.email || "User";
};

const getInitial = (user) =>
  getUserName(user).trim().charAt(0).toUpperCase() || "U";

// NEW: profile photo, if the user has one — MUI's Avatar falls back
// to its children (the initial letter) automatically if src is falsy
// or the image fails to load, so this is safe to pass through as-is.
const getUserAvatar = (user) => {
  if (!user || typeof user === "string") return undefined;
  return user.avatarUrl || undefined;
};

const colorFor = (id) => {
  const str = String(id || "");
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
};

const priorityMeta = (priority) =>
  PRIORITY_OPTIONS.find((option) => option.value === priority) || PRIORITY_OPTIONS[1];

const formatDate = (date) => {
  if (!date) return "No due date";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

// Date separator label for the chat ("Today", "Yesterday", "12 Mar 2026").
const dayLabel = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(d);
  that.setHours(0, 0, 0, 0);
  const diff = Math.round((today - that) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDate(d);
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/*
  The whole point of "chat partner name": for an INDIVIDUAL/SEPARATE
  task, the person you're talking to is whoever ISN'T you — the
  assignee if you created it, the creator if it was assigned to you.
*/
// NEW: like getChatTitle, but returns the user object (not just the
// name string) so the avatar photo can be read off it.
const getChatPartnerUser = (task, myId) => {
  if (!task || task.mode === "GROUP") return null;
  if (sameId(task.assignedBy, myId)) return task.assignedTo;
  return task.assignedBy;
};

const getChatTitle = (task, myId) => {
  if (!task) return "";

  if (task.mode === "GROUP") {
    const names = (task.participants || []).map(getUserName);
    return names.length ? names.join(", ") : "Group task";
  }

  if (sameId(task.assignedBy, myId)) {
    return getUserName(task.assignedTo);
  }

  return getUserName(task.assignedBy);
};

/*
  Everyone who should have seen a message: participants + the creator,
  minus the sender. If they're all in seenBy, the sender gets a blue
  double tick.
*/
const getChatMemberIds = (task) => {
  if (!task) return [];
  const ids =
    task.mode === "GROUP"
      ? (task.participants || []).map(getId)
      : [getId(task.assignedTo)];
  return [...new Set([...ids, getId(task.assignedBy)].filter(Boolean))];
};

const downloadImage = async (url, filename) => {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename || "photo.jpg";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  } catch {
    // Cloudinary CORS can block the fetch; opening the URL still lets
    // the user save it manually.
    window.open(url, "_blank");
  }
};

/* =========================================================
   MESSAGE TICKS
========================================================= */

function MessageTicks({ message, memberIds, myId }) {
  const others = memberIds.filter((id) => id !== getId(myId));
  const seen = (message.seenBy || []).map(getId);
  const seenByAll = others.length > 0 && others.every((id) => seen.includes(id));

  if (message.pending) {
    return <AccessTime sx={{ fontSize: 12, opacity: 0.6 }} />;
  }

  if (seenByAll) {
    // Blue double tick = everyone has read it.
    return <DoneAll sx={{ fontSize: 14, color: "#38BDF8" }} />;
  }

  if (seen.length > 1) {
    // Grey double tick = at least one other person read it.
    return <DoneAll sx={{ fontSize: 14, opacity: 0.75 }} />;
  }

  // Single tick = delivered to the server only.
  return <Done sx={{ fontSize: 14, opacity: 0.7 }} />;
}

/* =========================================================
   CHECKLIST PANEL
========================================================= */

function ChecklistPanel({
  task, open, onToggleOpen, onAdd, onToggleItem, onDeleteItem, onSetRecurrence,
}) {
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  const items = task?.checklist || [];
  const completed = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const recurrence = task?.checklistRecurrence;

  const submit = async () => {
    if (!newItem.trim() || adding) return;
    setAdding(true);
    await onAdd(newItem.trim());
    setNewItem("");
    setAdding(false);
  };

  return (
    <Box sx={{ borderBottom: "1px solid #EEEAF4", bgcolor: "#FFFFFF" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: { xs: 1.5, sm: 2 }, py: 1, cursor: "pointer" }}
        onClick={onToggleOpen}
      >
        <PlaylistAddCheck sx={{ fontSize: 19, color: PURPLE }} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.8}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
              Checklist
            </Typography>

            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: total && completed === total ? "#15803D" : "#7E7789" }}>
              {completed}/{total || 0} done
            </Typography>

            {recurrence?.enabled && (
              <Chip
                size="small"
                icon={<Repeat sx={{ fontSize: 12 }} />}
                label={recurrence.frequency}
                sx={{ height: 18, fontSize: 9.5, fontWeight: 700, borderRadius: 1, textTransform: "capitalize" }}
              />
            )}
          </Stack>

          {total > 0 && (
            <LinearProgress
              variant="determinate"
              value={percent}
              sx={{
                mt: 0.6, height: 5, borderRadius: 5, bgcolor: "#F0EBFA",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  bgcolor: completed === total ? "#16A34A" : PURPLE,
                },
              }}
            />
          )}
        </Box>

        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setMenuAnchor(event.currentTarget);
          }}
        >
          <MoreVert sx={{ fontSize: 17 }} />
        </IconButton>

        <IconButton size="small">
          {open ? <ExpandLess sx={{ fontSize: 19 }} /> : <ExpandMore sx={{ fontSize: 19 }} />}
        </IconButton>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 10.5, fontWeight: 800, color: "#948DA0" }}>
          RESET CHECKLIST EVERY
        </Typography>

        {RECURRENCE_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            selected={recurrence?.enabled && recurrence.frequency === option.value}
            onClick={() => {
              onSetRecurrence({ enabled: true, frequency: option.value });
              setMenuAnchor(null);
            }}
            sx={{ fontSize: 13 }}
          >
            {option.label}
          </MenuItem>
        ))}

        <Divider />

        <MenuItem
          selected={!recurrence?.enabled}
          onClick={() => {
            onSetRecurrence({ enabled: false, frequency: null });
            setMenuAnchor(null);
          }}
          sx={{ fontSize: 13 }}
        >
          Don&apos;t repeat
        </MenuItem>
      </Menu>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: { xs: 1.5, sm: 2 }, pb: 1.5, maxHeight: 230, overflowY: "auto" }}>
          {items.map((item) => (
            <Stack
              key={item._id}
              direction="row"
              alignItems="flex-start"
              spacing={0.5}
              sx={{ py: 0.2 }}
            >
              <Checkbox
                size="small"
                checked={Boolean(item.done)}
                onChange={() => onToggleItem(item, !item.done)}
                sx={{ p: 0.5, color: "#C6BFD4", "&.Mui-checked": { color: PURPLE } }}
              />

              <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    color: item.done ? "#9A94A3" : "#34303C",
                    textDecoration: item.done ? "line-through" : "none",
                  }}
                >
                  {item.text}
                </Typography>

                {item.done && item.doneByName && (
                  <Typography sx={{ fontSize: 9.5, color: "#A49DB0" }}>
                    {item.doneByName} • {formatTime(item.doneAt)}
                  </Typography>
                )}
              </Box>

              <IconButton size="small" onClick={() => onDeleteItem(item)} sx={{ p: 0.5 }}>
                <Close sx={{ fontSize: 14, color: "#B9B2C4" }} />
              </IconButton>
            </Stack>
          ))}

          <Stack direction="row" spacing={0.8} sx={{ mt: items.length ? 1 : 0.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add a checklist item..."
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2, bgcolor: "#FAF9FC", fontSize: 12.5,
                },
              }}
            />

            <IconButton
              onClick={submit}
              disabled={!newItem.trim() || adding}
              sx={{
                width: 36, height: 36, bgcolor: "#F3EEFF", color: PURPLE,
                "&:hover": { bgcolor: "#E9E0FF" },
              }}
            >
              <Add sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}

/* =========================================================
   PAGE (inner — wrapped in Suspense below because it reads
   useSearchParams, which Next.js requires a Suspense boundary for)
========================================================= */

function TasksInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const chatScrollRef = useRef(null);
  const loadMoreSentinelRef = useRef(null);
  const selectedIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isLoadingOlderRef = useRef(false);
  const autoOpenedFromUrlRef = useRef(false);

  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);

  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [activeFilter, setActiveFilter] = useState("all");
  const [checklistOpen, setChecklistOpen] = useState(false);

  const [typingUser, setTypingUser] = useState(null);

  // NEW: chat wallpaper + dark mode (device-level preference, same as
  // the old standalone chat page used to have).
  const [wallpaper, setWallpaper] = useState("default");
  const [chatDarkMode, setChatDarkMode] = useState(false);
  const [chatSettingsAnchor, setChatSettingsAnchor] = useState(null);

  // NEW: custom wallpaper picked from the phone's gallery. Stored as a
  // resized data URL in localStorage (device-level, same place as the
  // preset choice) rather than uploaded anywhere — it's a personal
  // display preference, not shared with anyone else in the chat.
  const [customWallpaperUrl, setCustomWallpaperUrl] = useState("");
  const wallpaperFileInputRef = useRef(null);

  /* ---------------- create task ---------------- */

  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState("INDIVIDUAL");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToList, setAssignedToList] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState("daily");
  const [newChecklist, setNewChecklist] = useState([]);
  const [checklistDraft, setChecklistDraft] = useState("");
  const [checklistRepeat, setChecklistRepeat] = useState("");
  const [creating, setCreating] = useState(false);

  /* ---------------- messages ---------------- */

  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [messageMenu, setMessageMenu] = useState(null);
  const [viewerPhoto, setViewerPhoto] = useState(null);

  /* ---------------- delete ---------------- */

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const myId = getId(user?._id);

  useEffect(() => {
    selectedIdRef.current = selectedTask?._id || null;
  }, [selectedTask?._id]);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (error) {
      console.error("User parse error:", error);
    }
  }, []);

  /* =======================================================
     NEW: CHAT WALLPAPER / DARK MODE — device-level preference,
     loaded once, persisted to localStorage.
  ======================================================= */

  useEffect(() => {
    try {
      const savedWallpaper = window.localStorage.getItem("chatWallpaper");
      const savedDark = window.localStorage.getItem("chatDark");
      const savedCustom = window.localStorage.getItem("chatWallpaperCustom");

      if (savedCustom) setCustomWallpaperUrl(savedCustom);

      if (savedWallpaper === "custom" && savedCustom) {
        setWallpaper("custom");
      } else if (savedWallpaper && WALLPAPERS[savedWallpaper]) {
        setWallpaper(savedWallpaper);
      }

      if (savedDark) setChatDarkMode(savedDark === "1");
    } catch {
      // localStorage can throw in some private-browsing modes — fine
      // to just fall back to defaults.
    }
  }, []);

  const pickWallpaper = (key) => {
    setWallpaper(key);
    try {
      window.localStorage.setItem("chatWallpaper", key);
    } catch {}
    setChatSettingsAnchor(null);
  };

  // NEW: gallery wallpaper — reads the picked file, downsizes it on a
  // canvas (full-resolution phone photos are overkill for a repeating
  // chat background and would blow past localStorage's ~5MB quota),
  // then stores the result as a JPEG data URL.
  const pickCustomWallpaper = () => {
    wallpaperFileInputRef.current?.click();
  };

  const handleCustomWallpaperFile = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const maxDimension = 1080;
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

        try {
          window.localStorage.setItem("chatWallpaperCustom", dataUrl);
          window.localStorage.setItem("chatWallpaper", "custom");
          setCustomWallpaperUrl(dataUrl);
          setWallpaper("custom");
          setChatSettingsAnchor(null);
          toast.success("Wallpaper updated");
        } catch {
          toast.error("That image is too large to save as a wallpaper — try a smaller one");
        }
      };

      img.onerror = () => toast.error("Could not read that image");
      img.src = reader.result;
    };

    reader.onerror = () => toast.error("Could not read that file");
    reader.readAsDataURL(file);
  };

  const removeCustomWallpaper = () => {
    try {
      window.localStorage.removeItem("chatWallpaperCustom");
    } catch {}
    setCustomWallpaperUrl("");
    if (wallpaper === "custom") pickWallpaper("default");
  };

  // Resolves whatever's currently selected (preset gradient or the
  // custom photo) into a CSS `background` value for the chat area.
  const currentChatBackground =
    wallpaper === "custom" && customWallpaperUrl
      ? `center / cover no-repeat url(${customWallpaperUrl})`
      : WALLPAPERS[wallpaper]?.bg || WALLPAPERS.default.bg;

  const toggleChatDarkMode = () => {
    setChatDarkMode((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem("chatDark", next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  /* =======================================================
     LOAD TASKS / USERS
  ======================================================= */

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/tasks/mine");
      // Backend may return either a bare array or { tasks, ... } —
      // this handles both shapes.
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.tasks || [];
      setTasks(data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load tasks"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await api.get("/users");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.users || response.data?.data || [];

      setUsers(
        data.filter(
          (item) => item?.isActive !== false && !sameId(item?._id, myId)
        )
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load users"));
    } finally {
      setUsersLoading(false);
    }
  }, [myId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (myId) loadUsers();
  }, [myId, loadUsers]);

  /* =======================================================
     OPEN / CLOSE TASK — defined before the deep-link effect
     below so it can be called from there.

     GET /tasks/:id is metadata-only; messages come from a
     separate GET /tasks/:id/messages call.
  ======================================================= */

  const openTask = useCallback(async (task) => {
    try {
      setTaskLoading(true);
      setChecklistOpen(false);
      setTypingUser(null);

      const [taskRes, messagesRes] = await Promise.all([
        api.get(`/tasks/${task._id}`),
        api.get(`/tasks/${task._id}/messages?limit=30`),
      ]);

      setSelectedTask({
        ...taskRes.data,
        messages: messagesRes.data?.messages || [],
      });
      setHasMoreMessages(Boolean(messagesRes.data?.hasMore));

      setTasks((previous) =>
        previous.map((item) =>
          item._id === task._id ? { ...item, unread: false, unreadCount: 0 } : item
        )
      );

      api.patch(`/tasks/${task._id}/messages/seen`).catch(() => {});

      requestAnimationFrame(() =>
        chatBottomRef.current?.scrollIntoView({ block: "end" })
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not open task"));
    } finally {
      setTaskLoading(false);
    }
  }, []);

  /* =======================================================
     FIX: opening a chat from a deep link — e.g. the
     notification bell sends the user to /tasks?open=<taskId>.
     Nothing previously read that query param, so clicking a
     notification just landed on the plain task list. This
     resolves it once the task list has loaded.
  ======================================================= */

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || loading || autoOpenedFromUrlRef.current) return;

    autoOpenedFromUrlRef.current = true;

    const existing = tasks.find((task) => task._id === openId);

    if (existing) {
      openTask(existing);
    } else {
      // Not in "my tasks" preview yet (rare — e.g. very first load
      // race) — fetch it directly by id instead of giving up.
      api
        .get(`/tasks/${openId}`)
        .then((res) => openTask(res.data))
        .catch(() => toast.error("Could not open that task"));
    }

    // Clean the URL so a refresh or the back button doesn't try to
    // reopen the same chat again.
    router.replace("/tasks");
  }, [searchParams, loading, tasks, openTask, router]);

  /* =======================================================
     REALTIME — user room
  ======================================================= */

  useEffect(() => {
    if (!myId) return;

    const socket = getSocket();
    socket.emit("join", myId);

    const onNewTask = (incoming) => {
      setTasks((previous) =>
        previous.some((task) => task._id === incoming._id)
          ? previous
          : [incoming, ...previous]
      );
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks((previous) => previous.filter((task) => task._id !== taskId));
      if (selectedIdRef.current === taskId) setSelectedTask(null);
    };

    const onNotification = (payload) => {
      if (payload?.type !== "NEW_MESSAGE" || !payload?.task) return;
      setTasks((previous) =>
        previous.map((task) => {
          if (!sameId(task._id, payload.task)) return task;

          // The chat this message belongs to is open right now — it'll
          // get marked seen by the task-room socket handler already,
          // so don't bump the badge for it.
          const isOpen = selectedIdRef.current === task._id;

          return {
            ...task,
            lastMessageText: payload.message || task.lastMessageText,
            lastMessageAt: payload.createdAt || new Date().toISOString(),
            unread: !isOpen,
            unreadCount: isOpen ? 0 : (task.unreadCount || 0) + 1,
          };
        })
      );
    };

    socket.on("newTask", onNewTask);
    socket.on("taskDeleted", onTaskDeleted);
    socket.on("notification", onNotification);

    return () => {
      socket.off("newTask", onNewTask);
      socket.off("taskDeleted", onTaskDeleted);
      socket.off("notification", onNotification);
    };
  }, [myId]);

  /* =======================================================
     REALTIME — task room
  ======================================================= */

  useEffect(() => {
    const taskId = selectedTask?._id;
    if (!taskId || !myId) return;

    const socket = getSocket();
    socket.emit("joinTask", taskId);

    const forThisTask = (payload) => String(payload?.taskId) === String(taskId);

    const onNewMessage = (payload) => {
      if (!forThisTask(payload)) return;

      setSelectedTask((previous) => {
        if (!previous) return previous;
        if (previous.messages?.some((m) => m._id === payload.message._id)) {
          return previous;
        }
        return {
          ...previous,
          messages: [...(previous.messages || []), payload.message],
        };
      });

      if (!sameId(payload.message.sender, myId)) {
        api.patch(`/tasks/${taskId}/messages/seen`).catch(() => {});
      }

      setTypingUser(null);

      requestAnimationFrame(() =>
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    };

    const onMessageEdited = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              messages: previous.messages.map((m) =>
                m._id === payload.messageId
                  ? { ...m, text: payload.text, editedAt: payload.editedAt }
                  : m
              ),
            }
          : previous
      );
    };

    const onMessageDeleted = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              messages: previous.messages.map((m) =>
                m._id === payload.messageId
                  ? { ...m, deleted: true, photoUrl: "", text: "This message was deleted" }
                  : m
              ),
            }
          : previous
      );
    };

    const onMessagesSeen = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              messages: previous.messages.map((m) =>
                (m.seenBy || []).map(getId).includes(getId(payload.userId))
                  ? m
                  : { ...m, seenBy: [...(m.seenBy || []), payload.userId] }
              ),
            }
          : previous
      );
    };

    const onStatusUpdated = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous ? { ...previous, status: payload.status } : previous
      );
      setTasks((previous) =>
        previous.map((task) =>
          task._id === payload.taskId ? { ...task, status: payload.status } : task
        )
      );
    };

    const onChecklistAdded = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) => {
        if (!previous) return previous;
        if (previous.checklist?.some((item) => item._id === payload.item._id)) {
          return previous;
        }
        return { ...previous, checklist: [...(previous.checklist || []), payload.item] };
      });
    };

    const onChecklistUpdated = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              checklist: (previous.checklist || []).map((item) =>
                item._id === payload.item._id ? payload.item : item
              ),
            }
          : previous
      );
    };

    const onChecklistDeleted = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              checklist: (previous.checklist || []).filter(
                (item) => item._id !== payload.itemId
              ),
            }
          : previous
      );
    };

    const onChecklistReset = (payload) => {
      if (!forThisTask(payload)) return;
      setSelectedTask((previous) =>
        previous
          ? {
              ...previous,
              checklist: (previous.checklist || []).map((item) => ({
                ...item, done: false, doneBy: null, doneByName: "", doneAt: null,
              })),
            }
          : previous
      );
    };

    const onTyping = ({ userName }) => {
      setTypingUser(userName);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
    };

    socket.on("newMessage", onNewMessage);
    socket.on("messageEdited", onMessageEdited);
    socket.on("messageDeleted", onMessageDeleted);
    socket.on("messagesSeen", onMessagesSeen);
    socket.on("statusUpdated", onStatusUpdated);
    socket.on("checklistItemAdded", onChecklistAdded);
    socket.on("checklistItemUpdated", onChecklistUpdated);
    socket.on("checklistItemDeleted", onChecklistDeleted);
    socket.on("checklistReset", onChecklistReset);
    socket.on("typing", onTyping);

    return () => {
      socket.emit("leaveTask", taskId);
      socket.off("newMessage", onNewMessage);
      socket.off("messageEdited", onMessageEdited);
      socket.off("messageDeleted", onMessageDeleted);
      socket.off("messagesSeen", onMessagesSeen);
      socket.off("statusUpdated", onStatusUpdated);
      socket.off("checklistItemAdded", onChecklistAdded);
      socket.off("checklistItemUpdated", onChecklistUpdated);
      socket.off("checklistItemDeleted", onChecklistDeleted);
      socket.off("checklistReset", onChecklistReset);
      socket.off("typing", onTyping);
      clearTimeout(typingTimeoutRef.current);
      setTypingUser(null);
    };
  }, [selectedTask?._id, myId]);

  const closeTask = () => {
    setSelectedTask(null);
    setEditingMessage(null);
    setEditText("");
    setMessageText("");
    setDeleteDialogOpen(false);
    setHasMoreMessages(false);
    setTypingUser(null);
  };

  /* =======================================================
     LAZY LOAD OLDER MESSAGES

     FIX: previously only triggered off `scrollTop < 60`, which is
     unreliable — a short chat's scrollTop never leaves 0, and a
     freshly-rendered flex container can report stale scroll metrics
     for a frame. isLoadingOlderRef (a ref, not state) guards against
     duplicate fetches even if this fires from a stale closure.
  ======================================================= */

  const loadOlderMessages = useCallback(async () => {
    if (!selectedTask?._id || isLoadingOlderRef.current || !hasMoreMessages) return;

    const oldest = selectedTask.messages?.[0];
    if (!oldest) return;

    const container = chatScrollRef.current;
    const previousHeight = container?.scrollHeight || 0;

    isLoadingOlderRef.current = true;
    setLoadingOlder(true);

    try {
      const response = await api.get(
        `/tasks/${selectedTask._id}/messages?before=${encodeURIComponent(
          oldest.createdAt
        )}&limit=30`
      );

      const older = response.data?.messages || [];

      setSelectedTask((previous) => {
        if (!previous) return previous;
        const existing = new Set((previous.messages || []).map((m) => m._id));
        const merged = older.filter((m) => !existing.has(m._id));
        return { ...previous, messages: [...merged, ...previous.messages] };
      });

      setHasMoreMessages(Boolean(response.data?.hasMore));

      // Keep the reading position steady instead of jumping to the top.
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - previousHeight;
        }
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load older messages"));
    } finally {
      isLoadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [selectedTask?._id, selectedTask?.messages, hasMoreMessages]);

  // Manual fallback (button) — kept in addition to the observer below.
  const onChatScroll = (event) => {
    if (event.currentTarget.scrollTop < 80) loadOlderMessages();
  };

  // NEW: IntersectionObserver-based auto-load. This is the reliable
  // mechanism — it fires whenever the sentinel div at the top of the
  // message list actually becomes visible, regardless of flex-layout
  // scroll-position quirks.
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    const root = chatScrollRef.current;
    if (!sentinel || !root || !hasMoreMessages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadOlderMessages();
        }
      },
      { root, threshold: 0, rootMargin: "200px 0px 0px 0px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [selectedTask?._id, hasMoreMessages, loadOlderMessages]);

  /* =======================================================
     FILTER / COUNTS
  ======================================================= */

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") return tasks;
    return tasks.filter((task) => task.status === activeFilter);
  }, [tasks, activeFilter]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      pending: tasks.filter((task) => task.status === "pending").length,
      inProgress: tasks.filter((task) => task.status === "in-progress").length,
      completed: tasks.filter((task) => task.status === "completed").length,
    }),
    [tasks]
  );

  /* =======================================================
     CREATE TASK
  ======================================================= */

  const resetCreateForm = () => {
    setMode("INDIVIDUAL");
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setAssignedToList([]);
    setDueDate("");
    setPriority("medium");
    setRecurrenceEnabled(false);
    setRecurrenceFrequency("daily");
    setNewChecklist([]);
    setChecklistDraft("");
    setChecklistRepeat("");
  };

  const handleCreateTask = async () => {
    if (!title.trim()) return toast.error("Task title is required");
    if (mode === "INDIVIDUAL" && !assignedTo) return toast.error("Please select a user");
    if (mode !== "INDIVIDUAL" && assignedToList.length < 2) {
      return toast.error("Please select at least two users");
    }

    try {
      setCreating(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        mode,
        dueDate,
        priority,
        recurrence: {
          enabled: recurrenceEnabled,
          frequency: recurrenceEnabled ? recurrenceFrequency : null,
        },
        checklist: newChecklist.map((text) => ({ text })),
        checklistRecurrence: checklistRepeat
          ? { enabled: true, frequency: checklistRepeat }
          : { enabled: false, frequency: null },
      };

      if (mode === "INDIVIDUAL") payload.assignedTo = assignedTo;
      else payload.assignedToList = assignedToList;

      const response = await api.post("/tasks", payload);

      toast.success("Task created");
      setCreateOpen(false);
      resetCreateForm();
      await loadTasks();

      if (mode !== "SEPARATE" && response.data?._id) {
        openTask(response.data);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create task"));
    } finally {
      setCreating(false);
    }
  };

  /* =======================================================
     STATUS / PIN
  ======================================================= */

  const updateTaskStatus = async (taskId, status) => {
    const previousStatus = selectedTask?.status;

    setSelectedTask((previous) =>
      previous?._id === taskId ? { ...previous, status } : previous
    );
    setTasks((previous) =>
      previous.map((task) => (task._id === taskId ? { ...task, status } : task))
    );

    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
    } catch (error) {
      setSelectedTask((previous) =>
        previous?._id === taskId ? { ...previous, status: previousStatus } : previous
      );
      toast.error(getErrorMessage(error, "Could not update status"));
    }
  };

  const togglePin = async (task, event) => {
    event?.stopPropagation();

    const nextPinned = !task.pinned;

    setTasks((previous) => {
      const updated = previous.map((item) =>
        item._id === task._id ? { ...item, pinned: nextPinned } : item
      );
      return [...updated].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    });

    setSelectedTask((previous) =>
      previous?._id === task._id ? { ...previous, pinned: nextPinned } : previous
    );

    try {
      await api.patch(`/tasks/${task._id}/pin`);
    } catch (error) {
      setTasks((previous) =>
        previous.map((item) =>
          item._id === task._id ? { ...item, pinned: !nextPinned } : item
        )
      );
      toast.error(getErrorMessage(error, "Could not update pin"));
    }
  };

  /* =======================================================
     MESSAGES
  ======================================================= */

  const appendMessage = (message) => {
    setSelectedTask((previous) => {
      if (!previous) return previous;
      if (previous.messages?.some((m) => m._id === message._id)) return previous;
      return { ...previous, messages: [...(previous.messages || []), message] };
    });

    requestAnimationFrame(() =>
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  };

  const handleMessageTextChange = (event) => {
    setMessageText(event.target.value);
    if (selectedTask?._id && user?.name) {
      getSocket().emit("typing", { taskId: selectedTask._id, userName: user.name });
    }
  };

  const sendMessage = async () => {
    if (!selectedTask?._id || !messageText.trim() || sendingMessage) return;

    const body = messageText.trim();
    setMessageText("");

    try {
      setSendingMessage(true);
      const response = await api.post(`/tasks/${selectedTask._id}/messages`, {
        text: body,
      });
      appendMessage(response.data);
    } catch (error) {
      setMessageText(body);
      toast.error(getErrorMessage(error, "Could not send message"));
    } finally {
      setSendingMessage(false);
    }
  };

  const sendPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedTask?._id) return;

    if (!file.type.startsWith("image/")) return toast.error("Please select an image");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");

    const caption = messageText.trim();
    setMessageText("");

    try {
      setSendingMessage(true);

      const formData = new FormData();
      formData.append("photo", file);
      if (caption) formData.append("caption", caption);

      const response = await api.post(
        `/tasks/${selectedTask._id}/messages/photo`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      appendMessage(response.data);
    } catch (error) {
      setMessageText(caption);
      toast.error(getErrorMessage(error, "Could not send photo"));
    } finally {
      setSendingMessage(false);
    }
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
    setEditText(message.text || "");
    setMessageMenu(null);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage?._id || !editText.trim()) return;

    try {
      const response = await api.patch(
        `/tasks/${selectedTask._id}/messages/${editingMessage._id}`,
        { text: editText.trim() }
      );

      setSelectedTask((previous) => ({
        ...previous,
        messages: previous.messages.map((message) =>
          message._id === editingMessage._id
            ? { ...message, ...response.data }
            : message
        ),
      }));

      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not edit message"));
    }
  };

  const deleteMessageById = async (message, scope = "me") => {
    setMessageMenu(null);

    try {
      await api.delete(
        `/tasks/${selectedTask._id}/messages/${message._id}?scope=${scope}`
      );

      setSelectedTask((previous) => ({
        ...previous,
        messages: previous.messages.map((item) => {
          if (item._id !== message._id) return item;

          if (scope === "everyone") {
            return { ...item, deleted: true, photoUrl: "", text: "This message was deleted" };
          }

          return { ...item, hiddenForMe: true, photoUrl: "", text: "" };
        }),
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete message"));
    }
  };

  /* =======================================================
     CHECKLIST ACTIONS
  ======================================================= */

  const addChecklistItem = async (text) => {
    try {
      const response = await api.post(`/tasks/${selectedTask._id}/checklist`, { text });
      setSelectedTask((previous) => ({
        ...previous,
        checklist: [...(previous.checklist || []), response.data],
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add item"));
    }
  };

  const toggleChecklistItem = async (item, done) => {
    setSelectedTask((previous) => ({
      ...previous,
      checklist: previous.checklist.map((entry) =>
        entry._id === item._id
          ? {
              ...entry,
              done,
              doneByName: done ? getUserName(user) : "",
              doneAt: done ? new Date().toISOString() : null,
            }
          : entry
      ),
    }));

    try {
      await api.patch(`/tasks/${selectedTask._id}/checklist/${item._id}`, { done });
    } catch (error) {
      setSelectedTask((previous) => ({
        ...previous,
        checklist: previous.checklist.map((entry) =>
          entry._id === item._id ? item : entry
        ),
      }));
      toast.error(getErrorMessage(error, "Could not update item"));
    }
  };

  const deleteChecklistItem = async (item) => {
    setSelectedTask((previous) => ({
      ...previous,
      checklist: previous.checklist.filter((entry) => entry._id !== item._id),
    }));

    try {
      await api.delete(`/tasks/${selectedTask._id}/checklist/${item._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete item"));
    }
  };

  const setChecklistRecurrence = async (value) => {
    setSelectedTask((previous) => ({
      ...previous,
      checklistRecurrence: { ...value, lastResetAt: new Date().toISOString() },
    }));

    try {
      await api.patch(`/tasks/${selectedTask._id}/checklist/recurrence`, value);
      toast.success(
        value.enabled ? `Checklist resets ${value.frequency}` : "Repeat turned off"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update repeat"));
    }
  };

  /* =======================================================
     DELETE TASK
  ======================================================= */

  const deleteCurrentTask = async () => {
    if (!selectedTask?._id) return;

    try {
      setDeleting(true);
      await api.delete(`/tasks/${selectedTask._id}`);
      toast.success("Task deleted");
      setTasks((previous) => previous.filter((task) => task._id !== selectedTask._id));
      closeTask();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete task"));
    } finally {
      setDeleting(false);
    }
  };

  /* =======================================================
     DERIVED
  ======================================================= */

  const memberIds = useMemo(() => getChatMemberIds(selectedTask), [selectedTask]);

  const chatTitle = useMemo(
    () => getChatTitle(selectedTask, myId),
    [selectedTask, myId]
  );

  // NEW: dark-mode-aware colors for the chat panel only (task list and
  // rest of the app stay on the normal light theme).
  const chatBg = chatDarkMode ? "#141020" : "#fff";
  const chatSurfaceBg = chatDarkMode ? "#1c1730" : "#fff";
  const chatBorderColor = chatDarkMode ? "#2b2347" : "#ECE8F5";
  const chatHeaderText = chatDarkMode ? "#F1EDFF" : "inherit";
  const chatSubText = chatDarkMode ? "#B8AFCF" : "#8A8498";
  const bubbleOtherBg = chatDarkMode ? "#2a2440" : "#fff";
  const bubbleOtherColor = chatDarkMode ? "#f1edff" : "#332D3A";
  const bubbleOtherBorder = chatDarkMode ? "none" : "1px solid #EAE6F1";
  const composerFieldBg = chatDarkMode ? "#241c3d" : "#FAF9FC";

  const statusChip = (status) => {
    const map = {
      completed: { icon: <CheckCircle sx={{ fontSize: 14 }} />, label: "Completed", bg: "#E8F7EE", color: "#15803D" },
      "in-progress": { icon: <AccessTime sx={{ fontSize: 14 }} />, label: "In Progress", bg: "#FFF4E5", color: "#B45309" },
      pending: { icon: <TaskAlt sx={{ fontSize: 14 }} />, label: "Pending", bg: "#F1EDF8", color: "#6B6478" },
    };
    const cfg = map[status] || map.pending;

    return (
      <Chip
        size="small"
        icon={cfg.icon}
        label={cfg.label}
        sx={{
          height: 22, fontSize: 10, fontWeight: 800, borderRadius: 1.5,
          bgcolor: cfg.bg, color: cfg.color,
          "& .MuiChip-icon": { color: cfg.color, ml: 0.5 },
        }}
      />
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#FAF9FF 0%,#FFFFFF 55%)", overflowX: "hidden" }}>
      <Box sx={{ display: { xs: selectedTask ? "none" : "block", md: "block" } }}>
        <Navbar />
      </Box>

      <Box
        sx={{
          maxWidth: 1500, mx: "auto",
          px: { xs: selectedTask ? 0 : 1.5, sm: 2.5, md: 3 },
          py: { xs: selectedTask ? 0 : 2, sm: 2.5, md: 3 },
        }}
      >
        {/* ---------------- HEADER ---------------- */}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          sx={{ mb: 2.5, display: { xs: selectedTask ? "none" : "flex", md: "flex" } }}
        >
          <Box>
            <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 800, color: "#171225", letterSpacing: -0.6 }}>
              Tasks
            </Typography>
            <Typography sx={{ mt: 0.5, color: "#77728A", fontSize: 13.5 }}>
              Assign, track and discuss your work
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Tooltip title="Refresh">
              <IconButton
                onClick={loadTasks}
                disabled={loading}
                sx={{ width: 42, height: 42, borderRadius: 2.5, border: "1px solid #E7E1F5", bgcolor: "#fff" }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            </Tooltip>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetCreateForm();
                setCreateOpen(true);
              }}
              sx={{
                minHeight: 42, borderRadius: 2.5, px: 2, textTransform: "none",
                fontWeight: 700, bgcolor: PURPLE,
                boxShadow: "0 8px 20px rgba(124,58,237,.20)",
                "&:hover": { bgcolor: PURPLE_DARK },
              }}
            >
              Create Task
            </Button>
          </Stack>
        </Stack>

        {/* ---------------- FILTERS ---------------- */}

        <Paper
          elevation={0}
          sx={{
            p: 1, mb: 2, borderRadius: 3, border: "1px solid #ECE8F5", bgcolor: "#fff",
            display: { xs: selectedTask ? "none" : "block", md: "block" },
          }}
        >
          <Stack direction="row" spacing={0.8} sx={{ overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
            {[
              { key: "all", label: "All", count: counts.all },
              { key: "pending", label: "Pending", count: counts.pending },
              { key: "in-progress", label: "In Progress", count: counts.inProgress },
              { key: "completed", label: "Completed", count: counts.completed },
            ].map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <Button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  sx={{
                    flexShrink: 0, minWidth: "auto", borderRadius: 2, px: 1.6, py: 0.9,
                    textTransform: "none", fontWeight: 700,
                    color: active ? "#fff" : "#686176",
                    bgcolor: active ? PURPLE : "transparent",
                    "&:hover": { bgcolor: active ? PURPLE_DARK : "#F5F2FA" },
                  }}
                >
                  {filter.label}
                  <Box
                    component="span"
                    sx={{
                      ml: 0.8, minWidth: 21, height: 21, px: 0.5, borderRadius: 10,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11,
                      bgcolor: active ? "rgba(255,255,255,.18)" : "#F1EDF8",
                    }}
                  >
                    {filter.count}
                  </Box>
                </Button>
              );
            })}
          </Stack>
        </Paper>

        {/* ---------------- GRID ---------------- */}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: selectedTask ? "minmax(320px, 400px) minmax(0, 1fr)" : "1fr",
            },
            gap: { xs: 0, md: 2 },
            alignItems: "stretch",
            minHeight: {
              xs: selectedTask ? "100dvh" : "calc(100dvh - 155px)",
              md: 680,
            },
          }}
        >
          {/* ============ TASK LIST ============ */}

          <Paper
            elevation={0}
            sx={{
              display: { xs: selectedTask ? "none" : "flex", md: "flex" },
              flexDirection: "column",
              borderRadius: { xs: 0, md: 3 },
              border: { xs: "none", md: "1px solid #ECE8F5" },
              bgcolor: "#fff", overflow: "hidden",
              height: { xs: "calc(100dvh - 155px)", md: 680 },
            }}
          >
            <Box sx={{ px: 2, py: 1.6, borderBottom: "1px solid #F0EDF5" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 15 }}>My Tasks</Typography>
              <Typography sx={{ color: "#8A8498", fontSize: 12, mt: 0.3 }}>
                {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, gap: 1.5 }}>
                <CircularProgress size={28} sx={{ color: PURPLE }} />
                <Typography sx={{ color: "#8A8498", fontSize: 13 }}>Loading tasks...</Typography>
              </Stack>
            ) : filteredTasks.length === 0 ? (
              <Stack alignItems="center" justifyContent="center" sx={{ flex: 1, px: 3, textAlign: "center" }}>
                <Avatar sx={{ width: 62, height: 62, mb: 1.5, bgcolor: "#F1EAFE", color: PURPLE }}>
                  <TaskAlt />
                </Avatar>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>No tasks found</Typography>
                <Typography sx={{ color: "#8A8498", fontSize: 13, mt: 0.5, maxWidth: 300 }}>
                  Create a task or change the selected filter.
                </Typography>
              </Stack>
            ) : (
              <Stack
                sx={{
                  overflowY: "auto", flex: 1,
                  "&::-webkit-scrollbar": { width: 5 },
                  "&::-webkit-scrollbar-thumb": { background: "#DDD7E8", borderRadius: 10 },
                }}
                divider={<Divider sx={{ borderColor: "#F2EFF6" }} />}
              >
                {filteredTasks.map((task) => {
                  const isSelected = selectedTask?._id === task._id;
                  const partnerUser = getChatPartnerUser(task, myId);
                  const partner = getChatTitle(task, myId);
                  const doneCount = (task.checklist || []).filter((i) => i.done).length;
                  const totalCount = (task.checklist || []).length;
                  const pMeta = priorityMeta(task.priority);
                  // Backend sends a real number now; fall back to the
                  // old boolean flag for a moment during rollout.
                  const unreadCount = task.unreadCount ?? (task.unread ? 1 : 0);

                  return (
                    <Box
                      key={task._id}
                      onClick={() => openTask(task)}
                      sx={{
                        p: 1.6, cursor: "pointer", transition: "0.18s",
                        bgcolor: isSelected ? "#F7F3FF" : "#fff",
                        "&:hover": { bgcolor: isSelected ? "#F4EEFF" : "#FAF8FE" },
                      }}
                    >
                      <Stack direction="row" spacing={1.2} alignItems="flex-start">
                        <Badge
                          color="secondary"
                          badgeContent={unreadCount}
                          max={99}
                          invisible={!unreadCount}
                          sx={{ "& .MuiBadge-badge": { bgcolor: PURPLE, color: "#fff", fontWeight: 700, fontSize: 10 } }}
                        >
                          <Avatar
                            src={task.mode === "GROUP" ? undefined : getUserAvatar(partnerUser)}
                            sx={{
                              width: 42, height: 42, borderRadius: 2.2,
                              bgcolor: task.mode === "GROUP" ? "#EEE7FF" : colorFor(getId(task.assignedTo) || task._id),
                              color: task.mode === "GROUP" ? PURPLE_DARK : "#fff",
                              fontSize: 15, fontWeight: 800,
                            }}
                          >
                            {task.mode === "GROUP" ? <Groups fontSize="small" /> : getInitial(partner)}
                          </Avatar>
                        </Badge>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={0.6}>
                            {task.pinned && <PushPin sx={{ fontSize: 13, color: PURPLE, transform: "rotate(45deg)" }} />}

                            {task.priority && task.priority !== "medium" && (
                              <Tooltip title={`${pMeta.label} priority`}>
                                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: pMeta.color, flexShrink: 0 }} />
                              </Tooltip>
                            )}

                            <Typography
                              sx={{
                                fontWeight: 800, fontSize: 14, color: "#27212F",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                              }}
                            >
                              {task.title}
                            </Typography>

                            {task.lastMessageAt && (
                              <Typography sx={{ fontSize: 10, color: "#A39CAF", flexShrink: 0 }}>
                                {formatTime(task.lastMessageAt)}
                              </Typography>
                            )}
                          </Stack>

                          <Typography
                            sx={{
                              mt: 0.2, fontSize: 11.5, fontWeight: 600, color: PURPLE_DARK,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {task.mode === "GROUP" ? `${(task.participants || []).length} members` : partner}
                          </Typography>

                          {task.lastMessageText ? (
                            <Typography
                              sx={{
                                mt: 0.4, fontSize: 11.5, color: "#8B8596",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                            >
                              {task.lastMessageSenderName ? `${task.lastMessageSenderName}: ` : ""}
                              {task.lastMessageText}
                            </Typography>
                          ) : task.description ? (
                            <Typography
                              sx={{
                                mt: 0.4, fontSize: 11.5, color: "#98929F",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}
                            >
                              {task.description}
                            </Typography>
                          ) : null}

                          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mt: 0.9, flexWrap: "wrap", rowGap: 0.5 }}>
                            {statusChip(task.status)}

                            {totalCount > 0 && (
                              <Chip
                                size="small"
                                icon={<PlaylistAddCheck sx={{ fontSize: 13 }} />}
                                label={`${doneCount}/${totalCount}`}
                                sx={{
                                  height: 22, fontSize: 10, fontWeight: 700, borderRadius: 1.5,
                                  bgcolor: doneCount === totalCount ? "#E8F7EE" : "#F5F1FB",
                                }}
                              />
                            )}

                            {task.dueDate && (
                              <Chip
                                size="small"
                                label={formatDate(task.dueDate)}
                                sx={{ height: 22, fontSize: 10, fontWeight: 600, borderRadius: 1.5 }}
                              />
                            )}
                          </Stack>
                        </Box>

                        <IconButton size="small" onClick={(event) => togglePin(task, event)} sx={{ p: 0.5 }}>
                          {task.pinned ? (
                            <PushPin sx={{ fontSize: 16, color: PURPLE }} />
                          ) : (
                            <PushPinOutlined sx={{ fontSize: 16, color: "#C3BCCE" }} />
                          )}
                        </IconButton>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {/* ============ CHAT ============ */}

          {selectedTask && (
            <Paper
              elevation={0}
              sx={{
                display: "flex", flexDirection: "column",
                position: { xs: "fixed", md: "relative" },
                inset: { xs: 0, md: "auto" },
                width: { xs: "100%", md: "auto" },
                height: { xs: "100dvh", md: 680 },
                zIndex: { xs: 1300, md: "auto" },
                borderRadius: { xs: 0, md: 3 },
                border: { xs: "none", md: `1px solid ${chatBorderColor}` },
                bgcolor: chatBg, overflow: "hidden",
                transition: "background-color 0.2s ease",
              }}
            >
              {/* ----- chat header ----- */}

              <Box sx={{ px: { xs: 1, sm: 2 }, py: { xs: 0.9, sm: 1.3 }, borderBottom: `1px solid ${chatBorderColor}`, bgcolor: chatSurfaceBg, flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton
                    onClick={closeTask}
                    sx={{ display: { xs: "flex", md: "none" }, width: 38, height: 38, color: chatDarkMode ? "#EDE9F7" : "#332D3A" }}
                  >
                    <ArrowBack />
                  </IconButton>

                  {selectedTask.mode === "GROUP" ? (
                    <AvatarGroup max={3} sx={{ "& .MuiAvatar-root": { width: 34, height: 34, fontSize: 13, fontWeight: 700 } }}>
                      {(selectedTask.participants || []).map((person) => (
                        <Avatar key={person._id} src={getUserAvatar(person)} sx={{ bgcolor: colorFor(person._id) }}>
                          {getInitial(person)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  ) : (
                    <Avatar
                      src={getUserAvatar(getChatPartnerUser(selectedTask, myId))}
                      sx={{
                        width: 40, height: 40, borderRadius: 2.2, fontWeight: 800,
                        bgcolor: colorFor(getId(selectedTask.assignedTo) || selectedTask._id),
                      }}
                    >
                      {getInitial(chatTitle)}
                    </Avatar>
                  )}

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 800, fontSize: 14.5, color: chatHeaderText,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {chatTitle}
                    </Typography>

                    <Typography
                      sx={{
                        color: typingUser ? PURPLE : chatSubText, fontSize: 11,
                        fontStyle: typingUser ? "italic" : "normal",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {typingUser
                        ? `${typingUser} is typing...`
                        : `${selectedTask.title}${
                            selectedTask.recurrence?.enabled
                              ? ` • repeats ${selectedTask.recurrence.frequency}`
                              : ""
                          }`}
                    </Typography>
                  </Box>

                  {/* NEW: chat settings — wallpaper + dark mode. */}
                  <Tooltip title="Chat settings">
                    <IconButton
                      onClick={(event) => setChatSettingsAnchor(event.currentTarget)}
                      sx={{ color: chatDarkMode ? "#CFC7E6" : "#A9A2B5" }}
                    >
                      <SettingsRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={selectedTask.pinned ? "Unpin chat" : "Pin chat"}>
                    <IconButton onClick={(event) => togglePin(selectedTask, event)} sx={{ color: selectedTask.pinned ? PURPLE : (chatDarkMode ? "#CFC7E6" : "#A9A2B5") }}>
                      {selectedTask.pinned ? <PushPin fontSize="small" /> : <PushPinOutlined fontSize="small" />}
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete task">
                    <IconButton onClick={() => setDeleteDialogOpen(true)} sx={{ color: "#B42318" }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={selectedTask.status || "pending"}
                      onChange={(event) => updateTaskStatus(selectedTask._id, event.target.value)}
                      sx={{ borderRadius: 2, fontSize: 12, fontWeight: 700, bgcolor: chatDarkMode ? "#241c3d" : "transparent", color: chatDarkMode ? "#F1EDFF" : "inherit" }}
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ px: 1.4, py: 0.7, borderRadius: 2, bgcolor: chatDarkMode ? "#241c3d" : "#F8F6FB", flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 9.5, color: chatSubText }}>Due date</Typography>
                    <Typography
                      sx={{
                        fontSize: 12, fontWeight: 700, color: chatDarkMode ? "#F1EDFF" : "#38313F",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(selectedTask.dueDate)}
                    </Typography>
                  </Box>

                  {selectedTask.priority && (
                    <Box sx={{ px: 1.4, py: 0.7, borderRadius: 2, bgcolor: chatDarkMode ? "#241c3d" : "#F8F6FB", minWidth: 70 }}>
                      <Typography sx={{ fontSize: 9.5, color: chatSubText }}>Priority</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: priorityMeta(selectedTask.priority).color, textTransform: "capitalize" }}>
                        {selectedTask.priority}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* ----- chat settings menu (wallpaper + dark mode) ----- */}

              <Menu
                anchorEl={chatSettingsAnchor}
                open={Boolean(chatSettingsAnchor)}
                onClose={() => setChatSettingsAnchor(null)}
              >
                <MenuItem onClick={toggleChatDarkMode} sx={{ fontSize: 13, fontWeight: 600 }}>
                  {chatDarkMode ? "Switch to light chat" : "Switch to dark chat"}
                </MenuItem>

                <Divider />

                <Typography sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 10.5, fontWeight: 800, color: "#948DA0" }}>
                  WALLPAPER
                </Typography>

                {Object.entries(WALLPAPERS).map(([key, w]) => (
                  <MenuItem key={key} selected={wallpaper === key} onClick={() => pickWallpaper(key)} sx={{ fontSize: 13 }}>
                    <Box sx={{ width: 18, height: 18, borderRadius: 1, background: w.bg, mr: 1.2, border: "1px solid #ddd", flexShrink: 0 }} />
                    {w.label}
                  </MenuItem>
                ))}

                {/* NEW: custom wallpaper from the gallery. */}
                {customWallpaperUrl && (
                  <MenuItem
                    selected={wallpaper === "custom"}
                    onClick={() => {
                      setWallpaper("custom");
                      try { window.localStorage.setItem("chatWallpaper", "custom"); } catch {}
                      setChatSettingsAnchor(null);
                    }}
                    sx={{ fontSize: 13 }}
                  >
                    <Box
                      component="img"
                      src={customWallpaperUrl}
                      sx={{ width: 18, height: 18, borderRadius: 1, mr: 1.2, border: "1px solid #ddd", flexShrink: 0, objectFit: "cover" }}
                    />
                    My photo
                  </MenuItem>
                )}

                <MenuItem onClick={pickCustomWallpaper} sx={{ fontSize: 13, color: PURPLE_DARK, fontWeight: 700 }}>
                  <ImageIcon sx={{ fontSize: 16, mr: 1.2 }} />
                  {customWallpaperUrl ? "Choose a different photo" : "Choose from gallery"}
                </MenuItem>

                {customWallpaperUrl && (
                  <MenuItem onClick={removeCustomWallpaper} sx={{ fontSize: 13, color: "#B42318" }}>
                    <Close sx={{ fontSize: 16, mr: 1.2 }} />
                    Remove my photo wallpaper
                  </MenuItem>
                )}
              </Menu>

              {/* Hidden input for the gallery wallpaper picker above. */}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={wallpaperFileInputRef}
                onChange={handleCustomWallpaperFile}
              />

              {/* ----- checklist ----- */}

              <ChecklistPanel
                task={selectedTask}
                open={checklistOpen}
                onToggleOpen={() => setChecklistOpen((previous) => !previous)}
                onAdd={addChecklistItem}
                onToggleItem={toggleChecklistItem}
                onDeleteItem={deleteChecklistItem}
                onSetRecurrence={setChecklistRecurrence}
              />

              {/* ----- messages ----- */}

              <Box
                ref={chatScrollRef}
                onScroll={onChatScroll}
                sx={{
                  flex: 1, minHeight: 0, overflowY: "auto",
                  px: { xs: 1, sm: 2 }, py: { xs: 1.2, sm: 1.8 },
                  background: currentChatBackground,
                  WebkitOverflowScrolling: "touch",
                  "&::-webkit-scrollbar": { width: 5 },
                  "&::-webkit-scrollbar-thumb": { background: "#D8D1E5", borderRadius: 10 },
                }}
              >
                {taskLoading ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320 }}>
                    <CircularProgress size={25} sx={{ color: PURPLE }} />
                  </Stack>
                ) : !selectedTask.messages?.length ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 320, textAlign: "center" }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: "#EEE7FF", color: PURPLE, mb: 1.5 }}>
                      <Send />
                    </Avatar>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: chatDarkMode ? "#F1EDFF" : "inherit" }}>No messages yet</Typography>
                    <Typography sx={{ color: chatDarkMode ? "#B8AFCF" : "#8D8797", fontSize: 12, mt: 0.5 }}>
                      Start the conversation with {chatTitle}.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={0.9}>
                    {/* Sentinel for auto-loading older messages — sits
                        above everything else in the list. */}
                    <div ref={loadMoreSentinelRef} style={{ height: 1 }} />

                    {hasMoreMessages && (
                      <Stack alignItems="center" sx={{ pb: 1 }}>
                        <Button
                          size="small"
                          onClick={loadOlderMessages}
                          disabled={loadingOlder}
                          startIcon={loadingOlder ? <CircularProgress size={13} /> : null}
                          sx={{ textTransform: "none", fontSize: 11.5, fontWeight: 700, color: PURPLE_DARK, borderRadius: 5, bgcolor: chatDarkMode ? "rgba(124,58,237,0.15)" : "transparent" }}
                        >
                          {loadingOlder ? "Loading..." : "Load older messages"}
                        </Button>
                      </Stack>
                    )}

                    {selectedTask.messages.map((message, index) => {
                      const isMine = sameId(message.sender, myId);
                      const previous = selectedTask.messages[index - 1];
                      const showDay =
                        !previous ||
                        dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

                      const showSender =
                        selectedTask.mode === "GROUP" &&
                        !isMine &&
                        (!previous || !sameId(previous.sender, message.sender) || showDay);

                      const isRemoved = message.deleted || message.hiddenForMe;

                      const canEdit =
                        isMine &&
                        !isRemoved &&
                        (Date.now() - new Date(message.createdAt).getTime()) / 36e5 < 24;

                      const hasCaption =
                        message.text && message.text !== "📷 Photo";

                      return (
                        <Box key={message._id}>
                          {showDay && (
                            <Stack alignItems="center" sx={{ py: 1 }}>
                              <Chip
                                size="small"
                                label={dayLabel(message.createdAt)}
                                sx={{ height: 21, fontSize: 10, fontWeight: 700, bgcolor: chatDarkMode ? "rgba(255,255,255,0.08)" : "#EFEBF7", color: chatDarkMode ? "#D7D0EA" : "#6F6880" }}
                              />
                            </Stack>
                          )}

                          <Box sx={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start" }}>
                            <Box sx={{ maxWidth: { xs: "86%", sm: "72%" }, minWidth: 0 }}>
                              {showSender && (
                                <Typography
                                  sx={{
                                    fontSize: 10.5, fontWeight: 800, ml: 1, mb: 0.3,
                                    color: colorFor(getId(message.sender)),
                                  }}
                                >
                                  {message.senderName}
                                </Typography>
                              )}

                              <Paper
                                elevation={0}
                                onContextMenu={(event) => {
                                  if (isRemoved) return;
                                  event.preventDefault();
                                  setMessageMenu({ anchor: event.currentTarget, message });
                                }}
                                sx={{
                                  p: message.photoUrl && !isRemoved ? 0.6 : 1.1,
                                  borderRadius: isMine ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
                                  bgcolor: isRemoved ? (chatDarkMode ? "#241c3d" : "#F3F1F7") : isMine ? PURPLE : bubbleOtherBg,
                                  color: isRemoved ? (chatDarkMode ? "#8A82A3" : "#9A94A3") : isMine ? "#fff" : bubbleOtherColor,
                                  border: isMine || isRemoved ? "none" : bubbleOtherBorder,
                                  boxShadow: "0 2px 8px rgba(30,20,50,.04)",
                                }}
                              >
                                {message.photoUrl && !isRemoved && (
                                  <Box sx={{ position: "relative", "&:hover .photo-actions": { opacity: 1 } }}>
                                    <Box
                                      component="img"
                                      src={message.photoUrl}
                                      alt="Attachment"
                                      loading="lazy"
                                      onClick={() => setViewerPhoto(message)}
                                      sx={{
                                        display: "block", width: "100%", maxWidth: 280,
                                        maxHeight: 300, objectFit: "cover",
                                        borderRadius: 2, cursor: "pointer",
                                      }}
                                    />

                                    <Stack
                                      className="photo-actions"
                                      direction="row"
                                      spacing={0.5}
                                      sx={{
                                        position: "absolute", top: 6, right: 6,
                                        opacity: { xs: 1, md: 0 }, transition: "0.2s",
                                      }}
                                    >
                                      <Tooltip title="Download">
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            downloadImage(
                                              message.photoUrl,
                                              `task-photo-${message._id}.jpg`
                                            )
                                          }
                                          sx={{
                                            width: 27, height: 27,
                                            bgcolor: "rgba(20,12,35,.55)", color: "#fff",
                                            "&:hover": { bgcolor: "rgba(20,12,35,.75)" },
                                          }}
                                        >
                                          <Download sx={{ fontSize: 15 }} />
                                        </IconButton>
                                      </Tooltip>

                                      {isMine && (
                                        <Tooltip title="Delete for everyone">
                                          <IconButton
                                            size="small"
                                            onClick={() => deleteMessageById(message, "everyone")}
                                            sx={{
                                              width: 27, height: 27,
                                              bgcolor: "rgba(20,12,35,.55)", color: "#fff",
                                              "&:hover": { bgcolor: "rgba(180,35,24,.85)" },
                                            }}
                                          >
                                            <Delete sx={{ fontSize: 15 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Stack>
                                  </Box>
                                )}

                                {(hasCaption || isRemoved || !message.photoUrl) && (
                                  <Typography
                                    sx={{
                                      fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      fontStyle: isRemoved ? "italic" : "normal",
                                      px: message.photoUrl && !isRemoved ? 0.6 : 0,
                                      pt: message.photoUrl && !isRemoved ? 0.6 : 0,
                                    }}
                                  >
                                    {message.deleted
                                      ? "This message was deleted"
                                      : message.hiddenForMe
                                      ? "You deleted this message"
                                      : message.text}
                                  </Typography>
                                )}

                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="flex-end"
                                  spacing={0.4}
                                  sx={{ mt: 0.35, px: message.photoUrl && !isRemoved ? 0.6 : 0, pb: message.photoUrl && !isRemoved ? 0.3 : 0 }}
                                >
                                  {message.editedAt && !isRemoved && (
                                    <Typography sx={{ fontSize: 9, opacity: 0.7 }}>edited</Typography>
                                  )}

                                  {!isRemoved && (
                                    <Typography sx={{ fontSize: 9, opacity: 0.65 }}>
                                      {formatTime(message.createdAt)}
                                    </Typography>
                                  )}

                                  {isMine && !isRemoved && (
                                    <MessageTicks message={message} memberIds={memberIds} myId={myId} />
                                  )}

                                  {!isRemoved && (
                                    <IconButton
                                      size="small"
                                      onClick={(event) =>
                                        setMessageMenu({ anchor: event.currentTarget, message })
                                      }
                                      sx={{ p: 0.15, ml: 0.2 }}
                                    >
                                      <MoreVert sx={{ fontSize: 13, color: isMine ? "#fff" : "#A9A2B5", opacity: 0.75 }} />
                                    </IconButton>
                                  )}
                                </Stack>
                              </Paper>
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}

                    <div ref={chatBottomRef} />
                  </Stack>
                )}
              </Box>

              {/* ----- composer ----- */}

              <Box
                sx={{
                  p: { xs: 0.8, sm: 1.2 },
                  pb: { xs: "max(8px, env(safe-area-inset-bottom))", sm: 1.2 },
                  borderTop: `1px solid ${chatBorderColor}`, bgcolor: chatSurfaceBg, flexShrink: 0,
                }}
              >
                <Stack direction="row" spacing={0.8} alignItems="flex-end">
                  <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={sendPhoto} />

                  <Tooltip title="Send photo (text box becomes the caption)">
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sendingMessage}
                      sx={{
                        width: 40, height: 40, color: PURPLE, bgcolor: chatDarkMode ? "rgba(124,58,237,0.18)" : "#F5F1FF", flexShrink: 0,
                        "&:hover": { bgcolor: chatDarkMode ? "rgba(124,58,237,0.28)" : "#EDE5FF" },
                      }}
                    >
                      <ImageIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={messageText}
                    onChange={handleMessageTextChange}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2.5, bgcolor: composerFieldBg, fontSize: 13, py: 0.3,
                        color: chatDarkMode ? "#F1EDFF" : "inherit",
                      },
                    }}
                  />

                  <IconButton
                    onClick={sendMessage}
                    disabled={sendingMessage || !messageText.trim()}
                    sx={{
                      width: 42, height: 42, bgcolor: PURPLE, color: "#fff", flexShrink: 0,
                      "&:hover": { bgcolor: PURPLE_DARK },
                      "&.Mui-disabled": { bgcolor: "#E7E2EE", color: "#AAA4B3" },
                    }}
                  >
                    {sendingMessage ? (
                      <CircularProgress size={18} sx={{ color: "#fff" }} />
                    ) : (
                      <Send fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
              </Box>
            </Paper>
          )}
        </Box>
      </Box>

      {/* ---------------- message menu ---------------- */}

      <Menu
        anchorEl={messageMenu?.anchor}
        open={Boolean(messageMenu)}
        onClose={() => setMessageMenu(null)}
      >
        {messageMenu?.message?.photoUrl && (
          <MenuItem
            onClick={() => {
              downloadImage(messageMenu.message.photoUrl, `task-photo-${messageMenu.message._id}.jpg`);
              setMessageMenu(null);
            }}
            sx={{ fontSize: 13 }}
          >
            <Download sx={{ fontSize: 16, mr: 1 }} /> Download photo
          </MenuItem>
        )}

        {sameId(messageMenu?.message?.sender, myId) &&
          (Date.now() - new Date(messageMenu?.message?.createdAt || 0).getTime()) / 36e5 < 24 && (
            <MenuItem onClick={() => startEditMessage(messageMenu.message)} sx={{ fontSize: 13 }}>
              <Edit sx={{ fontSize: 16, mr: 1 }} /> Edit message
            </MenuItem>
          )}

        <MenuItem onClick={() => deleteMessageById(messageMenu.message, "me")} sx={{ fontSize: 13 }}>
          <Delete sx={{ fontSize: 16, mr: 1 }} /> Delete for me
        </MenuItem>

        {sameId(messageMenu?.message?.sender, myId) && (
          <MenuItem
            onClick={() => deleteMessageById(messageMenu.message, "everyone")}
            sx={{ fontSize: 13, color: "#B42318" }}
          >
            <Delete sx={{ fontSize: 16, mr: 1 }} /> Delete for everyone
          </MenuItem>
        )}
      </Menu>

      {/* ---------------- photo viewer ---------------- */}

      <Dialog
        open={Boolean(viewerPhoto)}
        onClose={() => setViewerPhoto(null)}
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, bgcolor: "#141020" } }}
      >
        {viewerPhoto && (
          <>
            <Box
              component="img"
              src={viewerPhoto.photoUrl}
              alt="Attachment"
              sx={{ display: "block", maxWidth: "100%", maxHeight: "72vh" }}
            />

            {viewerPhoto.text && viewerPhoto.text !== "📷 Photo" && (
              <Typography sx={{ color: "#EDE9F7", fontSize: 13, px: 2, pt: 1.5 }}>
                {viewerPhoto.text}
              </Typography>
            )}

            <DialogActions sx={{ px: 2, pb: 1.5 }}>
              <Typography sx={{ flex: 1, color: "#9A93AB", fontSize: 11 }}>
                {viewerPhoto.senderName} • {formatTime(viewerPhoto.createdAt)}
              </Typography>

              <Button
                startIcon={<Download />}
                onClick={() => downloadImage(viewerPhoto.photoUrl, `task-photo-${viewerPhoto._id}.jpg`)}
                sx={{ textTransform: "none", fontWeight: 700, color: "#DCD3F5" }}
              >
                Download
              </Button>

              {sameId(viewerPhoto.sender, myId) && (
                <Button
                  startIcon={<Delete />}
                  onClick={() => {
                    deleteMessageById(viewerPhoto, "everyone");
                    setViewerPhoto(null);
                  }}
                  sx={{ textTransform: "none", fontWeight: 700, color: "#FCA5A5" }}
                >
                  Delete
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ---------------- create task ---------------- */}

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!creating) {
            setCreateOpen(false);
            resetCreateForm();
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3, m: { xs: 1.5, sm: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Create New Task</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
            />

            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <FormControl fullWidth>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.7, color: "#57505F" }}>
                Assignment type
              </Typography>

              <Select
                value={mode}
                onChange={(event) => {
                  setMode(event.target.value);
                  setAssignedTo("");
                  setAssignedToList([]);
                }}
                sx={{ borderRadius: 2 }}
              >
                {MODE_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{item.label}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: "#918A9A" }}>{item.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {mode === "INDIVIDUAL" ? (
              <FormControl fullWidth>
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.7, color: "#57505F" }}>
                  Assign to
                </Typography>

                <Select
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  displayEmpty
                  disabled={usersLoading}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">Select a person</MenuItem>

                  {users.map((member) => (
                    <MenuItem key={member._id} value={member._id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={getUserAvatar(member)} sx={{ width: 27, height: 27, fontSize: 11, bgcolor: colorFor(member._id) }}>
                          {getInitial(member)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                            {getUserName(member)}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: "#8E8797", textTransform: "capitalize" }}>
                            {member.role}
                          </Typography>
                        </Box>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <FormControl fullWidth>
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.7, color: "#57505F" }}>
                  Select people
                </Typography>

                <Select
                  multiple
                  value={assignedToList}
                  onChange={(event) =>
                    setAssignedToList(
                      typeof event.target.value === "string"
                        ? event.target.value.split(",")
                        : event.target.value
                    )
                  }
                  displayEmpty
                  disabled={usersLoading}
                  sx={{ borderRadius: 2 }}
                  renderValue={(selected) => {
                    if (!selected.length) {
                      return (
                        <Typography sx={{ color: "#9A94A3", fontSize: 13 }}>
                          Select people
                        </Typography>
                      );
                    }

                    return (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
                        {selected.map((id) => (
                          <Chip
                            key={id}
                            size="small"
                            label={getUserName(users.find((item) => sameId(item._id, id)))}
                            sx={{ borderRadius: 1.5 }}
                          />
                        ))}
                      </Stack>
                    );
                  }}
                >
                  {users.map((member) => (
                    <MenuItem key={member._id} value={member._id}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar src={getUserAvatar(member)} sx={{ width: 27, height: 27, fontSize: 11, bgcolor: colorFor(member._id) }}>
                          {getInitial(member)}
                        </Avatar>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {getUserName(member)}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth
                type="date"
                label="Due date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.7, color: "#57505F" }}>
                  Priority
                </Typography>
                <Select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Stack direction="row" alignItems="center" spacing={0.8}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: option.color }} />
                        <Typography sx={{ fontSize: 13 }}>{option.label}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* checklist builder */}

            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #EAE5F2", bgcolor: "#FBFAFD" }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 0.3 }}>Checklist</Typography>
              <Typography sx={{ fontSize: 10.5, color: "#918A9A", mb: 1.2 }}>
                Break the task into steps. Progress shows at the top of the chat.
              </Typography>

              {newChecklist.map((item, index) => (
                <Stack key={`${item}-${index}`} direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.4 }}>
                  <Check sx={{ fontSize: 15, color: "#C0B8CE" }} />
                  <Typography sx={{ flex: 1, fontSize: 12.5 }}>{item}</Typography>
                  <IconButton
                    size="small"
                    onClick={() => setNewChecklist((previous) => previous.filter((_, i) => i !== index))}
                    sx={{ p: 0.4 }}
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              ))}

              <Stack direction="row" spacing={0.8} sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a step..."
                  value={checklistDraft}
                  onChange={(event) => setChecklistDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && checklistDraft.trim()) {
                      event.preventDefault();
                      setNewChecklist((previous) => [...previous, checklistDraft.trim()]);
                      setChecklistDraft("");
                    }
                  }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "#fff", fontSize: 12.5 } }}
                />

                <IconButton
                  onClick={() => {
                    if (!checklistDraft.trim()) return;
                    setNewChecklist((previous) => [...previous, checklistDraft.trim()]);
                    setChecklistDraft("");
                  }}
                  sx={{ width: 36, height: 36, bgcolor: "#F3EEFF", color: PURPLE }}
                >
                  <Add sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>

              <FormControl fullWidth size="small" sx={{ mt: 1.2 }}>
                <Select
                  value={checklistRepeat}
                  onChange={(event) => setChecklistRepeat(event.target.value)}
                  displayEmpty
                  sx={{ borderRadius: 2, fontSize: 12.5, bgcolor: "#fff" }}
                >
                  <MenuItem value="">Checklist does not repeat</MenuItem>
                  {RECURRENCE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      Reset every {option.label.toLowerCase()}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* task recurrence */}

            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #EAE5F2", bgcolor: "#FBFAFD" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>Recurring task</Typography>
                  <Typography sx={{ fontSize: 10.5, color: "#918A9A", mt: 0.2 }}>
                    Creates a fresh task automatically after completion.
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant={recurrenceEnabled ? "contained" : "outlined"}
                  onClick={() => setRecurrenceEnabled((previous) => !previous)}
                  sx={{
                    minWidth: 80, borderRadius: 2, textTransform: "none", fontWeight: 700,
                    ...(recurrenceEnabled && { bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }),
                  }}
                >
                  {recurrenceEnabled ? "Enabled" : "Off"}
                </Button>
              </Stack>

              {recurrenceEnabled && (
                <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                  <Select
                    value={recurrenceFrequency}
                    onChange={(event) => setRecurrenceFrequency(event.target.value)}
                    sx={{ borderRadius: 2, bgcolor: "#fff" }}
                  >
                    {RECURRENCE_OPTIONS.map((item) => (
                      <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Paper>

            {mode !== "INDIVIDUAL" && assignedToList.length === 1 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Select at least two people for {mode === "GROUP" ? "a group task" : "separate assignment"}.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setCreateOpen(false);
              resetCreateForm();
            }}
            disabled={creating}
            sx={{ textTransform: "none", fontWeight: 700, color: "#686172" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateTask}
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <Add />}
            sx={{
              borderRadius: 2, textTransform: "none", fontWeight: 700,
              bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK },
            }}
          >
            {creating ? "Creating..." : "Create Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- edit message ---------------- */}

      <Dialog
        open={Boolean(editingMessage)}
        onClose={() => setEditingMessage(null)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Edit Message</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            sx={{ mt: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingMessage(null)} sx={{ textTransform: "none", fontWeight: 700 }}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={saveEditedMessage}
            disabled={!editText.trim()}
            sx={{
              borderRadius: 2, textTransform: "none", fontWeight: 700,
              bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- delete task ---------------- */}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Task?</DialogTitle>

        <DialogContent>
          <Typography sx={{ color: "#746D7D", fontSize: 13 }}>
            This permanently deletes the task, its checklist and the whole conversation.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={deleteCurrentTask}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <Delete />}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            {deleting ? "Deleting..." : "Delete Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   PROTECTED PAGE — TasksInner is wrapped in Suspense because it
   calls useSearchParams(), which Next.js requires a Suspense
   boundary for (otherwise the production build fails).
========================================================= */

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={null}>
        <TasksInner />
      </Suspense>
    </ProtectedRoute>
  );
}