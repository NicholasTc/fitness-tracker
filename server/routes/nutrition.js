import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { searchNutritionProviders } from "../utils/nutritionSearch.js";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/nutrition/search?q=chicken&limit=12
 */
router.get("/search", async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    if (query.length < 2) {
      res.status(400).json({ error: "q must be at least 2 characters" });
      return;
    }
    const payload = await searchNutritionProviders(query, req.query.limit);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

export default router;
