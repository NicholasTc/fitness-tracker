import jwt from "jsonwebtoken";

/**
 * Requires `Authorization: Bearer <jwt>`. Sets `req.user = { id, email }`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }
    const payload = jwt.verify(token, secret);
    const id = payload.sub;
    const email = payload.email;
    if (typeof id !== "string" || typeof email !== "string") {
      res.status(401).json({ error: "Invalid token payload" });
      return;
    }
    req.user = { id, email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
