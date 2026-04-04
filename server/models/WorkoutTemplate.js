import mongoose from "mongoose";
import { exerciseSchema } from "./exerciseSchema.js";

const workoutTemplateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    exercises: { type: [exerciseSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("WorkoutTemplate", workoutTemplateSchema);
