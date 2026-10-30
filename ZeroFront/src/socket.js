import { io } from 'socket.io-client';

// Connect to the backend server
const BACKEND_URL = 'http://localhost:5000';
export const socket = io(BACKEND_URL);
