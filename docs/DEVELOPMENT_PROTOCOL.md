# Development protocol — clarification over assumption

This project’s requirements live in **`docs/FEATURES.md`**, **`docs/IMPLEMENTATION_STAGES.md`**, and **`design-proposal/`**. Anyone implementing features (including AI assistants) should follow this protocol so behavior stays accurate to what the product owner wants.

---

## Rule

**If something important is not specified, ask the product owner for clarification before implementing.** Do not guess user-visible behavior, data shapes, or business rules when the answer would materially affect the product.

---

## When to ask

Ask before coding when, for example:

- **Data model:** Two valid designs exist (e.g. separate `Template` vs `Workout` collections vs one collection with a `type` flag) and the docs do not pick one.
- **UX flow:** Multiple flows could work (“start from template” could open a blank session with copied exercises, or a dedicated wizard).
- **Fields:** Which measurement fields, PR rules, or photo storage approach (GridFS vs external bucket) are required.
- **Edge cases:** Delete template that was used for past sessions; edit template after sessions were created from it.
- **Security / privacy:** Anything touching file uploads, URLs, or cross-user access.
- **Scope:** A stage feels too large or overlaps another; splitting needs agreement.

---

## When not to stall

- **Small, reversible choices** that match existing code style (naming, file layout) are fine without a meeting.
- **Technical MERN mechanics** (Express middleware order, Mongoose index) follow normal best practices unless FEATURES says otherwise.

---

## After clarification

- Update **`docs/FEATURES.md`** (or this file) with the decision so the next session does not re-debate it.

---

## Product owner

Decisions are confirmed by the repository owner (you). If instructions conflict, **FEATURES.md** and explicit answers in chat win over informal guesses.
