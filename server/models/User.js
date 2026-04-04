import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    heightCm: { type: Number, min: 50, max: 260 },
    weightKg: { type: Number, min: 20, max: 400 },
    ageYears: { type: Number, min: 13, max: 120 },
    sex: { type: String, enum: ["male", "female", "other"] },
    activityLevel: {
      type: String,
      enum: ["sedentary", "light", "moderate", "active", "very_active"],
    },
    goal: { type: String, enum: ["cut", "maintain", "bulk"] },
    /** Manual override; if set, used as daily target instead of formula. */
    targetCalories: { type: Number, min: 800, max: 20000 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    profile: { type: profileSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
