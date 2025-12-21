import { Router } from "express";
import {
  createBooking,
  updateBookingStatus,
} from "../controllers/bookings.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { db } from "../config/supabase.js";

const router = Router();

// Create booking
router.post("/", requireAuth, createBooking);

// Update booking status (admin only)
router.patch("/:id/status", requireAuth, requireAdmin, updateBookingStatus);

// ⭐ Get bookings for the logged‑in user
router.get("/my", requireAuth, async (req, res) => {
  try {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("user_id", req.user.sub)
      .order("start_datetime", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;