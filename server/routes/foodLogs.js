import { Router } from "express";
import mongoose from "mongoose";
import FoodLog from "../models/FoodLog.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDateInput } from "../utils/workoutPayload.js";
import { normalizeUtcDay, parseInclusiveDateRange } from "../utils/dateRange.js";
import { effectiveDailyCalories } from "../utils/tdee.js";
import {
  computeTotalsFromEntries,
  serializeFoodLog,
} from "../utils/serializeFoodLog.js";

const router = Router();

router.use(requireAuth);

function getPlainProfile(userDoc) {
  const p = userDoc.profile;
  if (p == null) return {};
  if (typeof p.toObject === "function") return p.toObject();
  return { ...p };
}

/**
 * GET /api/food-logs?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
router.get("/", async (req, res, next) => {
  try {
    const range = parseInclusiveDateRange(req.query.start, req.query.end);
    if (!range.ok) {
      res.status(400).json({ error: range.error });
      return;
    }

    const { startYmd, endYmd, startBound, endBoundInclusive: endBound } = range;

    const rows = await FoodLog.find({
      userId: req.user.id,
      date: { $gte: startBound, $lte: endBound },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const entries = rows.map((r) => serializeFoodLog(r));
    const totals = computeTotalsFromEntries(rows);

    const user = await User.findById(req.user.id).lean();
    const effectiveTargetCalories = user
      ? effectiveDailyCalories(getPlainProfile(user))
      : null;

    res.json({
      start: startYmd,
      end: endYmd,
      entries,
      totals,
      effectiveTargetCalories,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/food-logs — { date, calories, mealLabel?, note? }
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

    const calRaw = body?.calories;
    const calories = typeof calRaw === "number" ? calRaw : Number(calRaw);
    if (!Number.isFinite(calories) || calories < 1 || calories > 50000) {
      res.status(400).json({ error: "calories must be a number from 1 to 50000" });
      return;
    }

    let mealLabel;
    if (body?.mealLabel != null && body.mealLabel !== "") {
      if (typeof body.mealLabel !== "string") {
        res.status(400).json({ error: "mealLabel must be a string" });
        return;
      }
      mealLabel = body.mealLabel.trim().slice(0, 80) || undefined;
    }

    let note;
    if (body?.note != null && body.note !== "") {
      if (typeof body.note !== "string") {
        res.status(400).json({ error: "note must be a string" });
        return;
      }
      note = body.note.trim().slice(0, 500) || undefined;
    }

    const doc = await FoodLog.create({
      userId: req.user.id,
      date: normalizedDate,
      calories: Math.round(calories),
      mealLabel,
      note,
    });

    res.status(201).json(serializeFoodLog(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/food-logs/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const deleted = await FoodLog.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!deleted) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
