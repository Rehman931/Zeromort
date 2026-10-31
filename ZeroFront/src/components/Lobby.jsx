import React, { useState, useEffect } from 'react';

export function Lobby({ onJoin, isConnected }) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  // Automatically pre-fill room code from URL query parameter (e.g. ?room=xyz)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setRoomId(codeFromUrl);
    }
  }, []);

  const handleGenerateCode = () => {
    // Generate a clean 4-digit room code like room-4821
    const randomCode = 'room-' + Math.floor(1000 + Math.random() * 9000);
    setRoomId(randomCode);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter your name.');
      return;
    }
    const code = roomId.trim() || ('room-' + Math.floor(1000 + Math.random() * 9000));
    setRoomId(code);
    onJoin(code, username.trim(), true); // isCreating = true (GUARANTEES HOST)
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!roomId.trim()) {
      alert('Please enter a room code to join an existing party.');
      return;
    }
    onJoin(roomId.trim(), username.trim(), false); // isCreating = false (Participant)
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Live Server Status Indicator */}
      <div className="mb-4">
        {isConnected ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend Connected (Render)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Connecting to Render backend (waking up, please wait ~20-30s)...
          </span>
        )}
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-center text-white mb-2">
          YouTube Watch Party
        </h1>
        <p className="text-sm text-slate-400 text-center mb-6">
          Watch synchronized YouTube videos with friends in real-time.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your Name *
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
                onClick={handleGenerateCode}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer font-medium"
              >
                + Generate Random Code
              </button>
            </div>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="e.g. room-4821"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Two Distinct Action Buttons: Create as Host vs Join as Participant */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={!isConnected}
              className={`w-full py-2.5 px-3 font-semibold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex flex-col items-center justify-center ${
                isConnected
                  ? 'bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>Create Room</span>
              <span className="text-[10px] font-normal opacity-90">(Become Host 👑)</span>
            </button>

            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={!isConnected}
              className={`w-full py-2.5 px-3 font-semibold text-xs rounded-xl border transition active:scale-95 cursor-pointer flex flex-col items-center justify-center ${
                isConnected
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <span>Join Room</span>
              <span className="text-[10px] font-normal text-slate-400">(Participant 👤)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
