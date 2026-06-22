import { io } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

export function joinUserRoom(userId) {
  socket.emit("join:user", userId);
}

export function joinCohortRoom(cohortId) {
  socket.emit("join:cohort", cohortId);
}

// Called on login — joins user + cohort rooms
export function connectSocket({ userId, cohortId }) {
  if (userId) {
    socket.emit("join:user", userId);
    sessionStorage.setItem("userId", userId);
  }
  if (cohortId) {
    socket.emit("join:cohort", cohortId);
    sessionStorage.setItem("cohortId", cohortId);
  }
}

// Called on logout — clears rooms
export function disconnectSocket() {
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("cohortId");
  socket.disconnect();
  socket.connect();
}

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
  const userId = sessionStorage.getItem("userId");
  const cohortId = sessionStorage.getItem("cohortId");
  if (userId) socket.emit("join:user", userId);
  if (cohortId) socket.emit("join:cohort", cohortId);
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("reconnect", (attempt) => {
  console.log("Socket reconnected after", attempt, "attempts");
  const userId = sessionStorage.getItem("userId");
  const cohortId = sessionStorage.getItem("cohortId");
  if (userId) socket.emit("join:user", userId);
  if (cohortId) socket.emit("join:cohort", cohortId);
});
