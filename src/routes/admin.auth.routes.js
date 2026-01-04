import express from "express";
import { db, auth } from "../config/supabase.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Step 1: validate credentials with Supabase Auth
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: "Invalid credentials" });

    // Step 2: check if user exists in admins table
    const { data: adminData, error: adminError } = await db
      .from("admins")
      .select("*")
      .eq("email", email)
      .single();

    if (adminError || !adminData) {
      return res.status(403).json({ error: "Not authorized as admin" });
    }

    res.json({
      token: data.session.access_token,
      user: { email: adminData.email, role: "admin" }
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;