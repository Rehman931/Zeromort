# YouTube Watch Party (ZeroParty)

A clean, real-time YouTube Watch Party system built for an **Intern Assignment**.

---

## 🌐 Live Production Deployments

* **Frontend (Vercel):** [https://zeromort.vercel.app/](https://zeromort.vercel.app/)
* **Backend (Render):** [https://zeromort.onrender.com/](https://zeromort.onrender.com/)

> **Note on Render Free Tier:** Render spins down free backend web services after 15 minutes of inactivity. When you open the frontend, the first connection may take ~30 seconds for the backend to wake up.

---

## 🛠️ Tech Stack
* **Frontend:** React (Vite) + Tailwind CSS + YouTube IFrame API + Socket.IO Client.
* **Backend:** Node.js + Express + Socket.IO + MongoDB Atlas (Mongoose).
* **Language:** 100% Plain JavaScript (No TypeScript, No Next.js).

---

## 📂 Simplified Project Structure

```text
ZeroMort/
├── zeroback/                  # Backend deployed on Render
│   ├── server.js              # Express app + Socket.IO handlers + In-memory rooms
│   ├── models/
│   │   └── Room.js            # Simple Mongoose Schema for MongoDB Atlas
│   ├── .env                   # PORT & MONGODB_URI
│   └── package.json
│
└── ZeroFront/                 # Frontend deployed on Vercel
    ├── vercel.json            # SPA routing rewrites for Vercel
    ├── src/
    │   ├── socket.js          # Socket.IO connection (points to Render in prod)
    │   ├── App.jsx            # Main app container & room state
    │   └── components/
    │       ├── Lobby.jsx           # Join / Create room form with URL code auto-fill
    │       ├── VideoPlayer.jsx     # YouTube IFrame player with echo-cancellation
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

## 🎯 How It Works (Summary)

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
