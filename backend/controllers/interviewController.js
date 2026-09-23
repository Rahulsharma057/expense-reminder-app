const mongoose = require("mongoose");
const Interview = require("../models/Interview");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");

const toId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const notifyUsers = async ({ recipients = [], senderId, type, title, message, interview }) => {
  const uniqueRecipients = [
    ...new Set(recipients.filter(Boolean).map(toId).filter(Boolean).filter((id) => id !== String(senderId))),
  ];

  if (!uniqueRecipients.length) return;

  await Promise.all(
    uniqueRecipients.map((recipient) =>
      createNotification({ recipient, type, title, message, task: null })
    )
  );

  const io = getIO();
  if (io) {
    uniqueRecipients.forEach((id) =>
      io.to(id).emit("notification", { type, title, message, interview, createdAt: new Date() })
    );
  }

  sendPushToUsers(uniqueRecipients, {
    title,
    body: message,
    url: interview ? `/recruitment?interview=${interview}` : "/recruitment",
    tag: interview ? `interview-${interview}` : "interview",
  }).catch((err) => console.error("[push] interview notify failed:", err.message));
};

// ==========================================================
// SCHEDULE
// ==========================================================

const scheduleInterview = async (req, res) => {
  try {
    const { candidate, round, roundNumber, scheduledAt, durationMinutes, mode, location, interviewers } = req.body;

    if (!mongoose.Types.ObjectId.isValid(candidate)) {
      return res.status(400).json({ message: "Please select a valid candidate" });
    }

    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      return res.status(400).json({ message: "A valid date/time is required" });
    }

    const candidateDoc = await Candidate.findById(candidate);
    if (!candidateDoc) return res.status(404).json({ message: "Candidate not found" });

    const interviewerIds = Array.isArray(interviewers)
      ? interviewers.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];

    const interview = await Interview.create({
      candidate,
      job: candidateDoc.job,
      round: round?.trim() || "Round 1",
      roundNumber: Number(roundNumber) || 1,
      scheduledAt: new Date(scheduledAt),
      durationMinutes: Number(durationMinutes) || 30,
      mode: ["online", "offline", "phone"].includes(mode) ? mode : "online",
      location: location?.trim() || "",
      interviewers: interviewerIds,
      scheduledBy: req.user._id,
    });

    candidateDoc.status = "interview-scheduled";
    await candidateDoc.save();

    const populated = await Interview.findById(interview._id)
      .populate("candidate", "name phone email")
      .populate("interviewers", "name role")
      .lean();

    await notifyUsers({
      recipients: interviewerIds,
      senderId: req.user._id,
      type: "INTERVIEW_SCHEDULED",
      title: "Interview Assigned To You",
      message: `${candidateDoc.name} — ${populated.round} on ${new Date(interview.scheduledAt).toLocaleString()}`,
      interview: interview._id,
    });

    return res.status(201).json(populated);
  } catch (err) {
    console.error("scheduleInterview error:", err);
    return res.status(500).json({ message: "Could not schedule interview" });
  }
};

// ==========================================================
// LIST
// GET /interviews?scope=upcoming|mine|pending-confirmation|completed
//                &job=&candidate=
// ==========================================================

const listInterviews = async (req, res) => {
  try {
    const filter = {};
    const { scope, job, candidate } = req.query;

    if (job && mongoose.Types.ObjectId.isValid(job)) filter.job = job;
    if (candidate && mongoose.Types.ObjectId.isValid(candidate)) filter.candidate = candidate;

    const now = new Date();

    if (scope === "upcoming") {
      filter.scheduledAt = { $gte: now };
      filter.status = { $in: ["scheduled", "rescheduled"] };
    } else if (scope === "pending-confirmation") {
      filter.confirmed = false;
      filter.status = { $in: ["scheduled", "rescheduled"] };
      filter.scheduledAt = { $gte: now };
    } else if (scope === "completed") {
      filter.status = "completed";
    } else if (scope === "mine") {
      filter.interviewers = req.user._id;
      filter.scheduledAt = { $gte: now };
      filter.status = { $in: ["scheduled", "rescheduled"] };
    }

    const interviews = await Interview.find(filter)
      .populate("candidate", "name phone email currentCompany experienceYears")
      .populate("job", "title department")
      .populate("interviewers", "name role")
      .sort({ scheduledAt: 1 })
      .lean();

    return res.json(interviews);
  } catch (err) {
    console.error("listInterviews error:", err);
    return res.status(500).json({ message: "Could not load interviews" });
  }
};

