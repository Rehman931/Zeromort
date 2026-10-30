# YouTube Watch Party (ZeroParty)

A clean, beginner-friendly real-time YouTube Watch Party application built for an **Intern Assignment**.

---

## 🛠️ Tech Stack
* **Frontend:** React (Vite) + Tailwind CSS + YouTube IFrame API + Socket.IO Client.
* **Backend:** Node.js + Express + Socket.IO + MongoDB Atlas (Mongoose).
* **Language:** 100% Plain JavaScript (No TypeScript, No Next.js).

---

## 📂 Simplified Project Structure

```text
ZeroMort/
├── zeroback/                  # Backend
│   ├── server.js              # Express app + Socket.IO handlers + In-memory rooms
│   ├── models/
│   │   └── Room.js            # Simple Mongoose Schema for MongoDB Atlas
│   ├── .env                   # PORT & MONGODB_URI
│   └── package.json
│
└── ZeroFront/                 # Frontend
    ├── src/
    │   ├── socket.js          # Shared Socket.IO connection
    │   ├── App.jsx            # Main app container & room state
    │   └── components/
    │       ├── Lobby.jsx           # Simple Join / Create room form
    │       ├── VideoPlayer.jsx     # YouTube IFrame player with sync
    │       ├── VideoControls.jsx   # Play, Pause, Seek, and Change Video
    │       ├── ParticipantList.jsx # Member list + Host promote/kick actions
    │       └── ChatBox.jsx         # Live text chat
    ├── index.html
    └── package.json
```

---

## 🚀 How to Run Locally

### 1. Start Backend (`zeroback`)
```bash
cd zeroback
npm install
npm start
```
* Runs on: `http://localhost:5000`

### 2. Start Frontend (`ZeroFront`)
```bash
cd ZeroFront
npm install
npm run dev
```
* Runs on: `http://localhost:5173`

---

## 🎯 How It Works (Intern Interview Summary)

1. **Room Creation:** The first user to join a room becomes the **`Host`**. Anyone joining after receives the **`Participant`** role.
2. **Playback Synchronization:** When the Host or Moderator presses Play, Pause, or Seeks, an event is sent to the backend. The backend updates the room state and broadcasts it to everyone.
3. **Role Enforcement (RBAC):** On the backend in `server.js`, every control event checks:
   ```javascript
   if (user.role !== 'Host' && user.role !== 'Moderator') {
     return socket.emit('error_message', 'Only Host and Moderator can control playback.');
   }
   ```
4. **Preventing Echo Loops:** When a socket event updates the video player, an `isSyncing = true` flag prevents the player from sending the same event back to the server.
5. **MongoDB Atlas Persistence:** The room's latest video ID and playback state are saved to MongoDB Atlas so the room history is preserved.
