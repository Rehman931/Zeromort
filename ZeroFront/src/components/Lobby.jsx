import React, { useState } from 'react';

export function Lobby({ onJoin }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;
    onJoin(roomId.trim(), username.trim());
  };

  const handleRandomRoom = () => {
    const randomCode = 'room-' + Math.floor(100 + Math.random() * 900);
    setRoomId(randomCode);
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          YouTube Watch Party
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Watch synchronized YouTube videos with your friends in real-time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alice"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-300">
                Room Code
              </label>
              <button
                type="button"
                onClick={handleRandomRoom}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                Generate Code
              </button>
            </div>
            <input
              type="text"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. room-101"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg transition cursor-pointer"
          >
            Join / Create Room
          </button>
        </form>
      </div>
    </div>
  );
}
