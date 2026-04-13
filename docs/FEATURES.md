# Product features — FitFlow (fitness-tracker)

This document lists **what the project accommodates** and the **decisions** that lock MVP scope. It aligns with `docs/IMPLEMENTATION_STAGES.md` (how we build) and `design-proposal/` (visual and UX direction).

**Last updated:** April 2, 2026 (decisions below).

**How we work:** If a requirement is unclear, **ask for clarification** before building. Do not invent product or data-model details that are not written here or confirmed by the product owner. See `docs/DEVELOPMENT_PROTOCOL.md`.

---

## Product intent (from README)

A **single place** to run your fitness life: **plan and follow workouts**, **log what you eat** and how you are **progressing toward goals**, and get **straightforward guidance** when you are unsure what to do next—so training, nutrition, and accountability feel **connected** instead of scattered across tools and habits.

---

## Confirmed decisions (scope)

| Topic | Decision |
|-------|----------|
| **Audience size** | **Two people** for now (you + one other). No need to design for a large public user base in MVP. |
| **Desktop vs mobile** | **Both at the same level** for MVP: layouts and usability should be intentionally solid on **desktop and mobile** (responsive web, not native apps). |
| **Workout data model** | See [Workouts: templates vs sessions](#workouts-templates-vs-sessions-explained). **MVP includes both:** structured **sessions** (on a date) **and** reusable **templates** (saved blueprints; start a session from a template). |
| **Nutrition (MVP)** | **Manual entry** with calories plus **optional protein/carbs/fat grams**. Entries support **full edit** (date, calories, macros, label, note). Includes **nutrition search per 100g** through a hybrid provider strategy (**USDA + Open Food Facts**) with user-editable prefill before save. |
| **AI coach** | **After MVP** — not required for the first full release. |
| **Progress** | **In MVP:** **body measurements**, **progress photos**, and **lift PR history** (alongside workouts and calorie story). |
| **Notifications** | **None** for now (no email or push in MVP). |

---

## Workouts: “templates vs sessions” (explained)

These are two different ideas:

- **Session (logged workout):** A workout tied to a **specific day** — what you **did** or what you **plan to do** on that date, with exercises, sets, reps, weight. Example: “March 3 — leg day with these sets.”
- **Template:** A **saved blueprint** you reuse without retyping — example: “My push day” with a fixed list of exercises.

**MVP includes both:** users can **create, edit, delete templates**; **create, edit, delete sessions**; and **start a new session from a template** (copy structure onto a chosen date, then edit as needed). Exact UX (e.g. duplicate vs wizard) is defined at implementation time **after** any open questions are resolved with the product owner.

---

## Core capability areas

### 1. Accounts and security

- **Register** and **login** (email + password).
- **Separate data per user** (only two accounts expected, but data must still be isolated).
- **Logout** and protected routes (client + server).
- **Session identity** via JWT (or equivalent) for API calls.

---

### 2. Workouts

- **Sessions:** **Create, view, edit, delete** workout sessions tied to the logged-in user; **structured content** (name/date, **exercises**, **sets**, **reps**, optional **weight**).
- **Workout Planner list UI:** include a **single-week view** (`Week of ...`) with week navigation; show only one week at a time with that week's planned workouts.
- **Templates:** **Create, view, edit, delete** reusable workout templates (same structure as a session minus a fixed “performed on” date, or equivalent model agreed at implementation).
- **From template → session:** Flow to instantiate a session from a template on a chosen date.
- **List and detail** views aligned with `design-proposal/` where practical.

---

### 3. Profile and goals (metabolism / calories foundation)

- **Physical and goal inputs:** e.g. height, weight, activity level, goal (maintain / cut / bulk).
- **Derived or stored target calories** (TDEE / daily calorie target) for nutrition and dashboard.
- **Persisted profile** across sessions.

---

### 4. Nutrition and daily eating (MVP)

- **Daily calorie target** (from profile) vs **logged intake**.
- **Manual** logging: date, calories, optional meal label/note, and optional macro grams (**protein/carbs/fat**).
- **Edit existing entries** for all fields (date, calories, macros, meal label, note), plus delete.
- **Nutrition search** via `USDA + Open Food Facts` behind one backend endpoint, returning normalized per-100g values (calories/protein/carbs/fat).
- **Prefill flow:** selecting a search result pre-fills add-entry form values, then user edits before saving.
- **Unified “Log food” UX:** one logging area with two modes — **Quick log** (simple item) and **Build a meal** (ingredient-based meal with totals).
- **Meal builder model:** one meal record contains `ingredients[]` with grams + per-100g nutrition, and the server computes rollup totals for the meal.
- **Provider resilience:** short provider timeout, fallback to partial results when one source fails, and lightweight in-memory cache for repeated searches.
- **Attribution visible** in Nutrition UI for source transparency.
- **Totals** computed **server-side** where possible.

**Later (not MVP):** barcode scanning and richer food database improvements.

---

### 5. Calendar / time-based view

- **Workouts** (and optionally nutrition summaries) across **days or weeks**.
- **Week or month** navigation; data scoped to the logged-in user.

---

### 6. Progress (MVP)

- **Body measurements** over time (e.g. weight, waist — fields TBD in implementation).
- **Progress photos** (store references securely; follow good privacy practice for two-user app).
- **Lift PR history** (personal records tied to exercises or lifts).

---

### 7. AI coach (post-MVP)

- **Ask questions** and get guidance using **server-only** API keys.
- **Not part of the first full release** per current plan; add after core product is stable.

---

### 8. Platform and delivery

- **Web app** (React) + **REST API** (Express) + **MongoDB** (Atlas).
- **Production deploy:** API (e.g. Render), static client (e.g. Cloudflare Pages), Atlas.

---

### 9. Non-goals for MVP

- Public social feed, discovery, followers.
- Native iOS/Android apps (responsive web only).
- Payments or subscriptions.
- **Push or email notifications.**
- **Barcode / scanned nutrition** (planned later).
- **AI coach** (planned later).
- Offline-first sync (incidental browser cache only).

---

## Related documents

- `docs/DEVELOPMENT_PROTOCOL.md` — When to ask for clarification; avoid inaccurate assumptions.
- `docs/PLAN.md` — MERN concepts and original phase outline.
- `docs/IMPLEMENTATION_STAGES.md` — staged build order and verification gates.
- `design-proposal/` — HTML prototypes for layout and flows.
