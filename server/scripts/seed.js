import { connectMongo } from '../db.js';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import Project from '../models/project.js';
import Task from '../models/task.js';

async function run() {
  await connectMongo();
  const passwordHash = await bcrypt.hash('Passw0rd!', 12);

  const user = await User.findOneAndUpdate(
    { email: 'demo@example.com' },
    { name: 'Demo User', email: 'demo@example.com', passwordHash },
    { upsert: true, new: true }
  );

  const project = await Project.findOneAndUpdate(
    { key: 'TF' },
    { name: 'Task Flow', key: 'TF', owner: user._id },
    { upsert: true, new: true }
  );

  const task = await Task.create({
    title: 'Set up project',
    description: 'Initialize repository and CI',
    status: 'in_progress',
    priority: 'high',
    assignee: user._id,
    reporter: user._id,
    project: project._id,
    createdBy: user._id,
    tags: ['setup', 'infra'],
    subtasks: [
      { title: 'Create repo', done: true },
      { title: 'Configure lint', done: false },
    ],
  });

  console.log('Seeded task id:', task._id.toString());
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
