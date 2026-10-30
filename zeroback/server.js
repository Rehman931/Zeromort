import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { Room } from './models/Room.js';

const app = express();
const server = http.createServer(app);

// Enable CORS so our frontend can connect
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB Atlas (Optional: app continues even if DB is not connected)
const MONGO_URI = process.env.MONGODB_URI;
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Atlas connected successfully'))
    .catch((err) => console.log('MongoDB connection warning:', err.message));
}

// In-Memory Storage for Active Rooms
// Structure:
// rooms[roomId] = {
//   roomId: 'abc-123',
//   videoId: 'aqz-KE-bpKQ',
//   currentTime: 0,
//   isPlaying: false,
//   participants: [ { socketId, username, role } ]
// }
const rooms = {};

// Helper: Save room state to MongoDB Atlas (fails silently if DB not connected)
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
    // Ignore DB errors in development
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

// WebSocket Connection Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Join or Create Room
  socket.on('join_room', async ({ roomId, username }) => {
    if (!roomId || !username) return;

    const cleanRoomId = roomId.trim().toLowerCase();
    const cleanUsername = username.trim();

    // If room does not exist in memory, create it
    if (!rooms[cleanRoomId]) {
      rooms[cleanRoomId] = {
        roomId: cleanRoomId,
        videoId: 'aqz-KE-bpKQ', // Default video (Big Buck Bunny)
        currentTime: 0,
        isPlaying: false,
        participants: []
      };

      // Try loading previous state from MongoDB
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

    // First person to join becomes 'Host', others become 'Participant'
    const role = room.participants.length === 0 ? 'Host' : 'Participant';

    const participant = {
      socketId: socket.id,
      username: cleanUsername,
      role: role
    };

    room.participants.push(participant);
    socket.join(cleanRoomId);

    console.log(`${cleanUsername} joined room [${cleanRoomId}] as ${role}`);

    // Send current room state directly to the user who joined
    socket.emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      role: participant.role
    });

    // Broadcast updated participant list to everyone in the room
    io.to(cleanRoomId).emit('update_participants', room.participants);
  });

  // 2. Play Video (Host or Moderator only)
  socket.on('play', ({ currentTime }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can control playback.');
    }

    room.isPlaying = true;
    if (typeof currentTime === 'number') {
      room.currentTime = currentTime;
    }

    // Broadcast play event to all users in the room
    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: true
    });

    saveRoomToDB(room.roomId);
  });

  // 3. Pause Video (Host or Moderator only)
  socket.on('pause', ({ currentTime }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can control playback.');
    }

    room.isPlaying = false;
    if (typeof currentTime === 'number') {
      room.currentTime = currentTime;
    }

    // Broadcast pause event to all users in the room
    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: false
    });

    saveRoomToDB(room.roomId);
  });

  // 4. Seek Video (Host or Moderator only)
  socket.on('seek', ({ time }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const user = room.participants.find(p => p.socketId === socket.id);
    if (!user || (user.role !== 'Host' && user.role !== 'Moderator')) {
      return socket.emit('error_message', 'Only Host and Moderator can seek.');
    }

    room.currentTime = time || 0;

    // Broadcast seek position to all users in the room
    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying
    });

    saveRoomToDB(room.roomId);
  });

  // 5. Change Video (Host or Moderator only)
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

    // Broadcast new video to all users in the room
    io.to(room.roomId).emit('sync_state', {
      videoId: room.videoId,
      currentTime: 0,
      isPlaying: true
    });

    saveRoomToDB(room.roomId);
  });

  // 6. Assign Role (Host only)
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

      // Broadcast updated member list
      io.to(room.roomId).emit('update_participants', room.participants);

      // Notify the target user of their new role
      io.to(targetSocketId).emit('role_changed', { newRole });
    }
  });

  // 7. Remove Participant / Kick (Host only)
  socket.on('remove_participant', ({ targetSocketId }) => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const currentUser = room.participants.find(p => p.socketId === socket.id);
    if (!currentUser || currentUser.role !== 'Host') {
      return socket.emit('error_message', 'Only Host can remove participants.');
    }

    // Tell the target user they were removed
    io.to(targetSocketId).emit('kicked', 'You were removed from the room by the host.');

    // Disconnect target socket from room
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      targetSocket.leave(room.roomId);
    }

    // Remove from in-memory room
    room.participants = room.participants.filter(p => p.socketId !== targetSocketId);
    io.to(room.roomId).emit('update_participants', room.participants);
  });

  // 8. Room Chat Message
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

  // 9. Handle User Disconnect
  socket.on('disconnect', () => {
    const room = getRoomBySocketId(socket.id);
    if (!room) return;

    const leavingUser = room.participants.find(p => p.socketId === socket.id);
    room.participants = room.participants.filter(p => p.socketId !== socket.id);

    if (leavingUser) {
      console.log(`${leavingUser.username} left room [${room.roomId}]`);

      // If the Host leaves and other users remain, promote the next user to Host
      if (leavingUser.role === 'Host' && room.participants.length > 0) {
        room.participants[0].role = 'Host';
        io.to(room.participants[0].socketId).emit('role_changed', { newRole: 'Host' });
      }

      // If room is now empty, delete from memory
      if (room.participants.length === 0) {
        delete rooms[room.roomId];
        console.log(`Room [${room.roomId}] is now empty and removed.`);
      } else {
        io.to(room.roomId).emit('update_participants', room.participants);
      }
    }
  });
});

// Basic Health Check Route
app.get('/', (req, res) => {
  res.send('YouTube Watch Party Backend is running.');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
