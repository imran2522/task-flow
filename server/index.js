import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Load env before anything else
const candidateEnvFiles = ['.env.local', '.env'];
for (const p of candidateEnvFiles) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) { dotenv.config({ path: full }); break; }
}

const app = express();
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

import tasksRouter from './routes/tasks.js';
app.use('/api/tasks', tasksRouter);
import authRouter from './routes/auth.js';
app.use('/api/auth', authRouter);
import projectsRouter from './routes/projects.js';
app.use('/api/projects', projectsRouter);
import usersRouter from './routes/users.js';
app.use('/api/users', usersRouter);
import customRouter from './routes/custom.js';
// Mount at root to provide exact paths as requested
app.use('/', customRouter);

io.on('connection', (socket) => {
  socket.on('joinBoard', (boardId) => {
    if (!boardId) return;
    socket.join(String(boardId));
  });

  socket.on('leaveBoard', (boardId) => {
    if (!boardId) return;
    socket.leave(String(boardId));
  });

  socket.on('taskMoved', (payload = {}) => {
    const boardRoom = payload.boardId ?? payload.roomId;
    if (!boardRoom) return;

    // Broadcast move updates to everyone else on this board.
    socket.to(String(boardRoom)).emit('taskMoved', payload);
  });

  socket.on('taskCreated', (payload = {}) => {
    const boardRoom = payload.boardId ?? payload.roomId;
    if (!boardRoom) return;

    socket.to(String(boardRoom)).emit('taskCreated', payload);
  });
});

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
