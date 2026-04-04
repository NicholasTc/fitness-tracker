import { Router } from "express";
import mongoose from "mongoose";
import Workout from "../models/Workout.js";
import WorkoutTemplate from "../models/WorkoutTemplate.js";
import { requireAuth } from "../middleware/auth.js";
import {
  normalizeExercises,
  parseDateInput,
} from "../utils/workoutPayload.js";
import { serializeWorkout } from "../utils/serializeWorkout.js";

const router = Router();

router.use(requireAuth);

/**
 * POST /api/workouts/from-template — body: { templateId, date }
 * Must be registered before /:id routes.
 */
router.post("/from-template", async (req, res, next) => {
  try {
    const templateId = req.body?.templateId;
    const dateRaw = req.body?.date;
    if (!templateId || typeof templateId !== "string") {
      res.status(400).json({ error: "templateId is required" });
      return;
    }
    const date = parseDateInput(dateRaw);
    if (!date) {
      res.status(400).json({ error: "date is required (ISO or YYYY-MM-DD)" });
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(templateId)) {
      res.status(400).json({ error: "Invalid templateId" });
      return;
    }

    const template = await WorkoutTemplate.findOne({
      _id: templateId,
      userId: req.user.id,
    }).lean();

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    const exercises = (template.exercises || []).map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      weightKg: e.weightKg,
    }));

    const doc = await Workout.create({
      userId: req.user.id,
      name: template.name,
      date,
      exercises,
    });

    res.status(201).json(serializeWorkout(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workouts
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await Workout.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(rows.map(serializeWorkout));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workouts — { name, date, exercises? }
 */
router.post("/", async (req, res, next) => {
  try {
    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const date = parseDateInput(req.body?.date);
    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const exNorm = normalizeExercises(req.body?.exercises);
    if (!exNorm.ok) {
      res.status(400).json({ error: exNorm.error });
      return;
    }

    const doc = await Workout.create({
      userId: req.user.id,
      name: name.trim(),
      date,
      exercises: exNorm.exercises,
    });
    res.status(201).json(serializeWorkout(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workouts/:id
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const row = await Workout.findOne({
      _id: id,
      userId: req.user.id,
    }).lean();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeWorkout(row));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/workouts/:id
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await Workout.findOne({ _id: id, userId: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body;
    if (body.name != null) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        res.status(400).json({ error: "name must be a non-empty string" });
        return;
      }
      doc.name = body.name.trim();
    }
    if (body.date != null) {
      const d = parseDateInput(body.date);
      if (!d) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }
      doc.date = d;
    }
    if (body.exercises !== undefined) {
      const exNorm = normalizeExercises(body.exercises);
      if (!exNorm.ok) {
        res.status(400).json({ error: exNorm.error });
        return;
      }
      doc.exercises = exNorm.exercises;
    }

    await doc.save();
    res.json(serializeWorkout(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/workouts/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await Workout.deleteOne({ _id: id, userId: req.user.id });
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
