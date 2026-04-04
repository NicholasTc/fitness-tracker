import mongoose from "mongoose";

const measurementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    weightKg: { type: Number, min: 20, max: 400 },
    waistCm: { type: Number, min: 30, max: 300 },
    bodyFatPct: { type: Number, min: 3, max: 70 },
    notes: { type: String, maxlength: 1000, trim: true },
  },
  { timestamps: true },
);

measurementSchema.index({ userId: 1, date: -1 });

export default mongoose.model("Measurement", measurementSchema);
