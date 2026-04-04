# Learning notes

Thursday, April 2, 2026:

## MERN Phase 1 — summary

- We set up a **classic split**: a **React** app in `client/` and an **Express** API in `server/`, both in one repo.
- The **server** runs on **Node**, uses **Express** and **CORS**, and exposes **`GET /api/health`**, which returns JSON like `{ "ok": true }`. That checks that the API is up.
- The **client** is **Vite + React**. It uses **`fetch`** to call the API at a **base URL** (`VITE_API_URL` in `.env`, or a fallback in code). The browser never talks to a database; it only talks to **HTTP** on the server.
- **Local dev needs two processes**: one terminal for **`server`** (`npm run dev`), one for **`client`** (`npm run dev`). If only the client runs, you get **Failed to fetch**.
- **Port** is chosen on the server (`process.env.PORT` or a default in `index.js`). The **same number** must match what the client uses in its API URL. **`PORT` in `server/.env`** overrides the code default.
- **macOS** often uses **port 5000** for AirPlay, which caused **`EADDRINUSE`**. We avoided that by using another default (e.g. **5050**) or any free port you set.
- **Vite** only reads **`VITE_*`** env vars when it starts, so after changing `client/.env` you **restart** the client dev server.
- **React “routing”** (multiple pages) is **not** set up yet; **Express routes** live in **`server/index.js`** (`app.get(...)`, etc.).
- Right now the app only **proves the wire**: React can reach Express and read JSON. **No MongoDB, auth, or fitness features** until the next phases.
