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

function parseOptionalMacro(value, fieldName, res) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000) {
    res.status(400).json({ error: `${fieldName} must be a number from 0 to 1000` });
    return null;
  }
  return n;
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
 * POST /api/food-logs — { date, calories, proteinG?, carbsG?, fatG?, mealLabel?, note? }
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

    const proteinG = parseOptionalMacro(body?.proteinG, "proteinG", res);
    if (proteinG === null) return;
    const carbsG = parseOptionalMacro(body?.carbsG, "carbsG", res);
    if (carbsG === null) return;
    const fatG = parseOptionalMacro(body?.fatG, "fatG", res);
    if (fatG === null) return;

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
      proteinG,
      carbsG,
      fatG,
      mealLabel,
      note,
    });

    res.status(201).json(serializeFoodLog(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/food-logs/:id — partial update for date/calories/macros/mealLabel/note
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Expected JSON body" });
      return;
    }

    const doc = await FoodLog.findOne({ _id: id, userId: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "Entry not found" });
      return;
    }

    if ("date" in body) {
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
      doc.date = normalizedDate;
    }

    if ("calories" in body) {
      const calRaw = body?.calories;
      const calories = typeof calRaw === "number" ? calRaw : Number(calRaw);
      if (!Number.isFinite(calories) || calories < 1 || calories > 50000) {
        res
          .status(400)
          .json({ error: "calories must be a number from 1 to 50000" });
        return;
      }
      doc.calories = Math.round(calories);
    }

    if ("proteinG" in body) {
      const proteinG = parseOptionalMacro(body?.proteinG, "proteinG", res);
      if (proteinG === null) return;
      doc.proteinG = proteinG;
    }
    if ("carbsG" in body) {
      const carbsG = parseOptionalMacro(body?.carbsG, "carbsG", res);
      if (carbsG === null) return;
      doc.carbsG = carbsG;
    }
    if ("fatG" in body) {
      const fatG = parseOptionalMacro(body?.fatG, "fatG", res);
      if (fatG === null) return;
      doc.fatG = fatG;
    }

    if ("mealLabel" in body) {
      if (body?.mealLabel == null || body.mealLabel === "") {
        doc.mealLabel = undefined;
      } else if (typeof body.mealLabel !== "string") {
        res.status(400).json({ error: "mealLabel must be a string" });
        return;
      } else {
        doc.mealLabel = body.mealLabel.trim().slice(0, 80) || undefined;
      }
    }

    if ("note" in body) {
      if (body?.note == null || body.note === "") {
        doc.note = undefined;
      } else if (typeof body.note !== "string") {
        res.status(400).json({ error: "note must be a string" });
        return;
      } else {
        doc.note = body.note.trim().slice(0, 500) || undefined;
      }
    }

    await doc.save();
    res.json(serializeFoodLog(doc.toObject()));
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
