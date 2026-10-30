import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { Lobby } from './components/Lobby';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoControls } from './components/VideoControls';
import { ParticipantList } from './components/ParticipantList';
import { ChatBox } from './components/ChatBox';

export default function App() {
  const [joinedRoom, setJoinedRoom] = useState(null);
  const [username, setUsername] = useState('');
  const [myRole, setMyRole] = useState('Participant');
  const [roomState, setRoomState] = useState({
    videoId: 'aqz-KE-bpKQ',
    currentTime: 0,
    isPlaying: false
  });
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);

  // Socket event listeners
  useEffect(() => {
    // 1. Receive room state updates (play/pause/seek/change_video)
    socket.on('sync_state', (data) => {
      setRoomState((prev) => ({
        ...prev,
        videoId: data.videoId || prev.videoId,
        currentTime: data.currentTime ?? prev.currentTime,
        isPlaying: data.isPlaying ?? prev.isPlaying
      }));

      if (data.role) {
        setMyRole(data.role);
      }
    });

    // 2. Updated participant list
    socket.on('update_participants', (list) => {
      setParticipants(list);
    });

    // 3. User's role was changed by the Host
    socket.on('role_changed', ({ newRole }) => {
      setMyRole(newRole);
      alert(`Your role has been changed to: ${newRole}`);
    });

    // 4. User was kicked by the Host
    socket.on('kicked', (message) => {
      alert(message);
      setJoinedRoom(null);
      setParticipants([]);
      setMessages([]);
    });

    // 5. Incoming chat message
    socket.on('receive_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // 6. Permission or server error messages
    socket.on('error_message', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('sync_state');
      socket.off('update_participants');
      socket.off('role_changed');
      socket.off('kicked');
      socket.off('receive_message');
      socket.off('error_message');
    };
  }, []);

  // Handler: Join Room
  const handleJoin = (roomId, name) => {
    setUsername(name);
    setJoinedRoom(roomId);
    socket.emit('join_room', { roomId, username: name });
  };

  // Handler: Leave Room
  const handleLeave = () => {
    setJoinedRoom(null);
    setParticipants([]);
    setMessages([]);
    window.location.reload();
  };

  // Playback Action Handlers
  const handlePlay = (time) => {
    socket.emit('play', { currentTime: time });
  };

  const handlePause = (time) => {
    socket.emit('pause', { currentTime: time });
  };

  const handleSeek = (time) => {
    socket.emit('seek', { time });
  };

  const handleChangeVideo = (videoId) => {
    socket.emit('change_video', { videoId });
  };

  // Role Action Handlers (Host only)
  const handleAssignRole = (targetSocketId, newRole) => {
    socket.emit('assign_role', { targetSocketId, newRole });
  };

  const handleRemoveParticipant = (targetSocketId) => {
    socket.emit('remove_participant', { targetSocketId });
  };

  // Chat Handler
  const handleSendMessage = (text) => {
    socket.emit('send_message', { text });
  };

  const isHostOrMod = myRole === 'Host' || myRole === 'Moderator';
  const isHost = myRole === 'Host';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* If not in a room, show the simple Lobby */}
      {!joinedRoom ? (
        <Lobby onJoin={handleJoin} />
      ) : (
        <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
          {/* Top Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-white">ZeroParty</span>
              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-indigo-400 font-mono">
                Room: {joinedRoom}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-300">
                {username} ({myRole})
              </span>
              <button
                onClick={handleLeave}
                className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-800/40 rounded-lg cursor-pointer transition"
              >
                Leave
              </button>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Columns: Video Player & Controls */}
            <div className="lg:col-span-2 space-y-4">
              <VideoPlayer
                roomState={roomState}
                isHostOrMod={isHostOrMod}
                onPlay={handlePlay}
                onPause={handlePause}
              />
              <VideoControls
                roomState={roomState}
                isHostOrMod={isHostOrMod}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeek={handleSeek}
                onChangeVideo={handleChangeVideo}
              />
            </div>

            {/* Right 1 Column: Participants List & Chat Box */}
            <div className="space-y-4">
              <ParticipantList
                participants={participants}
                currentUserSocketId={socket.id}
                isHost={isHost}
                onAssignRole={handleAssignRole}
                onRemove={handleRemoveParticipant}
              />
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
