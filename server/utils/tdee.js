/**
 * Mifflin–St Jeor BMR, activity multipliers, goal adjustment.
 * "other" sex uses average of male and female BMR for the same inputs.
 */

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

function bmrMifflinStJeor({ weightKg, heightCm, ageYears, sex }) {
  const w = weightKg;
  const h = heightCm;
  const a = ageYears;
  const male = 10 * w + 6.25 * h - 5 * a + 5;
  const female = 10 * w + 6.25 * h - 5 * a - 161;
  if (sex === "male") return male;
  if (sex === "female") return female;
  return (male + female) / 2;
}

/**
 * @param {object} profile — user.profile subdocument (may be incomplete)
 * @returns {{ bmr: number, tdee: number, recommendedCalories: number } | null}
 */
export function computeNutritionTargets(profile) {
  if (!profile || typeof profile !== "object") return null;
  const { heightCm, weightKg, ageYears, sex, activityLevel, goal } = profile;
  if (
    heightCm == null ||
    weightKg == null ||
    ageYears == null ||
    !sex ||
    !activityLevel ||
    !goal
  ) {
    return null;
  }
  const mult = ACTIVITY_MULTIPLIER[activityLevel];
  if (!mult) return null;

  const bmr = bmrMifflinStJeor({ weightKg, heightCm, ageYears, sex });
  const tdee = bmr * mult;
  let recommended = tdee;
  if (goal === "cut") recommended = tdee * 0.85;
  else if (goal === "bulk") recommended = tdee * 1.12;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    recommendedCalories: Math.round(recommended),
  };
}

/**
 * Daily calorie target: manual override from profile, else formula from computeNutritionTargets.
 */
export function effectiveDailyCalories(profile) {
  if (!profile || typeof profile !== "object") return null;
  if (profile.targetCalories != null) return profile.targetCalories;
  return computeNutritionTargets(profile)?.recommendedCalories ?? null;
}
