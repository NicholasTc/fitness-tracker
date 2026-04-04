import mongoose from "mongoose";

/** Shared by workout sessions and workout templates. */
export const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sets: { type: Number, required: true, min: 1, max: 200 },
    reps: { type: Number, required: true, min: 1, max: 2000 },
    weightKg: { type: Number, min: 0, max: 1000 },
  },
  { _id: true },
);
