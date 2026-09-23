"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, AvatarGroup, Box, Button, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControl, FormControlLabel, IconButton, InputAdornment, MenuItem,
  Paper, Rating, Select, Stack, Switch, Tab, Tabs, TextField, Tooltip,
  Typography,
} from "@mui/material";

import {
  Add, Business, Close, Compare, Delete, Description, Edit,
  LocationOn, Phone, Search, VideoCameraFront, WhatsApp, WorkOutline,
  Groups, PictureAsPdf, EventBusy,
} from "@mui/icons-material";

import { toast } from "react-toastify";

import ProtectedRoute from "../../components/ProtectedRoute";
import Navbar from "../../components/Navbar";
import api from "../../lib/api";
import {
  fetchJobs, createJob, updateJob, deleteJob,
  fetchCandidates, addCandidate, updateCandidate, deleteCandidate, compareCandidates,
  scheduleInterview, fetchInterviews, updateInterview, markInterviewConfirmed,
  addInterviewFeedback, setInterviewOutcome, deleteInterview,
  buildWhatsAppReminderUrl,
} from "../../lib/recruitmentApi";

const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const getUserName = (user) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  return user.name || user.username || user.email || "User";
};

const getInitial = (user) => (getUserName(user).trim().charAt(0) || "U").toUpperCase();

const formatMoney = (value) => (value ? `₹${Number(value).toLocaleString("en-IN")}` : "—");

const formatDateTime = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

const CANDIDATE_STATUSES = [
  { value: "applied", label: "Applied", color: "#6B6478", bg: "#F1EDF8" },
  { value: "shortlisted", label: "Shortlisted", color: "#0369A1", bg: "#E0F2FE" },
  { value: "interview-scheduled", label: "Interview Scheduled", color: "#B45309", bg: "#FFF4E5" },
  { value: "interviewed", label: "Interviewed", color: "#7C3AED", bg: "#F1EBFF" },
  { value: "selected", label: "Selected", color: "#15803D", bg: "#E8F7EE" },
  { value: "on-hold", label: "On Hold", color: "#92400E", bg: "#FEF3C7" },
  { value: "rejected", label: "Rejected", color: "#B42318", bg: "#FEE4E2" },
  { value: "joined", label: "Joined", color: "#15803D", bg: "#DCFCE7" },
  { value: "not-joined", label: "Did Not Join", color: "#B42318", bg: "#FEE4E2" },
];

const statusMeta = (status) => CANDIDATE_STATUSES.find((s) => s.value === status) || CANDIDATE_STATUSES[0];

const JOB_STATUSES = [
  { value: "open", label: "Open", color: "#15803D", bg: "#E8F7EE" },
  { value: "on-hold", label: "On Hold", color: "#B45309", bg: "#FFF4E5" },
  { value: "closed", label: "Closed", color: "#6B6478", bg: "#F1EDF8" },
];

const jobStatusMeta = (status) => JOB_STATUSES.find((s) => s.value === status) || JOB_STATUSES[0];

const OUTCOME_META = {
  pending: { label: "Pending", color: "#6B6478", bg: "#F1EDF8" },
  pass: { label: "Passed", color: "#15803D", bg: "#E8F7EE" },
  fail: { label: "Failed", color: "#B42318", bg: "#FEE4E2" },
  hold: { label: "On Hold", color: "#B45309", bg: "#FFF4E5" },
};

const modeIcon = (mode) => {
  if (mode === "offline") return <LocationOn sx={{ fontSize: 15 }} />;
  if (mode === "phone") return <Phone sx={{ fontSize: 15 }} />;
  return <VideoCameraFront sx={{ fontSize: 15 }} />;
};

/* =========================================================
   SHARED BITS
========================================================= */

function SectionHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "stretch", sm: "center" }}
      spacing={1.5}
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography sx={{ fontSize: 19, fontWeight: 800, color: "#171225" }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 12.5, color: "#8A8498", mt: 0.2 }}>{subtitle}</Typography>}
      </Box>
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
   JOBS TAB
========================================================= */

