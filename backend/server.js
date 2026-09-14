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
    });
  })
  .catch((error) => {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  });