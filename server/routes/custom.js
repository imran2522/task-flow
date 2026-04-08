import { Router } from 'express';
import { connectMongo } from '../db.js';
import Task from '../models/task.js';

const router = Router();

router.use(async (req, res, next) => {
  try { await connectMongo(); next(); } catch (e) { next(e); }
});

// GET /boards — returns tasks grouped by status for a project
router.get('/boards', async (req, res, next) => {
  try {
    const { project } = req.query;
    if (!project) return res.status(400).json({ error: 'project is required' });
    const tasks = await Task.find({ project }).sort({ order: 1, updatedAt: -1 }).lean();
    const board = {
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };
    for (const t of tasks) {
      const s = t.status || 'todo';
      if (!board[s]) board[s] = [];
      board[s].push(t);
    }
    res.json({ project, columns: board });
  } catch (e) { next(e); }
});

// POST /create-task — create a task
router.post('/create-task', async (req, res, next) => {
  try {
    const { title, project, description, status, priority, assignee, reporter, createdBy, tags, order, dueDate } = req.body || {};
    if (!title || !project) return res.status(400).json({ error: 'title and project are required' });
    const payload = {
      title,
      project,
      description,
      status,
      priority,
      assignee,
      reporter,
      createdBy: createdBy || reporter,
      tags,
      order,
      dueDate,
    };
    const created = await Task.create(payload);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

// PUT /update-task-status — update only the status (and optional order)
router.put('/update-task-status', async (req, res, next) => {
  try {
    const { id, status, order } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'id and status are required' });
    const updated = await Task.findByIdAndUpdate(id, { status, ...(order !== undefined ? { order } : {}) }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;
