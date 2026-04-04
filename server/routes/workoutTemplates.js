import { Router } from "express";
import mongoose from "mongoose";
import WorkoutTemplate from "../models/WorkoutTemplate.js";
import { requireAuth } from "../middleware/auth.js";
import { normalizeExercises } from "../utils/workoutPayload.js";
import { serializeTemplate } from "../utils/serializeWorkout.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const rows = await WorkoutTemplate.find({ userId: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(rows.map(serializeTemplate));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = req.body?.name;
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const exNorm = normalizeExercises(req.body?.exercises);
    if (!exNorm.ok) {
      res.status(400).json({ error: exNorm.error });
      return;
    }

    const doc = await WorkoutTemplate.create({
      userId: req.user.id,
      name: name.trim(),
      exercises: exNorm.exercises,
    });
    res.status(201).json(serializeTemplate(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const row = await WorkoutTemplate.findOne({
      _id: id,
      userId: req.user.id,
    }).lean();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(serializeTemplate(row));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const doc = await WorkoutTemplate.findOne({ _id: id, userId: req.user.id });
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
    if (body.exercises !== undefined) {
      const exNorm = normalizeExercises(body.exercises);
      if (!exNorm.ok) {
        res.status(400).json({ error: exNorm.error });
        return;
      }
      doc.exercises = exNorm.exercises;
    }

    await doc.save();
    res.json(serializeTemplate(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await WorkoutTemplate.deleteOne({
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
