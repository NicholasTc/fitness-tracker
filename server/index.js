import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import calendarRouter from "./routes/calendar.js";
import foodLogsRouter from "./routes/foodLogs.js";
import mealLogsRouter from "./routes/mealLogs.js";
import aiMealRouter from "./routes/aiMeal.js";
import nutritionRouter from "./routes/nutrition.js";
import workoutTemplatesRouter from "./routes/workoutTemplates.js";
import measurementsRouter from "./routes/measurements.js";
import personalRecordsRouter from "./routes/personalRecords.js";
import progressPhotosRouter from "./routes/progressPhotos.js";
import workoutsRouter from "./routes/workouts.js";

const PORT = process.env.PORT || 5050;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../client/dist");

const app = express();

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/food-logs", foodLogsRouter);
app.use("/api/meal-logs", mealLogsRouter);
app.use("/api/ai", aiMealRouter);
app.use("/api/nutrition", nutritionRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/measurements", measurementsRouter);
app.use("/api/personal-records", personalRecordsRouter);
app.use("/api/progress-photos", progressPhotosRouter);
app.use("/api/workout-templates", workoutTemplatesRouter);
app.use("/api/workouts", workoutsRouter);

// Production SPA: Vite build in client/dist (same origin as API)
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.name === "MulterError") {
    const msg =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image too large (max 5MB)"
        : err.message;
    res.status(400).json({ error: msg });
    return;
  }
  if (
    typeof err.message === "string" &&
    err.message.includes("Only JPEG, PNG, WebP, or GIF")
  ) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

function listen() {
  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the other process, or set PORT in server/.env to a free port and set VITE_API_URL in client/.env to match.`,
      );
    }
    throw err;
  });
}

async function bootstrap() {
  if (!MONGODB_URI?.trim()) {
    console.error(
      "Missing MONGODB_URI. Copy server/.env.example to server/.env and set your MongoDB connection string (e.g. from MongoDB Atlas).",
    );
    process.exit(1);
  }

  if (!JWT_SECRET?.trim()) {
    console.error(
      "Missing JWT_SECRET. Copy server/.env.example to server/.env and set a long random string for signing tokens.",
    );
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  listen();
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
