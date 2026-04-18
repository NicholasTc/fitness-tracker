import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    userAgent: {
      type: String,
      maxlength: 300,
    },
    ip: {
      type: String,
      maxlength: 120,
    },
  },
  { timestamps: true },
);

export default mongoose.model("UserSession", userSessionSchema);
