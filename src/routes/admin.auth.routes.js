
import express from "express";
import { db, auth } from "../config/supabase.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const { JWT_SECRET } = process.env;

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: validate credentials with Supabase Auth
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: "Invalid credentials" });

    // Step 2a: Check if user exists in 'admins' table (primary source of truth for admins)
    const { data: adminData, error: adminError } = await db
      .from("admins")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    // Step 2b: Fallback - check 'users' table with admin role
    let isAdmin = false;

    if (adminError && adminError.code !== "PGRST116") {
      // If error is NOT "not found", it's a real error
      console.error("Admins table query error:", adminError);
      return res.status(500).json({ error: "Database error" });
    }

    if (adminData) {
      // User found in admins table
      isAdmin = true;
    } else {
      // Check users table as fallback
      const { data: userResult, error: userError } = await db
        .from("users")
        .select("user_id, email, full_name, role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (userResult && userResult.role && userResult.role.toLowerCase() === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      console.error(`Access denied - ${email} is not in admins table or admin users`);
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    // Step 3: issue backend JWT for admin
    const payload = {
      id: data.user.id,  // Use the UUID from Supabase Auth
      email: email,
      role: "admin"
    };
    const backendToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });

    res.json({
      token: backendToken,
      user: payload
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;