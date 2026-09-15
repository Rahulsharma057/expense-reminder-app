"use client";

import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      "http://localhost:5001";

    console.log("🔌 Connecting Socket.IO:", socketUrl);

    socket = io(socketUrl, {
      withCredentials: true,

      // WebSocket + polling fallback
      transports: ["websocket", "polling"],

      autoConnect: true,
    });

    socket.on("connect", () => {
      console.log("🟢 Socket connected:", socket.id);
    });

    socket.on("connect_error", (error) => {
      console.error(
        "🔴 Socket connection error:",
        error.message
      );
    });

    socket.on("disconnect", (reason) => {
      console.log(
        "🟡 Socket disconnected:",
        reason
      );
    });
  }

  return socket;
};

export default getSocket;