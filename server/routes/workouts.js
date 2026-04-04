import { Router } from "express";
import Workout from "../models/Workout.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/workouts — list workouts for the authenticated user.
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await Workout.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    const workouts = rows.map((row) => ({
      id: row._id.toString(),
      name: row.name,
      createdAt: row.createdAt,
    }));
    res.json(workouts);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workouts — create a workout with { name: string }
 */
router.post("/", async (req, res, next) => {
  try {
    const raw = req.body?.name;
    if (typeof raw !== "string" || !raw.trim()) {
      res.status(400).json({
        error: "name is required and must be a non-empty string",
      });
      return;
    }

    const doc = await Workout.create({
      userId: req.user.id,
      name: raw.trim(),
    });
    res.status(201).json({
      id: doc._id.toString(),
      name: doc.name,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