const getInterview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    const interview = await Interview.findById(id)
      .populate("candidate")
      .populate("job", "title department")
      .populate("interviewers", "name role")
      .populate("feedback.interviewer", "name role")
      .lean();

    if (!interview) return res.status(404).json({ message: "Interview not found" });

    return res.json(interview);
  } catch (err) {
    console.error("getInterview error:", err);
    return res.status(500).json({ message: "Could not load interview" });
  }
};

// ==========================================================
// UPDATE (reschedule / change interviewers / cancel)
// ==========================================================

const updateInterview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    const interview = await Interview.findById(id);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const { scheduledAt, durationMinutes, mode, location, interviewers, status, round, roundNumber } = req.body;

    const wasRescheduled = scheduledAt && new Date(scheduledAt).getTime() !== interview.scheduledAt.getTime();

    if (scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime())) {
      interview.scheduledAt = new Date(scheduledAt);
      // A reschedule needs a fresh reminder cycle, and the candidate
      // needs to confirm the NEW time — the old confirmation doesn't
      // carry over.
      interview.reminderSentAt = null;
      interview.confirmationNudgeSentAt = null;
      interview.confirmed = false;
      interview.confirmedAt = null;
      if (interview.status === "scheduled") interview.status = "rescheduled";
    }

    if (durationMinutes !== undefined) interview.durationMinutes = Number(durationMinutes) || 30;
    if (["online", "offline", "phone"].includes(mode)) interview.mode = mode;
    if (typeof location === "string") interview.location = location.trim();
    if (typeof round === "string" && round.trim()) interview.round = round.trim();
    if (roundNumber !== undefined) interview.roundNumber = Number(roundNumber) || 1;

    if (Array.isArray(interviewers)) {
      interview.interviewers = interviewers.filter((interviewerId) =>
        mongoose.Types.ObjectId.isValid(interviewerId)
      );
    }

    if (["scheduled", "completed", "cancelled", "rescheduled", "no-show"].includes(status)) {
      interview.status = status;
    }

    await interview.save();

    const populated = await Interview.findById(id)
      .populate("candidate", "name phone email")
      .populate("interviewers", "name role")
      .lean();

    if (wasRescheduled) {
      await notifyUsers({
        recipients: interview.interviewers,
        senderId: req.user._id,
        type: "INTERVIEW_RESCHEDULED",
        title: "Interview Rescheduled",
        message: `${populated.candidate?.name || "Candidate"} — moved to ${new Date(interview.scheduledAt).toLocaleString()}`,
        interview: interview._id,
      });
    }

    return res.json(populated);
  } catch (err) {
    console.error("updateInterview error:", err);
    return res.status(500).json({ message: "Could not update interview" });
  }
};

// ==========================================================
// CONFIRMATION — internal (recruiter marks it after a phone call)
// ==========================================================

const markConfirmed = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    const interview = await Interview.findByIdAndUpdate(
      id,
      { $set: { confirmed: true, confirmedAt: new Date() } },
      { new: true }
    );

    if (!interview) return res.status(404).json({ message: "Interview not found" });

    return res.json(interview);
  } catch (err) {
    console.error("markConfirmed error:", err);
    return res.status(500).json({ message: "Could not update confirmation" });
  }
};

// ==========================================================
// CONFIRMATION — public, no login. This is the link sent directly
// to the candidate (SMS/WhatsApp/email) so THEY can confirm without
// needing an account. Responds with a small styled HTML page since
// it's meant to be opened straight from a phone, not through the app.
// ==========================================================

