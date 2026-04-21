import { Router } from 'express';
import { connectMongo } from '../db.js';
import { listTasks, getTaskById, createTask, updateTask, deleteTask } from '../services/taskService.js';
import { requireAuth, requireRoles } from '../middleware/authz.js';

const router = Router();

router.use(async (req, res, next) => {
  try { await connectMongo(); next(); } catch (e) { next(e); }
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { project, status, assignee, search, tags, sort, page, limit } = req.query;
    const parsedTags = typeof tags === 'string' ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const result = await listTasks({ project, status, assignee, search, tags: parsedTags, sort, page, limit });
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await getTaskById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', requireRoles('admin', 'contributor'), async (req, res, next) => {
  try {
    const created = await createTask({
      ...req.body,
      createdBy: req.user.id,
      reporter: req.body?.reporter || req.user.id,
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.patch('/:id', requireRoles('admin', 'editor'), async (req, res, next) => {
  try {
    const updated = await updateTask(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) { next(e); }
});

router.delete('/:id', requireRoles('admin', 'editor'), async (req, res, next) => {
  try {
    const deleted = await deleteTask(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
