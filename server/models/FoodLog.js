import mongoose from "mongoose";

const foodLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Calendar day (UTC midnight for the logged day). */
    date: { type: Date, required: true, index: true },
    calories: { type: Number, required: true, min: 1, max: 50000 },
    proteinG: { type: Number, min: 0, max: 1000 },
    carbsG: { type: Number, min: 0, max: 1000 },
    fatG: { type: Number, min: 0, max: 1000 },
    mealLabel: { type: String, maxlength: 80, trim: true },
    note: { type: String, maxlength: 500, trim: true },
  },
  { timestamps: true },
);

foodLogSchema.index({ userId: 1, date: 1 });

export default mongoose.model("FoodLog", foodLogSchema);
