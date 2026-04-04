import mongoose from "mongoose";

const personalRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    weightKg: { type: Number, required: true, min: 0, max: 1000 },
    reps: { type: Number, required: true, min: 1, max: 200 },
    achievedAt: { type: Date, required: true, index: true },
    notes: { type: String, maxlength: 500, trim: true },
  },
  { timestamps: true },
);

personalRecordSchema.index({ userId: 1, exerciseName: 1, achievedAt: -1 });

export default mongoose.model("PersonalRecord", personalRecordSchema);
