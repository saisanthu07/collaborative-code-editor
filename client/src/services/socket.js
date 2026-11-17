import { io } from "socket.io-client";

let socketInstance = null;
let currentToken = null;

export function getSocket(token) {
  const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

  if (socketInstance) {
    if (token && token !== currentToken) {
      currentToken = token;
      socketInstance.auth = { token };
    }
    return socketInstance;
  }

  currentToken = token;
  socketInstance = io(url, {
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
    currentToken = null;
  }
}
