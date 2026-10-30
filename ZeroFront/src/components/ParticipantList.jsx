import React from 'react';

export function ParticipantList({ participants, currentUserSocketId, isHost, onAssignRole, onRemove }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col">
      <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Room Members ({participants.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {participants.map((p) => {
          const isSelf = p.socketId === currentUserSocketId;

          return (
            <div
              key={p.socketId}
              className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                isSelf ? 'bg-indigo-950/40 border-indigo-700/50' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">
                  {p.username} {isSelf && '(You)'}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] ${
                    p.role === 'Host'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : p.role === 'Moderator'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {p.role}
                </span>
              </div>

              {/* Host management buttons */}
              {isHost && !isSelf && (
                <div className="flex items-center gap-1">
                  {p.role === 'Participant' && (
                    <button
                      onClick={() => onAssignRole(p.socketId, 'Moderator')}
                      className="px-2 py-0.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-[10px] cursor-pointer"
                    >
                      Make Mod
                    </button>
                  )}
                  {p.role === 'Moderator' && (
                    <button
                      onClick={() => onAssignRole(p.socketId, 'Participant')}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[10px] cursor-pointer"
                    >
                      Demote
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(p.socketId)}
                    className="px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-[10px] cursor-pointer"
                  >
                    Kick
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
