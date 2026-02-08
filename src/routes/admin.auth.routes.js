
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

    // Step 2: check if user exists in users table with admin role
    const { data: userData, error: userError } = await db
      .from("users")
      .select("user_id, email, full_name, role")
      .eq("user_id", data.user.id)
      .single();

    if (userError || !userData || userData.role !== "admin") {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    // Step 3: issue backend JWT for admin
    const payload = {
      id: data.user.id,  // Use the UUID from Supabase Auth
      email: userData.email,
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