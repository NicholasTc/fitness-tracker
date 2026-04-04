import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import ProgressPhoto from "../models/ProgressPhoto.js";
import { requireAuth } from "../middleware/auth.js";
import { parseDateInput } from "../utils/workoutPayload.js";
import { normalizeUtcDay } from "../utils/dateRange.js";
import { serializeProgressPhotoMeta } from "../utils/serializeProgress.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed"));
    }
  },
});

function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (err) next(err);
    else next();
  });
}

router.use(requireAuth);

/**
 * GET /api/progress-photos — metadata only (no image bytes)
 */
router.get("/", async (req, res, next) => {
  try {
    const rows = await ProgressPhoto.find({ userId: req.user.id })
      .select("-image")
      .sort({ dateTaken: -1 })
      .limit(200)
      .lean();
    res.json(rows.map((r) => serializeProgressPhotoMeta(r)));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/progress-photos — multipart: file, date (YYYY-MM-DD), caption (optional)
 */
router.post("/", uploadSingle, async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ error: "file is required (image upload)" });
      return;
    }

    const date = parseDateInput(req.body?.date);
    if (!date) {
      res.status(400).json({ error: "date is required" });
      return;
    }
    const dateTaken = normalizeUtcDay(date);
    if (!dateTaken) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }

    let caption;
    if (req.body?.caption != null && req.body.caption !== "") {
      if (typeof req.body.caption !== "string") {
        res.status(400).json({ error: "caption must be a string" });
        return;
      }
      caption = req.body.caption.trim().slice(0, 300) || undefined;
    }

    const doc = await ProgressPhoto.create({
      userId: req.user.id,
      dateTaken,
      caption,
      contentType: req.file.mimetype,
      image: req.file.buffer,
    });

    const lean = doc.toObject();
    delete lean.image;
    res.status(201).json(serializeProgressPhotoMeta(lean));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/progress-photos/:id/file — raw image (requires same auth as API)
 */
router.get("/:id/file", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const row = await ProgressPhoto.findOne({
      _id: id,
      userId: req.user.id,
    }).lean();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.setHeader("Content-Type", row.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(row.image);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/progress-photos/:id
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const result = await ProgressPhoto.deleteOne({
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
