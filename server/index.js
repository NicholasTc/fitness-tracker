import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import workoutsRouter from "./routes/workouts.js";

const PORT = process.env.PORT || 5050;
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

app.use(
  cors({
    origin: clientOrigin,
  }),
);

app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/workouts", workoutsRouter);

app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
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
