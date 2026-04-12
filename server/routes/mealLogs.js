import { Router } from "express";
import mongoose from "mongoose";
import MealLog from "../models/MealLog.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDateInput } from "../utils/workoutPayload.js";
import { normalizeUtcDay, parseInclusiveDateRange } from "../utils/dateRange.js";
import {
  computeMealRangeTotals,
  computeMealTotals,
  serializeMealLog,
} from "../utils/serializeMealLog.js";

const router = Router();

router.use(requireAuth);

function parseOneIngredient(raw, res) {
  if (!raw || typeof raw !== "object") {
    res.status(400).json({ error: "Each ingredient must be an object" });
    return null;
  }
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Ingredient name is required" });
    return null;
  }
  if (name.length > 120) {
    res.status(400).json({ error: "Ingredient name is too long" });
    return null;
  }
  const grams = Number(raw.grams);
  if (!Number.isFinite(grams) || grams < 1 || grams > 5000) {
    res.status(400).json({ error: "Ingredient grams must be between 1 and 5000" });
    return null;
  }
  const caloriesPer100g = Number(raw.caloriesPer100g);
  if (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0 || caloriesPer100g > 5000) {
    res
      .status(400)
      .json({ error: "Ingredient caloriesPer100g must be between 0 and 5000" });
    return null;
  }

  const proteinPer100g =
    raw.proteinPer100g == null || raw.proteinPer100g === ""
      ? 0
      : Number(raw.proteinPer100g);
  const carbsPer100g =
    raw.carbsPer100g == null || raw.carbsPer100g === ""
      ? 0
      : Number(raw.carbsPer100g);
  const fatPer100g =
    raw.fatPer100g == null || raw.fatPer100g === "" ? 0 : Number(raw.fatPer100g);
  for (const [label, n] of [
    ["proteinPer100g", proteinPer100g],
    ["carbsPer100g", carbsPer100g],
    ["fatPer100g", fatPer100g],
  ]) {
    if (!Number.isFinite(n) || n < 0 || n > 1000) {
      res.status(400).json({ error: `${label} must be between 0 and 1000` });
      return null;
    }
  }
  const source = ["usda", "openfoodfacts", "manual"].includes(raw.source)
    ? raw.source
    : "manual";
  return {
    name,
    grams: Math.round(grams * 10) / 10,
    caloriesPer100g: Math.round(caloriesPer100g * 10) / 10,
    proteinPer100g: Math.round(proteinPer100g * 10) / 10,
    carbsPer100g: Math.round(carbsPer100g * 10) / 10,
    fatPer100g: Math.round(fatPer100g * 10) / 10,
    source,
    externalId:
      typeof raw.externalId === "string" && raw.externalId.trim()
        ? raw.externalId.trim().slice(0, 120)
        : undefined,
  };
}

/**
 * GET /api/meal-logs?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get("/", async (req, res, next) => {
  try {
    const range = parseInclusiveDateRange(req.query.start, req.query.end);
    if (!range.ok) {
      res.status(400).json({ error: range.error });
      return;
    }
    const { startYmd, endYmd, startBound, endBoundInclusive } = range;
    const rows = await MealLog.find({
      userId: req.user.id,
      date: { $gte: startBound, $lte: endBoundInclusive },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();
    const totals = computeMealRangeTotals(rows);
    res.json({
      start: startYmd,
      end: endYmd,
      entries: rows.map((row) => serializeMealLog(row)),
      totals,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/meal-logs
 */
router.post("/", async (req, res, next) => {
  try {
    const body = req.body;
    const date = parseDateInput(body?.date);
    if (!date) {
      res.status(400).json({ error: "date is required (ISO or YYYY-MM-DD)" });
      return;
    }
    const normalizedDate = normalizeUtcDay(date);
    if (!normalizedDate) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    const mealName = typeof body?.mealName === "string" ? body.mealName.trim() : "";
    if (!mealName) {
      res.status(400).json({ error: "mealName is required" });
      return;
    }
    if (mealName.length > 120) {
      res.status(400).json({ error: "mealName is too long" });
      return;
    }
    if (!Array.isArray(body?.ingredients) || body.ingredients.length < 1) {
      res.status(400).json({ error: "At least one ingredient is required" });
      return;
    }
    const ingredients = [];
    for (const raw of body.ingredients) {
      const one = parseOneIngredient(raw, res);
      if (!one) return;
      ingredients.push(one);
    }
    const totals = computeMealTotals(ingredients);
    const note =
      typeof body?.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : undefined;

    const doc = await MealLog.create({
      userId: req.user.id,
      date: normalizedDate,
      mealName,
      note,
      ingredients,
      totalCalories: totals.totalCalories,
      totalProteinG: totals.totalProteinG,
      totalCarbsG: totals.totalCarbsG,
      totalFatG: totals.totalFatG,
    });
    res.status(201).json(serializeMealLog(doc));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/meal-logs/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const deleted = await MealLog.findOneAndDelete({ _id: id, userId: req.user.id });
    if (!deleted) {
      res.status(404).json({ error: "Meal entry not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
