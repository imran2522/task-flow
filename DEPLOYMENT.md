# Deployment Guide: Vercel + Render

This guide walks you through deploying the frontend to Vercel and the backend to Render.

## Prerequisites

- GitHub repo (public or private)
- Vercel account (free)
- Render account (free)
- MongoDB Atlas connection string
- A JWT secret key (min 32 chars, e.g., `openssl rand -base64 32`)

## Step 1: Deploy Backend to Render

### 1a. Push repo to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/task-flow.git
git push -u origin main
```

### 1b. Create Render Web Service
1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Select your task-flow GitHub repo
4. Fill in:
   - **Name**: `task-flow-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Plan**: `Free` (or `Starter Pro` for production)
5. Scroll down to **Environment** section
6. Add env vars:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = `mongodb+srv://...` (from MongoDB Atlas)
   - `JWT_SECRET` = your secret (32+ chars)
7. Click **Create Web Service**
8. Wait for deploy (2–5 min)
9. Copy the service URL, e.g., `https://task-flow-api.onrender.com`
10. Test health: `curl https://task-flow-api.onrender.com/health`

**Note:** Free tier services spin down after 15 min of inactivity. Upgrade to Starter Pro for production.

---

## Step 2: Deploy Frontend to Vercel

### 2a. Import project to Vercel
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Select your task-flow GitHub repo
4. Click **Import**
5. Under **Framework Preset**, confirm `Vite` is selected
6. Scroll to **Environment Variables**
7. Add env var:
   - `VITE_API_URL` = `https://task-flow-api.onrender.com` (your Render backend URL, **no trailing slash**)
8. Click **Deploy**
9. Wait for deploy (1–3 min)
10. You'll get a Vercel URL, e.g., `https://task-flow.vercel.app`

### 2b. (Optional) Connect custom domain
1. In Vercel project settings, go to **Domains**
2. Add your custom domain and follow DNS setup

---

## Step 3: Test the Full Stack

1. Open your Vercel frontend URL
2. Try **Sign Up** → create a test account
3. Check MongoDB Atlas to verify the user was saved
4. Log in and try creating a board/task
5. Open DevTools → Network to confirm API calls go to your Render backend

---

## Environment Variables Summary

| Var | Value | Where Set | Example |
|-----|-------|-----------|---------|
| `MONGODB_URI` | MongoDB connection string | Render Web Service | `mongodb+srv://user:pass@...` |
| `JWT_SECRET` | Secret for token signing | Render Web Service | 32+ random chars |
| `NODE_ENV` | `production` | Render Web Service | `production` |
| `PORT` | Server port | Render (auto-injected) | `3000` |
| `VITE_API_URL` | Backend origin (no /api suffix) | Vercel project env | `https://task-flow-api.onrender.com` |
| `VITE_APP_NAME` | App display name | Vercel project env | `Task Flow` |
| `VITE_ENV` | Environment name | Vercel project env | `production` |

---

## Troubleshooting

### Frontend shows "Cannot POST /api/auth/login"
- **Cause**: `VITE_API_URL` not set or wrong in Vercel
- **Fix**: Go to Vercel project settings → Environment Variables, add `VITE_API_URL=https://task-flow-api.onrender.com`, then redeploy

### Sockets not connecting (no realtime updates)
- **Cause**: Socket.IO only works with long-lived connections; free Render services may time out
- **Fix**: Upgrade Render to Starter Pro, or refactor to use a managed realtime service (Ably, Pusher, Supabase)

### "Invalid MongoDB connection string"
- **Cause**: Missing or malformed `MONGODB_URI` on Render
- **Fix**: Go to Render Web Service settings, confirm env var matches MongoDB Atlas connection string with username/password

### Backend spinning down on Render
- **Cause**: Free tier service spins down after 15 min of inactivity
- **Workaround**: Use a monitoring service (e.g., UptimeRobot) to ping `/health` every 5 min, or upgrade to Starter Pro

---

## Next Steps (Production Hardening)

1. **Monitor Render service**: Set up ping/uptime alert for `/health` endpoint
2. **Enable HTTPS**: Both Vercel and Render provide free HTTPS by default ✓
3. **Update CORS**: Check [server/index.js](server/index.js) `cors` config if you add a custom domain
4. **Rate limiting**: Add rate-limit middleware to API (optional for now)
5. **Database backups**: Enable automatic backups in MongoDB Atlas

---

## Rollback

To rollback a deployment:
- **Vercel**: Click **Deployments**, select an older deployment, click **Redeploy**
- **Render**: Trigger a manual deploy from GitHub, or use Render UI **Deploys** tab to rollback

---

## Config Files

This repo includes:
- `vercel.json` – Vercel project config (SPA rewrites, build/output dirs)
- `render.yaml` – Render service config (environment, start command)
- `.env.example` – Template for local `.env` and deployment env vars
