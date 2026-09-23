require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");

const connectDB = require("./config/db");
const startReminderScheduler = require("./reminderScheduler");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { initSocket } = require("./utils/socket");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const pushRoutes = require("./routes/pushRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const taskRoutes = require("./routes/taskRoutes");
const goalRoutes = require("./routes/goalRoutes");
const mistakeRoutes = require("./routes/mistakeRoutes");
const habitRoutes = require("./routes/habitRoutes");
const noteRoutes = require("./routes/noteRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const brandSettingsRoutes = require("./routes/brandSettingsRoutes");
// NEW: notification bell + task templates. These are new files, no
// name collision with anything that already exists.
const notificationRoutes = require("./routes/notificationRoutes");
const templateRoutes = require("./routes/templateRoutes");

// NEW: daily "due tomorrow" reminder job for tasks. Separate from
// your existing expense reminderScheduler — this one only looks at
// the Task collection.
const { startDueDateReminderJob } = require("./jobs/dueDateReminder");

// NEW: checklist module — create checklists, assign to owner/members,
// per-item status + remarks, Daily/Weekly auto-reset, due-date and
// reset push notifications. Separate cron from the two above.
const checklistRoutes = require("./routes/checklistRoutes");
const startChecklistCron = require("./jobs/checklistCron");

// NEW: Good/Bad Things journal, Random Messages (categorized, per-recipient,
// frequency-based push notifications), and Shopping/Packing Lists with
// budget + purchased tracking.
const goodBadRoutes = require("./routes/goodBadRoutes");
const randomMessageRoutes = require("./routes/randomMessageRoutes");
const shoppingRoutes = require("./routes/shoppingRoutes");
const { startRandomMessageCron } = require("./jobs/randomMessageCron");

// NEW: recruitment module (jobs / candidates / interviews). Interview
// reminders + confirmation nudges run every 15 min via their own cron.
const jobRoutes = require("./routes/jobRoutes");
const candidateRoutes = require("./routes/candidateRoutes");
const interviewRoutes = require("./routes/interviewRoutes");
const { startInterviewReminderJob } = require("./jobs/interviewReminder");

// NEW: event/function planning module (items, budget, guests, RSVP).
// Daily 09:00 job flags anything unresolved for events happening
// tomorrow.
const eventRoutes = require("./routes/eventRoutes");
const eventItemTemplateRoutes = require("./routes/eventItemTemplateRoutes");
const { startEventReminderJob } = require("./jobs/eventReminder");

const app = express();

/* =========================================================
  CORS CONFIGURATION
========================================================= */

// Add your actual Vercel production URL here if needed.
const allowedOrigins = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",

  // Production frontend
  // "https://your-app.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin
      // Example: Postman / server-to-server / UptimeRobot
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow all Vercel deployments / preview URLs
      if (
        origin.startsWith("https://") &&
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      console.log("❌ CORS blocked:", origin);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
  })
);

/* =========================================================
  MIDDLEWARE
========================================================= */

app.use(
  express.json({
    limit: "5mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

/* =========================================================
  HEALTH CHECK
========================================================= */

// Use this URL in UptimeRobot:
//
// https://expense-reminder-app.onrender.com/api/health
//
// It does NOT require login/authentication.

app.get("/api/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "Expense Reminder API is running",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
  ROUTES
========================================================= */

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/reminders", reminderRoutes);

app.use("/api/push", pushRoutes);

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recipients", require("./routes/recipients"));
app.use("/api/udhaar", require("./routes/udhaarRoutes"));
// Task assignment + WhatsApp-style task chat (added)
app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", require("./routes/meetingRoutes"));

// NEW: notification bell (list / unread-count / mark-read) and
// reusable task checklist templates.
app.use("/api/notifications", notificationRoutes);
app.use("/api/templates", templateRoutes);

// NEW: checklist module — CRUD, item status updates, cancel/reopen.
app.use("/api/checklists", checklistRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/mistakes", mistakeRoutes);
app.use("/api/habits", habitRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/brand-settings", brandSettingsRoutes);

// NEW: Good/Bad Things journal, Random Messages, Shopping Lists.
app.use("/api/good-bad", goodBadRoutes);
app.use("/api/random-messages", randomMessageRoutes);
app.use("/api/shopping", shoppingRoutes);

// NEW: recruitment module — job openings, candidates, interviews.
app.use("/api/jobs", jobRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/interviews", interviewRoutes);

// NEW: event/function planning module — items/budget, guests, RSVP.
app.use("/api/events", eventRoutes);
app.use("/api/event-item-templates", eventItemTemplateRoutes);

/* =========================================================
  ERROR HANDLING
========================================================= */

app.use(notFound);

app.use(errorHandler);

/* =========================================================
  SERVER
  Wrapped in a plain http server (instead of app.listen directly)
  so Socket.io can attach to the same server for realtime task chat.
========================================================= */

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);
initSocket(server);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);

      // Start reminder scheduler
      startReminderScheduler();

      // NEW: daily 09:00 job that notifies people about tasks due
      // tomorrow. Safe to start even if VAPID/web-push isn't
      // configured — it still creates in-app notifications either way.
      startDueDateReminderJob();

      // NEW: daily 00:05 job that resets Daily/Weekly checklists and
      // sends due/overdue reminders for all checklist types.
      startChecklistCron();

      // NEW: checks every 5 minutes which random-message preferences
      // are due (based on their own per-recipient frequency) and sends.
      startRandomMessageCron();

      // NEW: interview reminders + confirmation nudges, every 15 min.
      startInterviewReminderJob();

      // NEW: daily 09:00 check for events happening tomorrow with
      // unresolved items (price unknown / not yet delivered).
      startEventReminderJob();
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });