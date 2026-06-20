import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});

// Log reconnection events so we know what's happening
socket.on('reconnect_attempt', (n) => {
  console.log(`🔄 Socket reconnecting... attempt ${n}`);
});

socket.on('reconnect', () => {
  console.log('✅ Socket reconnected');
  // Re-join cohort room after reconnect
  const cohortId = socket.data?.cohortId;
  if (cohortId) {
    socket.emit('join:cohort', cohortId);
  }
});

socket.on('disconnect', (reason) => {
  console.log(`🔌 Socket disconnected: ${reason}`);
  if (reason === 'io server disconnect') {
    // Server forced disconnect — reconnect manually
    socket.connect();
  }
});

export function connectSocket({ userId, cohortId }) {
  if (!socket.connected) {
    socket.connect();
  }
  socket.data = { userId, cohortId };
  socket.emit('user:online', { userId, cohortId });
  if (cohortId) {
    socket.emit('join:cohort', cohortId);
  }
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}