function JobsTab({ jobs, jobsLoading, reloadJobs, onViewCandidates }) {
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const emptyForm = {
    title: "", department: "", location: "", description: "",
    experienceMin: "", experienceMax: "", qualification: "",
    budgetMin: "", budgetMax: "", openings: "1", status: "open",
  };
  const [form, setForm] = useState(emptyForm);

  const filteredJobs = useMemo(
    () => (filter === "all" ? jobs : jobs.filter((job) => job.status === filter)),
    [jobs, filter]
  );

  const openCreate = () => {
    setEditingJob(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title || "", department: job.department || "", location: job.location || "",
      description: job.description || "",
      experienceMin: String(job.experienceMin || ""), experienceMax: String(job.experienceMax || ""),
      qualification: (job.qualification || []).join(", "),
      budgetMin: String(job.budgetMin || ""), budgetMax: String(job.budgetMax || ""),
      openings: String(job.openings || 1), status: job.status || "open",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Job title is required");

    try {
      setSaving(true);
      if (editingJob) {
        await updateJob(editingJob._id, form);
        toast.success("Job updated");
      } else {
        await createJob(form);
        toast.success("Job posted");
      }
      setDialogOpen(false);
      reloadJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save job"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJob(deleteTarget._id);
      toast.success("Job deleted");
      setDeleteTarget(null);
      reloadJobs();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete job"));
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Job Openings"
        subtitle={`${filteredJobs.length} job${filteredJobs.length !== 1 ? "s" : ""}`}
        actionLabel="Post Job"
        onAction={openCreate}
      />

      <FilterChips
        options={[{ value: "all", label: "All" }, ...JOB_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        value={filter}
        onChange={setFilter}
      />

      {jobsLoading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : filteredJobs.length === 0 ? (
        <EmptyState
          icon={<WorkOutline sx={{ fontSize: 36, color: "#D8D1E5" }} />}
          title="No jobs yet"
          subtitle="Post a job to start adding candidates."
        />
      ) : (
        <Stack spacing={1.2}>
          {filteredJobs.map((job) => {
            const sMeta = jobStatusMeta(job.status);
            const summary = job.candidateSummary || { total: 0, byStatus: {} };

            return (
              <Paper key={job._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>{job.title}</Typography>
                      <Chip size="small" label={sMeta.label} sx={{ height: 21, fontSize: 10, fontWeight: 800, bgcolor: sMeta.bg, color: sMeta.color }} />
                    </Stack>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.6 }}>
                      {job.department && (
                        <Stack direction="row" alignItems="center" spacing={0.4}>
                          <Business sx={{ fontSize: 14, color: "#A39CAF" }} />
                          <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{job.department}</Typography>
                        </Stack>
                      )}
                      {job.location && (
                        <Stack direction="row" alignItems="center" spacing={0.4}>
                          <LocationOn sx={{ fontSize: 14, color: "#A39CAF" }} />
                          <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{job.location}</Typography>
                        </Stack>
                      )}
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{job.experienceMin}-{job.experienceMax} yrs</Typography>
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{formatMoney(job.budgetMin)} - {formatMoney(job.budgetMax)}</Typography>
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{job.openings} opening{job.openings > 1 ? "s" : ""}</Typography>
                    </Stack>

                    {job.qualification?.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5} sx={{ mt: 0.8 }}>
                        {job.qualification.map((q) => (
                          <Chip key={q} size="small" label={q} sx={{ height: 20, fontSize: 10, bgcolor: "#F5F1FB" }} />
                        ))}
                      </Stack>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <Chip
                        size="small"
                        icon={<Groups sx={{ fontSize: 13 }} />}
                        label={`${summary.total} candidate${summary.total !== 1 ? "s" : ""}`}
                        sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: "#F5F1FB" }}
                      />
                      {summary.byStatus?.selected > 0 && (
                        <Chip size="small" label={`${summary.byStatus.selected} selected`} sx={{ height: 22, fontSize: 10.5, fontWeight: 700, bgcolor: "#E8F7EE", color: "#15803D" }} />
                      )}
                    </Stack>
                  </Box>

                  <Stack spacing={0.5}>
                    <Tooltip title="View candidates">
                      <IconButton size="small" onClick={() => onViewCandidates(job)} sx={{ color: PURPLE }}>
                        <Groups fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(job)}><Edit fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => setDeleteTarget(job)} sx={{ color: "#B42318" }}><Delete fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingJob ? "Edit Job" : "Post a New Job"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField fullWidth label="Job title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} autoFocus />
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Department" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
              <TextField fullWidth label="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
            </Stack>
            <TextField fullWidth multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Min experience (yrs)" value={form.experienceMin} onChange={(e) => setForm((p) => ({ ...p, experienceMin: e.target.value }))} />
              <TextField fullWidth type="number" label="Max experience (yrs)" value={form.experienceMax} onChange={(e) => setForm((p) => ({ ...p, experienceMax: e.target.value }))} />
            </Stack>
            <TextField fullWidth label="Qualification (comma separated)" placeholder="B.Tech, MCA, Any Graduate" value={form.qualification} onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))} />
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Budget min (₹/yr)" value={form.budgetMin} onChange={(e) => setForm((p) => ({ ...p, budgetMin: e.target.value }))} />
              <TextField fullWidth type="number" label="Budget max (₹/yr)" value={form.budgetMax} onChange={(e) => setForm((p) => ({ ...p, budgetMax: e.target.value }))} />
            </Stack>
            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Openings" value={form.openings} onChange={(e) => setForm((p) => ({ ...p, openings: e.target.value }))} />
              <FormControl fullWidth>
                <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} sx={{ borderRadius: 2 }}>
                  {JOB_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {saving ? "Saving..." : editingJob ? "Save Changes" : "Post Job"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this job?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#746D7D" }}>
            This also deletes every candidate and interview linked to &quot;{deleteTarget?.title}&quot;. This can&apos;t be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   CANDIDATES TAB
========================================================= */

function CandidatesTab({ jobs, jobFilter, setJobFilter, onSchedule }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareJobId, setCompareJobId] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [comparing, setComparing] = useState(false);

  const emptyForm = {
    job: "", name: "", email: "", phone: "", experienceYears: "",
    currentCompany: "", currentDesignation: "", qualification: "", skills: "",
    currentSalary: "", expectedSalary: "", negotiable: true, noticePeriodDays: "",
    source: "", notes: "", status: "applied", overallRating: 0,
  };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchCandidates({
        job: jobFilter !== "all" ? jobFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        sort,
        q: search || undefined,
      });
      setCandidates(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load candidates"));
    } finally {
      setLoading(false);
    }
  }, [jobFilter, statusFilter, sort, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingCandidate(null);
    setForm({ ...emptyForm, job: jobFilter !== "all" ? jobFilter : "" });
    setResumeFile(null);
    setDialogOpen(true);
  };

  const openEdit = (candidate) => {
    setEditingCandidate(candidate);
    setForm({
      job: getId(candidate.job), name: candidate.name || "", email: candidate.email || "",
      phone: candidate.phone || "", experienceYears: String(candidate.experienceYears || ""),
      currentCompany: candidate.currentCompany || "", currentDesignation: candidate.currentDesignation || "",
      qualification: candidate.qualification || "", skills: (candidate.skills || []).join(", "),
      currentSalary: String(candidate.currentSalary || ""), expectedSalary: String(candidate.expectedSalary || ""),
      negotiable: candidate.negotiable !== false, noticePeriodDays: String(candidate.noticePeriodDays || ""),
      source: candidate.source || "", notes: candidate.notes || "",
      status: candidate.status || "applied", overallRating: candidate.overallRating || 0,
    });
    setResumeFile(null);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.job) return toast.error("Please select a job");
    if (!form.name.trim()) return toast.error("Candidate name is required");

    try {
      setSaving(true);
      if (editingCandidate) {
        await updateCandidate(editingCandidate._id, form, resumeFile);
        toast.success("Candidate updated");
      } else {
        await addCandidate(form, resumeFile);
        toast.success("Candidate added");
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save candidate"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCandidate(deleteTarget._id);
      toast.success("Candidate deleted");
      setDeleteTarget(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete candidate"));
    }
  };

  const openCompare = async () => {
    const jobId = jobFilter !== "all" ? jobFilter : compareJobId;
    if (!jobId) return toast.error("Pick a job first to compare its candidates");

    setCompareJobId(jobId);
    setCompareOpen(true);
    setComparing(true);
    try {
      const response = await compareCandidates(jobId);
      setCompareData(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load comparison"));
    } finally {
      setComparing(false);
    }
  };

  return (
    <Box>
      <SectionHeader
        title="Candidates"
        subtitle={`${candidates.length} candidate${candidates.length !== 1 ? "s" : ""}`}
        actionLabel="Add Candidate"
        onAction={openCreate}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} sx={{ borderRadius: 2, fontSize: 13 }} displayEmpty>
            <MenuItem value="all">All jobs</MenuItem>
            {jobs.map((job) => <MenuItem key={job._id} value={job._id}>{job.title}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} sx={{ borderRadius: 2, fontSize: 13 }}>
            <MenuItem value="newest">Newest first</MenuItem>
            <MenuItem value="rating">Highest rated</MenuItem>
            <MenuItem value="experience">Most experienced</MenuItem>
            <MenuItem value="expected-salary">Lowest expected salary</MenuItem>
            <MenuItem value="expected-salary-desc">Highest expected salary</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: "#A9A2B5" }} /></InputAdornment> }}
        />

        <Button variant="outlined" startIcon={<Compare />} onClick={openCompare} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, whiteSpace: "nowrap" }}>
          Compare
        </Button>
      </Stack>

      <FilterChips
        options={[{ value: "all", label: "All" }, ...CANDIDATE_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
        value={statusFilter}
        onChange={setStatusFilter}
      />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : candidates.length === 0 ? (
        <EmptyState title="No candidates found" subtitle="Try a different filter, or add a new candidate." />
      ) : (
        <Stack spacing={1.2}>
          {candidates.map((candidate) => {
            const sMeta = statusMeta(candidate.status);
            return (
              <Paper key={candidate._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Stack direction="row" spacing={1.3} sx={{ minWidth: 0, flex: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: "#EEE7FF", color: PURPLE_DARK, fontWeight: 800 }}>
                      {candidate.name?.charAt(0)?.toUpperCase() || "C"}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{candidate.name}</Typography>
                        <Chip size="small" label={sMeta.label} sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: sMeta.bg, color: sMeta.color }} />
                        {candidate.overallRating > 0 && (
                          <Rating value={candidate.overallRating} readOnly size="small" precision={0.5} />
                        )}
                      </Stack>

                      <Typography sx={{ fontSize: 11.5, color: PURPLE_DARK, fontWeight: 600, mt: 0.2 }}>
                        {candidate.job?.title || "—"}
                      </Typography>

                      <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.6 }}>
                        {candidate.phone && <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>📞 {candidate.phone}</Typography>}
                        <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>{candidate.experienceYears} yrs exp</Typography>
                        {candidate.currentCompany && <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>at {candidate.currentCompany}</Typography>}
                      </Stack>

                      <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.4 }}>
                        <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>
                          Current: {formatMoney(candidate.currentSalary)}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>
                          Expected: {formatMoney(candidate.expectedSalary)}{candidate.negotiable ? " (negotiable)" : ""}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: "#6F6880" }}>
                          Notice: {candidate.noticePeriodDays} days
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack spacing={0.5} alignItems="flex-end">
                    <Stack direction="row" spacing={0.3}>
                      {candidate.resumeUrl && (
                        <Tooltip title="View resume">
                          <IconButton size="small" component="a" href={candidate.resumeUrl} target="_blank" rel="noreferrer" sx={{ color: PURPLE }}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(candidate)}><Edit fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteTarget(candidate)} sx={{ color: "#B42318" }}><Delete fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>

                    <Button
                      size="small"
                      onClick={() => onSchedule(candidate)}
                      sx={{ textTransform: "none", fontSize: 11.5, fontWeight: 700, color: PURPLE_DARK }}
                    >
                      Schedule Interview
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ---------------- add/edit candidate ---------------- */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingCandidate ? "Edit Candidate" : "Add Candidate"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Applying for</Typography>
              <Select value={form.job} onChange={(e) => setForm((p) => ({ ...p, job: e.target.value }))} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="">Select a job</MenuItem>
                {jobs.map((job) => <MenuItem key={job._id} value={job._id}>{job.title}</MenuItem>)}
              </Select>
            </FormControl>

            <TextField fullWidth label="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Experience (yrs)" value={form.experienceYears} onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))} />
              <TextField fullWidth label="Qualification" value={form.qualification} onChange={(e) => setForm((p) => ({ ...p, qualification: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Current company" value={form.currentCompany} onChange={(e) => setForm((p) => ({ ...p, currentCompany: e.target.value }))} />
              <TextField fullWidth label="Current designation" value={form.currentDesignation} onChange={(e) => setForm((p) => ({ ...p, currentDesignation: e.target.value }))} />
            </Stack>

            <TextField fullWidth label="Skills (comma separated)" value={form.skills} onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))} />

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth type="number" label="Current salary (₹/yr)" value={form.currentSalary} onChange={(e) => setForm((p) => ({ ...p, currentSalary: e.target.value }))} />
              <TextField fullWidth type="number" label="Expected salary (₹/yr)" value={form.expectedSalary} onChange={(e) => setForm((p) => ({ ...p, expectedSalary: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <FormControlLabel
                control={<Switch checked={form.negotiable} onChange={(e) => setForm((p) => ({ ...p, negotiable: e.target.checked }))} />}
                label={<Typography sx={{ fontSize: 13 }}>Negotiable</Typography>}
              />
              <TextField fullWidth type="number" label="Notice period (days)" value={form.noticePeriodDays} onChange={(e) => setForm((p) => ({ ...p, noticePeriodDays: e.target.value }))} />
            </Stack>

            <TextField fullWidth label="Source" placeholder="Referral, Naukri, LinkedIn, Walk-in..." value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} />

            {editingCandidate && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <FormControl fullWidth>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Status</Typography>
                  <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} sx={{ borderRadius: 2 }}>
                    {CANDIDATE_STATUSES.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                  </Select>
                </FormControl>

                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Overall rating</Typography>
                  <Rating
                    value={form.overallRating}
                    precision={0.5}
                    onChange={(_, value) => setForm((p) => ({ ...p, overallRating: value || 0 }))}
                  />
                </Box>
              </Stack>
            )}

            <TextField fullWidth multiline minRows={2} label="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

            <Button component="label" variant="outlined" startIcon={<Description />} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, alignSelf: "flex-start" }}>
              {resumeFile ? resumeFile.name : editingCandidate?.resumeFileName ? "Replace resume" : "Upload resume (PDF/Word)"}
              <input type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {saving ? "Saving..." : editingCandidate ? "Save Changes" : "Add Candidate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- delete confirm ---------------- */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Delete this candidate?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: "#746D7D" }}>
            This also deletes {deleteTarget?.name}&apos;s interview history and resume. This can&apos;t be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- compare candidates ---------------- */}
      <Dialog open={compareOpen} onClose={() => setCompareOpen(false)} fullWidth maxWidth="lg" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Compare Candidates{compareData?.job?.title ? ` — ${compareData.job.title}` : ""}
        </DialogTitle>
        <DialogContent>
          {comparing ? (
            <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
          ) : !compareData?.candidates?.length ? (
            <EmptyState title="No candidates to compare" subtitle="Add candidates to this job first." />
          ) : (
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 900 }}>
                <Stack direction="row" spacing={0} sx={{ borderBottom: "2px solid #ECE8F5", pb: 1, mb: 1 }}>
                  {["Rank", "Name", "Status", "Exp.", "Qualification", "Current CTC", "Expected CTC", "Notice", "Rating", "Rounds", "Budget Fit", "Resume"].map((h) => (
                    <Box key={h} sx={{ flex: h === "Name" ? 1.5 : 1, fontSize: 11, fontWeight: 800, color: "#8A8498", textTransform: "uppercase" }}>{h}</Box>
                  ))}
                </Stack>

                {compareData.candidates.map((c, index) => {
                  const sMeta = statusMeta(c.status);
                  return (
                    <Stack key={c._id} direction="row" alignItems="center" spacing={0} sx={{ py: 1.2, borderBottom: "1px solid #F2EFF6" }}>
                      <Box sx={{ flex: 1 }}>
                        {index === 0 ? (
                          <Chip size="small" label="🏆 Best" sx={{ bgcolor: "#E8F7EE", color: "#15803D", fontWeight: 800, fontSize: 10.5 }} />
                        ) : (
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#8A8498" }}>#{index + 1}</Typography>
                        )}
                      </Box>
                      <Box sx={{ flex: 1.5 }}><Typography sx={{ fontSize: 13, fontWeight: 700 }}>{c.name}</Typography></Box>
                      <Box sx={{ flex: 1 }}><Chip size="small" label={sMeta.label} sx={{ height: 20, fontSize: 9.5, bgcolor: sMeta.bg, color: sMeta.color }} /></Box>
                      <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 12.5 }}>{c.experienceYears} yrs</Typography></Box>
                      <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 12.5 }}>{c.qualification || "—"}</Typography></Box>
                      <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 12.5 }}>{formatMoney(c.currentSalary)}</Typography></Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5 }}>{formatMoney(c.expectedSalary)}</Typography>
                        {c.negotiable && <Typography sx={{ fontSize: 10, color: "#8A8498" }}>negotiable</Typography>}
                      </Box>
                      <Box sx={{ flex: 1 }}><Typography sx={{ fontSize: 12.5 }}>{c.noticePeriodDays}d</Typography></Box>
                      <Box sx={{ flex: 1 }}>
                        <Rating value={c.avgFeedbackRating ?? c.overallRating ?? 0} readOnly size="small" precision={0.5} />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 12, color: "#15803D" }}>{c.passedRounds} pass</Typography>
                        {c.failedRounds > 0 && <Typography sx={{ fontSize: 11, color: "#B42318" }}>{c.failedRounds} fail</Typography>}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        {c.withinBudget === null ? (
                          <Typography sx={{ fontSize: 11.5, color: "#8A8498" }}>—</Typography>
                        ) : c.withinBudget ? (
                          <Chip size="small" label="Within" sx={{ height: 20, fontSize: 9.5, bgcolor: "#E8F7EE", color: "#15803D" }} />
                        ) : (
                          <Chip size="small" label="Over" sx={{ height: 20, fontSize: 9.5, bgcolor: "#FEE4E2", color: "#B42318" }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        {c.resumeUrl ? (
                          <IconButton size="small" component="a" href={c.resumeUrl} target="_blank" rel="noreferrer" sx={{ color: PURPLE }}>
                            <PictureAsPdf fontSize="small" />
                          </IconButton>
                        ) : "—"}
                      </Box>
                    </Stack>
                  );
                })}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCompareOpen(false)} sx={{ textTransform: "none", fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* =========================================================
   INTERVIEWS TAB
========================================================= */

function InterviewsTab({ jobs, candidates, users, myId, presetCandidate, onConsumePreset }) {
  const [scope, setScope] = useState("upcoming");
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    candidate: "", round: "Round 1", roundNumber: "1", scheduledAt: "",
    durationMinutes: "30", mode: "online", location: "", interviewers: [],
  });

  const [detail, setDetail] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ rating: 0, comments: "", recommendation: "hold" });
  const [savingFeedback, setSavingFeedback] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchInterviews({ scope });
      setInterviews(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load interviews"));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (presetCandidate) {
      setScheduleForm((p) => ({ ...p, candidate: presetCandidate._id }));
      setScheduleOpen(true);
      onConsumePreset();
    }
  }, [presetCandidate, onConsumePreset]);

  const openSchedule = () => {
    setScheduleForm({
      candidate: "", round: "Round 1", roundNumber: "1", scheduledAt: "",
      durationMinutes: "30", mode: "online", location: "", interviewers: [],
    });
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleForm.candidate) return toast.error("Please select a candidate");
    if (!scheduleForm.scheduledAt) return toast.error("Please pick a date and time");

    try {
      setScheduling(true);
      await scheduleInterview(scheduleForm);
      toast.success("Interview scheduled");
      setScheduleOpen(false);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not schedule interview"));
    } finally {
      setScheduling(false);
    }
  };

  const openDetail = (interview) => {
    setDetail(interview);
    const mine = (interview.feedback || []).find((f) => getId(f.interviewer) === myId);
    setFeedbackForm(mine ? { rating: mine.rating, comments: mine.comments, recommendation: mine.recommendation } : { rating: 0, comments: "", recommendation: "hold" });
  };

  const refreshDetail = async (id) => {
    try {
      const response = await api.get(`/interviews/${id}`);
      setDetail(response.data);
      setInterviews((previous) => previous.map((i) => (i._id === id ? { ...i, ...response.data } : i)));
    } catch {
      // detail dialog just keeps showing the stale copy — not fatal
    }
  };

  const submitFeedback = async () => {
    if (!feedbackForm.rating) return toast.error("Please give a rating");
    try {
      setSavingFeedback(true);
      await addInterviewFeedback(detail._id, feedbackForm);
      toast.success("Feedback saved");
      refreshDetail(detail._id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save feedback"));
    } finally {
      setSavingFeedback(false);
    }
  };

  const confirmNow = async () => {
    try {
      await markInterviewConfirmed(detail._id);
      toast.success("Marked as confirmed");
      refreshDetail(detail._id);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update confirmation"));
    }
  };

  const changeOutcome = async (outcome) => {
    try {
      await setInterviewOutcome(detail._id, outcome);
      toast.success(`Marked as ${outcome}`);
      refreshDetail(detail._id);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update outcome"));
    }
  };

  const cancelInterview = async () => {
    try {
      await updateInterview(detail._id, { status: "cancelled" });
      toast.success("Interview cancelled");
      setDetail(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not cancel interview"));
    }
  };

  const sendWhatsAppReminder = () => {
    const phone = detail.candidate?.phone;
    if (!phone) return toast.error("This candidate has no phone number saved");
    window.open(buildWhatsAppReminderUrl(detail, phone), "_blank");
  };

  const scopeOptions = [
    { value: "upcoming", label: "Upcoming" },
    { value: "pending-confirmation", label: "Pending Confirmation" },
    { value: "mine", label: "My Interviews" },
    { value: "completed", label: "Completed" },
  ];

  return (
    <Box>
      <SectionHeader
        title="Interviews"
        subtitle={`${interviews.length} interview${interviews.length !== 1 ? "s" : ""}`}
        actionLabel="Schedule Interview"
        onAction={openSchedule}
      />

      <FilterChips options={scopeOptions} value={scope} onChange={setScope} />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress sx={{ color: PURPLE }} /></Stack>
      ) : interviews.length === 0 ? (
        <EmptyState icon={<EventBusy sx={{ fontSize: 36, color: "#D8D1E5" }} />} title="No interviews here" subtitle="Schedule one to get started." />
      ) : (
        <Stack spacing={1.2}>
          {interviews.map((interview) => {
            const outcomeMeta = OUTCOME_META[interview.outcome] || OUTCOME_META.pending;
            return (
              <Paper
                key={interview._id}
                elevation={0}
                onClick={() => openDetail(interview)}
                sx={{ p: 2, borderRadius: 3, border: "1px solid #ECE8F5", cursor: "pointer", "&:hover": { bgcolor: "#FAF8FE" } }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" rowGap={0.5}>
                      <Typography sx={{ fontWeight: 800, fontSize: 15 }}>{interview.candidate?.name || "Candidate"}</Typography>
                      <Chip size="small" label={interview.round} sx={{ height: 20, fontSize: 9.5, fontWeight: 700, bgcolor: "#F5F1FB" }} />
                      {interview.status === "completed" && (
                        <Chip size="small" label={outcomeMeta.label} sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: outcomeMeta.bg, color: outcomeMeta.color }} />
                      )}
                      {interview.status === "cancelled" && (
                        <Chip size="small" label="Cancelled" sx={{ height: 20, fontSize: 9.5, fontWeight: 800, bgcolor: "#F1EDF8", color: "#6B6478" }} />
                      )}
                    </Stack>

                    <Typography sx={{ fontSize: 11.5, color: PURPLE_DARK, fontWeight: 600, mt: 0.2 }}>{interview.job?.title}</Typography>

                    <Stack direction="row" spacing={1.5} flexWrap="wrap" rowGap={0.4} sx={{ mt: 0.6 }} alignItems="center">
                      <Typography sx={{ fontSize: 12, color: "#6F6880" }}>{formatDateTime(interview.scheduledAt)}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.4}>
                        {modeIcon(interview.mode)}
                        <Typography sx={{ fontSize: 12, color: "#6F6880", textTransform: "capitalize" }}>{interview.mode}</Typography>
                      </Stack>
                      {interview.confirmed ? (
                        <Chip size="small" label="Confirmed" sx={{ height: 20, fontSize: 9.5, fontWeight: 700, bgcolor: "#E8F7EE", color: "#15803D" }} />
                      ) : (
                        <Chip size="small" label="Not confirmed" sx={{ height: 20, fontSize: 9.5, fontWeight: 700, bgcolor: "#FFF4E5", color: "#B45309" }} />
                      )}
                    </Stack>

                    {interview.interviewers?.length > 0 && (
                      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt: 0.8 }}>
                        <AvatarGroup max={4} sx={{ "& .MuiAvatar-root": { width: 22, height: 22, fontSize: 10 } }}>
                          {interview.interviewers.map((person) => (
                            <Avatar key={getId(person)} src={person.avatarUrl}>{getInitial(person)}</Avatar>
                          ))}
                        </AvatarGroup>
                        <Typography sx={{ fontSize: 11, color: "#8A8498" }}>
                          {interview.interviewers.map((p) => getUserName(p)).join(", ")}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* ---------------- schedule dialog ---------------- */}
      <Dialog open={scheduleOpen} onClose={() => !scheduling && setScheduleOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Schedule Interview</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Candidate</Typography>
              <Select value={scheduleForm.candidate} onChange={(e) => setScheduleForm((p) => ({ ...p, candidate: e.target.value }))} displayEmpty sx={{ borderRadius: 2 }}>
                <MenuItem value="">Select a candidate</MenuItem>
                {candidates.map((c) => (
                  <MenuItem key={c._id} value={c._id}>{c.name} — {c.job?.title || ""}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1.5}>
              <TextField fullWidth label="Round" value={scheduleForm.round} onChange={(e) => setScheduleForm((p) => ({ ...p, round: e.target.value }))} />
              <TextField fullWidth type="number" label="Round #" value={scheduleForm.roundNumber} onChange={(e) => setScheduleForm((p) => ({ ...p, roundNumber: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth type="datetime-local" label="Date & time"
                InputLabelProps={{ shrink: true }}
                value={scheduleForm.scheduledAt}
                onChange={(e) => setScheduleForm((p) => ({ ...p, scheduledAt: e.target.value }))}
              />
              <TextField fullWidth type="number" label="Duration (min)" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm((p) => ({ ...p, durationMinutes: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <FormControl fullWidth>
                <Select value={scheduleForm.mode} onChange={(e) => setScheduleForm((p) => ({ ...p, mode: e.target.value }))} sx={{ borderRadius: 2 }}>
                  <MenuItem value="online">Online</MenuItem>
                  <MenuItem value="offline">In-person</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                </Select>
              </FormControl>
              <TextField fullWidth label={scheduleForm.mode === "offline" ? "Address" : "Meeting link"} value={scheduleForm.location} onChange={(e) => setScheduleForm((p) => ({ ...p, location: e.target.value }))} />
            </Stack>

            <FormControl fullWidth>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.6, color: "#57505F" }}>Interviewers</Typography>
              <Select
                multiple
                value={scheduleForm.interviewers}
                onChange={(e) => setScheduleForm((p) => ({ ...p, interviewers: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value }))}
                displayEmpty
                sx={{ borderRadius: 2 }}
                renderValue={(selected) => (!selected.length ? <Typography sx={{ color: "#9A94A3", fontSize: 13 }}>Select interviewers</Typography> : (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" rowGap={0.5}>
                    {selected.map((id) => <Chip key={id} size="small" label={getUserName(users.find((u) => u._id === id))} />)}
                  </Stack>
                ))}
              >
                {users.map((u) => <MenuItem key={u._id} value={u._id}>{getUserName(u)}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setScheduleOpen(false)} disabled={scheduling} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={submitSchedule} disabled={scheduling} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}>
            {scheduling ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- interview detail ---------------- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        {detail && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {detail.candidate?.name}
              <IconButton size="small" onClick={() => setDetail(null)}><Close fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={0.6}>
                  <Chip size="small" label={detail.round} sx={{ bgcolor: "#F5F1FB", fontWeight: 700 }} />
                  <Chip size="small" label={detail.status} sx={{ bgcolor: "#F1EDF8", fontWeight: 700, textTransform: "capitalize" }} />
                  {detail.status === "completed" && (
                    <Chip size="small" label={OUTCOME_META[detail.outcome]?.label} sx={{ bgcolor: OUTCOME_META[detail.outcome]?.bg, color: OUTCOME_META[detail.outcome]?.color, fontWeight: 800 }} />
                  )}
                  {detail.confirmed ? (
                    <Chip size="small" label="Confirmed" sx={{ bgcolor: "#E8F7EE", color: "#15803D", fontWeight: 700 }} />
                  ) : (
                    <Chip size="small" label="Not confirmed" sx={{ bgcolor: "#FFF4E5", color: "#B45309", fontWeight: 700 }} />
                  )}
                </Stack>

                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 13 }}><b>When:</b> {formatDateTime(detail.scheduledAt)} ({detail.durationMinutes} min)</Typography>
                  <Typography sx={{ fontSize: 13, textTransform: "capitalize" }}><b>Mode:</b> {detail.mode}{detail.location ? ` — ${detail.location}` : ""}</Typography>
                  {detail.candidate?.phone && <Typography sx={{ fontSize: 13 }}><b>Phone:</b> {detail.candidate.phone}</Typography>}
                  {detail.interviewers?.length > 0 && (
                    <Typography sx={{ fontSize: 13 }}><b>Interviewers:</b> {detail.interviewers.map((p) => getUserName(p)).join(", ")}</Typography>
                  )}
                </Stack>

                <Divider />

                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
                  {!detail.confirmed && (
                    <Button size="small" variant="outlined" onClick={confirmNow} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                      Mark Confirmed
                    </Button>
                  )}
                  <Button size="small" variant="outlined" startIcon={<WhatsApp />} onClick={sendWhatsAppReminder} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, color: "#15803D", borderColor: "#15803D" }}>
                    Send WhatsApp Reminder
                  </Button>
                  {detail.status !== "cancelled" && detail.status !== "completed" && (
                    <Button size="small" variant="outlined" color="error" onClick={cancelInterview} sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}>
                      Cancel Interview
                    </Button>
                  )}
                </Stack>

                {detail.status !== "cancelled" && (
                  <>
                    <Divider />
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>Round Outcome</Typography>
                      <Stack direction="row" spacing={1}>
                        {["pass", "hold", "fail"].map((outcome) => (
                          <Button
                            key={outcome}
                            size="small"
                            variant={detail.outcome === outcome ? "contained" : "outlined"}
                            onClick={() => changeOutcome(outcome)}
                            sx={{
                              borderRadius: 2, textTransform: "none", fontWeight: 700, flex: 1,
                              ...(detail.outcome === outcome && { bgcolor: OUTCOME_META[outcome].color, "&:hover": { bgcolor: OUTCOME_META[outcome].color } }),
                            }}
                          >
                            {OUTCOME_META[outcome].label}
                          </Button>
                        ))}
                      </Stack>
                    </Box>
                  </>
                )}

                <Divider />

                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>Feedback</Typography>

                  {(detail.feedback || []).length === 0 ? (
                    <Typography sx={{ fontSize: 12.5, color: "#8A8498" }}>No feedback submitted yet.</Typography>
                  ) : (
                    <Stack spacing={1} sx={{ mb: 1.5 }}>
                      {detail.feedback.map((f) => (
                        <Paper key={f._id || f.interviewerName} elevation={0} sx={{ p: 1.2, borderRadius: 2, bgcolor: "#FAF9FC" }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{f.interviewerName}</Typography>
                            <Rating value={f.rating} readOnly size="small" />
                          </Stack>
                          <Chip
                            size="small"
                            label={f.recommendation}
                            sx={{
                              mt: 0.5, height: 19, fontSize: 9.5, fontWeight: 700, textTransform: "capitalize",
                              bgcolor: f.recommendation === "hire" ? "#E8F7EE" : f.recommendation === "reject" ? "#FEE4E2" : "#FFF4E5",
                              color: f.recommendation === "hire" ? "#15803D" : f.recommendation === "reject" ? "#B42318" : "#B45309",
                            }}
                          />
                          {f.comments && <Typography sx={{ fontSize: 12, color: "#6F6880", mt: 0.5 }}>{f.comments}</Typography>}
                        </Paper>
                      ))}
                    </Stack>
                  )}

                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, mb: 0.5 }}>Add / update your feedback</Typography>
                  <Rating
                    value={feedbackForm.rating}
                    onChange={(_, value) => setFeedbackForm((p) => ({ ...p, rating: value || 0 }))}
                  />
                  <TextField
                    fullWidth multiline minRows={2} placeholder="Comments..." sx={{ mt: 1 }}
                    value={feedbackForm.comments}
                    onChange={(e) => setFeedbackForm((p) => ({ ...p, comments: e.target.value }))}
                  />
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    {["hire", "hold", "reject"].map((rec) => (
                      <Button
                        key={rec}
                        size="small"
                        variant={feedbackForm.recommendation === rec ? "contained" : "outlined"}
                        onClick={() => setFeedbackForm((p) => ({ ...p, recommendation: rec }))}
                        sx={{ borderRadius: 2, fontWeight: 700, flex: 1, textTransform: "capitalize" }}
                      >
                        {rec}
                      </Button>
                    ))}
                  </Stack>
                  <Button
                    fullWidth variant="contained" onClick={submitFeedback} disabled={savingFeedback}
                    sx={{ mt: 1.5, borderRadius: 2, textTransform: "none", fontWeight: 700, bgcolor: PURPLE, "&:hover": { bgcolor: PURPLE_DARK } }}
                  >
                    {savingFeedback ? "Saving..." : "Save Feedback"}
                  </Button>
                </Box>
              </Stack>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

/* =========================================================
   PAGE
========================================================= */

function RecruitmentInner() {
  const [tab, setTab] = useState(0);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);
  const [myId, setMyId] = useState("");

  const [candidateJobFilter, setCandidateJobFilter] = useState("all");
  const [scheduleCandidate, setScheduleCandidate] = useState(null);

  const loadJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const response = await fetchJobs();
      setJobs(response.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load jobs"));
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const loadAllCandidatesForScheduling = useCallback(async () => {
    try {
      const response = await fetchCandidates({});
      setCandidates(response.data || []);
    } catch {
      // Non-fatal — the schedule dialog's candidate list just stays empty.
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get("/users");
      const data = Array.isArray(response.data) ? response.data : response.data?.users || [];
      setUsers(data.filter((u) => u.isActive !== false));
    } catch {
      // interviewer picker just stays empty
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setMyId(getId(JSON.parse(stored)));
    } catch {}
    loadJobs();
    loadAllCandidatesForScheduling();
    loadUsers();
  }, [loadJobs, loadAllCandidatesForScheduling, loadUsers]);

  const goToCandidatesForJob = (job) => {
    setCandidateJobFilter(job._id);
    setTab(1);
  };

  const handleSchedule = (candidate) => {
    setScheduleCandidate(candidate);
    setTab(2);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#FAF9FF 0%,#FFFFFF 55%)" }}>
      <Navbar />

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 1.5, sm: 2.5, md: 3 }, py: { xs: 2, sm: 2.5, md: 3 } }}>
        <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 800, color: "#171225", letterSpacing: -0.6, mb: 0.3 }}>
          Recruitment
        </Typography>
        <Typography sx={{ color: "#77728A", fontSize: 13.5, mb: 2.5 }}>
          Post jobs, manage candidates, schedule and track interviews end to end.
        </Typography>

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
            <Tab label="Jobs" />
            <Tab label="Candidates" />
            <Tab label="Interviews" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <JobsTab jobs={jobs} jobsLoading={jobsLoading} reloadJobs={loadJobs} onViewCandidates={goToCandidatesForJob} />
        )}

        {tab === 1 && (
          <CandidatesTab
            jobs={jobs}
            jobFilter={candidateJobFilter}
            setJobFilter={setCandidateJobFilter}
            onSchedule={handleSchedule}
          />
        )}

        {tab === 2 && (
          <InterviewsTab
            jobs={jobs}
            candidates={candidates}
            users={users}
            myId={myId}
            presetCandidate={scheduleCandidate}
            onConsumePreset={() => setScheduleCandidate(null)}
          />
        )}
      </Box>
    </Box>
  );
}

export default function RecruitmentPage() {
  return (
    <ProtectedRoute>
      <RecruitmentInner />
    </ProtectedRoute>
  );
} 