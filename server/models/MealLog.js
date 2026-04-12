import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    grams: { type: Number, required: true, min: 1, max: 5000 },
    caloriesPer100g: { type: Number, required: true, min: 0, max: 5000 },
    proteinPer100g: { type: Number, min: 0, max: 1000, default: 0 },
    carbsPer100g: { type: Number, min: 0, max: 1000, default: 0 },
    fatPer100g: { type: Number, min: 0, max: 1000, default: 0 },
    source: {
      type: String,
      enum: ["usda", "openfoodfacts", "manual"],
      default: "manual",
    },
    externalId: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false },
);

const mealLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Calendar day (UTC midnight for the logged day). */
    date: { type: Date, required: true, index: true },
    mealName: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 500 },
    ingredients: {
      type: [ingredientSchema],
      validate: [(arr) => Array.isArray(arr) && arr.length > 0, "At least 1 ingredient"],
    },
    totalCalories: { type: Number, required: true, min: 0, max: 50000 },
    totalProteinG: { type: Number, required: true, min: 0, max: 5000, default: 0 },
    totalCarbsG: { type: Number, required: true, min: 0, max: 5000, default: 0 },
    totalFatG: { type: Number, required: true, min: 0, max: 5000, default: 0 },
  },
  { timestamps: true },
);

mealLogSchema.index({ userId: 1, date: 1 });

export default mongoose.model("MealLog", mealLogSchema);
