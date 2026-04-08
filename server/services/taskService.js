import Task from '../models/task.js';

export async function listTasks({
  project,
  status,
  assignee,
  search,
  tags,
  sort = '-updatedAt',
  page = 1,
  limit = 20,
}) {
  const q = {};
  if (project) q.project = project;
  if (status) q.status = status;
  if (assignee) q.assignee = assignee;
  if (Array.isArray(tags) && tags.length) q.tags = { $in: tags };
  
  let query = Task.find(q);
  if (search) {
    query = query.find({ $text: { $search: search } });
  }
  
  const skip = (Number(page) - 1) * Number(limit);
  const sortSpec = sort.split(',').join(' ');
  
  const [items, total] = await Promise.all([
    query.sort(sortSpec).skip(skip).limit(Number(limit)).lean(),
    Task.countDocuments(q),
  ]);
  
  return { items, total, page: Number(page), limit: Number(limit) };
}

export async function getTaskById(id) {
  return Task.findById(id).lean();
}

export async function createTask(data) {
  return Task.create(data);
}

export async function updateTask(id, data) {
  return Task.findByIdAndUpdate(id, data, { new: true }).lean();
}

export async function deleteTask(id) {
  return Task.findByIdAndDelete(id).lean();
}
