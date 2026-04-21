import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const ALLOWED_ROLES = new Set(['admin', 'viewer', 'editor', 'contributor', 'user']);

function ensureSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

function normalizeRole(role) {
  // Keep legacy "user" accounts as read-only viewers.
  if (role === 'user') return 'viewer';
  return role;
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, ensureSecret());
    const userId = decoded?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('_id name email role').lean();
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = normalizeRole(user.role);
    if (!ALLOWED_ROLES.has(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireRoles(...roles) {
  const allowed = new Set(roles);

  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}
