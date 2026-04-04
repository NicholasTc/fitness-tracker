import { Router } from "express";
import Workout from "../models/Workout.js";
import FoodLog from "../models/FoodLog.js";
import { requireAuth } from "../middleware/auth.js";
import { parseInclusiveDateRange } from "../utils/dateRange.js";
import { computeTotalsFromEntries } from "../utils/serializeFoodLog.js";

const router = Router();

router.use(requireAuth);

function serializeWorkoutSummary(row) {
  const dateVal = row.date ?? row.createdAt;
  return {
    id: row._id.toString(),
    name: row.name,
    date: dateVal ? new Date(dateVal).toISOString() : null,
  };
}

/**
 * GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Workouts in range (session date, or createdAt for legacy) + food totals by day.
 */
router.get("/", async (req, res, next) => {
  try {
    const range = parseInclusiveDateRange(req.query.start, req.query.end);
    if (!range.ok) {
      res.status(400).json({ error: range.error });
      return;
    }

    const { startYmd, endYmd, startBound, endBoundInclusive, endExclusive } =
      range;

    const workoutRows = await Workout.find({
      userId: req.user.id,
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ["$date", "$createdAt"] }, startBound] },
          { $lt: [{ $ifNull: ["$date", "$createdAt"] }, endExclusive] },
        ],
      },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const workouts = workoutRows.map(serializeWorkoutSummary);

    const foodRows = await FoodLog.find({
      userId: req.user.id,
      date: { $gte: startBound, $lte: endBoundInclusive },
    }).lean();

    const nutritionByDay = computeTotalsFromEntries(foodRows).byDay;

    res.json({
      start: startYmd,
      end: endYmd,
      workouts,
      nutritionByDay,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
