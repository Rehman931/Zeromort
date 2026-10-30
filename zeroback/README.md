# Backend — YouTube Watch Party

A clean and simple Node.js + Socket.IO + Express backend with MongoDB Atlas persistence.

## Files
* `server.js`: Contains Express configuration, Socket.IO event handlers (`join_room`, `play`, `pause`, `seek`, `change_video`, `assign_role`, `remove_participant`, `send_message`, `disconnect`), and in-memory room management.
* `models/Room.js`: Mongoose model for persisting room state to MongoDB Atlas.

## Run
```bash
npm install
node server.js
```
