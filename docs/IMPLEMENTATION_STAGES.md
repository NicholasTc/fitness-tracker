# Staged build — full product (incremental, test each stage)

This document breaks the **MVP** into **stages**. Do **not** start the next stage until the **verification checklist** for the current stage passes. That keeps regressions small and debugging manageable.

**Product scope:** See `docs/FEATURES.md`. **Clarification protocol:** `docs/DEVELOPMENT_PROTOCOL.md` (ask before guessing on ambiguous product or data-model choices).

**Stack:** MongoDB (Atlas), Express, React (Vite), JWT auth, deploy in the final stage.

**Design reference:** `design-proposal/` guides layout and flows; implementation can simplify as long as behavior matches the stage goals.

---

## Stage 0 — Baseline (already done)

**Goal:** Client and server run together; API responds over HTTP.

**Verification:**

- [ ] `GET /api/health` returns JSON from Express while the React app is open.
- [ ] Two terminals: `server` + `client` dev servers both running without errors.

If any item fails, fix before Stage 1.

---

## Stage 1 — Database connected; anonymous workout stub

**Goal:** MongoDB is live; first read/write through the API (no login yet).

**Build:**

- Atlas cluster + `MONGODB_URI` in `server/.env` (never commit).
- Mongoose connection on server startup (fail fast or log clearly if URI missing).
- Model: e.g. `Workout` with minimal fields (`name`, `createdAt`).
- `express.json()` for bodies.
- `GET /api/workouts` — list all (temporary; will be scoped by user in Stage 2).
- `POST /api/workouts` — create from JSON body.

**Verification:**

- [ ] Server starts and logs successful DB connection (or you confirm with one test insert).
- [ ] `POST` via Postman/curl creates a document; `GET` returns it in the list.
- [ ] React: simple form + list calling those endpoints; new items appear after refresh or after refetch.

---

## Stage 2 — Authentication (register, login, protected routes)

**Goal:** Multi-user safety; all private data tied to `userId`.

**Build:**

- User model: email (unique), password hash only.
- `POST /api/register`, `POST /api/login` — bcrypt + JWT (`Authorization: Bearer ...`).
- Auth middleware: reject protected routes without valid token.
- Move workouts under protection: `GET/POST /api/workouts` require auth; store `userId` on each workout.
- React: Register / Login pages; store token (memory or `sessionStorage` for v1); attach header on `fetch`; logout clears token.
- React Router: routes for `/login`, `/register`, and a protected `/app` (or `/`) that redirects if not logged in.

**Verification:**

- [ ] Two test accounts; user A never sees user B’s workouts (API + UI).
- [ ] Invalid or missing token returns 401 on protected routes.
- [ ] Refresh behavior acceptable for v1 (document known limits if token is only in memory).

---

## Stage 3 — User profile and goals (TDEE / calories foundation)

**Goal:** One place for height, weight, goals, and daily calorie target used later.

**Build:**

- Profile model or extend User: fields like height, weight, activity level, goal (maintain / cut / bulk), optional target calories (or compute from formula server-side).
- `GET /api/profile`, `PUT /api/profile` (protected).
- React: profile form on a dedicated screen; load on login, save updates API.

**Verification:**

- [ ] Profile persists after logout/login.
- [ ] Values validate server-side (reasonable ranges, required fields).

---

## Stage 4 — Workouts: sessions + templates (CRUD + structure)

**Goal:** Structured **sessions** (on a date) **and** reusable **templates**, including **start session from template**. See `docs/FEATURES.md` §2.

**Before implementation:** If the data model or API shape is still ambiguous (e.g. one collection vs two, route naming), resolve with the product owner per `docs/DEVELOPMENT_PROTOCOL.md`.

**Build:**

- **Sessions:** Model + routes for workout sessions — name, date, exercises (name, sets, reps, optional weight). `GET/POST`, `GET/PATCH/DELETE /api/workouts/:id` (or equivalent REST shape).
- **Templates:** Model + routes for templates — same exercise structure, no “performed on” date (or agreed equivalent). Full CRUD for `/api/workout-templates` (or agreed path).
- **From template:** Route or action to **create a session from a template** for a chosen date (e.g. `POST /api/workouts/from-template` with `templateId` + `date`).
- React: lists and detail/edit for both; flow to create session from template; responsive layouts (`design-proposal/`).

