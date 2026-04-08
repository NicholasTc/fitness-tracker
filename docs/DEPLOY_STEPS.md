# Step-by-step: deploy (single origin)

Follow these in order. The example host is **Render** (free Web Service, GitHub deploy); **Railway** and **Fly.io** work similarly—same env vars and build shape, different dashboard labels.

**You need:** GitHub account, MongoDB Atlas account, a host account (e.g. Render), Node 18+ locally optional (for testing builds).

---

## 1. Put the code on GitHub

1. Create a **new repository** on GitHub (empty, no README required if you already have code).
2. In your project folder, commit everything **except secrets** (do not commit `server/.env`):

   ```bash
   cd /path/to/Project-New-FitnessApp
   git init
   git add .
   git status   # confirm .env is not listed
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git push -u origin main
   ```

3. If `.gitignore` does not ignore `server/.env`, add `server/.env` and commit.

---

## 2. MongoDB Atlas (database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → **Build a database** → choose **M0** (free) → create cluster.
2. **Database Access:** add a user (username + password). Save the password.
3. **Network Access:** **Add IP Address** → **Allow access from anywhere** (`0.0.0.0/0`) for a simple hobby deploy, or restrict later.
4. **Database** → **Connect** → **Drivers** → copy the connection string. Replace `<password>` with your user’s password and set a default DB name if you like, e.g. `...mongodb.net/fitness?...`.
5. Keep this string for **`MONGODB_URI`** (never commit it).

---

## 3. Choose your public URL (before the first client build)

Single-origin means the React app calls **`https://YOUR_ORIGIN/api/...`**. The **origin** must match what you set in **`VITE_API_URL`** (build) and **`CLIENT_ORIGIN`** (runtime).

**On Render:** When you create a Web Service, you pick a **name**; the URL is:

`https://<that-name>.onrender.com`

Example: name `fitness-app` → `https://fitness-app.onrender.com`

Use that exact HTTPS URL (no trailing slash) for the next section.

---

## 4. Secrets and env vars to prepare

Generate a long random string for JWTs (e.g. 32+ bytes hex):

```bash
openssl rand -hex 32
```

You will set these on the host:

| Name | Example | Notes |
|------|---------|--------|
| `MONGODB_URI` | `mongodb+srv://...` | From Atlas |
| `JWT_SECRET` | `a1b2c3...` | From `openssl rand -hex 32` |
| `CLIENT_ORIGIN` | `https://fitness-app.onrender.com` | **Same** as public site URL |
| `VITE_API_URL` | `https://fitness-app.onrender.com` | **Same** value; used **at build time** for the client |
| `NODE_ENV` | `production` | Optional but recommended |

**Important:** `CLIENT_ORIGIN` and `VITE_API_URL` must be identical to your live `https://…` origin.

---

## 5. Create the Web Service (Render example)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**.
2. **Connect** your GitHub repo → select the repo and branch **`main`**.
3. Configure:
   - **Root directory:** leave **empty** (repository root).
   - **Runtime:** **Node**.
   - **Build command:**

     ```bash
     cd client && npm ci && npm run build && cd ../server && npm ci
     ```

   - **Start command:**

     ```bash
     cd server && npm start
     ```

4. **Environment** → add the variables from the table above.  
   For **`VITE_API_URL`:** Render runs the build on the server—add `VITE_API_URL` in the same **Environment** list so it is available when `npm run build` runs in `client/`. (If your provider separates “build secrets,” put `VITE_API_URL` there too.)

5. **Instance type:** Free (if offered).

6. **Create Web Service** and wait for the first deploy.

**If the build fails:** open the deploy log. Common fixes: wrong Node version (set **Environment** → `NODE_VERSION` = `20` on Render), or typo in `cd client` / `cd server` paths.

---

## 6. After the first successful deploy

1. Open `https://YOUR-SERVICE.onrender.com/api/health` — expect `{"ok":true}`.
2. Open `https://YOUR-SERVICE.onrender.com/` — the app should load.
3. **Register** a user and log in; open a page that loads data (e.g. dashboard).

**If the UI cannot reach the API:** Check `VITE_API_URL` was set **during the last build** (same as site URL). Change it → **Clear build cache / redeploy** so the client rebuilds.

**If you change the service URL** (rename service): Update `CLIENT_ORIGIN`, `VITE_API_URL`, redeploy with a fresh client build.

---

## 7. Local “production-like” check (optional)

From the repo root:

```bash
cd client && VITE_API_URL=http://localhost:5050 npm run build && cd ../server && npm start
```

Visit `http://localhost:5050` — SPA + API on one port. Uses your local `server/.env` for MongoDB and `CLIENT_ORIGIN` (set `CLIENT_ORIGIN=http://localhost:5050` in `server/.env` for this test).

---

## 8. Ongoing workflow

- Push to **`main`** → host rebuilds and deploys (per your provider’s settings).
- Any change that affects API URL or CORS → update env vars and ensure the **client** is rebuilt.

---

## Quick reference: what runs where

| Step | Where |
|------|--------|
| `npm run build` in `client/` | Build machine (Render, etc.) |
| `VITE_API_URL` | Injected at **build** time |
| `CLIENT_ORIGIN`, `MONGODB_URI`, `JWT_SECRET` | **Runtime** on the Node server |
| `node index.js` in `server/` | Same machine; serves `client/dist` + `/api/*` |

See also `docs/DEPLOYMENT_PLAN.md` for architecture and tradeoffs.
