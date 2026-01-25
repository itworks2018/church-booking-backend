import express from "express";
import { getMyProfile, updateMyProfile } from "../controllers/profile.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { db } from "../config/supabase.js";

const router = express.Router();

// 🔹 GET logged-in user's profile
router.get("/my", requireAuth, getMyProfile);

// 🔹 UPDATE logged-in user's profile
router.patch("/my", requireAuth, updateMyProfile);

// 🔹 ADMIN: Get all users
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await db
      .from("users")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
    res.json({ items: data });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 ADMIN: Update a user
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await db
      .from("users")
      .update({
        full_name: req.body.full_name,
        email: req.body.email,
        role: req.body.role
      })
      .eq("id", req.params.id)
      .select();

    if (error) return res.status(400).json({ error: error.message });
    res.json({ updated: data });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 ADMIN: Delete a user
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await db
      .from("users")
      .delete()
      .eq("id", req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ message: `User ${req.params.id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;