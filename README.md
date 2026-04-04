# fitness-tracker

FitFlow is meant to be a single place to run your fitness life: plan and follow workouts, log what you eat and how you’re progressing toward your goals, and get straightforward guidance when you’re unsure what to do next—so training, nutrition, and accountability feel connected instead of scattered across different tools and habits.

## MERN layout

- `server/` — Express API: `GET /api/health`, `GET/PUT /api/profile`, `GET/POST /api/workouts`, auth routes (MongoDB via Mongoose).
- `client/` — Vite + React; calls the API over HTTP.

**Environment:** Copy `server/.env.example` to `server/.env` and set:

- **`MONGODB_URI`** — from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas); allow your IP in Network Access (or `0.0.0.0/0` for local learning only).
- **`JWT_SECRET`** — long random string used to sign login tokens (Stage 2+). Required for the API to start.

Workouts created in Stage 1 **without** a `userId` will not appear after Stage 2; you can delete them in Atlas or leave them unused.

See `docs/PLAN.md` for the MERN roadmap, `docs/FEATURES.md` for product scope, `docs/IMPLEMENTATION_STAGES.md` for staged delivery, and `docs/DEVELOPMENT_PROTOCOL.md` for how we resolve ambiguous requirements (ask; do not guess).

## Local development

You need **two terminals** (two processes).

**Terminal 1 — API**

```bash
cd server
npm install
npm run dev
```

The API listens on [http://localhost:5050](http://localhost:5050) by default (port **5050** avoids a common clash on macOS where **5000** is often taken by AirPlay Receiver).

**Terminal 2 — React app**

```bash
cd client
npm install
npm run dev
```

Open the URL Vite prints (usually [http://localhost:5173](http://localhost:5173)). You should see a health check and a **Workouts** section: add a name, **Add**, and it should appear in the list after `POST /api/workouts` and `GET /api/workouts`.

**Optional:** copy `client/.env.example` to `client/.env` and set `VITE_API_URL` if your API is not on `http://localhost:5050`. The client defaults to that URL if the variable is missing.

**Server env:** copy `server/.env.example` to `server/.env`. Set **`MONGODB_URI`** (required). Optionally override `PORT` or `CLIENT_ORIGIN` (CORS); defaults match the URLs above.

**If you see `EADDRINUSE` on the server:** another program is using that port. Set a different `PORT` in `server/.env` and the same base URL in `client/.env` as `VITE_API_URL`.
