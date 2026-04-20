import { connectMongo } from '../db.js';
import bcrypt from 'bcryptjs';
import User from '../models/user.js';
import Project from '../models/project.js';
import Task from '../models/task.js';

const demoTasks = [
  {
    title: 'Define sprint goals',
    description: 'Collect requirements and lock sprint scope for this iteration.',
    status: 'todo',
    priority: 'high',
    tags: ['planning', 'sprint'],
  },
  {
    title: 'Wireframe dashboard layout',
    description: 'Create the board and header wireframes in Figma.',
    status: 'todo',
    priority: 'medium',
    tags: ['design', 'ui'],
  },
  {
    title: 'Build auth endpoints',
    description: 'Implement register/login handlers and validate request bodies.',
    status: 'in_progress',
    priority: 'urgent',
    tags: ['backend', 'auth'],
  },
  {
    title: 'Connect board to API',
    description: 'Load tasks from backend and update status on drag and drop.',
    status: 'in_progress',
    priority: 'high',
    tags: ['frontend', 'integration'],
  },
  {
    title: 'Resolve deploy pipeline issue',
    description: 'Fix failing environment variable injection in CI pipeline.',
    status: 'blocked',
    priority: 'high',
    tags: ['infra', 'ci'],
  },
  {
    title: 'Set up project repository',
    description: 'Initialize repository settings, labels, and branch protections.',
    status: 'done',
    priority: 'medium',
    tags: ['setup', 'repo'],
  },
  {
    title: 'Configure linting and formatting',
    description: 'Enable ESLint defaults and basic style checks for the app.',
    status: 'done',
    priority: 'low',
    tags: ['quality', 'tooling'],
  },
];

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

  await Task.deleteMany({
    project: project._id,
    createdBy: user._id,
    tags: { $in: ['planning', 'sprint', 'design', 'ui', 'backend', 'auth', 'frontend', 'integration', 'infra', 'ci', 'setup', 'repo', 'quality', 'tooling'] },
  });

  const created = await Task.insertMany(
    demoTasks.map((task, index) => ({
      ...task,
      assignee: user._id,
      reporter: user._id,
      project: project._id,
      createdBy: user._id,
      order: index,
      subtasks: [
        { title: 'Define acceptance criteria', done: task.status === 'done' },
        { title: 'Implement and test', done: task.status === 'done' },
      ],
    }))
  );

  const counts = created.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Seeded demo tasks:', created.length);
  console.log('Status counts:', counts);
}

run()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
