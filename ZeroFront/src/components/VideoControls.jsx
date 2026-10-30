import React, { useState } from 'react';

// Simple helper to get 11-character video ID from a YouTube URL
function extractVideoId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : (url.length === 11 ? url : '');
}

export function VideoControls({ roomState, isHostOrMod, onPlay, onPause, onSeek, onChangeVideo }) {
  const [videoInput, setVideoInput] = useState('');

  const handleTogglePlay = () => {
    if (!isHostOrMod) return;
    if (roomState.isPlaying) {
      onPause(roomState.currentTime);
    } else {
      onPlay(roomState.currentTime);
    }
  };

  const handleSeekDelta = (delta) => {
    if (!isHostOrMod) return;
    const newTime = Math.max(0, (roomState.currentTime || 0) + delta);
    onSeek(newTime);
  };

  const handleChangeVideoSubmit = (e) => {
    e.preventDefault();
    if (!isHostOrMod) return;
    const id = extractVideoId(videoInput.trim());
    if (!id) {
      alert('Please enter a valid YouTube link or 11-character video ID.');
      return;
    }
    onChangeVideo(id);
    setVideoInput('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4">
      {/* 1. Play / Pause & Seek Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePlay}
            disabled={!isHostOrMod}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition cursor-pointer ${
              isHostOrMod
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {roomState.isPlaying ? 'Pause ⏸' : 'Play ▶'}
          </button>

          <button
            onClick={() => handleSeekDelta(-10)}
            disabled={!isHostOrMod}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            -10s
          </button>

          <button
            onClick={() => handleSeekDelta(10)}
            disabled={!isHostOrMod}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            +10s
          </button>

          <span className="text-xs text-slate-400 pl-2">
            Time: {Math.floor(roomState.currentTime || 0)}s
          </span>
        </div>

        {/* Role permission status */}
        <span className={`text-xs px-2.5 py-1 rounded-full ${
          isHostOrMod ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
        }`}>
          {isHostOrMod ? 'Controls Enabled' : 'Watch-Only Mode'}
        </span>
      </div>

      {/* 2. Change Video Form */}
      {isHostOrMod && (
        <form onSubmit={handleChangeVideoSubmit} className="flex gap-2">
          <input
            type="text"
            value={videoInput}
            onChange={(e) => setVideoInput(e.target.value)}
            placeholder="Paste YouTube link or Video ID..."
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition cursor-pointer"
          >
            Change Video
          </button>
        </form>
      )}
    </div>
  );
}
