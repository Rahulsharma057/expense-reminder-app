"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  FormControlLabel, IconButton, LinearProgress, MenuItem, Paper,
  Select, Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";

import {
  Add, ArrowBack, AttachMoney, CalendarMonth, Close, Delete,
  Description, Edit, EventAvailable, Groups, LocationOn,
  PictureAsPdf, PlaylistAddCheck, WhatsApp, Image as ImageIcon,
} from "@mui/icons-material";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import {
  fetchEvents, fetchEvent, createEvent, updateEvent, deleteEvent, uploadEventCover,
  fetchItems, addItem, updateItem, deleteItem, addItemFromTemplate,
  fetchItemTemplates, createItemTemplate, deleteItemTemplate,
  fetchGuests, addGuest, addGuestsBulk, updateGuest, deleteGuest,
  markInvitationSent, buildWhatsAppInviteUrl,
} from "../../lib/eventApi";

const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";

const getErrorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const formatMoney = (value) => (value ? `₹${Number(value).toLocaleString("en-IN")}` : "₹0");

const formatDate = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const ITEM_CATEGORIES = [
  "Decoration", "Catering", "Gifts", "Stationery", "Logistics",
  "Entertainment", "Photography", "Venue", "Sound & Lighting", "Other",
];

const CHECKLIST_STATUSES = [
  { value: "pending", label: "Pending", color: "#6B6478", bg: "#F1EDF8" },
  { value: "ordered", label: "Ordered", color: "#0369A1", bg: "#E0F2FE" },
  { value: "purchased", label: "Purchased", color: "#B45309", bg: "#FFF4E5" },
  { value: "delivered", label: "Delivered", color: "#15803D", bg: "#E8F7EE" },
  { value: "setup-done", label: "Setup Done", color: "#15803D", bg: "#DCFCE7" },
  { value: "cancelled", label: "Cancelled", color: "#B42318", bg: "#FEE4E2" },
];

const checklistMeta = (status) => CHECKLIST_STATUSES.find((s) => s.value === status) || CHECKLIST_STATUSES[0];

const GUEST_CATEGORIES = ["VIP", "Staff", "External", "Family", "Vendor", "Other"];

const RSVP_META = {
  pending: { label: "Pending", color: "#6B6478", bg: "#F1EDF8" },
  confirmed: { label: "Confirmed", color: "#15803D", bg: "#E8F7EE" },
  declined: { label: "Declined", color: "#B42318", bg: "#FEE4E2" },
};

const EVENT_STATUSES = [
  { value: "planning", label: "Planning", color: "#B45309", bg: "#FFF4E5" },
  { value: "confirmed", label: "Confirmed", color: "#0369A1", bg: "#E0F2FE" },
  { value: "ongoing", label: "Ongoing", color: "#7C3AED", bg: "#F1EBFF" },
  { value: "completed", label: "Completed", color: "#15803D", bg: "#E8F7EE" },
  { value: "cancelled", label: "Cancelled", color: "#B42318", bg: "#FEE4E2" },
];

const eventStatusMeta = (status) => EVENT_STATUSES.find((s) => s.value === status) || EVENT_STATUSES[0];

/* =========================================================
   SHARED BITS
========================================================= */

function SectionHeader({ title, subtitle, actionLabel, onAction, secondaryLabel, onSecondary }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#171225" }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 12.5, color: "#8A8498", mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
      <Stack direction="row" spacing={1}>
        {secondaryLabel && (
          <Button
            variant="outlined"
            onClick={onSecondary}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700 }}
          >
            {secondaryLabel}
          </Button>
        )}
        {actionLabel && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAction}
            sx={{ borderRadius: 2.5, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}
          >
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function FilterChips({ options, value, onChange }) {
  return (
    <Stack direction="row" spacing={0.8} sx={{ mb: 2, overflowX: "auto", "&::-webkit-scrollbar": { display: "none" } }}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value}
            onClick={() => onChange(option.value)}
            size="small"
            sx={{
              flexShrink: 0, borderRadius: 2, px: 1.4, textTransform: "none", fontWeight: 700, fontSize: 12.5,
              color: active ? "#fff" : "#686176",
              bgcolor: active ? PURPLE : "#F1EDF8",
              "&:hover": { bgcolor: active ? PURPLE_DARK : "#E7E1F5" },
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </Stack>
  );
}

function EmptyState({ icon, title, subtitle }) {
  return (
    <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3, border: "1px solid #ECE8F5" }}>
      {icon}
      <Typography sx={{ fontWeight: 700, mt: 1 }}>{title}</Typography>
      {subtitle && <Typography sx={{ fontSize: 12.5, color: "#8A8498", mt: 0.5 }}>{subtitle}</Typography>}
    </Paper>
  );
}

