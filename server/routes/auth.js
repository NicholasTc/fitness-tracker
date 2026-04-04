import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = Router();

const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN = 8;

function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const s = value.trim().toLowerCase();
  if (s.length < 3 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    secret,
    { expiresIn: "7d" },
  );
}

/**
 * POST /api/auth/register { email, password }
 */
router.post("/register", async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;

    if (!isValidEmail(emailRaw)) {
      res.status(400).json({ error: "Invalid email" });
      return;
    }
    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
      res.status(400).json({
        error: `Password must be at least ${PASSWORD_MIN} characters`,
      });
      return;
    }

    const email = emailRaw.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, passwordHash });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        theme: user.theme ?? "default",
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    next(err);
  }
});

/**
 * POST /api/auth/login { email, password }
 */
router.post("/login", async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;

    if (!isValidEmail(emailRaw) || typeof password !== "string") {
      res.status(400).json({ error: "Invalid email or password" });
      return;
    }

    const email = emailRaw.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        theme: user.theme ?? "default",
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
