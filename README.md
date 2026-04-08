## React Router

Login vs Dashboard navigation is set up with React Router.

- Pages: [src/pages/Login.jsx](src/pages/Login.jsx), [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
- Router wrapper: [src/main.jsx](src/main.jsx) uses `BrowserRouter`
- Routes: [src/App.jsx](src/App.jsx) defines `/login`, `/dashboard` and a simple `RequireAuth` that redirects to `/login` when no token is found in `localStorage`.

Quick test:

```bash
npm run dev
```

Then visit `/login`, submit the form to set a dev token, and navigate to `/dashboard`.

`/login` now calls `POST /api/auth/login` and stores `{ token, user }` in localStorage.
Client requests should use the shared helper in [src/lib/api.js](src/lib/api.js), which auto-attaches `Authorization: Bearer <token>` when available.
Use seeded credentials after running `npm run seed`:
- email: `demo@example.com`
- password: `Passw0rd!`
## API Server

Start the Express server (loads env and connects on-demand):

```bash
npm run server
```

Endpoints:
- `GET /health` — health check
- `POST /api/auth/register` — register with `{ name, email, password }`
- `POST /api/auth/login` — login with `{ email, password }`, returns `{ user, token }`
- `GET /api/tasks` — list tasks with filters: `project,status,assignee,search,tags,sort,page,limit`
- `GET /api/tasks/:id` — fetch one
- `POST /api/tasks` — create
- `PATCH /api/tasks/:id` — update
- `DELETE /api/tasks/:id` — delete

Custom endpoints (mounted at root):
- `GET /boards?project=<id>` — returns task columns grouped by status for a project
- `POST /create-task` — create task; body fields: `title` (required), `project` (required), optional `description,status,priority,assignee,reporter,createdBy,tags,order,dueDate`
- `PUT /update-task-status` — update status (and optionally `order`); body: `id` (required), `status` (required), optional `order`

Notes:
- Requires `MONGODB_URI` in `.env.local` or `.env`.
- Requires `JWT_SECRET` in `.env.local` for token signing.
- Node >= 18 recommended due to driver and ESM.

Auth quick test (replace credentials):

```bash
curl -X POST http://localhost:3000/api/auth/register \
	-H "Content-Type: application/json" \
	-d '{"name":"Demo","email":"demo@example.com","password":"Passw0rd!"}'

curl -X POST http://localhost:3000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"demo@example.com","password":"Passw0rd!"}'
```
## Mongoose Schemas

Server-side models live under [server/models](server/models):
- [User](server/models/user.js): accounts with roles and notification settings.
- [Project](server/models/project.js): workspace container with members.
- [Task](server/models/task.js): tasks with status, priority, tags, subtasks, comments.

Connection helper: [server/db.js](server/db.js) loads `MONGODB_URI` from `.env.local` or `.env` and connects via Mongoose.

Seed demo data:

```bash
npm run seed
```

Ensure Node >= 18 due to driver requirements and ESM usage.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment Variables (Vite)

Vite loads environment variables from `.env*` files and only exposes variables prefixed with `VITE_` to your client-side code.

- Create your local env file by copying `.env.example` to `.env.local` and updating the values.
- Use variables in code via `import.meta.env`, e.g. `import.meta.env.VITE_API_URL`.

Example helper added in [src/config.js](src/config.js):

```js
export const appName = import.meta.env.VITE_APP_NAME;
export const apiUrl = import.meta.env.VITE_API_URL;
export const envName = import.meta.env.VITE_ENV;
```

Available env files:
- `.env` — default for all modes
- `.env.local` — local overrides (ignored by git)
- `.env.development`, `.env.production` — mode-specific values

Start the dev server to pick up changes:

```bash
npm run dev
```

## Database Connection Test

- Script: see [test-db.cjs](test-db.cjs) (CommonJS) and [test-db.js](test-db.js) (ESM).
- Requirements: Node version >= 18 (the installed mongodb@7.x driver requires modern Node).
- Connection string: stored in /.env.local as MONGODB_URI. Ensure special characters in passwords are URL-encoded (e.g., @ → %40).

Run the test:

```bash
npm run test:db
```

Troubleshooting:
- Whitelist/IP: Check Atlas Network Access and allow your current IP.
- Auth errors: Verify username/password and correct URL-encoding in MONGODB_URI.
- DNS/SRV: Ensure SRV records resolve; retry on flaky networks.
