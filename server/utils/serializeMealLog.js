function round1(n) {
  return Math.round(n * 10) / 10;
}

function ymd(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

function asNumberOrZero(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

export function computeIngredientLine(ingredient) {
  const grams = asNumberOrZero(ingredient.grams);
  const factor = grams / 100;
  const calories = round1(asNumberOrZero(ingredient.caloriesPer100g) * factor);
  const proteinG = round1(asNumberOrZero(ingredient.proteinPer100g) * factor);
  const carbsG = round1(asNumberOrZero(ingredient.carbsPer100g) * factor);
  const fatG = round1(asNumberOrZero(ingredient.fatPer100g) * factor);
  return { calories, proteinG, carbsG, fatG };
}

export function computeMealTotals(ingredients) {
  const out = { totalCalories: 0, totalProteinG: 0, totalCarbsG: 0, totalFatG: 0 };
  for (const one of Array.isArray(ingredients) ? ingredients : []) {
    const line = computeIngredientLine(one);
    out.totalCalories += line.calories;
    out.totalProteinG += line.proteinG;
    out.totalCarbsG += line.carbsG;
    out.totalFatG += line.fatG;
  }
  out.totalCalories = round1(out.totalCalories);
  out.totalProteinG = round1(out.totalProteinG);
  out.totalCarbsG = round1(out.totalCarbsG);
  out.totalFatG = round1(out.totalFatG);
  return out;
}

export function serializeMealLog(doc) {
  const raw = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const ingredients = Array.isArray(raw.ingredients)
    ? raw.ingredients.map((item) => ({
        name: item.name,
        grams: item.grams,
        caloriesPer100g: item.caloriesPer100g,
        proteinPer100g: item.proteinPer100g ?? 0,
        carbsPer100g: item.carbsPer100g ?? 0,
        fatPer100g: item.fatPer100g ?? 0,
        source: item.source || "manual",
        externalId: item.externalId || null,
        lineTotals: computeIngredientLine(item),
      }))
    : [];
  const totals = computeMealTotals(ingredients);
  return {
    id: raw._id.toString(),
    date: ymd(raw.date),
    mealName: raw.mealName,
    note: raw.note || "",
    ingredients,
    totals: {
      calories: raw.totalCalories ?? totals.totalCalories,
      proteinG: raw.totalProteinG ?? totals.totalProteinG,
      carbsG: raw.totalCarbsG ?? totals.totalCarbsG,
      fatG: raw.totalFatG ?? totals.totalFatG,
    },
    createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : null,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
  };
}

export function computeMealRangeTotals(rows) {
  const out = { rangeTotalCalories: 0, byDay: {} };
  for (const row of rows || []) {
    const date = ymd(row.date);
    if (!date) continue;
    const calories = asNumberOrZero(row.totalCalories);
    out.rangeTotalCalories += calories;
    out.byDay[date] = round1((out.byDay[date] || 0) + calories);
  }
  out.rangeTotalCalories = round1(out.rangeTotalCalories);
  return out;
}
