import api from "./api";

/* ---------------- jobs ---------------- */

export const fetchJobs = (status) => api.get(`/jobs${status ? `?status=${status}` : ""}`);
export const fetchJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (payload) => api.post("/jobs", payload);
export const updateJob = (id, payload) => api.patch(`/jobs/${id}`, payload);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

/* ---------------- candidates ---------------- */

export const fetchCandidates = ({ job, status, sort, q } = {}) => {
  const params = new URLSearchParams();
  if (job) params.set("job", job);
  if (status) params.set("status", status);
  if (sort) params.set("sort", sort);
  if (q) params.set("q", q);
  return api.get(`/candidates?${params.toString()}`);
};

export const fetchCandidate = (id) => api.get(`/candidates/${id}`);

export const addCandidate = (fields, resumeFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (resumeFile) form.append("resume", resumeFile);
  return api.post("/candidates", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const updateCandidate = (id, fields, resumeFile) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (resumeFile) form.append("resume", resumeFile);
  return api.patch(`/candidates/${id}`, form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteCandidate = (id) => api.delete(`/candidates/${id}`);

export const compareCandidates = (jobId) => api.get(`/candidates/compare/${jobId}`);

/* ---------------- interviews ---------------- */

export const scheduleInterview = (payload) => api.post("/interviews", payload);

export const fetchInterviews = ({ scope, job, candidate } = {}) => {
  const params = new URLSearchParams();
  if (scope) params.set("scope", scope);
  if (job) params.set("job", job);
  if (candidate) params.set("candidate", candidate);
  return api.get(`/interviews?${params.toString()}`);
};

export const fetchInterview = (id) => api.get(`/interviews/${id}`);
export const updateInterview = (id, payload) => api.patch(`/interviews/${id}`, payload);
export const markInterviewConfirmed = (id) => api.patch(`/interviews/${id}/confirm`);
export const addInterviewFeedback = (id, payload) => api.post(`/interviews/${id}/feedback`, payload);
export const setInterviewOutcome = (id, outcome) => api.patch(`/interviews/${id}/outcome`, { outcome });
export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

// Builds the public (no-login) confirmation link to text/WhatsApp/email
// directly to the candidate.
export const buildPublicConfirmLink = (interview) => {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base}/api/interviews/public/${interview._id}/confirm?token=${interview.confirmToken}`;
};

// Opens a WhatsApp chat with a pre-filled reminder message — no SMS/
// email integration needed, just hands the recruiter a ready-to-send
// message including the confirm link above.
export const buildWhatsAppReminderUrl = (interview, candidatePhone) => {
  const link = buildPublicConfirmLink(interview);
  const when = new Date(interview.scheduledAt).toLocaleString();
  const text = encodeURIComponent(
    `Hi! This is a reminder about your interview (${interview.round}) scheduled for ${when}. ` +
      `Please confirm you can make it: ${link}`
  );
  const digits = (candidatePhone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${text}`;
};