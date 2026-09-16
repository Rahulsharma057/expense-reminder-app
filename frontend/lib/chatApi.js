import api from "./api";

// Thin wrappers so tasks-page.js (or wherever you wire these in) just
// calls a named function instead of repeating URL strings everywhere.

/* ---------------- messages (now paginated + richer) ---------------- */

export const fetchMessages = (taskId, { before, limit = 30 } = {}) => {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  params.set("limit", limit);
  return api.get(`/tasks/${taskId}/messages?${params.toString()}`);
};

export const searchTaskMessages = (taskId, q) =>
  api.get(`/tasks/${taskId}/messages/search?q=${encodeURIComponent(q)}`);

export const fetchPinnedMessages = (taskId) =>
  api.get(`/tasks/${taskId}/messages/pinned`);

export const sendTextMessage = (taskId, { text, replyTo }) =>
  api.post(`/tasks/${taskId}/messages`, { text, replyTo });

export const sendPhotoMessage = (taskId, file, { caption, replyTo } = {}) => {
  const form = new FormData();
  form.append("photo", file);
  if (caption) form.append("caption", caption);
  if (replyTo) form.append("replyTo", replyTo);
  return api.post(`/tasks/${taskId}/messages/photo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendDocumentMessage = (taskId, file, { caption, replyTo } = {}) => {
  const form = new FormData();
  form.append("document", file);
  if (caption) form.append("caption", caption);
  if (replyTo) form.append("replyTo", replyTo);
  return api.post(`/tasks/${taskId}/messages/document`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const sendVoiceMessage = (taskId, blob, { replyTo } = {}) => {
  const form = new FormData();
  form.append("voice", blob, "voice-note.webm");
  if (replyTo) form.append("replyTo", replyTo);
  return api.post(`/tasks/${taskId}/messages/voice`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const forwardMessage = (taskId, messageId, targetTaskId) =>
  api.post(`/tasks/${taskId}/messages/${messageId}/forward`, { targetTaskId });

export const editMessage = (taskId, messageId, text) =>
  api.patch(`/tasks/${taskId}/messages/${messageId}`, { text });

// scope: "me" hides it just for you, "everyone" wipes it for the
// whole chat (only allowed on your own messages, or by superadmin).
export const deleteMessage = (taskId, messageId, scope = "me") =>
  api.delete(`/tasks/${taskId}/messages/${messageId}?scope=${scope}`);

export const toggleReaction = (taskId, messageId, emoji) =>
  api.put(`/tasks/${taskId}/messages/${messageId}/reactions`, { emoji });

export const togglePinMessage = (taskId, messageId) =>
  api.patch(`/tasks/${taskId}/messages/${messageId}/pin`);

export const markMessagesSeen = (taskId) =>
  api.patch(`/tasks/${taskId}/messages/seen`);

/* ---------------- tasks ---------------- */

export const fetchMyTasks = ({ page = 1, limit = 30, status, priority } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  return api.get(`/tasks/mine?${params.toString()}`);
};

export const reassignTask = (taskId, newAssigneeId) =>
  api.patch(`/tasks/${taskId}/reassign`, { newAssigneeId });

export const updateTaskPriority = (taskId, priority) =>
  api.patch(`/tasks/${taskId}`, { priority });

/* ---------------- checklist (assignment added) ---------------- */

export const addChecklistItem = (taskId, text, assignedTo) =>
  api.post(`/tasks/${taskId}/checklist`, { text, assignedTo });

export const assignChecklistItem = (taskId, itemId, assignedTo) =>
  api.patch(`/tasks/${taskId}/checklist/${itemId}`, { assignedTo });

/* ---------------- templates ---------------- */

export const fetchTemplates = () => api.get("/templates");

export const createTemplate = (payload) => api.post("/templates", payload);

export const deleteTemplate = (id) => api.delete(`/templates/${id}`);

export const createTaskFromTemplate = (templateId, overrides = {}) =>
  api.post("/tasks", { templateId, ...overrides });

/* ---------------- notifications ---------------- */

export const fetchNotifications = (page = 1) =>
  api.get(`/notifications?page=${page}&limit=20`);

export const fetchUnreadCount = () => api.get("/notifications/unread-count");

export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () => api.patch("/notifications/read-all");

/* ---------------- web push ---------------- */

export const fetchPushPublicKey = () => api.get("/push/public-key");

export const subscribeToPush = (subscription) => api.post("/push/subscribe", subscription);

export const unsubscribeFromPush = (endpoint) => api.post("/push/unsubscribe", { endpoint });