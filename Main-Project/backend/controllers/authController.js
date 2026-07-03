import crypto from "crypto";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export const authController = {
  /**
   * Admin Login endpoint. Validates password and generates JWT.
   */
  async login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!supabase) {
      return res.status(500).json({ error: "Supabase integration not configured." });
    }

    try {
      const cleanEmail = email.toLowerCase().trim();

      // Fetch user account
      const { data: user, error } = await supabase
        .from("admin_accounts")
        .select("*")
        .eq("email", cleanEmail)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("[AuthController] Database error:", error);
        return res.status(500).json({ error: "Database error during login." });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid admin email or inactive account." });
      }

      // Verify SHA-256 password hash using salt
      const computedHash = sha256(user.password_salt + password);
      if (computedHash !== user.password_hash) {
        return res.status(401).json({ error: "Incorrect password." });
      }

      // Generate JWT payload
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      };

      // Sign token (expires in 12 hours)
      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "12h" });

      console.log(`[AuthController] Admin '${user.name}' logged in successfully.`);

      return res.status(200).json({
        token,
        user: payload
      });
    } catch (err) {
      console.error("[AuthController] Login exception:", err);
      return res.status(500).json({ error: "An unexpected error occurred during login." });
    }
  }
};