const confirmPage = (title, message, isError = false) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; background: linear-gradient(180deg,#FAF9FF,#fff); margin:0; padding:0; min-height:100vh; display:flex; align-items:center; justify-content:center; }
  .card { background:#fff; border-radius:20px; padding:32px 28px; max-width:380px; text-align:center; box-shadow:0 10px 40px rgba(76,29,149,0.12); margin:16px; }
  .icon { font-size:44px; margin-bottom:12px; }
  h1 { font-size:19px; color:${isError ? "#B42318" : "#171225"}; margin:0 0 8px; }
  p { font-size:14px; color:#77728A; line-height:1.5; margin:0; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${isError ? "⚠️" : "✅"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;

const publicConfirm = async (req, res) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send(confirmPage("Invalid link", "This confirmation link looks broken.", true));
    }

    const interview = await Interview.findById(id).populate("candidate", "name");
    if (!interview) {
      return res.status(404).send(confirmPage("Not found", "We couldn't find this interview.", true));
    }

    if (interview.confirmToken !== token) {
      return res.status(403).send(confirmPage("Invalid link", "This confirmation link is not valid.", true));
    }

    if (interview.status === "cancelled") {
      return res.send(confirmPage("Interview cancelled", "This interview has been cancelled. Our team will reach out with next steps.", true));
    }

    interview.confirmed = true;
    interview.confirmedAt = new Date();
    await interview.save();

    const io = getIO();
    if (io) {
      io.to(String(interview.scheduledBy)).emit("notification", {
        type: "INTERVIEW_CONFIRMED",
        title: "Candidate Confirmed",
        message: `${interview.candidate?.name || "Candidate"} confirmed their interview.`,
        interview: interview._id,
        createdAt: new Date(),
      });
    }

    return res.send(
      confirmPage(
        "Interview confirmed!",
        `Thanks${interview.candidate?.name ? ", " + interview.candidate.name : ""}! Your interview on ${new Date(
          interview.scheduledAt
        ).toLocaleString()} is confirmed. See you then.`
      )
    );
  } catch (err) {
    console.error("publicConfirm error:", err);
    return res.status(500).send(confirmPage("Something went wrong", "Please try again or contact us directly.", true));
  }
};

// ==========================================================
// FEEDBACK
// ==========================================================

const addFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comments, recommendation } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (!["hire", "reject", "hold"].includes(recommendation)) {
      return res.status(400).json({ message: "Recommendation must be hire, reject, or hold" });
    }

    const interview = await Interview.findById(id);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    // Replace this interviewer's existing feedback if they already
    // submitted some, rather than piling up duplicates.
    interview.feedback = interview.feedback.filter(
      (entry) => String(entry.interviewer) !== String(req.user._id)
    );

    interview.feedback.push({
      interviewer: req.user._id,
      interviewerName: req.user.name,
      rating: Number(rating),
      comments: comments?.trim() || "",
      recommendation,
    });

    await interview.save();

    return res.status(201).json(interview.feedback);
  } catch (err) {
    console.error("addFeedback error:", err);
    return res.status(500).json({ message: "Could not save feedback" });
  }
};

// ==========================================================
// OUTCOME (pass / fail / hold for this round)
// ==========================================================

const setOutcome = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    if (!["pending", "pass", "fail", "hold"].includes(outcome)) {
      return res.status(400).json({ message: "Invalid outcome" });
    }

    const interview = await Interview.findById(id);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    interview.outcome = outcome;
    interview.status = "completed";
    await interview.save();

    // Keep the candidate's headline status roughly in sync.
    const candidate = await Candidate.findById(interview.candidate);
    if (candidate) {
      if (outcome === "fail") candidate.status = "rejected";
      else if (outcome === "pass") candidate.status = "interviewed";
      await candidate.save();
    }

    return res.json(interview);
  } catch (err) {
    console.error("setOutcome error:", err);
    return res.status(500).json({ message: "Could not update outcome" });
  }
};

// ==========================================================
// DELETE / CANCEL
// ==========================================================

const deleteInterview = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid interview ID" });
    }

    const interview = await Interview.findByIdAndDelete(id);
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    return res.json({ success: true });
  } catch (err) {
    console.error("deleteInterview error:", err);
    return res.status(500).json({ message: "Could not delete interview" });
  }
};

module.exports = {
  scheduleInterview,
  listInterviews,
  getInterview,
  updateInterview,
  markConfirmed,
  publicConfirm,
  addFeedback,
  setOutcome,
  deleteInterview,
};