# Fitness App — Implementation Plan (MERN)

This document is the roadmap for building the project as a **classic MERN stack** so you can see how each layer is wired. MERN means **MongoDB** (database), **Express** (API server on Node), **React** (browser UI), **Node.js** (runtime for Express).

---

## Goals

- Ship a working fitness web app aligned with the static designs in `design-proposal/` (layouts and flows are a guide; the app will be rebuilt in React).
- Learn deliberately: separate **client** (React), **server** (Express), and **database** (MongoDB), with clear HTTP boundaries between them.
- Keep deployment simple at first: **MongoDB Atlas** for data, **Render** (or similar) for Express, **Cloudflare Pages** (or similar) for the React build.

---

## Repository layout (target)

One repository with two main folders:

- `server/` — Express app, connects to MongoDB (Mongoose), exposes REST API (e.g. `/api/...`).
- `client/` — React app (e.g. Vite + React), talks to the API only over HTTP (no direct DB access from the browser).

Environment variables (never commit secrets):

- Server: `MONGODB_URI`, `PORT`, and later `JWT_SECRET` (or session secret) for auth.
- Client: `VITE_API_URL` (or equivalent) pointing at your Express base URL in dev and production.

---

## Routes (HTTP method and path)

In **Express**, a **route** is a rule that ties together:

1. **Which URL path** the server reacts to (for example `/api/health` or `/api/workouts`).
2. **Which HTTP method** is allowed (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, and others).
3. **Which function runs** when both match (the **handler**). That function can read the request, talk to MongoDB, and send JSON back.

When the React app (or a tool like Postman) sends a request such as `GET /api/health`, Express finds the registered route with that **method + path** and runs its handler. Routes are how the server stays organized: each URL shape does one job instead of one giant script that tries to handle everything.

**Examples used in this plan:**

| Method and path | Purpose |
|-----------------|--------|
| `GET /api/health` | Smoke test: return simple JSON (e.g. `{ ok: true }`) to prove the server is running and the client can reach it. No database required. |
| `GET /api/workouts` | Read: return a list of workouts (usually scoped to the logged-in user once auth exists). |
| `POST /api/workouts` | Create: accept JSON in the request body, validate, save to MongoDB, return the new record or an error. |
| `POST /api/register`, `POST /api/login` | Auth: create an account or verify email/password; issue a token or session so later routes know who is calling. |

As you add features, you may add `PUT` or `PATCH` (update one resource) and `DELETE` (remove one resource). Same idea: **method + path** names one clear operation.

**Not the same as React “routes”:** In the browser, **React Router** also uses the word “routes” (e.g. `/dashboard` vs `/login`). Those only decide **which page component to show**. **Express API routes** run on the **server** and are what actually access the database and secrets. Both use the word “route,” but they live in different places.

---

## Phase 1 — Scaffold and prove the wire

1. Create `server/` with a minimal Express app: one route such as `GET /api/health` returning JSON.
2. Create `client/` with Vite + React: one page with a button or effect that calls `GET /api/health` via `fetch`.
3. Enable **CORS** on Express so the React dev server (different port) can call the API.
4. Run two processes locally: API on one port (e.g. 5050), React on another (e.g. 5173). Confirm the browser shows a successful response from the API.

Outcome: you understand the request path from React to Express with no database yet.

---

## Phase 2 — MongoDB and first real data

1. Create a **MongoDB Atlas** cluster (free tier). Whitelist your IP (or `0.0.0.0/0` for learning only; tighten later).
2. Add **Mongoose** on the server. Define one simple model (e.g. `User` or `Workout` stub).
3. Add routes to **create and list** documents (e.g. `POST /api/workouts`, `GET /api/workouts`).
4. From React, call those routes and display the list. Use environment variables for the API base URL.

Outcome: data flows **React → Express → MongoDB → back to React**.

---

## Phase 3 — Authentication (multi-user)

1. Choose an approach: **JWT** in `Authorization` header or **HTTP-only cookies** with sessions. JWT in header is common in MERN tutorials.
2. Add **register** and **login** routes. Hash passwords with **bcrypt**; never store plain text.
3. Add middleware on protected routes to verify the token or session.
4. In React: login/register forms, store token safely (memory + optional refresh strategy for later), attach token to `fetch` for protected calls.
5. Ensure every workout or profile record is tied to the **logged-in user** so two users do not see each other’s data.

Outcome: the app is multi-user safe at the API level.

---

## Phase 4 — Core product features (iterative)

Build in small slices, always **API first**, then **UI**:

- User profile and preferences.
- Workout templates and logging (or the subset you decided in design: e.g. plan preview vs live set logging).
- Nutrition / calorie targets if in scope.
- Calendar or weekly view if in scope.
- AI coach: **server-only** route that calls the AI provider with the API key in env; React never sees the key.

Reuse patterns from Phase 2: Mongoose models, Express routes, React pages/components.

---

## Phase 5 — Polish and deployment

1. **Client:** `npm run build`, deploy static output to **Cloudflare Pages** (or Netlify/Vercel). Set production `VITE_API_URL` to your live API URL.
2. **Server:** Deploy Express to **Render** (or Railway/Fly.io). Set `MONGODB_URI` and secrets in the host’s dashboard. Ensure the Atlas IP whitelist allows Render (often `0.0.0.0/0` for Atlas with auth, or Render’s outbound IPs if you lock down).
3. **Database:** Atlas connection string in production env on the server only.
4. **CORS:** Allow your production frontend origin on Express.
5. Optional later: custom domain, HTTPS (usually handled by the host), basic logging and error handling.

Outcome: same architecture as local dev, running on the internet.

---

## What we are not doing in v1

- Microservices, GraphQL everywhere, or multiple databases unless you outgrow one MongoDB.
- Running classic Express **inside** Cloudflare Workers (different runtime; would be a separate learning track).
- Storing API keys for third-party services in the React bundle.

---

## How this document will be used

Update this plan when priorities change (e.g. feature order). Use it as a checklist; detailed technical notes can live in code comments or future docs as needed.
