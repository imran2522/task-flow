import { Router } from 'express';
import { connectMongo } from '../db.js';
import { register, login } from '../services/authService.js';

const router = Router();

router.use(async (req, res, next) => {
  try { await connectMongo(); next(); } catch (e) { next(e); }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await register({ name, email, password });
    res.status(201).json({ user });
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });
    res.json(result);
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message });
  }
});

export default router;
