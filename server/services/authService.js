import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';

function ensureSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export async function register({ name, email, password }) {
  if (!name || !email || !password) {
    throw new Error('name, email, password are required');
  }
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  return sanitize(user);
}

export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('email, password are required');
  }
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const secret = ensureSecret();
  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  const token = jwt.sign(payload, secret, { expiresIn: '7d' });
  return { user: sanitize(user), token };
}

function sanitize(userDoc) {
  const u = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  return {
    id: u._id?.toString?.() || u._id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