**Verification:**

- [ ] Session CRUD and template CRUD work for the logged-in user only; no cross-user leakage.
- [ ] “From template” creates an independent session user can edit without changing the template (unless you explicitly choose copy-on-write vs link — confirm if unclear).
- [ ] Empty states and errors (network, 401) handled without crashing the app.

---

## Stage 5 — Nutrition / daily targets (lightweight)

**Goal:** Daily calorie target and simple logging enough to support the dashboard story.

**Not in this stage:** barcode or external nutrition APIs (post-MVP per `docs/FEATURES.md`).

**Build:**

- Model: e.g. `FoodLog` or daily summary — date, calories, optional meal label; link to `userId`.
- Routes: `GET` by date range, `POST` add entry, optional `DELETE`.
- React: simple day view + add entry form; show running total vs target from profile.

**Verification:**

- [ ] Entries persist and scope per user.
- [ ] Totals match server-side math (avoid trusting only the client).

---

## Stage 6 — Calendar or week view (read-focused)

**Goal:** See planned or completed workouts across days (can be read-only from workout dates first).

**Build:**

- Either derive calendar from existing workout dates or add scheduled fields.
- `GET` endpoint that returns events for a month/week (or filter client-side if data volume is tiny).
- React: week or month grid; click-through to detail where applicable.

**Verification:**

- [ ] Navigating months/weeks shows correct data for the logged-in user.
- [ ] Performance acceptable with realistic test data volume.

---

## Stage 7 — Progress (measurements, photos, PRs)

**Goal:** Body measurements over time, progress photos, and lift PR history — all scoped to the logged-in user.

**Build:**

- Models/routes for: **measurement entries** (e.g. date, weight, optional body fields), **photo metadata** (store files in cloud storage or GridFS — pick one approach; never expose other users’ media).
- **PR records:** e.g. exercise name, best weight/reps, date achieved; `GET`/`POST`/`PUT`/`DELETE` as needed.
- React: simple timelines or lists; upload or link photos per your storage choice; PR list or per-exercise view.

**Verification:**

- [ ] User A cannot read or mutate user B’s measurements, photos, or PRs.
- [ ] Happy path and basic error handling covered.

---

## Stage 8 — Polish and production deploy

**Goal:** Usable on the internet for **two** intended users; **desktop and mobile** layouts reviewed for parity (no “desktop-only” shortcuts that break narrow screens).

**Build:**

- Environment-based API URL for client; production CORS origin on server.
- Deploy: Atlas; Express on Render (or similar); React static build on Cloudflare Pages (or similar).
- HTTPS in production; smoke test register, login, workouts, nutrition, progress on live URLs.
- **No** email or push notifications in MVP (nothing to configure unless you add them later).

**Verification:**

- [ ] End-to-end on production URLs matches local behavior for core MVP flows.
- [ ] `.env` and secrets not in git; host dashboards configured.
- [ ] Spot-check key screens on a narrow viewport and a desktop width.

---

## Post-MVP (order flexible)

Complete Stage 8 first, then add in any order:

- **AI coach:** `POST /api/coach` (server-only keys), rate limits, React UI.
- **Barcode / external nutrition API:** extend Stage 5 with scanning and third-party food data.
- **Notifications:** email or push if you want them later.

---

## How to use this document

1. After each stage, **run the checklist** and fix failures before continuing.
2. If a stage feels large, split **that stage** into smaller internal commits (API first, then UI), but keep the **verification** as the gate.
3. Update this file if you reorder features (e.g. nutrition before calendar) as long as dependencies make sense (auth before user-scoped data).

---

## Dependency overview (quick reference)

| Stage | Depends on |
|-------|------------|
| 1 | 0 |
| 2 | 1 |
| 3 | 2 |
| 4 | 2 (or 3 if you want profile first; either order works if workouts stay user-scoped) |
| 5 | 3 (profile targets), 2 |
| 6 | 4 |
| 7 | 2, 3 (4 helps for context; can run after 6) |
| 8 | Stages 1–7 for full MVP deploy |

Post-MVP items do not block Stage 8.
