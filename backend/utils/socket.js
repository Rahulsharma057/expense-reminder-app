const { Server } = require("socket.io");

let io = null;

const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ];

  // Production frontend URL
  if (process.env.CLIENT_ORIGIN) {
    allowedOrigins.push(process.env.CLIENT_ORIGIN);
  }

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // Requests without browser origin
        if (!origin) {
          return callback(null, true);
        }

        // Exact allowed origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow Vercel production + preview URLs
        if (
          origin.startsWith("https://") &&
          origin.endsWith(".vercel.app")
        ) {
          return callback(null, true);
        }

        console.log("❌ Socket.IO CORS blocked:", origin);

        return callback(new Error("Not allowed by Socket.IO CORS"));
      },

      methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      credentials: true,
    },

    // WebSocket first + polling fallback
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    // User notification room
    socket.on("join", (userId) => {
      if (!userId) return;

      const room = String(userId);

      socket.join(room);

      console.log(`👤 User ${room} joined socket room`);
    });

    // Task chat room
    socket.on("joinTask", (taskId) => {
      if (!taskId) return;

      const room = `task:${taskId}`;

      socket.join(room);

      console.log(`📋 Socket ${socket.id} joined ${room}`);
    });

    socket.on("leaveTask", (taskId) => {
      if (!taskId) return;

      const room = `task:${taskId}`;

      socket.leave(room);

      console.log(`📋 Socket ${socket.id} left ${room}`);
    });

    // Typing indicator
    socket.on("typing", ({ taskId, userName }) => {
      if (!taskId) return;

      socket.to(`task:${taskId}`).emit("typing", {
        userName: userName || "Someone",
      });
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `🟡 Socket disconnected: ${socket.id} | Reason: ${reason}`
      );
    });
  });

  console.log("✅ Socket.IO initialized");

  return io;
};

const getIO = () => io;

module.exports = {
  initSocket,
  getIO,
};