import { io } from "socket.io-client";

let socket = null;

// One shared Socket.IO connection for chat, presence, cursors and room
// events (kept separate from the Yjs y-websocket connection, which handles
// only document CRDT sync).
export function getSocket(token, guestName) {
  if (socket) return socket;
  const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
  socket = io(url, {
    withCredentials: true,
    auth: { token, guestName },
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
