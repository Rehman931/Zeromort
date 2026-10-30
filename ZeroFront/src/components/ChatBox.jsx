import React, { useState } from 'react';

export function ChatBox({ messages, onSendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col h-72">
      <h3 className="text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800 mb-2">
        Live Chat
      </h3>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                <span className="font-semibold text-slate-300">
                  {m.sender} <span className="text-indigo-400">({m.role})</span>
                </span>
                <span>{m.time}</span>
              </div>
              <p className="text-slate-200 break-words">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-800 mt-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer"
        >
          Send
        </button>
      </form>
    </div>
  );
}
