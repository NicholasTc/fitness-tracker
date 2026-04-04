import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { computeNutritionTargets, effectiveDailyCalories } from "../utils/tdee.js";

const router = Router();

const PROFILE_KEYS = [
  "heightCm",
  "weightKg",
  "ageYears",
  "sex",
  "activityLevel",
  "goal",
  "targetCalories",
];

function getPlainProfile(userDoc) {
  const p = userDoc.profile;
  if (p == null) return {};
  if (typeof p.toObject === "function") return p.toObject();
  return { ...p };
}

function buildProfileResponse(userDoc) {
  const profile = getPlainProfile(userDoc);
  const computed = computeNutritionTargets(profile);

  return {
    profile,
    computed,
    effectiveTargetCalories: effectiveDailyCalories(profile),
    theme: userDoc.theme ?? "default",
  };
}

function parseOptionalNumber(val) {
  if (val === null || val === undefined || val === "") return undefined;
  const n = typeof val === "number" ? val : Number(val);
  if (Number.isNaN(n)) return NaN;
  return n;
}

/**
 * GET /api/profile
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(buildProfileResponse(user));
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile — partial update. Send targetCalories: null to clear override.
 */
router.put("/", requireAuth, async (req, res, next) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Expected JSON body" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if ("theme" in body) {
      const t = body.theme;
      if (t !== "default" && t !== "roseLight") {
        res.status(400).json({ error: "theme must be default or roseLight" });
        return;
      }
      user.theme = t;
    }

    const nextProfile = { ...getPlainProfile(user) };

    for (const key of PROFILE_KEYS) {
      if (!(key in body)) continue;
      const raw = body[key];

      if (key === "targetCalories") {
        if (raw === null || raw === "") {
          delete nextProfile.targetCalories;
          continue;
        }
        const n = parseOptionalNumber(raw);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: "targetCalories must be a number" });
          return;
        }
        nextProfile.targetCalories = n;
        continue;
      }

      if (
        key === "heightCm" ||
        key === "weightKg" ||
        key === "ageYears"
      ) {
        if (raw === null || raw === "") {
          delete nextProfile[key];
          continue;
        }
        const n = parseOptionalNumber(raw);
        if (Number.isNaN(n)) {
          res.status(400).json({ error: `${key} must be a number` });
          return;
        }
        nextProfile[key] = n;
        continue;
      }

      if (raw === null || raw === "") {
        delete nextProfile[key];
        continue;
      }
      if (typeof raw !== "string") {
        res.status(400).json({ error: `${key} must be a string` });
        return;
      }
      nextProfile[key] = raw;
    }

    user.profile = nextProfile;
    await user.save();
    res.json(buildProfileResponse(user));
  } catch (err) {
    next(err);
  }
});

export default router;
