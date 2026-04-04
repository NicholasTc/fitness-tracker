import { Router } from "express";
import mongoose from "mongoose";
import PersonalRecord from "../models/PersonalRecord.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDateInput } from "../utils/workoutPayload.js";
import { serializePersonalRecord } from "../utils/serializeProgress.js";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/personal-records — optional ?exercise= substring match (case-insensitive)
 */
router.get("/", async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    const ex = req.query.exercise;
    if (typeof ex === "string" && ex.trim()) {
      filter.exerciseName = new RegExp(
        ex.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
    }

    const rows = await PersonalRecord.find(filter)
      .sort({ achievedAt: -1 })
      .limit(500)
      .lean();
    res.json(rows.map(serializePersonalRecord));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/personal-records
 */
router.post("/", async (req, res, next) => {
  try {
    const exerciseName =
      typeof req.body?.exerciseName === "string"
        ? req.body.exerciseName.trim()
        : "";
    if (!exerciseName) {
      res.status(400).json({ error: "exerciseName is required" });
      return;
    }

    const weightKg = Number(req.body?.weightKg);
    const reps = Number(req.body?.reps ?? 1);
    if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 1000) {
      res.status(400).json({ error: "weightKg must be between 0 and 1000" });
      return;
    }
    if (!Number.isFinite(reps) || reps < 1 || reps > 200) {
      res.status(400).json({ error: "reps must be between 1 and 200" });
      return;
    }

    const achievedAt = parseDateInput(req.body?.achievedAt);
    if (!achievedAt) {
      res.status(400).json({ error: "achievedAt is required" });
      return;
    }

    let notes;
    if (req.body?.notes != null && req.body.notes !== "") {
      if (typeof req.body.notes !== "string") {
        res.status(400).json({ error: "notes must be a string" });
        return;
      }
      notes = req.body.notes.trim().slice(0, 500) || undefined;
    }

    const doc = await PersonalRecord.create({
      userId: req.user.id,
      exerciseName: exerciseName.slice(0, 120),
      weightKg,
      reps: Math.round(reps),
      achievedAt,
      notes,
    });

    res.status(201).json(serializePersonalRecord(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/personal-records/:id
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const doc = await PersonalRecord.findOne({ _id: id, userId: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body || {};

    if (body.exerciseName != null) {
      if (typeof body.exerciseName !== "string" || !body.exerciseName.trim()) {
        res.status(400).json({ error: "exerciseName must be non-empty" });
        return;
      }
      doc.exerciseName = body.exerciseName.trim().slice(0, 120);
    }
    if (body.weightKg != null) {
      const w = Number(body.weightKg);
      if (!Number.isFinite(w) || w < 0 || w > 1000) {
        res.status(400).json({ error: "Invalid weightKg" });
        return;
      }
      doc.weightKg = w;
    }
    if (body.reps != null) {
      const r = Number(body.reps);
      if (!Number.isFinite(r) || r < 1 || r > 200) {
        res.status(400).json({ error: "Invalid reps" });
        return;
      }
      doc.reps = Math.round(r);
    }
    if (body.achievedAt != null) {
      const d = parseDateInput(body.achievedAt);
      if (!d) {
        res.status(400).json({ error: "Invalid achievedAt" });
        return;
      }
      doc.achievedAt = d;
    }
    if ("notes" in body) {
      doc.notes =
        typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : undefined;
    }

    await doc.save();
    res.json(serializePersonalRecord(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/personal-records/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await PersonalRecord.deleteOne({
      _id: id,
      userId: req.user.id,
    });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
