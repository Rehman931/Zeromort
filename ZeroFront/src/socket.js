import { io } from 'socket.io-client';

// In production, connect to Render backend (https://zeromort.onrender.com)
// In local development, fall back to http://localhost:5000
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.PROD ? 'https://zeromort.onrender.com' : 'http://localhost:5000');

export const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'], // Polling helps connect while Render spins up
  autoConnect: true,
});
