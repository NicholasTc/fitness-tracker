import { Router } from "express";
import mongoose from "mongoose";
import Measurement from "../models/Measurement.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDateInput } from "../utils/workoutPayload.js";
import {
  normalizeUtcDay,
  parseInclusiveDateRange,
} from "../utils/dateRange.js";
import { serializeMeasurement } from "../utils/serializeProgress.js";

const router = Router();

router.use(requireAuth);

function hasAnyMetric(body) {
  return (
    body.weightKg != null ||
    body.waistCm != null ||
    body.bodyFatPct != null
  );
}

function parseOptionalMetric(val) {
  if (val === null || val === undefined || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

/**
 * GET /api/measurements — optional ?start=&end= (YYYY-MM-DD) or ?limit= (default 100)
 */
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(
      500,
      Math.max(1, parseInt(String(req.query.limit || "100"), 10) || 100),
    );

    if (req.query.start && req.query.end) {
      const range = parseInclusiveDateRange(req.query.start, req.query.end);
      if (!range.ok) {
        res.status(400).json({ error: range.error });
        return;
      }
      const { startBound, endBoundInclusive: endBound } = range;
      const rows = await Measurement.find({
        userId: req.user.id,
        date: { $gte: startBound, $lte: endBound },
      })
        .sort({ date: -1 })
        .lean();
      res.json(rows.map(serializeMeasurement));
      return;
    }

    const rows = await Measurement.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(limit)
      .lean();
    res.json(rows.map(serializeMeasurement));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/measurements
 */
router.post("/", async (req, res, next) => {
  try {
    const date = parseDateInput(req.body?.date);
    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const normalizedDate = normalizeUtcDay(date);
    if (!normalizedDate) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }

    const body = req.body || {};
    if (!hasAnyMetric(body)) {
      res.status(400).json({
        error: "Provide at least one of weightKg, waistCm, bodyFatPct",
      });
      return;
    }

    const weightKg = parseOptionalMetric(body.weightKg);
    const waistCm = parseOptionalMetric(body.waistCm);
    const bodyFatPct = parseOptionalMetric(body.bodyFatPct);
    if (
      (body.weightKg != null && body.weightKg !== "" && Number.isNaN(weightKg)) ||
      (body.waistCm != null && body.waistCm !== "" && Number.isNaN(waistCm)) ||
      (body.bodyFatPct != null &&
        body.bodyFatPct !== "" &&
        Number.isNaN(bodyFatPct))
    ) {
      res.status(400).json({ error: "Invalid numeric field" });
      return;
    }

    const doc = await Measurement.create({
      userId: req.user.id,
      date: normalizedDate,
      weightKg: weightKg !== undefined ? weightKg : undefined,
      waistCm: waistCm !== undefined ? waistCm : undefined,
      bodyFatPct: bodyFatPct !== undefined ? bodyFatPct : undefined,
      notes:
        typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined,
    });

    res.status(201).json(serializeMeasurement(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/measurements/:id
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const doc = await Measurement.findOne({ _id: id, userId: req.user.id });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body || {};

    if (body.date != null) {
      const d = parseDateInput(body.date);
      if (!d) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }
      const nd = normalizeUtcDay(d);
      if (!nd) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }
      doc.date = nd;
    }

    if ("weightKg" in body) {
      if (body.weightKg === null || body.weightKg === "") delete doc.weightKg;
      else {
        const n = parseOptionalMetric(body.weightKg);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: "Invalid weightKg" });
          return;
        }
        doc.weightKg = n;
      }
    }
    if ("waistCm" in body) {
      if (body.waistCm === null || body.waistCm === "") delete doc.waistCm;
      else {
        const n = parseOptionalMetric(body.waistCm);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: "Invalid waistCm" });
          return;
        }
        doc.waistCm = n;
      }
    }
    if ("bodyFatPct" in body) {
      if (body.bodyFatPct === null || body.bodyFatPct === "")
        delete doc.bodyFatPct;
      else {
        const n = parseOptionalMetric(body.bodyFatPct);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: "Invalid bodyFatPct" });
          return;
        }
        doc.bodyFatPct = n;
      }
    }
    if ("notes" in body) {
      doc.notes =
        typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined;
    }

    const merged = doc.toObject();
    if (
      merged.weightKg == null &&
      merged.waistCm == null &&
      merged.bodyFatPct == null
    ) {
      res.status(400).json({
        error: "At least one of weightKg, waistCm, bodyFatPct must be set",
      });
      return;
    }

    await doc.save();
    res.json(serializeMeasurement(doc.toObject()));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/measurements/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await Measurement.deleteOne({ _id: id, userId: req.user.id });
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
