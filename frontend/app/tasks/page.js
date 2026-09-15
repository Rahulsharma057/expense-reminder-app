"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Add,
  ArrowBack,
  AttachFile,
  Check,
  CheckCircle,
  Delete,
  Edit,
  Groups,
  Image as ImageIcon,
  Refresh,
  Send,
  TaskAlt,
  AccessTime,
} from "@mui/icons-material";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";

/* =========================================================
   CONSTANTS
========================================================= */

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "in-progress",
    label: "In Progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

const MODE_OPTIONS = [
  {
    value: "INDIVIDUAL",
    label: "Individual",
    description: "Assign task to one user",
  },
  {
    value: "SEPARATE",
    label: "Separate",
    description: "Create separate task for each user",
  },
  {
    value: "GROUP",
    label: "Group",
    description: "One shared task and chat",
  },
];

const RECURRENCE_OPTIONS = [
  {
    value: "daily",
    label: "Daily",
  },
  {
    value: "weekly",
    label: "Weekly",
  },
  {
    value: "monthly",
    label: "Monthly",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const getUserName = (user) => {
  if (!user) return "User";

  if (typeof user === "string") {
    return user;
  }

  return (
    user.name ||
    user.username ||
    user.email ||
    "User"
  );
};

const getInitial = (user) => {
  const name = getUserName(user);

  return (
    name.trim().charAt(0).toUpperCase() || "U"
  );
};

const formatDate = (date) => {
  if (!date) return "No due date";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return date;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (date) => {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   PAGE
========================================================= */

function TasksInner() {
  const fileInputRef = useRef(null);
  const chatBottomRef = useRef(null);
  const socketRef = useRef(null);

  const [user, setUser] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [taskLoading, setTaskLoading] =
    useState(false);

  const [activeFilter, setActiveFilter] =
    useState("all");

  /* =======================================================
     CREATE TASK STATES
  ======================================================= */

  const [createOpen, setCreateOpen] =
    useState(false);

  const [mode, setMode] =
    useState("INDIVIDUAL");

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [assignedTo, setAssignedTo] =
    useState("");

  const [assignedToList, setAssignedToList] =
    useState([]);

  const [dueDate, setDueDate] =
    useState("");

  const [recurrenceEnabled, setRecurrenceEnabled] =
    useState(false);

  const [recurrenceFrequency, setRecurrenceFrequency] =
    useState("daily");

  const [creating, setCreating] =
    useState(false);

  /* =======================================================
     MESSAGE STATES
  ======================================================= */

  const [messageText, setMessageText] =
    useState("");

  const [sendingMessage, setSendingMessage] =
    useState(false);

  const [editingMessage, setEditingMessage] =
    useState(null);

  const [editText, setEditText] =
    useState("");

  /* =======================================================
     DELETE
  ======================================================= */

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  useEffect(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error(
        "User parse error:",
        error
      );
    }
  }, []);

  /* =======================================================
     LOAD TASKS
  ======================================================= */

  const loadTasks = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/tasks/mine"
      );

      const data = Array.isArray(
        response.data
      )
        ? response.data
        : response.data?.tasks || [];

      setTasks(data);
    } catch (error) {
      console.error(
        "Load tasks error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not load tasks"
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  /* =======================================================
     LOAD USERS / MEMBERS
  ======================================================= */

  const loadUsers = async () => {
    try {
      setUsersLoading(true);

      const response = await api.get(
        "/users"
      );

      const data = Array.isArray(
        response.data
      )
        ? response.data
        : response.data?.users ||
          response.data?.data ||
          [];

      const activeMembers = data.filter(
        (item) =>
          item?.isActive !== false &&
          String(item?.role || "").toLowerCase() ===
            "member"
      );

      setUsers(activeMembers);
    } catch (error) {
      console.error(
        "Load users error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not load users"
        )
      );
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* =======================================================
     REALTIME (socket.io)
     - joins the user's own room so "newTask" / "notification"
       events can reach them anywhere in the app
     - joins/leaves the currently open task's room so chat
       messages, edits, and status changes appear live without
       needing to close and reopen the task
  ======================================================= */

  useEffect(() => {
    if (!user?._id) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.emit("join", user._id);

    const onNewTask = (incomingTask) => {
      setTasks((previous) => {
        const exists = previous.some(
          (task) => task._id === incomingTask._id
        );
        if (exists) return previous;
        return [incomingTask, ...previous];
      });
    };

    socket.on("newTask", onNewTask);

    return () => {
      socket.off("newTask", onNewTask);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!selectedTask?._id || !user?._id) return;

    const socket = getSocket();
    const taskId = selectedTask._id;

    socket.emit("joinTask", taskId);

    const onNewMessage = (payload) => {
      if (String(payload.taskId) !== String(taskId)) return;

      setSelectedTask((previous) => {
        if (!previous) return previous;
        const exists = previous.messages?.some(
          (message) => message._id === payload.message._id
        );
        if (exists) return previous;
        return {
          ...previous,
          messages: [
            ...(previous.messages || []),
            payload.message,
          ],
        };
      });

      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 50);
    };

    const onMessageEdited = (payload) => {
      if (String(payload.taskId) !== String(taskId)) return;

      setSelectedTask((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          messages: previous.messages.map((message) =>
            message._id === payload.messageId
              ? {
                  ...message,
                  text: payload.text,
                  editedAt: payload.editedAt,
                }
              : message
          ),
        };
      });
    };

    const onStatusUpdated = (payload) => {
      if (String(payload.taskId) !== String(taskId)) return;

      setSelectedTask((previous) =>
        previous ? { ...previous, status: payload.status } : previous
      );

      setTasks((previous) =>
        previous.map((task) =>
          task._id === payload.taskId
            ? { ...task, status: payload.status }
            : task
        )
      );
    };

    socket.on("newMessage", onNewMessage);
    socket.on("messageEdited", onMessageEdited);
    socket.on("statusUpdated", onStatusUpdated);

    return () => {
      socket.emit("leaveTask", taskId);
      socket.off("newMessage", onNewMessage);
      socket.off("messageEdited", onMessageEdited);
      socket.off("statusUpdated", onStatusUpdated);
    };
  }, [selectedTask?._id, user?._id]);

  /* =======================================================
     OPEN TASK
  ======================================================= */

  const openTask = async (task) => {
    try {
      setTaskLoading(true);

      const response = await api.get(
        `/tasks/${task._id}`
      );

      setSelectedTask(response.data);

      try {
        await api.patch(
          `/tasks/${task._id}/messages/seen`
        );
      } catch (seenError) {
        console.error(
          "Mark messages seen error:",
          seenError
        );
      }

      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 100);
    } catch (error) {
      console.error(
        "Open task error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not open task"
        )
      );
    } finally {
      setTaskLoading(false);
    }
  };

  /* =======================================================
     CLOSE TASK / MOBILE BACK
  ======================================================= */

  const closeTask = () => {
    setSelectedTask(null);
    setEditingMessage(null);
    setEditText("");
    setMessageText("");
    setDeleteDialogOpen(false);
  };

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredTasks = useMemo(() => {
    if (activeFilter === "all") {
      return tasks;
    }

    return tasks.filter(
      (task) =>
        task.status === activeFilter
    );
  }, [tasks, activeFilter]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const counts = useMemo(() => {
    return {
      all: tasks.length,

      pending: tasks.filter(
        (task) =>
          task.status === "pending"
      ).length,

      inProgress: tasks.filter(
        (task) =>
          task.status === "in-progress"
      ).length,

      completed: tasks.filter(
        (task) =>
          task.status === "completed"
      ).length,
    };
  }, [tasks]);

  /* =======================================================
     RESET CREATE FORM
  ======================================================= */

  const resetCreateForm = () => {
    setMode("INDIVIDUAL");
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setAssignedToList([]);
    setDueDate("");
    setRecurrenceEnabled(false);
    setRecurrenceFrequency("daily");
  };

  /* =======================================================
     CREATE TASK
  ======================================================= */

  const handleCreateTask = async () => {
    if (!title.trim()) {
      toast.error(
        "Task title is required"
      );
      return;
    }

    if (
      mode === "INDIVIDUAL" &&
      !assignedTo
    ) {
      toast.error(
        "Please select a user"
      );
      return;
    }

    if (
      (mode === "SEPARATE" ||
        mode === "GROUP") &&
      assignedToList.length < 2
    ) {
      toast.error(
        "Please select at least two users"
      );
      return;
    }

    try {
      setCreating(true);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        mode,
        dueDate,

        recurrence: {
          enabled: recurrenceEnabled,
          frequency: recurrenceEnabled
            ? recurrenceFrequency
            : null,
        },
      };

      if (mode === "INDIVIDUAL") {
        payload.assignedTo =
          assignedTo;
      } else {
        payload.assignedToList =
          assignedToList;
      }

      const response = await api.post(
        "/tasks",
        payload
      );

      toast.success(
        "Task created successfully"
      );

      setCreateOpen(false);
      resetCreateForm();

      await loadTasks();

      if (
        mode === "INDIVIDUAL" ||
        mode === "GROUP"
      ) {
        const createdTask =
          response.data;

        if (createdTask?._id) {
          setSelectedTask(
            createdTask
          );
        }
      }
    } catch (error) {
      console.error(
        "Create task error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not create task"
        )
      );
    } finally {
      setCreating(false);
    }
  };

  /* =======================================================
     UPDATE STATUS
  ======================================================= */

  const updateTaskStatus = async (
    taskId,
    status
  ) => {
    try {
      const response = await api.patch(
        `/tasks/${taskId}/status`,
        { status }
      );

      toast.success(
        "Task status updated"
      );

      const updatedTask =
        response.data?.task ||
        response.data;

      setTasks((previous) =>
        previous.map((task) =>
          task._id === taskId
            ? {
                ...task,
                ...updatedTask,
              }
            : task
        )
      );

      setSelectedTask((previous) =>
        previous?._id === taskId
          ? {
              ...previous,
              ...updatedTask,
            }
          : previous
      );
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not update status"
        )
      );
    }
  };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const sendMessage = async () => {
    if (!selectedTask?._id) {
      return;
    }

    if (!messageText.trim()) {
      return;
    }

    try {
      setSendingMessage(true);

      const response = await api.post(
        `/tasks/${selectedTask._id}/messages`,
        {
          text: messageText.trim(),
        }
      );

      setSelectedTask((previous) => {
        const exists = previous?.messages?.some(
          (message) => message._id === response.data._id
        );
        if (exists) return previous;
        return {
          ...previous,
          messages: [
            ...(previous?.messages || []),
            response.data,
          ],
        };
      });

      setMessageText("");

      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 50);
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not send message"
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /* =======================================================
     SEND PHOTO
  ======================================================= */

  const sendPhoto = async (event) => {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (
      !file ||
      !selectedTask?._id
    ) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      toast.error(
        "Please select an image"
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      toast.error(
        "Image must be smaller than 5MB"
      );
      return;
    }

    try {
      setSendingMessage(true);

      const formData = new FormData();

      formData.append(
        "photo",
        file
      );

      if (messageText.trim()) {
        formData.append(
          "caption",
          messageText.trim()
        );
      }

      const response =
        await api.post(
          `/tasks/${selectedTask._id}/messages/photo`,
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
          }
        );

      setSelectedTask((previous) => {
        const exists = previous?.messages?.some(
          (message) => message._id === response.data._id
        );
        if (exists) return previous;
        return {
          ...previous,
          messages: [
            ...(previous?.messages || []),
            response.data,
          ],
        };
      });

      setMessageText("");

      toast.success(
        "Photo sent"
      );

      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      }, 50);
    } catch (error) {
      console.error(
        "Photo message error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not send photo"
        )
      );
    } finally {
      setSendingMessage(false);
    }
  };

  /* =======================================================
     EDIT MESSAGE
  ======================================================= */

  const startEditMessage = (
    message
  ) => {
    setEditingMessage(message);
    setEditText(
      message.text || ""
    );
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText("");
  };

  const saveEditedMessage = async () => {
    if (!editingMessage?._id) {
      return;
    }

    if (!editText.trim()) {
      toast.error(
        "Message cannot be empty"
      );
      return;
    }

    try {
      const response =
        await api.patch(
          `/tasks/${selectedTask._id}/messages/${editingMessage._id}`,
          {
            text: editText.trim(),
          }
        );

      setSelectedTask(
        (previous) => ({
          ...previous,

          messages:
            previous.messages.map(
              (message) =>
                message._id ===
                editingMessage._id
                  ? response.data
                  : message
            ),
        })
      );

      toast.success(
        "Message updated"
      );

      cancelEditMessage();
    } catch (error) {
      console.error(
        "Edit message error:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Could not edit message"
        )
      );
    }
  };

  /* =======================================================
     DELETE TASK
  ======================================================= */

  const deleteCurrentTask =
    async () => {
      if (!selectedTask?._id) {
        return;
      }

      try {
        setDeleting(true);

        await api.delete(
          `/tasks/${selectedTask._id}`
        );

        toast.success(
          "Task deleted successfully"
        );

        setTasks((previous) =>
          previous.filter(
            (task) =>
              task._id !==
              selectedTask._id
          )
        );

        closeTask();
      } catch (error) {
        console.error(
          "Delete task error:",
          error
        );

        toast.error(
          getErrorMessage(
            error,
            "Could not delete task"
          )
        );
      } finally {
        setDeleting(false);
      }
    };

  /* =======================================================
     PARTICIPANTS
  ======================================================= */

  const getParticipants = (
    task
  ) => {
    if (task?.mode === "GROUP") {
      return task.participants || [];
    }

    return task?.assignedTo
      ? [task.assignedTo]
      : [];
  };

  /* =======================================================
     STATUS CHIP
  ======================================================= */

  const getStatusChip = (
    status
  ) => {
    if (status === "completed") {
      return (
        <Chip
          size="small"
          icon={<CheckCircle />}
          label="Completed"
          sx={{
            fontWeight: 700,
            borderRadius: 2,
          }}
        />
      );
    }

    if (
      status === "in-progress"
    ) {
      return (
        <Chip
          size="small"
          icon={<AccessTime />}
          label="In Progress"
          sx={{
            fontWeight: 700,
            borderRadius: 2,
          }}
        />
      );
    }

    return (
      <Chip
        size="small"
        icon={<TaskAlt />}
        label="Pending"
        sx={{
          fontWeight: 700,
          borderRadius: 2,
        }}
      />
    );
  };

  /* =======================================================
     JSX
  ======================================================= */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#FAF9FF",
        background:
          "linear-gradient(180deg, #FAF9FF 0%, #FFFFFF 55%)",
        overflowX: "hidden",
      }}
    >
      {/* =================================================
          NAVBAR
      ================================================= */}

      <Box
        sx={{
          display: {
            xs: selectedTask
              ? "none"
              : "block",
            md: "block",
          },
        }}
      >
        <Navbar />
      </Box>

      {/* =================================================
          PAGE CONTAINER
      ================================================= */}

      <Box
        sx={{
          maxWidth: 1500,
          mx: "auto",

          px: {
            xs: selectedTask
              ? 0
              : 1.5,
            sm: 2.5,
            md: 3,
          },

          py: {
            xs: selectedTask
              ? 0
              : 2,
            sm: 2.5,
            md: 3,
          },
        }}
      >
        {/* =================================================
            PAGE HEADER
        ================================================= */}

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
          spacing={2}
          sx={{
            mb: 2.5,

            display: {
              xs: selectedTask
                ? "none"
                : "flex",
              md: "flex",
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 24,
                  sm: 28,
                },
                fontWeight: 800,
                color: "#171225",
                letterSpacing: -0.6,
              }}
            >
              Tasks
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                color: "#77728A",
                fontSize: 13.5,
              }}
            >
              Assign, track and discuss
              your tasks
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              width: {
                xs: "100%",
                sm: "auto",
              },
            }}
          >
            <Tooltip title="Refresh">
              <IconButton
                onClick={loadTasks}
                disabled={loading}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2.5,
                  border:
                    "1px solid #E7E1F5",
                  bgcolor: "#fff",
                }}
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
                minHeight: 42,
                borderRadius: 2.5,
                px: 2,
                textTransform:
                  "none",
                fontWeight: 700,
                bgcolor: "#7C3AED",
                boxShadow:
                  "0 8px 20px rgba(124,58,237,.20)",
                "&:hover": {
                  bgcolor: "#6D28D9",
                },
              }}
            >
              Create Task
            </Button>
          </Stack>
        </Stack>

        {/* =================================================
            FILTERS
        ================================================= */}

        <Paper
          elevation={0}
          sx={{
            p: 1,
            mb: 2,
            borderRadius: 3,
            border:
              "1px solid #ECE8F5",
            bgcolor: "#fff",

            display: {
              xs: selectedTask
                ? "none"
                : "block",
              md: "block",
            },
          }}
        >
          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              overflowX: "auto",

              "&::-webkit-scrollbar":
                {
                  display: "none",
                },
            }}
          >
            {[
              {
                key: "all",
                label: "All",
                count: counts.all,
              },
              {
                key: "pending",
                label: "Pending",
                count: counts.pending,
              },
              {
                key: "in-progress",
                label: "In Progress",
                count:
                  counts.inProgress,
              },
              {
                key: "completed",
                label: "Completed",
                count:
                  counts.completed,
              },
            ].map((filter) => (
              <Button
                key={filter.key}
                onClick={() =>
                  setActiveFilter(
                    filter.key
                  )
                }
                sx={{
                  flexShrink: 0,
                  minWidth: "auto",
                  borderRadius: 2,
                  px: 1.6,
                  py: 0.9,
                  textTransform:
                    "none",
                  fontWeight: 700,
                  color:
                    activeFilter ===
                    filter.key
                      ? "#fff"
                      : "#686176",
                  bgcolor:
                    activeFilter ===
                    filter.key
                      ? "#7C3AED"
                      : "transparent",

                  "&:hover": {
                    bgcolor:
                      activeFilter ===
                      filter.key
                        ? "#6D28D9"
                        : "#F5F2FA",
                  },
                }}
              >
                {filter.label}

                <Box
                  component="span"
                  sx={{
                    ml: 0.8,
                    minWidth: 21,
                    height: 21,
                    px: 0.5,
                    borderRadius: 10,
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    fontSize: 11,
                    bgcolor:
                      activeFilter ===
                      filter.key
                        ? "rgba(255,255,255,.18)"
                        : "#F1EDF8",
                  }}
                >
                  {filter.count}
                </Box>
              </Button>
            ))}
          </Stack>
        </Paper>

        {/* =================================================
            MAIN GRID
        ================================================= */}

        <Box
          sx={{
            display: "grid",

            gridTemplateColumns: {
              xs: "1fr",
              md: selectedTask
                ? "minmax(320px, 430px) minmax(0, 1fr)"
                : "1fr",
            },

            gap: {
              xs: 0,
              md: 2,
            },

            alignItems: "stretch",

            position: "relative",

            minHeight: {
              xs: selectedTask
                ? "100dvh"
                : "calc(100dvh - 155px)",
              md: 650,
            },
          }}
        >
          {/* =================================================
              TASK LIST
          ================================================= */}

          <Paper
            elevation={0}
            sx={{
              display: {
                xs: selectedTask
                  ? "none"
                  : "flex",
                md: "flex",
              },

              flexDirection:
                "column",

              borderRadius: {
                xs: 0,
                md: 3,
              },

              border: {
                xs: "none",
                md: "1px solid #ECE8F5",
              },

              bgcolor: "#fff",
              overflow: "hidden",

              minHeight: {
                xs: "calc(100dvh - 155px)",
                md: 650,
              },

              height: {
                xs: "calc(100dvh - 155px)",
                md: "auto",
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.7,
                borderBottom:
                  "1px solid #F0EDF5",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                My Tasks
              </Typography>

              <Typography
                sx={{
                  color: "#8A8498",
                  fontSize: 12,
                  mt: 0.3,
                }}
              >
                {filteredTasks.length}{" "}
                task
                {filteredTasks.length !==
                1
                  ? "s"
                  : ""}
              </Typography>
            </Box>

            {loading ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  minHeight: 420,
                  gap: 1.5,
                }}
              >
                <CircularProgress
                  size={28}
                  sx={{
                    color: "#7C3AED",
                  }}
                />

                <Typography
                  sx={{
                    color: "#8A8498",
                    fontSize: 13,
                  }}
                >
                  Loading tasks...
                </Typography>
              </Stack>
            ) : filteredTasks.length ===
              0 ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{
                  minHeight: 420,
                  px: 3,
                  textAlign: "center",
                }}
              >
                <Avatar
                  sx={{
                    width: 62,
                    height: 62,
                    mb: 1.5,
                    bgcolor: "#F1EAFE",
                    color: "#7C3AED",
                  }}
                >
                  <TaskAlt />
                </Avatar>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 16,
                  }}
                >
                  No tasks found
                </Typography>

                <Typography
                  sx={{
                    color: "#8A8498",
                    fontSize: 13,
                    mt: 0.5,
                    maxWidth: 300,
                  }}
                >
                  Create a task or
                  change the selected
                  filter.
                </Typography>
              </Stack>
            ) : (
              <Stack
                sx={{
                  overflowY: "auto",
                  flex: 1,

                  "&::-webkit-scrollbar":
                    {
                      width: 5,
                    },

                  "&::-webkit-scrollbar-thumb":
                    {
                      background:
                        "#DDD7E8",
                      borderRadius: 10,
                    },
                }}
                divider={
                  <Divider
                    sx={{
                      borderColor:
                        "#F2EFF6",
                    }}
                  />
                }
              >
                {filteredTasks.map(
                  (task) => {
                    const isSelected =
                      selectedTask?._id ===
                      task._id;

                    const participants =
                      getParticipants(
                        task
                      );

                    return (
                      <Box
                        key={task._id}
                        onClick={() =>
                          openTask(task)
                        }
                        sx={{
                          p: 1.7,
                          cursor:
                            "pointer",

                          bgcolor:
                            isSelected
                              ? "#F7F3FF"
                              : "#fff",

                          transition:
                            "0.18s",

                          "&:hover": {
                            bgcolor:
                              "#FAF8FE",
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.2}
                          alignItems="flex-start"
                        >
                          {/* TASK ICON */}

                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius:
                                2.2,
                              bgcolor:
                                "#EEE7FF",
                              color:
                                "#6D28D9",
                            }}
                          >
                            {task.mode ===
                            "GROUP" ? (
                              <Groups fontSize="small" />
                            ) : (
                              <TaskAlt fontSize="small" />
                            )}
                          </Avatar>

                          {/* TASK CONTENT */}

                          <Box
                            sx={{
                              minWidth: 0,
                              flex: 1,
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              justifyContent="space-between"
                              spacing={1}
                            >
                              <Box
                                sx={{
                                  minWidth: 0,
                                  flex: 1,
                                }}
                              >
                                {/* TASK TITLE */}

                                <Typography
                                  sx={{
                                    fontWeight:
                                      800,
                                    fontSize: 14,
                                    color:
                                      "#27212F",
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {task.title}
                                </Typography>

                                {/* ASSIGNED USER NAME */}

                                <Typography
                                  sx={{
                                    mt: 0.35,
                                    fontSize:
                                      11.5,
                                    fontWeight:
                                      600,
                                    color:
                                      "#6D28D9",
                                    overflow:
                                      "hidden",
                                    textOverflow:
                                      "ellipsis",
                                    whiteSpace:
                                      "nowrap",
                                  }}
                                >
                                  {task.mode ===
                                  "GROUP"
                                    ? `${
                                        participants.length
                                      } users`
                                    : `Assigned to: ${getUserName(
                                        task.assignedTo
                                      )}`}
                                </Typography>
                              </Box>

                              {getStatusChip(
                                task.status
                              )}
                            </Stack>

                            {/* DESCRIPTION */}

                            {task.description && (
                              <Typography
                                sx={{
                                  mt: 0.5,
                                  color:
                                    "#858093",
                                  fontSize:
                                    12,
                                  display:
                                    "-webkit-box",
                                  WebkitLineClamp:
                                    2,
                                  WebkitBoxOrient:
                                    "vertical",
                                  overflow:
                                    "hidden",
                                }}
                              >
                                {
                                  task.description
                                }
                              </Typography>
                            )}

                            {/* META */}

                            <Stack
                              direction="row"
                              spacing={0.7}
                              alignItems="center"
                              sx={{
                                mt: 1,
                                flexWrap:
                                  "wrap",
                              }}
                            >
                              <Chip
                                size="small"
                                label={
                                  task.mode
                                }
                                sx={{
                                  height: 23,
                                  fontSize:
                                    10,
                                  fontWeight:
                                    700,
                                  borderRadius:
                                    1.5,
                                  bgcolor:
                                    "#F5F1FB",
                                }}
                              />

                              {task.dueDate && (
                                <Chip
                                  size="small"
                                  label={`Due ${formatDate(
                                    task.dueDate
                                  )}`}
                                  sx={{
                                    height: 23,
                                    fontSize:
                                      10,
                                    fontWeight:
                                      600,
                                    borderRadius:
                                      1.5,
                                  }}
                                />
                              )}

                              {task.mode ===
                                "GROUP" &&
                                participants.length >
                                  0 && (
                                  <Typography
                                    sx={{
                                      fontSize:
                                        10.5,
                                      color:
                                        "#938DA0",
                                    }}
                                  >
                                    {
                                      participants.length
                                    }{" "}
                                    participant
                                    {participants.length >
                                    1
                                      ? "s"
                                      : ""}
                                  </Typography>
                                )}
                            </Stack>
                          </Box>
                        </Stack>
                      </Box>
                    );
                  }
                )}
              </Stack>
            )}
          </Paper>

          {/* =================================================
              CHAT
          ================================================= */}

          {selectedTask && (
            <Paper
              elevation={0}
              sx={{
                display: "flex",
                flexDirection:
                  "column",

                position: {
                  xs: "fixed",
                  md: "relative",
                },

                top: {
                  xs: 0,
                  md: "auto",
                },

                left: {
                  xs: 0,
                  md: "auto",
                },

                right: {
                  xs: 0,
                  md: "auto",
                },

                bottom: {
                  xs: 0,
                  md: "auto",
                },

                width: {
                  xs: "100%",
                  md: "auto",
                },

                height: {
                  xs: "100dvh",
                  md: 650,
                },

                minHeight: {
                  xs: "100dvh",
                  md: 650,
                },

                zIndex: {
                  xs: 1300,
                  md: "auto",
                },

                borderRadius: {
                  xs: 0,
                  md: 3,
                },

                border: {
                  xs: "none",
                  md: "1px solid #ECE8F5",
                },

                bgcolor: "#fff",
                overflow: "hidden",
              }}
            >
              {/* =================================================
                  CHAT HEADER
              ================================================= */}

              <Box
                sx={{
                  px: {
                    xs: 1,
                    sm: 2,
                  },

                  py: {
                    xs: 0.9,
                    sm: 1.5,
                  },

                  borderBottom:
                    "1px solid #EEEAF4",

                  bgcolor: "#fff",

                  flexShrink: 0,

                  position:
                    "relative",

                  zIndex: 2,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                >
                  {/* MOBILE BACK */}

                  <IconButton
                    onClick={
                      closeTask
                    }
                    sx={{
                      display: {
                        xs: "flex",
                        md: "none",
                      },

                      width: 40,
                      height: 40,
                      mr: 0.2,
                      color:
                        "#332D3A",
                    }}
                  >
                    <ArrowBack />
                  </IconButton>

                  {/* TASK AVATAR */}

                  <Avatar
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius:
                        2.2,
                      bgcolor:
                        "#EEE7FF",
                      color:
                        "#6D28D9",
                    }}
                  >
                    {selectedTask.mode ===
                    "GROUP" ? (
                      <Groups />
                    ) : (
                      <TaskAlt />
                    )}
                  </Avatar>

                  {/* CHAT TITLE */}

                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight:
                          800,
                        fontSize: 14.5,
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {
                        selectedTask.title
                      }
                    </Typography>

                    {/* USER NAME */}

                    <Typography
                      sx={{
                        color:
                          "#6D28D9",
                        fontSize:
                          11.5,
                        fontWeight:
                          600,
                        mt: 0.2,
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {selectedTask.mode ===
                      "GROUP"
                        ? `${
                            selectedTask
                              .participants
                              ?.length ||
                            0
                          } users`
                        : `Assigned to: ${getUserName(
                            selectedTask.assignedTo
                          )}`}
                    </Typography>
                  </Box>

                  {/* DELETE */}

                  <Tooltip title="Delete task">
                    <IconButton
                      onClick={() =>
                        setDeleteDialogOpen(
                          true
                        )
                      }
                      sx={{
                        color:
                          "#B42318",
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* STATUS + DUE */}

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    mt: 1.2,
                  }}
                >
                  <FormControl
                    size="small"
                    sx={{
                      flex: 1,
                    }}
                  >
                    <Select
                      value={
                        selectedTask.status ||
                        "pending"
                      }
                      onChange={(
                        event
                      ) =>
                        updateTaskStatus(
                          selectedTask._id,
                          event.target
                            .value
                        )
                      }
                      sx={{
                        borderRadius: 2,
                        fontSize: 12,
                        fontWeight:
                          700,
                      }}
                    >
                      {STATUS_OPTIONS.map(
                        (item) => (
                          <MenuItem
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </MenuItem>
                        )
                      )}
                    </Select>
                  </FormControl>

                  <Box
                    sx={{
                      px: 1.4,
                      py: 0.9,
                      borderRadius: 2,
                      bgcolor:
                        "#F8F6FB",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 10,
                        color:
                          "#9892A2",
                      }}
                    >
                      Due date
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight:
                          700,
                        color:
                          "#38313F",
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {formatDate(
                        selectedTask.dueDate
                      )}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {/* =================================================
                  CHAT MESSAGES
              ================================================= */}

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  height: 0,
                  overflowY:
                    "auto",

                  px: {
                    xs: 1,
                    sm: 2,
                  },

                  py: {
                    xs: 1.5,
                    sm: 2,
                  },

                  bgcolor:
                    "#FBFAFD",

                  WebkitOverflowScrolling:
                    "touch",

                  "&::-webkit-scrollbar":
                    {
                      width: 5,
                    },

                  "&::-webkit-scrollbar-thumb":
                    {
                      background:
                        "#D8D1E5",
                      borderRadius:
                        10,
                    },
                }}
              >
                {taskLoading ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      minHeight: 350,
                    }}
                  >
                    <CircularProgress
                      size={25}
                      sx={{
                        color:
                          "#7C3AED",
                      }}
                    />
                  </Stack>
                ) : !selectedTask
                    .messages
                    ?.length ? (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      minHeight: 350,
                      textAlign:
                        "center",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor:
                          "#EEE7FF",
                        color:
                          "#7C3AED",
                        mb: 1.5,
                      }}
                    >
                      <Send />
                    </Avatar>

                    <Typography
                      sx={{
                        fontWeight:
                          800,
                        fontSize: 15,
                      }}
                    >
                      No messages yet
                    </Typography>

                    <Typography
                      sx={{
                        color:
                          "#8D8797",
                        fontSize: 12,
                        mt: 0.5,
                      }}
                    >
                      Start the task
                      conversation.
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.2}>
                    {selectedTask.messages.map(
                      (message) => {
                        const senderId =
                          getId(
                            message.sender
                          );

                        const currentUserId =
                          getId(
                            user?._id
                          );

                        const isMine =
                          senderId &&
                          currentUserId &&
                          senderId ===
                            currentUserId;

                        return (
                          <Box
                            key={
                              message._id
                            }
                            sx={{
                              display:
                                "flex",
                              justifyContent:
                                isMine
                                  ? "flex-end"
                                  : "flex-start",
                            }}
                          >
                            <Box
                              sx={{
                                maxWidth:
                                  {
                                    xs: "88%",
                                    sm: "75%",
                                  },
                              }}
                            >
                              {!isMine && (
                                <Stack
                                  direction="row"
                                  spacing={
                                    0.8
                                  }
                                  alignItems="center"
                                  sx={{
                                    mb: 0.4,
                                    ml: 0.5,
                                  }}
                                >
                                  <Avatar
                                    sx={{
                                      width: 23,
                                      height: 23,
                                      fontSize:
                                        10,
                                      bgcolor:
                                        "#E8E1F5",
                                      color:
                                        "#6D28D9",
                                    }}
                                  >
                                    {getInitial(
                                      message.senderName
                                    )}
                                  </Avatar>

                                  <Typography
                                    sx={{
                                      fontSize:
                                        10.5,
                                      fontWeight:
                                        700,
                                      color:
                                        "#80798C",
                                    }}
                                  >
                                    {
                                      message.senderName
                                    }
                                  </Typography>
                                </Stack>
                              )}

                              <Paper
                                elevation={
                                  0
                                }
                                sx={{
                                  position:
                                    "relative",

                                  p: 1.15,

                                  borderRadius:
                                    isMine
                                      ? "15px 15px 4px 15px"
                                      : "15px 15px 15px 4px",

                                  bgcolor:
                                    isMine
                                      ? "#7C3AED"
                                      : "#fff",

                                  color:
                                    isMine
                                      ? "#fff"
                                      : "#332D3A",

                                  border:
                                    isMine
                                      ? "none"
                                      : "1px solid #EAE6F1",

                                  boxShadow:
                                    "0 2px 8px rgba(30,20,50,.04)",
                                }}
                              >
                                {message.photoUrl && (
                                  <Box
                                    component="img"
                                    src={
                                      message.photoUrl
                                    }
                                    alt="Task attachment"
                                    sx={{
                                      display:
                                        "block",
                                      width:
                                        "100%",
                                      maxWidth: 300,
                                      maxHeight: 300,
                                      objectFit:
                                        "cover",
                                      borderRadius:
                                        2,
                                      mb:
                                        message.text &&
                                        message.text !==
                                          "📷 Photo"
                                          ? 0.8
                                          : 0,
                                      cursor:
                                        "pointer",
                                    }}
                                    onClick={() =>
                                      window.open(
                                        message.photoUrl,
                                        "_blank"
                                      )
                                    }
                                  />
                                )}

                                {message.text && (
                                  <Typography
                                    sx={{
                                      fontSize:
                                        13,
                                      lineHeight:
                                        1.5,
                                      whiteSpace:
                                        "pre-wrap",
                                      wordBreak:
                                        "break-word",
                                    }}
                                  >
                                    {
                                      message.text
                                    }
                                  </Typography>
                                )}

                                <Stack
                                  direction="row"
                                  alignItems="center"
                                  justifyContent="flex-end"
                                  spacing={
                                    0.5
                                  }
                                  sx={{
                                    mt: 0.5,
                                  }}
                                >
                                  {message.editedAt && (
                                    <Typography
                                      sx={{
                                        fontSize:
                                          9,
                                        opacity:
                                          0.7,
                                      }}
                                    >
                                      edited
                                    </Typography>
                                  )}

                                  <Typography
                                    sx={{
                                      fontSize:
                                        9,
                                      opacity:
                                        0.65,
                                    }}
                                  >
                                    {formatTime(
                                      message.createdAt
                                    )}
                                  </Typography>

                                  {isMine && (
                                    <Check
                                      sx={{
                                        fontSize:
                                          13,
                                        opacity:
                                          0.8,
                                      }}
                                    />
                                  )}
                                </Stack>

                                {isMine && (
                                  <Tooltip title="Edit message">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        startEditMessage(
                                          message
                                        )
                                      }
                                      sx={{
                                        position:
                                          "absolute",
                                        top: -7,
                                        right: -7,
                                        width: 25,
                                        height: 25,
                                        bgcolor:
                                          "#fff",
                                        color:
                                          "#6D28D9",
                                        boxShadow:
                                          "0 2px 8px rgba(0,0,0,.12)",

                                        "&:hover":
                                          {
                                            bgcolor:
                                              "#F4F0FA",
                                          },
                                      }}
                                    >
                                      <Edit
                                        sx={{
                                          fontSize:
                                            13,
                                        }}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Paper>
                            </Box>
                          </Box>
                        );
                      }
                    )}

                    <div
                      ref={
                        chatBottomRef
                      }
                    />
                  </Stack>
                )}
              </Box>

              {/* =================================================
                  MESSAGE COMPOSER
              ================================================= */}

              <Box
                sx={{
                  p: {
                    xs: 0.8,
                    sm: 1.2,
                  },

                  pb: {
                    xs: "max(8px, env(safe-area-inset-bottom))",
                    sm: 1.2,
                  },

                  borderTop:
                    "1px solid #ECE8F3",

                  bgcolor: "#fff",

                  flexShrink: 0,

                  position:
                    "relative",

                  zIndex: 3,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.8}
                  alignItems="flex-end"
                >
                  <input
                    ref={
                      fileInputRef
                    }
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={
                      sendPhoto
                    }
                  />

                  <Tooltip title="Send photo">
                    <IconButton
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={
                        sendingMessage
                      }
                      sx={{
                        width: 40,
                        height: 40,
                        color:
                          "#7C3AED",
                        bgcolor:
                          "#F5F1FF",
                        flexShrink: 0,

                        "&:hover": {
                          bgcolor:
                            "#EDE5FF",
                        },
                      }}
                    >
                      <ImageIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={
                      messageText
                    }
                    onChange={(
                      event
                    ) =>
                      setMessageText(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root":
                        {
                          borderRadius:
                            2.5,
                          bgcolor:
                            "#FAF9FC",
                          fontSize:
                            13,
                          py: 0.3,
                        },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <AttachFile
                            sx={{
                              fontSize:
                                18,
                              color:
                                "#AAA4B3",
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <IconButton
                    onClick={
                      sendMessage
                    }
                    disabled={
                      sendingMessage ||
                      !messageText.trim()
                    }
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor:
                        "#7C3AED",
                      color: "#fff",
                      flexShrink: 0,

                      "&:hover": {
                        bgcolor:
                          "#6D28D9",
                      },

                      "&.Mui-disabled": {
                        bgcolor:
                          "#E7E2EE",
                        color:
                          "#AAA4B3",
                      },
                    }}
                  >
                    {sendingMessage ? (
                      <CircularProgress
                        size={18}
                        sx={{
                          color:
                            "#fff",
                        }}
                      />
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

      {/* =======================================================
          CREATE TASK DIALOG
      ======================================================= */}

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
        PaperProps={{
          sx: {
            borderRadius: 3,
            m: {
              xs: 1.5,
              sm: 2,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            pb: 1,
          }}
        >
          Create New Task
        </DialogTitle>

        <DialogContent>
          <Stack
            spacing={2}
            sx={{
              pt: 1,
            }}
          >
            <TextField
              fullWidth
              label="Task title"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              autoFocus
            />

            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
            />

            {/* MODE */}

            <FormControl fullWidth>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  mb: 0.7,
                  color:
                    "#57505F",
                }}
              >
                Assignment type
              </Typography>

              <Select
                value={mode}
                onChange={(event) => {
                  setMode(
                    event.target
                      .value
                  );

                  setAssignedTo("");
                  setAssignedToList(
                    []
                  );
                }}
                sx={{
                  borderRadius: 2,
                }}
              >
                {MODE_OPTIONS.map(
                  (item) => (
                    <MenuItem
                      key={
                        item.value
                      }
                      value={
                        item.value
                      }
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize:
                              13,
                            fontWeight:
                              700,
                          }}
                        >
                          {
                            item.label
                          }
                        </Typography>

                        <Typography
                          sx={{
                            fontSize:
                              10.5,
                            color:
                              "#918A9A",
                          }}
                        >
                          {
                            item.description
                          }
                        </Typography>
                      </Box>
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            {/* INDIVIDUAL */}

            {mode ===
              "INDIVIDUAL" && (
              <FormControl fullWidth>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    mb: 0.7,
                    color:
                      "#57505F",
                  }}
                >
                  Select user
                </Typography>

                <Select
                  value={
                    assignedTo
                  }
                  onChange={(
                    event
                  ) =>
                    setAssignedTo(
                      event.target
                        .value
                    )
                  }
                  displayEmpty
                  disabled={
                    usersLoading
                  }
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="">
                    Select user
                  </MenuItem>

                  {users.map(
                    (member) => (
                      <MenuItem
                        key={
                          member._id
                        }
                        value={
                          member._id
                        }
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize:
                                11,
                              bgcolor:
                                "#EEE7FF",
                              color:
                                "#6D28D9",
                            }}
                          >
                            {getInitial(
                              member
                            )}
                          </Avatar>

                          <Box>
                            <Typography
                              sx={{
                                fontSize:
                                  13,
                                fontWeight:
                                  700,
                              }}
                            >
                              {getUserName(
                                member
                              )}
                            </Typography>

                            {member.email && (
                              <Typography
                                sx={{
                                  fontSize:
                                    10,
                                  color:
                                    "#8E8797",
                                }}
                              >
                                {
                                  member.email
                                }
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            )}

            {/* SEPARATE / GROUP */}

            {(mode ===
              "SEPARATE" ||
              mode === "GROUP") && (
              <FormControl fullWidth>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    mb: 0.7,
                    color:
                      "#57505F",
                  }}
                >
                  Select users
                </Typography>

                <Select
                  multiple
                  value={
                    assignedToList
                  }
                  onChange={(
                    event
                  ) =>
                    setAssignedToList(
                      typeof event
                        .target
                        .value ===
                        "string"
                        ? event.target.value.split(
                            ","
                          )
                        : event.target
                            .value
                    )
                  }
                  displayEmpty
                  disabled={
                    usersLoading
                  }
                  sx={{
                    borderRadius: 2,
                  }}
                  renderValue={(
                    selected
                  ) => {
                    if (
                      !selected.length
                    ) {
                      return (
                        <Typography
                          sx={{
                            color:
                              "#9A94A3",
                            fontSize:
                              13,
                          }}
                        >
                          Select users
                        </Typography>
                      );
                    }

                    return (
                      <Stack
                        direction="row"
                        spacing={
                          0.5
                        }
                        flexWrap="wrap"
                      >
                        {selected.map(
                          (id) => {
                            const member =
                              users.find(
                                (
                                  item
                                ) =>
                                  String(
                                    item._id
                                  ) ===
                                  String(
                                    id
                                  )
                              );

                            return (
                              <Chip
                                key={id}
                                size="small"
                                label={getUserName(
                                  member
                                )}
                                sx={{
                                  borderRadius:
                                    1.5,
                                }}
                              />
                            );
                          }
                        )}
                      </Stack>
                    );
                  }}
                >
                  {users.map(
                    (member) => (
                      <MenuItem
                        key={
                          member._id
                        }
                        value={
                          member._id
                        }
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize:
                                11,
                              bgcolor:
                                "#EEE7FF",
                              color:
                                "#6D28D9",
                            }}
                          >
                            {getInitial(
                              member
                            )}
                          </Avatar>

                          <Typography
                            sx={{
                              fontSize:
                                13,
                              fontWeight:
                                600,
                            }}
                          >
                            {getUserName(
                              member
                            )}
                          </Typography>
                        </Stack>
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            )}

            {/* DUE DATE */}

            <TextField
              fullWidth
              type="date"
              label="Due date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target.value
                )
              }
              InputLabelProps={{
                shrink: true,
              }}
            />

            {/* RECURRENCE */}

            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2.5,
                border:
                  "1px solid #EAE5F2",
                bgcolor:
                  "#FBFAFD",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Recurring task
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color:
                        "#918A9A",
                      mt: 0.2,
                    }}
                  >
                    Automatically
                    create the
                    next task after
                    completion.
                  </Typography>
                </Box>

                <Button
                  size="small"
                  variant={
                    recurrenceEnabled
                      ? "contained"
                      : "outlined"
                  }
                  onClick={() =>
                    setRecurrenceEnabled(
                      (previous) =>
                        !previous
                    )
                  }
                  sx={{
                    minWidth: 80,
                    borderRadius: 2,
                    textTransform:
                      "none",
                    fontWeight: 700,

                    ...(recurrenceEnabled && {
                      bgcolor:
                        "#7C3AED",

                      "&:hover": {
                        bgcolor:
                          "#6D28D9",
                      },
                    }),
                  }}
                >
                  {recurrenceEnabled
                    ? "Enabled"
                    : "Off"}
                </Button>
              </Stack>

              {recurrenceEnabled && (
                <FormControl
                  fullWidth
                  size="small"
                  sx={{
                    mt: 1.5,
                  }}
                >
                  <Select
                    value={
                      recurrenceFrequency
                    }
                    onChange={(
                      event
                    ) =>
                      setRecurrenceFrequency(
                        event.target
                          .value
                      )
                    }
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    {RECURRENCE_OPTIONS.map(
                      (item) => (
                        <MenuItem
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </MenuItem>
                      )
                    )}
                  </Select>
                </FormControl>
              )}
            </Paper>

            {(mode ===
              "SEPARATE" ||
              mode === "GROUP") &&
              assignedToList.length >
                0 &&
              assignedToList.length <
                2 && (
                <Alert severity="info">
                  Select at least two
                  users for{" "}
                  {mode === "GROUP"
                    ? "a group task"
                    : "separate assignment"}
                  .
                </Alert>
              )}
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={() => {
              setCreateOpen(false);
              resetCreateForm();
            }}
            disabled={creating}
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
              color: "#686172",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              handleCreateTask
            }
            disabled={creating}
            startIcon={
              creating ? (
                <CircularProgress
                  size={16}
                  sx={{
                    color:
                      "#fff",
                  }}
                />
              ) : (
                <Add />
              )
            }
            sx={{
              borderRadius: 2,
              textTransform:
                "none",
              fontWeight: 700,
              bgcolor:
                "#7C3AED",

              "&:hover": {
                bgcolor:
                  "#6D28D9",
              },
            }}
          >
            {creating
              ? "Creating..."
              : "Create Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* =======================================================
          EDIT MESSAGE
      ======================================================= */}

      <Dialog
        open={Boolean(
          editingMessage
        )}
        onClose={
          cancelEditMessage
        }
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
          }}
        >
          Edit Message
        </DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={editText}
            onChange={(event) =>
              setEditText(
                event.target.value
              )
            }
            sx={{
              mt: 1,

              "& .MuiOutlinedInput-root":
                {
                  borderRadius: 2,
                },
            }}
          />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2,
          }}
        >
          <Button
            onClick={
              cancelEditMessage
            }
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={
              saveEditedMessage
            }
            sx={{
              borderRadius: 2,
              textTransform:
                "none",
              fontWeight: 700,
              bgcolor:
                "#7C3AED",

              "&:hover": {
                bgcolor:
                  "#6D28D9",
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* =======================================================
          DELETE TASK
      ======================================================= */}

      <Dialog
        open={deleteDialogOpen}
        onClose={() =>
          !deleting &&
          setDeleteDialogOpen(
            false
          )
        }
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
          }}
        >
          Delete Task?
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              color: "#746D7D",
              fontSize: 13,
            }}
          >
            This will permanently
            delete this task and its
            conversation.
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            pb: 2.5,
          }}
        >
          <Button
            onClick={() =>
              setDeleteDialogOpen(
                false
              )
            }
            disabled={deleting}
            sx={{
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={
              deleteCurrentTask
            }
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress
                  size={16}
                  sx={{
                    color:
                      "#fff",
                  }}
                />
              ) : (
                <Delete />
              )
            }
            sx={{
              borderRadius: 2,
              textTransform:
                "none",
              fontWeight: 700,
            }}
          >
            {deleting
              ? "Deleting..."
              : "Delete Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   PROTECTED PAGE
========================================================= */

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksInner />
    </ProtectedRoute>
  );
}