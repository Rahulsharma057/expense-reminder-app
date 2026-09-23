const cron = require("node-cron");
const Interview = require("../models/Interview");
const { createNotification } = require("../services/notificationService");
const { getIO } = require("../utils/socket");
const { sendPushToUsers } = require("../utils/webPush");

// ==========================================================
// SETUP
// ==========================================================
// In server.js, after DB connection is established:
//
//   const { startInterviewReminderJob } = require("./jobs/interviewReminder");
//   startInterviewReminderJob();
//
// Runs every 15 minutes. Candidates are NOT system users, so this
// never messages them directly — it reminds your TEAM (interviewers,
// the recruiter who scheduled it) so they can call/message the
// candidate, and nudges them to chase an unconfirmed booking before
// it's too late to reschedule.
// ==========================================================

const notify = async (recipients, { type, title, message, interview }) => {
  const unique = [...new Set(recipients.filter(Boolean).map(String))];
  if (!unique.length) return;

  await Promise.all(
    unique.map((recipient) => createNotification({ recipient, type, title, message, task: null }))
  );

  const io = getIO();
  if (io) {
    unique.forEach((id) =>
      io.to(id).emit("notification", { type, title, message, interview, createdAt: new Date() })
    );
  }

  sendPushToUsers(unique, {
    title,
    body: message,
    url: `/recruitment?interview=${interview}`,
    tag: `interview-${interview}`,
  }).catch((err) => console.error("[push] interview reminder failed:", err.message));
};

const runInterviewReminders = async () => {
  const now = new Date();

  // ---------------- 1. Interviewer reminder ----------------
  // Interviews starting in the next 60 minutes that haven't been
  // reminded about yet.
  const soon = new Date(now.getTime() + 60 * 60 * 1000);

  const upcoming = await Interview.find({
    scheduledAt: { $gte: now, $lte: soon },
    status: { $in: ["scheduled", "rescheduled"] },
    reminderSentAt: null,
  })
    .populate("candidate", "name")
    .lean();

  for (const interview of upcoming) {
    await notify(interview.interviewers, {
      type: "INTERVIEW_REMINDER",
      title: "Interview Starting Soon",
      message: `${interview.candidate?.name || "Candidate"} — ${interview.round} at ${new Date(
        interview.scheduledAt
      ).toLocaleTimeString()}`,
      interview: interview._id,
    });

    await Interview.updateOne({ _id: interview._id }, { $set: { reminderSentAt: new Date() } });
  }

  // ---------------- 2. Confirmation nudge ----------------
  // Interview is within the next 24 hours, candidate still hasn't
  // confirmed, and we haven't already nudged about it. Goes to the
  // person who scheduled it AND the interviewers — someone needs to
  // follow up with the candidate directly.
  const withinADay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const unconfirmed = await Interview.find({
    scheduledAt: { $gte: now, $lte: withinADay },
    status: { $in: ["scheduled", "rescheduled"] },
    confirmed: false,
    confirmationNudgeSentAt: null,
  })
    .populate("candidate", "name phone")
    .lean();

  for (const interview of unconfirmed) {
    const recipients = [
      interview.scheduledBy,
      ...(interview.interviewers || []),
    ];

    await notify(recipients, {
      type: "INTERVIEW_UNCONFIRMED",
      title: "Candidate Hasn't Confirmed Yet",
      message: `${interview.candidate?.name || "Candidate"}${
        interview.candidate?.phone ? ` (${interview.candidate.phone})` : ""
      } hasn't confirmed their interview tomorrow. Follow up?`,
      interview: interview._id,
    });

    await Interview.updateOne({ _id: interview._id }, { $set: { confirmationNudgeSentAt: new Date() } });
  }

  if (upcoming.length || unconfirmed.length) {
    console.log(
      `[interviewReminder] sent ${upcoming.length} start-soon reminder(s), ${unconfirmed.length} confirmation nudge(s)`
    );
  }
};

const startInterviewReminderJob = () => {
  cron.schedule("*/15 * * * *", () => {
    runInterviewReminders().catch((err) => console.error("[interviewReminder] job failed:", err));
  });

  console.log("[interviewReminder] cron scheduled every 15 minutes");
};

module.exports = { startInterviewReminderJob, runInterviewReminders };