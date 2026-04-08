import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env before anything else
const candidateEnvFiles = ['.env.local', '.env'];
for (const p of candidateEnvFiles) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) { dotenv.config({ path: full }); break; }
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

import tasksRouter from './routes/tasks.js';
app.use('/api/tasks', tasksRouter);
import authRouter from './routes/auth.js';
app.use('/api/auth', authRouter);
import customRouter from './routes/custom.js';
// Mount at root to provide exact paths as requested
app.use('/', customRouter);

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
