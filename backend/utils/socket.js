const { Server } = require("socket.io");

let io = null;

// Call this ONCE in your server.js, right after you create the
// http server and before server.listen(...):
//
//   const http = require("http");
//   const { initSocket } = require("./utils/socket");
//   const app = require("./app");           // your express app
//   const server = http.createServer(app);
//   initSocket(server);
//   server.listen(PORT, () => console.log("listening..."));
//
const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*", // set this to your frontend URL in production
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    // Every logged-in user joins a room named after their own user id.
    // This lets the backend push a notification straight to them with
    // io.to(userId).emit("notification", {...}) from anywhere.
    socket.on("join", (userId) => {
      if (userId) socket.join(String(userId));
    });

    // Whoever has a task's chat screen open joins that task's room,
    // so new messages / status changes appear live for everyone
    // looking at it, WhatsApp-style.
    socket.on("joinTask", (taskId) => {
      if (taskId) socket.join(`task:${taskId}`);
    });

    socket.on("leaveTask", (taskId) => {
      if (taskId) socket.leave(`task:${taskId}`);
    });

    // Typing indicator (optional, WhatsApp has this too).
    socket.on("typing", ({ taskId, userName }) => {
      if (!taskId) return;
      socket.to(`task:${taskId}`).emit("typing", { userName });
    });
  });

  return io;
};

// Safe getter: never throws if socket.io somehow isn't initialized
// (e.g. in a script or test run), so controllers can call it freely.
const getIO = () => io;

module.exports = { initSocket, getIO };