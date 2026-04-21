import { Router } from 'express';
import { connectMongo } from '../db.js';
import Project from '../models/project.js';
import Task from '../models/task.js';
import { requireAuth, requireRoles } from '../middleware/authz.js';

const router = Router();

router.use(async (req, res, next) => {
  try { await connectMongo(); next(); } catch (e) { next(e); }
});

router.use(requireAuth);

function sanitizeProject(projectDoc) {
  const p = typeof projectDoc.toObject === 'function' ? projectDoc.toObject() : projectDoc;
  return {
    id: p._id?.toString?.() || p._id,
    name: p.name,
    key: p.key,
    description: p.description,
    owner: p.owner,
    members: p.members || [],
    isArchived: Boolean(p.isArchived),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function buildProjectKey(name) {
  const normalized = String(name || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

  if (!normalized) return `BOARD${Date.now().toString().slice(-4)}`;
  return normalized.slice(0, 8);
}

router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find({ isArchived: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(projects.map(sanitizeProject));
  } catch (e) { next(e); }
});

router.post('/', requireRoles('admin'), async (req, res, next) => {
  try {
    const { name, description, key } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const baseKey = key ? String(key).toUpperCase().trim() : buildProjectKey(name);

    let uniqueKey = baseKey;
    let suffix = 1;
    while (await Project.exists({ key: uniqueKey })) {
      uniqueKey = `${baseKey.slice(0, 6)}${suffix}`;
      suffix += 1;
    }

    const created = await Project.create({
      name: String(name).trim(),
      description: description ? String(description) : undefined,
      owner: req.user.id,
      key: uniqueKey,
      members: [req.user.id],
    });

    res.status(201).json(sanitizeProject(created));
  } catch (e) { next(e); }
});

router.patch('/:id', requireRoles('admin'), async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    const updates = {};

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description ? String(description) : undefined;
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: 'At least one field is required' });
    }

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(sanitizeProject(updated));
  } catch (e) { next(e); }
});

router.delete('/:id', requireRoles('admin'), async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const deletedProject = await Project.findByIdAndDelete(projectId).lean();
    if (!deletedProject) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const taskDeleteResult = await Task.deleteMany({ project: projectId });
    res.json({
      ok: true,
      deletedProjectId: projectId,
      deletedTaskCount: taskDeleteResult.deletedCount || 0,
    });
  } catch (e) { next(e); }
});

export default router;
