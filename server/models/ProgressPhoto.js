import mongoose from "mongoose";

const progressPhotoSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateTaken: { type: Date, required: true, index: true },
    caption: { type: String, maxlength: 300, trim: true },
    contentType: { type: String, default: "image/jpeg" },
    image: { type: Buffer, required: true },
  },
  { timestamps: true },
);

progressPhotoSchema.index({ userId: 1, dateTaken: -1 });

export default mongoose.model("ProgressPhoto", progressPhotoSchema);
