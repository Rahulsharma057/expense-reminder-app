import api from "./api";

/* ---------------- events ---------------- */

export const fetchEvents = (status) => api.get(`/events${status ? `?status=${status}` : ""}`);
export const fetchEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (payload) => api.post("/events", payload);
export const updateEvent = (id, payload) => api.patch(`/events/${id}`, payload);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

export const uploadEventCover = (id, file) => {
  const form = new FormData();
  form.append("cover", file);
  return api.post(`/events/${id}/cover`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

/* ---------------- items ---------------- */

export const fetchItems = (eventId, filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priceKnown === false) params.set("priceKnown", "false");
  return api.get(`/events/${eventId}/items?${params.toString()}`);
};

export const addItem = (eventId, fields, billFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (billFile) form.append("bill", billFile);
  return api.post(`/events/${eventId}/items`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const addItemFromTemplate = (eventId, templateId) =>
  api.post(`/events/${eventId}/items/from-template/${templateId}`);

export const updateItem = (eventId, itemId, fields, billFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (billFile) form.append("bill", billFile);
  return api.patch(`/events/${eventId}/items/${itemId}`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteItem = (eventId, itemId) => api.delete(`/events/${eventId}/items/${itemId}`);

/* ---------------- item templates ---------------- */

export const fetchItemTemplates = () => api.get("/event-item-templates");
export const createItemTemplate = (payload) => api.post("/event-item-templates", payload);
export const deleteItemTemplate = (id) => api.delete(`/event-item-templates/${id}`);

/* ---------------- guests ---------------- */

export const fetchGuests = (eventId, status) =>
  api.get(`/events/${eventId}/guests${status ? `?status=${status}` : ""}`);

export const addGuest = (eventId, payload) => api.post(`/events/${eventId}/guests`, payload);

export const addGuestsBulk = (eventId, text, category) =>
  api.post(`/events/${eventId}/guests/bulk`, { text, category });

export const updateGuest = (eventId, guestId, payload) => api.patch(`/events/${eventId}/guests/${guestId}`, payload);

export const deleteGuest = (eventId, guestId) => api.delete(`/events/${eventId}/guests/${guestId}`);

export const markInvitationSent = (eventId, guestId) =>
  api.patch(`/events/${eventId}/guests/${guestId}/invite-sent`);

/* ---------------- invitation / RSVP links ---------------- */

const apiBase = () => process.env.NEXT_PUBLIC_API_URL || "";

export const buildRsvpLink = (eventId, guest, response) =>
  `${apiBase()}/api/events/public/${eventId}/guests/${guest._id}/rsvp?token=${guest.rsvpToken}&response=${response}`;

// Opens WhatsApp with a pre-filled invitation, including both a
// "yes" and a "no" RSVP link — no separate confirmation page needed,
// the guest just taps the one that applies.
export const buildWhatsAppInviteUrl = (event, guest) => {
  const yesLink = buildRsvpLink(event._id, guest, "yes");
  const noLink = buildRsvpLink(event._id, guest, "no");
  const when = new Date(event.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const text = encodeURIComponent(
    `You're invited! 🎉\n\n"${event.title}"\n📅 ${when}${event.venue ? `\n📍 ${event.venue}` : ""}\n\n` +
      `Please let us know if you can make it:\n✅ Yes, I'll be there: ${yesLink}\n❌ Sorry, can't make it: ${noLink}`
  );

  const digits = (guest.phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${text}`;
};