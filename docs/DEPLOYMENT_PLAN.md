# Deployment plan — single origin (v1)

This document is the **plan for shipping** the Fitness app on **one public HTTPS URL** that serves both the React UI and the Express API. It assumes **GitHub → automatic deploy on push**, **free tier where possible**, and the **default hostname** from your host (no custom domain required for v1).

---

## 1. What “single origin” means here

| Layer | Role |
|--------|------|
| **Browser** | The user opens one address, e.g. `https://your-service.onrender.com`. |
| **Same host** | Static files for the SPA (**Vite build** in `client/dist`) and JSON API routes (**Express** under `/api/*`) are served by **one** Node process behind that URL. |
| **Database** | **MongoDB Atlas** (e.g. free M0) is separate in the cloud; it is **not** a second URL for users—only the API connects to it via `MONGODB_URI`. |

**Why this shape:** One URL matches the product goal, keeps CORS simple (`CLIENT_ORIGIN` equals that same origin), and fits a single **Web Service** on a free PaaS (Render, Railway, Fly.io, etc.) with a **build command** then **start command**.

---

## 2. Request flow (how routing should work)

1. **`GET /api/*`** — Handled by Express (existing routers). Includes `GET /api/health` for health checks.
2. **`GET` for static assets** — e.g. `/assets/...`, `favicon`, etc. — Served from `client/dist` with correct `express.static` caching headers.
3. **`GET` for client routes** — e.g. `/dashboard`, `/login` — The server must **not** return 404 for unknown paths that are SPA routes. After static file lookup fails, respond with **`index.html`** (SPA fallback) so React Router can render.

**Order matters:** Register API routes **before** the static middleware and the catch-all SPA fallback, so `/api` never gets swallowed by `index.html`.

**Repo behavior:** When `client/dist` exists (after `npm run build` in `client/`), `server/index.js` serves those files and falls back to `index.html` for non-API routes. Local dev without a build still runs API-only.

---

## 3. Build-time vs runtime configuration

### 3.1 Client build (`VITE_API_URL`)

The client uses `API_BASE` from `VITE_API_URL` and calls `API_BASE + '/api/...'` (see `client/src/lib/api.js`).

For single origin, set **`VITE_API_URL` to the production origin only**—scheme, host, and port if non-default—**no path, no trailing slash**:

```text
VITE_API_URL=https://your-service.onrender.com
```

Use the **real** URL after the first deploy, or the URL you know the platform will assign. If the host URL changes, **rebuild** the client and redeploy.

### 3.2 Server runtime

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Atlas connection string (required). |
| `JWT_SECRET` | Long random secret for JWT signing (required). |
| `PORT` | Listen port; most hosts set this automatically. |
| `CLIENT_ORIGIN` | Must equal the **browser origin** of the deployed site (same as `VITE_API_URL` for single origin: `https://your-service.onrender.com`). |

Keep secrets only in the host’s environment or secret manager—never in git.

---

## 4. How to deploy (recommended procedure)

### Step A — Database (MongoDB Atlas)

1. Create a **free M0** cluster (or your team’s standard).
2. Create a database user and get the **connection string**.
3. **Network access:** Allow the PaaS outbound IPs **or** use `0.0.0.0/0` for a hobby project (weaker security; acceptable only if you accept the risk).
4. Store the URI as `MONGODB_URI` in production.

### Step B — Application (single-origin serving)

Implemented in **`server/index.js`**: if `../client/dist` exists, Express serves it and uses an SPA fallback for non-`/api` routes. Optional: set **`NODE_ENV=production`** on the host.

### Step C — Build and start on the host

The host must, on each deploy:

1. **Install** client dependencies (`client/`) and **build** the client with production `VITE_API_URL`.
2. **Install** server dependencies (`server/`).
3. **Start** the server from `server/` (`npm start` → `node index.js`).

Example shape (exact commands depend on monorepo layout; your repo has **separate** `client/` and `server/` packages):

- **Root directory:** repository root (or the folder that contains both `client` and `server`).
- **Build command (conceptual):** `cd client && npm ci && VITE_API_URL=https://YOUR_URL npm run build && cd ../server && npm ci`
- **Start command:** `cd server && npm start`

Adjust `YOUR_URL` to your real public HTTPS origin. Many platforms let you inject `VITE_API_URL` from a configured env var so you don’t hardcode it.

### Step D — Connect GitHub

1. Create a **Web Service** (or equivalent) on your chosen provider.
2. Connect the **GitHub** repository; set branch to **`main`** (or your release branch).
3. Paste **environment variables** (`MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, `VITE_API_URL` for build, optional `PORT`).
4. Trigger the first deploy; fix build failures (missing Node version, wrong working directory, etc.) until green.

### Step E — Smoke test

- [ ] `GET https://YOUR_URL/api/health` returns JSON `{ ok: true }`.
- [ ] Opening `https://YOUR_URL/` loads the SPA (not raw directory listing or 404).
- [ ] Direct navigation to a deep link (e.g. `/dashboard`) works after refresh (SPA fallback).
- [ ] Register / login and one authenticated API call succeed.

---

## 5. Constraints and tradeoffs (free tier)

- **Cold starts / sleep:** Many free tiers spin down idle services; the first request after idle can be slow. Acceptable for v1 at `$0`.
- **Build minutes / limits:** Free tiers cap build time and bandwidth—keep dependencies lean.
- **Atlas M0:** Suitable for development and light use; watch connection limits and backup expectations.

---

## 6. Summary checklist

| Item | Status |
|------|--------|
| Single public URL for UI + API | **Target architecture** |
| Express serves `client/dist` + SPA fallback | **Done** when `client/dist` exists |
| Production `VITE_API_URL` = same origin as site | **Set at build time** |
| `CLIENT_ORIGIN` = same origin | **Set at runtime** |
| Atlas + secrets in host env | **Required** |
| GitHub push → deploy | **Configure on provider** |

This file stays **provider-agnostic**; once you pick a host, add a short appendix with **exact** dashboard field names and env var mapping if helpful.