/* =========================================================
   EVENTS LIST
========================================================= */

function EventsList({ onOpen }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { title: "", type: "", description: "", date: "", venue: "", budget: "", status: "planning" };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchEvents(filter === "all" ? undefined : filter);
      setEvents(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load events"));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Event title is required");
    if (!form.date) return toast.error("Please pick a date");

    try {
      setSaving(true);
      const response = await createEvent(form);
      toast.success("Event created");
      setDialogOpen(false);
      load();
      onOpen(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create event"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Events"
        subtitle={`${events.length} event${events.length !== 1 ? "s" : ""}`}
        actionLabel="New Event"
        onAction={openCreate}
      />

      <FilterChips
        options={[{ value: "all", label: "All" }, ...EVENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        value={filter}
        onChange={setFilter}
      />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : events.length === 0 ? (
        <EmptyState icon={<EventAvailable sx={{ fontSize: 36, color: "#D8D1E5" }} />} title="No events yet" subtitle="Create one to start planning." />
      ) : (
        <Stack spacing={1.2}>
          {events.map((event) => {
            const sMeta = eventStatusMeta(event.status);
            const items = event.itemSummary || { totalPlanned: 0, totalActual: 0, itemCount: 0, pendingPriceCount: 0 };
            const guests = event.guestSummary || { total: 0, confirmed: 0, declined: 0, pending: 0 };
            const spendUsed = event.budget > 0 ? Math.min(100, (items.totalActual / event.budget) * 100) : 0;
            const overBudget = event.budget > 0 && items.totalActual > event.budget;

            return (
              <Paper
                key={event._id}
                elevation={0}
                onClick={() => onOpen(event)}
                sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5", cursor: "pointer", "&:hover": { bgcolor: "#FAF8FE" } }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>{event.title}</Typography>
                      <Chip size="small" label={sMeta.label} sx={{ height: 21, fontSize: 10, fontWeight: 800, bgcolor: sMeta.bg, color: sMeta.color }} />
                      {event.type && <Chip size="small" label={event.type} sx={{ height: 21, fontSize: 10, bgcolor: "#F5F1FB" }} />}
                    </Stack>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.6 }}>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        <CalendarMonth sx={{ fontSize: 14, color: "#A39CAF" }} />
                        <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{formatDate(event.date)}</Typography>
                      </Stack>
                      {event.venue && (
                        <Stack direction="row" alignItems="center" spacing={0.4}>
                          <LocationOn sx={{ fontSize: 14, color: "#A39CAF" }} />
                          <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{event.venue}</Typography>
                        </Stack>
                      )}
                    </Stack>

                    {event.budget > 0 && (
                      <Box sx={{ mt: 1, maxWidth: 320 }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: 11, color: "#8A8498" }}>
                            {formatMoney(items.totalActual)} of {formatMoney(event.budget)} spent
                          </Typography>
                          {overBudget && <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#B42318" }}>Over budget</Typography>}
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={spendUsed}
                          sx={{ mt: 0.3, height: 5, borderRadius: 5, bgcolor: "#F0EBFA", "& .MuiLinearProgress-bar": { bgcolor: overBudget ? "#B42318" : PURPLE, borderRadius: 5 } }}
                        />
                      </Box>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" rowGap={0.5}>
                      <Chip size="small" icon={<PlaylistAddCheck sx={{ fontSize: 13 }} />} label={`${items.itemCount} item${items.itemCount !== 1 ? "s" : ""}`} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: "#F5F1FB" }} />
                      {items.pendingPriceCount > 0 && (
                        <Chip size="small" label={`${items.pendingPriceCount} price pending`} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: "#FFF4E5", color: "#B45309" }} />
                      )}
                      <Chip size="small" icon={<Groups sx={{ fontSize: 13 }} />} label={`${guests.confirmed}/${guests.total} confirmed`} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: "#F5F1FB" }} />
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>New Event</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth label="Event title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} autoFocus />
            <TextField fullWidth label="Type" placeholder="Office Party, Diwali Celebration, Team Outing, Product Launch..." value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
            <TextField fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              <TextField fullWidth label="Venue" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Budget (₹)" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} />
              <FormControl fullWidth>
                <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} sx={{ borderRadius: 2 }}>
                  {EVENT_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {saving ? "Creating..." : "Create Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   OVERVIEW TAB
========================================================= */

function OverviewTab({ event, onUpdated, onDeleted }) {
  const [form, setForm] = useState({
    title: event.title, type: event.type || "", description: event.description || "",
    date: event.date ? event.date.slice(0, 10) : "", venue: event.venue || "",
    budget: String(event.budget || ""), status: event.status,
  });
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const items = event.itemSummary || { totalPlanned: 0, totalActual: 0, itemCount: 0, pendingPriceCount: 0 };
  const guests = event.guestSummary || { total: 0, confirmed: 0, declined: 0, pending: 0 };
  const overBudget = event.budget > 0 && items.totalActual > event.budget;
  const remaining = event.budget - items.totalActual;

  const save = async () => {
    try {
      setSaving(true);
      const response = await updateEvent(event._id, form);
      toast.success("Event updated");
      onUpdated({ ...event, ...response.data });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update event"));
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (fileEvent) => {
    const file = fileEvent.target.files?.[0];
    fileEvent.target.value = "";
    if (!file) return;

    try {
      setUploadingCover(true);
      const response = await uploadEventCover(event._id, file);
      toast.success("Cover image updated");
      onUpdated({ ...event, ...response.data });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not upload image"));
    } finally {
      setUploadingCover(false);
    }
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteEvent(event._id);
      toast.success("Event deleted");
      onDeleted();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete event"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      {/* Budget summary */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #ECE8F5" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.5 }}>Budget</Typography>
        <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1.5}>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: "#8A8498", fontWeight: 700 }}>BUDGET</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800 }}>{formatMoney(event.budget)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: "#8A8498", fontWeight: 700 }}>PLANNED</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: PURPLE_DARK }}>{formatMoney(items.totalPlanned)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: "#8A8498", fontWeight: 700 }}>ACTUAL SPENT</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: overBudget ? "#B42318" : "#15803D" }}>{formatMoney(items.totalActual)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: "#8A8498", fontWeight: 700 }}>{overBudget ? "OVER BY" : "REMAINING"}</Typography>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: overBudget ? "#B42318" : "#15803D" }}>{formatMoney(Math.abs(remaining))}</Typography>
          </Box>
        </Stack>
        {event.budget > 0 && (
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (items.totalActual / event.budget) * 100)}
            sx={{ mt: 2, height: 7, borderRadius: 5, bgcolor: "#F0EBFA", "& .MuiLinearProgress-bar": { bgcolor: overBudget ? "#B42318" : PURPLE, borderRadius: 5 } }}
          />
        )}
        {items.pendingPriceCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2, fontSize: 12.5 }}>
            {items.pendingPriceCount} item{items.pendingPriceCount !== 1 ? "s" : ""} still don&apos;t have a confirmed price — the actual total above will change once they do.
          </Alert>
        )}
      </Paper>

      {/* Guest summary */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #ECE8F5" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.5 }}>Guests</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
          <Chip label={`${guests.total} invited`} sx={{ fontWeight: 700, bgcolor: "#F5F1FB" }} />
          <Chip label={`${guests.confirmed} confirmed`} sx={{ fontWeight: 700, bgcolor: "#E8F7EE", color: "#15803D" }} />
          <Chip label={`${guests.declined} declined`} sx={{ fontWeight: 700, bgcolor: "#FEE4E2", color: "#B42318" }} />
          <Chip label={`${guests.pending} awaiting response`} sx={{ fontWeight: 700, bgcolor: "#FFF4E5", color: "#B45309" }} />
        </Stack>
      </Paper>

      {/* Details form */}
      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #ECE8F5" }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.5 }}>Details</Typography>
        <Stack spacing={2}>
          <TextField fullWidth label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <TextField fullWidth label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
          <TextField fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
            <TextField fullWidth label="Venue" value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth type="number" label="Budget (₹)" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} />
            <FormControl fullWidth>
              <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} sx={{ borderRadius: 2 }}>
                {EVENT_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button component="label" variant="outlined" startIcon={<ImageIcon />} disabled={uploadingCover} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
              {uploadingCover ? "Uploading..." : event.coverImageUrl ? "Replace cover image" : "Add cover image"}
              <input type="file" hidden accept="image/*" onChange={uploadCover} />
            </Button>
            {event.coverImageUrl && (
              <Avatar variant="rounded" src={event.coverImageUrl} sx={{ width: 44, height: 44 }} />
            )}
          </Stack>

          <Stack direction="row" justifyContent="space-between">
            <Button color="error" startIcon={<Delete />} onClick={() => setDeleteOpen(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
              Delete Event
            </Button>
            <Button variant="contained" onClick={save} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this event?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#746D7D" }}>This also deletes every item and guest for &quot;{event.title}&quot;. This can&apos;t be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} disabled={deleting} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/* =========================================================
   ITEMS TAB
========================================================= */

function ItemsTab({ eventId, onSummaryChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const emptyForm = {
    name: "", category: "Other", vendor: "", vendorPhone: "", quantity: "1", unit: "pcs",
    plannedCost: "", priceKnown: false, actualCost: "", checklistStatus: "pending",
    remarks: "", saveAsTemplate: false,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchItems(eventId, { status: statusFilter !== "all" ? statusFilter : undefined });
      setItems(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load items"));
    } finally {
      setLoading(false);
    }
  }, [eventId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    const totalPlanned = items.reduce((sum, item) => sum + (item.plannedCost || 0), 0);
    const totalActual = items.reduce((sum, item) => sum + (item.priceKnown ? item.actualCost || 0 : 0), 0);
    return { totalPlanned, totalActual };
  }, [items]);

  useEffect(() => {
    onSummaryChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const openCreate = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setBillFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name, category: item.category, vendor: item.vendor || "", vendorPhone: item.vendorPhone || "",
      quantity: String(item.quantity || 1), unit: item.unit || "pcs",
      plannedCost: String(item.plannedCost || ""), priceKnown: item.priceKnown,
      actualCost: String(item.actualCost || ""), checklistStatus: item.checklistStatus,
      remarks: item.remarks || "", saveAsTemplate: false,
    });
    setBillFile(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Item name is required");

    try {
      setSaving(true);
      if (editingItem) {
        await updateItem(eventId, editingItem._id, form, billFile);
        toast.success("Item updated");
      } else {
        await addItem(eventId, form, billFile);
        toast.success("Item added");
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save item"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(eventId, deleteTarget._id);
      toast.success("Item deleted");
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete item"));
    }
  };

  const openTemplates = async () => {
    setTemplateDialogOpen(true);
    setTemplatesLoading(true);
    try {
      const response = await fetchItemTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load templates"));
    } finally {
      setTemplatesLoading(false);
    }
  };

  const useTemplate = async (template) => {
    try {
      await addItemFromTemplate(eventId, template._id);
      toast.success(`"${template.name}" added`);
      setTemplateDialogOpen(false);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add item"));
    }
  };

  const removeTemplate = async (template) => {
    try {
      await deleteItemTemplate(template._id);
      setTemplates((previous) => previous.filter((t) => t._id !== template._id));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete template"));
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Items & Supplies"
        subtitle={`${formatMoney(totals.totalActual)} spent of ${formatMoney(totals.totalPlanned)} planned`}
        actionLabel="Add Item"
        onAction={openCreate}
        secondaryLabel="From Template"
        onSecondary={openTemplates}
      />

      <FilterChips
        options={[{ value: "all", label: "All" }, ...CHECKLIST_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : items.length === 0 ? (
        <EmptyState title="No items yet" subtitle="Add what you need to arrange for this event." />
      ) : (
        <Stack spacing={1.2}>
          {items.map((item) => {
            const cMeta = checklistMeta(item.checklistStatus);
            const overBudget = item.priceKnown && item.plannedCost > 0 && item.actualCost > item.plannedCost;

            return (
              <Paper key={item._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{item.name}</Typography>
                      <Chip size="small" label={item.category} sx={{ height: 20, fontSize: 9.5, bgcolor: "#F5F1FB" }} />
                      <Chip size="small" label={cMeta.label} sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: cMeta.bg, color: cMeta.color }} />
                    </Stack>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.6 }}>
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{item.quantity} {item.unit}</Typography>
                      {item.vendor && <Typography sx={{ fontSize: 12, color: "#6F6880" }}>from {item.vendor}</Typography>}
                    </Stack>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.4 }} alignItems="center">
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>Planned: {formatMoney(item.plannedCost)}</Typography>
                      {item.priceKnown ? (
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: overBudget ? "#B42318" : "#15803D" }}>
                          Actual: {formatMoney(item.actualCost)}{overBudget ? " (over)" : ""}
                        </Typography>
                      ) : (
                        <Chip size="small" label="Price not known yet" sx={{ height: 19, fontSize: 9.5, fontWeight: 700, bgcolor: "#FFF4E5", color: "#B45309" }} />
                      )}
                    </Stack>

                    {item.remarks && <Typography sx={{ fontSize: 12, color: "#8A8498", mt: 0.6, fontStyle: "italic" }}>{item.remarks}</Typography>}
                  </Box>

                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={0.3}>
                      {item.billUrl && (
                        <Tooltip title="View bill">
                          <IconButton size="small" component="a" href={item.billUrl} target="_blank" rel="noreferrer" sx={{ color: PURPLE }}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(item)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(item)} sx={{ color: "#B42318" }}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ---------------- add/edit item ---------------- */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingItem ? "Edit Item" : "Add Item"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth label="Item name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus />

            <Stack direction="row" spacing={1.5}>
              <FormControl fullWidth>
                <Select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} sx={{ borderRadius: 2 }}>
                  {ITEM_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <Select value={form.checklistStatus} onChange={(e) => setForm((p) => ({ ...p, checklistStatus: e.target.value }))} sx={{ borderRadius: 2 }}>
                  {CHECKLIST_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Vendor" value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} />
              <TextField fullWidth label="Vendor phone" value={form.vendorPhone} onChange={(e) => setForm((p) => ({ ...p, vendorPhone: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Quantity" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
              <TextField fullWidth label="Unit" placeholder="pcs, kg, plates..." value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
            </Stack>

            <TextField fullWidth type="number" label="Planned cost — what was decided (₹)" value={form.plannedCost} onChange={(e) => setForm((p) => ({ ...p, plannedCost: e.target.value }))} />

            <FormControlLabel
              control={<Switch checked={form.priceKnown} onChange={(e) => setForm((p) => ({ ...p, priceKnown: e.target.checked }))} />}
              label={<Typography sx={{ fontSize: 13 }}>I know the actual price now</Typography>}
            />

            {form.priceKnown && (
              <TextField fullWidth type="number" label="Actual cost — what it came for (₹)" value={form.actualCost} onChange={(e) => setForm((p) => ({ ...p, actualCost: e.target.value }))} />
            )}

            <TextField fullWidth multiline minRows={2} label="Remarks" value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />

            <Button component="label" variant="outlined" startIcon={<Description />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}>
              {billFile ? billFile.name : "Attach bill / quotation"}
              <input type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setBillFile(e.target.files?.[0] || null)} />
            </Button>

            {!editingItem && (
              <FormControlLabel
                control={<Switch checked={form.saveAsTemplate} onChange={(e) => setForm((p) => ({ ...p, saveAsTemplate: e.target.checked }))} />}
                label={<Typography sx={{ fontSize: 13 }}>Save as a reusable template for future events</Typography>}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- delete confirm ---------------- */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this item?</DialogTitle>
        <DialogContent><Typography sx={{ fontSize: 13, color: "#746D7D" }}>This can&apos;t be undone.</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- pick from template ---------------- */}
      <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Add from Template
          <IconButton size="small" onClick={() => setTemplateDialogOpen(false)}><Close fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {templatesLoading ? (
            <Stack alignItems="center" sx={{ py: 3 }}><CircularProgress size={22} sx={{ color: PURPLE }} /></Stack>
          ) : templates.length === 0 ? (
            <Typography sx={{ fontSize: 13, color: "#8A8498", textAlign: "center", py: 3 }}>
              No saved templates yet — check &quot;Save as a reusable template&quot; when adding an item.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {templates.map((template) => (
                <Paper key={template._id} elevation={0} sx={{ p: 1.2, borderRadius: 2, bgcolor: "#FAF9FC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{template.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#8A8498" }}>{template.category} · {formatMoney(template.plannedCost)} · {template.vendor || "no vendor set"}</Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" variant="contained" onClick={() => useTemplate(template)} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
                      Add
                    </Button>
                    <IconButton size="small" onClick={() => removeTemplate(template)} sx={{ color: "#B42318" }}><Delete fontSize="small" /></IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   GUESTS TAB
========================================================= */

function GuestsTab({ event }) {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { name: "", phone: "", email: "", category: "Staff", plusOnes: "0", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkCategory, setBulkCategory] = useState("Staff");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchGuests(event._id, statusFilter !== "all" ? statusFilter : undefined);
      setGuests(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load guests"));
    } finally {
      setLoading(false);
    }
  }, [event._id, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Guest name is required");
    try {
      setSaving(true);
      await addGuest(event._id, form);
      toast.success("Guest added");
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add guest"));
    } finally {
      setSaving(false);
    }
  };

  const submitBulk = async () => {
    if (!bulkText.trim()) return toast.error("Paste at least one guest");
    try {
      setBulkSaving(true);
      const response = await addGuestsBulk(event._id, bulkText, bulkCategory);
      toast.success(`${response.data.count} guests added`);
      setBulkOpen(false);
      setBulkText("");
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add guests"));
    } finally {
      setBulkSaving(false);
    }
  };

  const sendInvite = async (guest) => {
    if (!guest.phone) return toast.error("This guest has no phone number saved");
    window.open(buildWhatsAppInviteUrl(event, guest), "_blank");
    try {
      await markInvitationSent(event._id, guest._id);
      setGuests((previous) => previous.map((g) => (g._id === guest._id ? { ...g, invitationSent: true } : g)));
    } catch {
      // Non-fatal — invite still opened, just the "sent" flag didn't save.
    }
  };

  const setRsvp = async (guest, status) => {
    try {
      await updateGuest(event._id, guest._id, { rsvpStatus: status });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update RSVP"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGuest(event._id, deleteTarget._id);
      toast.success("Guest removed");
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not remove guest"));
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Guests"
        subtitle={`${guests.length} guest${guests.length !== 1 ? "s" : ""}`}
        actionLabel="Add Guest"
        onAction={() => { setForm(emptyForm); setDialogOpen(true); }}
        secondaryLabel="Bulk Add"
        onSecondary={() => setBulkOpen(true)}
      />

      <FilterChips
        options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "confirmed", label: "Confirmed" },
          { value: "declined", label: "Declined" },
        ]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : guests.length === 0 ? (
        <EmptyState title="No guests yet" subtitle="Add people to invite, one by one or pasted in bulk." />
      ) : (
        <Stack spacing={1.2}>
          {guests.map((guest) => {
            const rMeta = RSVP_META[guest.rsvpStatus] || RSVP_META.pending;
            return (
              <Paper key={guest._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack direction="row" spacing={1.3} sx={{ minWidth: 0, flex: 1 }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: "#EEE7FF", color: PURPLE_DARK, fontWeight: 800 }}>
                      {guest.name?.charAt(0)?.toUpperCase() || "G"}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14.5 }}>{guest.name}</Typography>
                        <Chip size="small" label={guest.category} sx={{ height: 19, fontSize: 9.5, bgcolor: "#F5F1FB" }} />
                        <Chip size="small" label={rMeta.label} sx={{ height: 19, fontSize: 9.5, fontWeight: 800, bgcolor: rMeta.bg, color: rMeta.color }} />
                        {guest.invitationSent && <Chip size="small" label="Invited" sx={{ height: 19, fontSize: 9.5, bgcolor: "#E0F2FE", color: "#0369A1" }} />}
                      </Stack>
                      <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.3} sx={{ mt: 0.4 }}>
                        {guest.phone && <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>📞 {guest.phone}</Typography>}
                        {guest.plusOnes > 0 && <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>+{guest.plusOnes} guest{guest.plusOnes > 1 ? "s" : ""}</Typography>}
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack spacing={0.5} alignItems="flex-end">
                    <Stack direction="row" spacing={0.3}>
                      <Tooltip title="Send WhatsApp invite">
                        <IconButton size="small" onClick={() => sendInvite(guest)} sx={{ color: "#15803D" }}><WhatsApp fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Remove guest">
                        <IconButton size="small" onClick={() => setDeleteTarget(guest)} sx={{ color: "#B42318" }}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                    {guest.rsvpStatus === "pending" && (
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" onClick={() => setRsvp(guest, "confirmed")} sx={{ textTransform: "none", fontSize: 11, fontWeight: 700, color: "#15803D" }}>Mark yes</Button>
                        <Button size="small" onClick={() => setRsvp(guest, "declined")} sx={{ textTransform: "none", fontSize: 11, fontWeight: 700, color: "#B42318" }}>Mark no</Button>
                      </Stack>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ---------------- add guest ---------------- */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Guest</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} autoFocus />
            <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            <TextField fullWidth label="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Stack direction="row" spacing={1.5}>
              <FormControl fullWidth>
                <Select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} sx={{ borderRadius: 2 }}>
                  {GUEST_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField fullWidth type="number" label="Plus ones" value={form.plusOnes} onChange={(e) => setForm((p) => ({ ...p, plusOnes: e.target.value }))} />
            </Stack>
            <TextField fullWidth multiline minRows={2} label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {saving ? "Adding..." : "Add Guest"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- bulk add ---------------- */}
      <Dialog open={bulkOpen} onClose={() => !bulkSaving && setBulkOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Bulk Add Guests</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: 12.5, color: "#8A8498" }}>
              One guest per line. Optionally add a phone after a comma: <i>Ravi Kumar, 9876543210</i>
            </Typography>
            <TextField
              fullWidth multiline minRows={8}
              placeholder={"Ravi Kumar, 9876543210\nPriya Sharma, 9123456780\nAmit Verma"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <FormControl fullWidth>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Category for all of them</Typography>
              <Select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} sx={{ borderRadius: 2 }}>
                {GUEST_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setBulkOpen(false)} disabled={bulkSaving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submitBulk} disabled={bulkSaving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {bulkSaving ? "Adding..." : "Add All"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- delete confirm ---------------- */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Remove this guest?</DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   EVENT DETAIL (tabs)
========================================================= */

function EventDetail({ eventId, onBack, onDeleted }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchEvent(eventId);
      setEvent(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load event"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !event) {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>;
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={onBack} sx={{ color: "#332D3A" }}><ArrowBack /></IconButton>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 17, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</Typography>
          <Typography sx={{ fontSize: 12, color: "#8A8498" }}>{formatDate(event.date)}{event.venue ? ` · ${event.venue}` : ""}</Typography>
        </Box>
      </Stack>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid #ECE8F5", mb: 2.5, overflow: "hidden" }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": { textTransform: "none", fontWeight: 700, fontSize: 13.5 },
            "& .Mui-selected": { color: `${PURPLE} !important` },
            "& .MuiTabs-indicator": { bgcolor: PURPLE, height: 3 },
          }}
        >
          <Tab label="Overview" />
          <Tab label="Items" />
          <Tab label="Guests" />
        </Tabs>
      </Paper>

      {tab === 0 && <OverviewTab event={event} onUpdated={setEvent} onDeleted={onDeleted} />}
      {tab === 1 && <ItemsTab eventId={event._id} onSummaryChange={load} />}
      {tab === 2 && <GuestsTab event={event} />}
    </Box>
  );
}

/* =========================================================
   PAGE
========================================================= */

function EventsInner() {
  const [selectedEventId, setSelectedEventId] = useState(null);

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#FAF9FF 0%,#FFFFFF 55%)" }}>
      <Navbar />
      <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 1.5, sm: 2.5, md: 3 }, py: { xs: 2, sm: 2.5, md: 3 } }}>
        {!selectedEventId ? (
          <>
            <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 800, color: "#171225", letterSpacing: -0.6, mb: 0.3 }}>
              Events
            </Typography>
            <Typography sx={{ color: "#77728A", fontSize: 13.5, mb: 2.5 }}>
              Plan office functions and celebrations — supplies, budget, and guest list all in one place.
            </Typography>
            <EventsList onOpen={(event) => setSelectedEventId(event._id)} />
          </>
        ) : (
          <EventDetail
            eventId={selectedEventId}
            onBack={() => setSelectedEventId(null)}
            onDeleted={() => setSelectedEventId(null)}
          />
        )}
      </Box>
    </Box>
  );
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <EventsInner />
    </ProtectedRoute>
  );
}