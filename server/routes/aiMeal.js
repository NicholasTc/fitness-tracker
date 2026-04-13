import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  generateMealIngredientDraft,
  generateMockMealIngredientDraft,
} from "../utils/aiMealDraft.js";
import { searchNutritionProviders } from "../utils/nutritionSearch.js";
import { computeMealTotals } from "../utils/serializeMealLog.js";

const router = Router();
router.use(requireAuth);

function selectValidatedNutrition(results) {
  const rows = Array.isArray(results) ? results : [];
  return (
    rows.find((r) => r?.per100g?.calories != null) ||
    rows.find((r) => r?.per100g?.proteinG != null || r?.per100g?.carbsG != null || r?.per100g?.fatG != null) ||
    null
  );
}

router.post("/meal-breakdown/draft", async (req, res, next) => {
  try {
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (text.length < 6) {
      res.status(400).json({ error: "Meal description must be at least 6 characters" });
      return;
    }
    if (text.length > 300) {
      res.status(400).json({ error: "Meal description is too long (max 300 chars)" });
      return;
    }

    let parsed;
    let parserMode = "gemini";
    try {
      parsed = await generateMealIngredientDraft(text);
    } catch (err) {
      parsed = generateMockMealIngredientDraft(text);
      parserMode = "mock_fallback";
      console.warn("AI draft fallback to mock parser:", err.message);
    }
    const ingredients = [];
    let unresolvedCount = 0;

    for (const draftIng of parsed.ingredients) {
      const providerPayload = await searchNutritionProviders(draftIng.name, 5);
      const picked = selectValidatedNutrition(providerPayload.results);
      if (!picked) {
        unresolvedCount += 1;
        ingredients.push({
          name: draftIng.name,
          grams: draftIng.grams,
          caloriesPer100g: 0,
          proteinPer100g: 0,
          carbsPer100g: 0,
          fatPer100g: 0,
          source: "manual",
          externalId: null,
          unresolved: true,
        });
        continue;
      }
      ingredients.push({
        name: picked.name || draftIng.name,
        grams: draftIng.grams,
        caloriesPer100g: picked.per100g?.calories ?? 0,
        proteinPer100g: picked.per100g?.proteinG ?? 0,
        carbsPer100g: picked.per100g?.carbsG ?? 0,
        fatPer100g: picked.per100g?.fatG ?? 0,
        source: picked.source || "manual",
        externalId: picked.externalId || null,
        unresolved: false,
      });
    }

    const totals = computeMealTotals(ingredients);
    res.json({
      draft: {
        mealName: parsed.mealName,
        mealLabel: parsed.mealLabel,
        ingredients,
        totals: {
          calories: totals.totalCalories,
          proteinG: totals.totalProteinG,
          carbsG: totals.totalCarbsG,
          fatG: totals.totalFatG,
        },
      },
      requiresReview: true,
      unresolvedCount,
      status: "draft",
      parserMode,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
