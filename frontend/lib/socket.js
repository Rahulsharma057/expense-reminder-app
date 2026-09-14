"use client";

import { io } from "socket.io-client";

// One shared socket for the whole app. Point NEXT_PUBLIC_SOCKET_URL
// at your backend's base URL (same host as your API, without /api).
let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001", {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
};

export default getSocket;