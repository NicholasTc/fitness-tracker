function ymd(d) {
  if (!d) return null;
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  return x.toISOString().slice(0, 10);
}

export function serializeFoodLog(row) {
  const o = row.toObject ? row.toObject() : row;
  return {
    id: o._id.toString(),
    date: ymd(o.date),
    calories: o.calories,
    proteinG: o.proteinG ?? null,
    carbsG: o.carbsG ?? null,
    fatG: o.fatG ?? null,
    mealLabel: o.mealLabel || null,
    note: o.note || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

/**
 * @param {Array<{ date: Date, calories: number }>} entries
 * @returns {{ rangeTotalCalories: number, byDay: Array<{ date: string, calories: number }> }}
 */
export function computeTotalsFromEntries(entries) {
  const byDayMap = new Map();
  let rangeTotalCalories = 0;
  for (const e of entries) {
    const c = Number(e.calories);
    if (!Number.isFinite(c)) continue;
    rangeTotalCalories += c;
    const key = ymd(e.date);
    if (!key) continue;
    byDayMap.set(key, (byDayMap.get(key) || 0) + c);
  }
  const byDay = [...byDayMap.entries()]
    .map(([date, calories]) => ({ date, calories }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { rangeTotalCalories, byDay };
}
