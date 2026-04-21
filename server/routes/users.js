import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { connectMongo } from '../db.js';
import User from '../models/user.js';
import { requireAuth, requireRoles } from '../middleware/authz.js';

const router = Router();
const EDITABLE_ROLES = new Set(['admin', 'viewer', 'editor', 'contributor']);

function sanitizeUser(userDoc) {
  const user = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  return {
    id: user._id?.toString?.() || user._id,
    name: user.name,
    email: user.email,
    role: user.role === 'user' ? 'viewer' : user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.use(async (req, res, next) => {
  try { await connectMongo(); next(); } catch (error) { next(error); }
});

router.use(requireAuth);
router.use(requireRoles('admin'));

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .select('_id name email role createdAt updatedAt')
      .lean();

    res.json(users.map(sanitizeUser));
  } catch (error) { next(error); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const normalizedRole = role || 'viewer';
    if (!EDITABLE_ROLES.has(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: normalizedRole,
    });

    res.status(201).json(sanitizeUser(created));
  } catch (error) { next(error); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};
    const updates = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      updates.email = email.toLowerCase().trim();
    }

    if (role !== undefined) {
      if (!EDITABLE_ROLES.has(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }

    if (typeof password === 'string' && password.trim()) {
      updates.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('_id name email role createdAt updatedAt');

    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(sanitizeUser(updated));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const deleted = await User.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true, id: req.params.id });
  } catch (error) { next(error); }
});

export default router;
