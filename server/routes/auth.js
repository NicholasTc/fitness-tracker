import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";

const router = Router();

const BCRYPT_ROUNDS = 10;
const PASSWORD_MIN = 8;
const ACCESS_TOKEN_TTL = "7d";
const REMEMBER_COOKIE = "fitflow_remember";
const REMEMBER_DAYS = 30;
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000;

function shouldRemember(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function makeSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function rememberCookieOptions(maxAgeMs = REMEMBER_MS) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeMs,
    path: "/",
  };
}

function clearRememberCookie(res) {
  res.clearCookie(REMEMBER_COOKIE, rememberCookieOptions(0));
}

function isAllowedOrigin(req) {
  const allowedOrigin = process.env.CLIENT_ORIGIN?.trim();
  if (!allowedOrigin) return true;
  const origin = req.get("origin");
  if (!origin) return true;
  return origin === allowedOrigin;
}

function requireAllowedOrigin(req, res) {
  if (isAllowedOrigin(req)) return true;
  res.status(403).json({ error: "Disallowed origin" });
  return false;
}

async function revokeRememberSessionByToken(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await UserSession.findOneAndUpdate(
    { tokenHash, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

async function createRememberSession(req, res, userId, expiresAtOverride) {
  const now = Date.now();
  const expiresAt = expiresAtOverride ?? new Date(now + REMEMBER_MS);
  const rawToken = makeSessionToken();
  const tokenHash = hashToken(rawToken);
  const maxAge = Math.max(0, expiresAt.getTime() - now);
  await UserSession.create({
    userId,
    tokenHash,
    expiresAt,
    lastUsedAt: new Date(),
    userAgent: req.get("user-agent")?.slice(0, 300),
    ip: req.ip ? String(req.ip).slice(0, 120) : undefined,
  });
  res.cookie(REMEMBER_COOKIE, rawToken, rememberCookieOptions(maxAge));
}

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
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

/**
 * POST /api/auth/register { email, password, firstName?, lastName?, rememberMe? }
 */
router.post("/register", async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    const firstNameRaw = req.body?.firstName;
    const lastNameRaw = req.body?.lastName;
    const rememberMe = shouldRemember(req.body?.rememberMe);

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
    const firstName =
      typeof firstNameRaw === "string"
        ? firstNameRaw.trim().slice(0, 80) || undefined
        : undefined;
    const lastName =
      typeof lastNameRaw === "string"
        ? lastNameRaw.trim().slice(0, 80) || undefined
        : undefined;

    const user = await User.create({ email, passwordHash, firstName, lastName });

    const token = signToken(user);
    if (rememberMe) {
      await revokeRememberSessionByToken(req.cookies?.[REMEMBER_COOKIE]);
      await createRememberSession(req, res, user._id);
    } else {
      await revokeRememberSessionByToken(req.cookies?.[REMEMBER_COOKIE]);
      clearRememberCookie(res);
    }
    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
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
 * POST /api/auth/login { email, password, rememberMe? }
 */
router.post("/login", async (req, res, next) => {
  try {
    const emailRaw = req.body?.email;
    const password = req.body?.password;
    const rememberMe = shouldRemember(req.body?.rememberMe);

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
    if (rememberMe) {
      await revokeRememberSessionByToken(req.cookies?.[REMEMBER_COOKIE]);
      await createRememberSession(req, res, user._id);
    } else {
      await revokeRememberSessionByToken(req.cookies?.[REMEMBER_COOKIE]);
      clearRememberCookie(res);
    }
    res.json({
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email,
        theme: user.theme ?? "default",
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", async (req, res, next) => {
  try {
    if (!requireAllowedOrigin(req, res)) return;
    const raw = req.cookies?.[REMEMBER_COOKIE];
    if (!raw) {
      res.status(401).json({ error: "Remember session not found" });
      return;
    }
    const tokenHash = hashToken(raw);
    const now = new Date();
    const session = await UserSession.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    });
    if (!session) {
      clearRememberCookie(res);
      res.status(401).json({ error: "Remember session expired or invalid" });
      return;
    }
    const user = await User.findById(session.userId);
    if (!user) {
      session.revokedAt = now;
      await session.save();
      clearRememberCookie(res);
      res.status(401).json({ error: "Remember session invalid" });
      return;
    }

    // Rotate remember token on refresh to reduce replay window.
    const nextRaw = makeSessionToken();
    session.tokenHash = hashToken(nextRaw);
    session.lastUsedAt = now;
    await session.save();

    res.cookie(
      REMEMBER_COOKIE,
      nextRaw,
      rememberCookieOptions(Math.max(0, session.expiresAt.getTime() - Date.now())),
    );
    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email,
        theme: user.theme ?? "default",
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", async (req, res, next) => {
  try {
    if (!requireAllowedOrigin(req, res)) return;
    await revokeRememberSessionByToken(req.cookies?.[REMEMBER_COOKIE]);
    clearRememberCookie(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
