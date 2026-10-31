import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Room } from './models/Room.js';

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS (Vercel deployment + Local development)
const allowedOrigins = [
  'https://zeromort.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configure Mongoose to fail immediately instead of buffering if offline
mongoose.set('bufferCommands', false);

const MONGO_URI = process.env.MONGODB_URI;
if (MONGO_URI && MONGO_URI.trim()) {
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('MongoDB Atlas connected successfully'))
    .catch((err) => console.log('MongoDB connection warning:', err.message));
}

// In-Memory Storage for Active Rooms
const rooms = {};

// Helper: Save room state to MongoDB Atlas
async function saveRoomToDB(roomId) {
  try {
    const room = rooms[roomId];
    if (!room || mongoose.connection.readyState !== 1) return;

    await Room.findOneAndUpdate(
      { roomId },
      {
        roomId,
        videoId: room.videoId,
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        hostUsername: room.participants.find(p => p.role === 'Host')?.username || 'Host'
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    // Ignore DB errors in background
  }
}

// Helper: Find which room a socket belongs to
function getRoomBySocketId(socketId) {
  for (const roomId in rooms) {
    const found = rooms[roomId].participants.some(p => p.socketId === socketId);
    if (found) return rooms[roomId];
  }
  return null;
}

// Helper: Remove socket from room
function removeSocketFromRoom(socketId) {
  const room = getRoomBySocketId(socketId);
  if (!room) return null;

  const leavingUser = room.participants.find(p => p.socketId === socketId);
  room.participants = room.participants.filter(p => p.socketId !== socketId);

  if (leavingUser) {
    console.log(`${leavingUser.username} left room [${room.roomId}]`);

    // If the Host leaves and other users remain, promote the next user to Host
    if (leavingUser.role === 'Host' && room.participants.length > 0) {
      room.participants[0].role = 'Host';
      io.to(room.participants[0].socketId).emit('role_changed', { newRole: 'Host' });
    }

    if (room.participants.length === 0) {
      delete rooms[room.roomId];
    } else {
      io.to(room.roomId).emit('update_participants', room.participants);
    }
  }

  return room;
}

// WebSocket Event Listeners
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Join or Create Room
  socket.on('join_room', async ({ roomId, username, isCreating }, callback) => {
    if (!roomId || !username) return;

    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanUsername = username.trim();

    // Remove socket from any previous room first
    removeSocketFromRoom(socket.id);

    // Create room in memory if it doesn't exist
    if (!rooms[cleanRoomId]) {
      rooms[cleanRoomId] = {
        roomId: cleanRoomId,
        videoId: 'aqz-KE-bpKQ', // Default starter video
        currentTime: 0,
        isPlaying: false,
        participants: []
      };

      // Try loading previous state from MongoDB Atlas
      try {
        if (mongoose.connection.readyState === 1) {
          const saved = await Room.findOne({ roomId: cleanRoomId });
          if (saved) {
            rooms[cleanRoomId].videoId = saved.videoId || 'aqz-KE-bpKQ';
            rooms[cleanRoomId].currentTime = saved.currentTime || 0;
          }
        }
      } catch (e) {}
    }

    const room = rooms[cleanRoomId];

    // Determine Role:
    // If user clicked "Create Room" or if the room is empty -> they are Host
    let role = 'Participant';
    if (isCreating || room.participants.length === 0) {
      role = 'Host';
      // If there was an existing host, demote them so there is only one host
      room.participants.forEach((p) => {
        if (p.role === 'Host') p.role = 'Participant';
      });
    }

    const participant = {
      socketId: socket.id,
      username: cleanUsername,
      role: role
    };

    room.participants.push(participant);
    socket.join(cleanRoomId);

    console.log(`${cleanUsername} joined room [${cleanRoomId}] as ${role}`);

    // Send state and role directly to the joiner
    socket.emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      role: participant.role
    });

    // Callback acknowledgment to client
    if (typeof callback === 'function') {
      callback({ success: true, role: participant.role, roomId: cleanRoomId });
    }

    // Broadcast updated member list to room
    io.to(cleanRoomId).emit('update_participants', room.participants);
  });

  // 2. Play Video
  socket.on('play', ({ currentTime }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can control playback.');
    }

    room.isPlaying = true;
    if (typeof currentTime === 'number') room.currentTime = currentTime;

    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: true
    });

    saveRoomToDB(room.roomId);
  });

  // 3. Pause Video
  socket.on('pause', ({ currentTime }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can control playback.');
    }

    room.isPlaying = false;
    if (typeof currentTime === 'number') room.currentTime = currentTime;

    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: false
    });

    saveRoomToDB(room.roomId);
  });

  // 4. Seek Video
  socket.on('seek', ({ time }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can seek.');
    }

    room.currentTime = time || 0;

    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying
    });

    saveRoomToDB(room.roomId);
  });

  // 5. Change Video
  socket.on('change_video', ({ videoId }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can change video.');
    }

    if (!videoId) return;

    room.videoId = videoId;
    room.currentTime = 0;
    room.isPlaying = true;

    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: 0,
      isPlaying: true
    });

    saveRoomToDB(room.roomId);
  });

  // 6. Assign Role
  socket.on('assign_role', ({ targetSocketId, newRole }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const currentUser = room.participants.find(p => p.socketId === socket.id);
    if (!currentUser || currentUser.role !== 'Host') {
      return socket.emit('error_message', 'Only Host can assign roles.');
    }

    const targetUser = room.participants.find(p => p.socketId === targetSocketId);
    if (targetUser) {
      targetUser.role = newRole;
      io.to(room.roomId).emit('update_participants', room.participants);
      io.to(targetSocketId).emit('role_changed', { newRole });
    }
  });

  // 7. Remove Participant (Kick)
  socket.on('remove_participant', ({ targetSocketId }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const currentUser = room.participants.find(p => p.socketId === socket.id);
    if (!currentUser || currentUser.role !== 'Host') {
      return socket.emit('error_message', 'Only Host can remove participants.');
    }

    io.to(targetSocketId).emit('kicked', 'You were removed from the room by the host.');

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) targetSocket.leave(room.roomId);

    room.participants = room.participants.filter(p => p.socketId !== targetSocketId);
    io.to(room.roomId).emit('update_participants', room.participants);
  });

  // 8. Leave Room
  socket.on('leave_room', () => {
    removeSocketFromRoom(socket.id);
  });

  // 9. Live Chat Message
  socket.on('send_message', ({ text }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || !text.trim()) return;

    io.to(room.roomId).emit('receive_message', {
      id: Date.now().toString(),
      sender: user.username,
      role: user.role,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 10. User Disconnect
  socket.on('disconnect', () => {
    removeSocketFromRoom(socket.id);
  });
});

// Render Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'YouTube Watch Party Backend (zeroback)',
    deployedAt: 'Render',
    frontend: 'https://zeromort.vercel.app/'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
