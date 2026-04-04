/**
 * @returns {{ ok: true, exercises: object[] } | { ok: false, error: string }}
 */
export function normalizeExercises(raw) {
  if (raw === undefined) {
    return { ok: true, exercises: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "exercises must be an array" };
  }
  const out = [];
  for (const e of raw) {
    const one = normalizeExercise(e);
    if (!one) {
      return {
        ok: false,
        error:
          "Each exercise needs name (string), sets and reps (numbers), optional weightKg",
      };
    }
    out.push(one);
  }
  return { ok: true, exercises: out };
}

function normalizeExercise(e) {
  if (!e || typeof e !== "object") return null;
  const name = typeof e.name === "string" ? e.name.trim() : "";
  if (!name) return null;
  const sets = Number(e.sets);
  const reps = Number(e.reps);
  if (!Number.isFinite(sets) || sets < 1 || sets > 200) return null;
  if (!Number.isFinite(reps) || reps < 1 || reps > 2000) return null;
  const row = { name, sets, reps };
  if (e.weightKg != null && e.weightKg !== "") {
    const w = Number(e.weightKg);
    if (Number.isFinite(w) && w >= 0 && w <= 1000) row.weightKg = w;
  }
  return row;
}

export function parseDateInput(val) {
  if (val == null || val === "") return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
