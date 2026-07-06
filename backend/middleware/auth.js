import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function authenticateAdmin(req, res, next) {
  // Option to bypass auth check in local testing if needed, but for production it is strict
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No authentication token provided." });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.adminUser = decoded; // { id, name, email, role }
    next();
  } catch (err) {
    console.error("[Auth Middleware] JWT verification failed:", err.message);
    return res.status(403).json({ error: "Access denied. Invalid or expired token." });
  }
}
