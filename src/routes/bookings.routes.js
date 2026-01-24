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
      .eq("user_id", req.user.id)
      .order("start_datetime", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Metric card: Total bookings
router.get("/summary", requireAdmin, async (req, res) => {
  try {
    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ totalBookings: count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Metric card: Pending approval bookings
router.get("/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"); // adjust column name if different

    if (error) return res.status(400).json({ error: error.message });

    res.json({ pendingCount: count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Metric card: Upcoming events (future bookings)
router.get("/upcoming", requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .gte("start_datetime", now);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ upcomingCount: count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Full list: Upcoming approved bookings (for calendar)
router.get("/upcoming/list", requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await db
      .from("admin_bookings_view") // ✅ use the view you created
      .select("*")
      .eq("status", "approved")
      .gte("date", now)
      .order("date", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    res.json({ items: data, upcomingCount: data.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;