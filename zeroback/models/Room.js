import mongoose from 'mongoose';

// Simple Room Schema to store watch party room data in MongoDB Atlas
const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  videoId: { type: String, default: 'aqz-KE-bpKQ' }, // default starter video
  currentTime: { type: Number, default: 0 },
  isPlaying: { type: Boolean, default: false },
  hostUsername: { type: String, default: 'Host' },
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
