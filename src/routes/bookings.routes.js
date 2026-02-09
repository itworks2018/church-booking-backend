import { Router } from "express";

import {
  createBooking,
  updateBookingStatus,
  getAllBookings,
} from "../controllers/bookings.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { db } from "../config/supabase.js";

const router = Router();

// Get all bookings (pending and approved) for all users
router.get("/all", requireAuth, getAllBookings);

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

    // Generate display booking_id from numeric id
    const itemsWithDisplayId = data.map(item => ({
      ...item,
      booking_id: `BK-${String(item.id).padStart(6, "0")}`
    }));

    res.json(itemsWithDisplayId);
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

// 🔹 Metric card: Pending approval bookings (count only)
router.get("/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending");

    if (error) return res.status(400).json({ error: error.message });

    res.json({ pendingCount: count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Full list: Pending bookings (for table with actions)
router.get("/pending/list", requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log("📋 Fetching pending bookings...");
    
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .eq("status", "Pending")
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("❌ Pending list query error:", error);
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      console.error("   Details:", error.details);
      console.error("   Hint:", error.hint);
      console.error("   Full Error Object:", JSON.stringify(error));
      return res.status(400).json({ error: error.message, details: error.details, code: error.code });
    }

    console.log(`✅ Found ${data?.length || 0} pending bookings`);

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First booking item structure:", JSON.stringify(data[0]));
      console.log("📋 Available keys in first item:", Object.keys(data[0]));
      console.log("🔍 Value of 'id' field:", data[0].id);
      console.log("🔍 Value of 'booking_id' field:", data[0].booking_id);
    }

    // Generate display booking_id (already UUID from database)
    const itemsWithDisplayId = data.map(item => {
      return {
        ...item,
        booking_id: item.booking_id || "unknown"
      };
    });

    res.json({ items: itemsWithDisplayId, pendingCount: data.length });
  } catch (err) {
    console.error("❌ Pending list fetch error:", err.message);
    console.error("   Stack:", err.stack);
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Metric card: Upcoming events (Approved only)
router.get("/upcoming", requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { count, error } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "Approved")
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
    console.log("📅 Fetching upcoming bookings from:", now);
    
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .in("status", ["Approved", "Pending"])
      .gte("start_datetime", now)
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("❌ Calendar query error:", error);
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      console.error("   Details:", error.details);
      console.error("   Hint:", error.hint);
      console.error("   Query attempted: status IN ['Approved', 'Pending']");
      console.error("   Full Error Object:", JSON.stringify(error));
      return res.status(400).json({ error: error.message, details: error.details, code: error.code });
    }

    console.log(`✅ Found ${data?.length || 0} upcoming bookings`);

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First upcoming booking structure:", JSON.stringify(data[0]));
      console.log("📋 Available keys in first item:", Object.keys(data[0]));
      console.log("🔍 Value of 'id' field:", data[0].id);
      console.log("🔍 Value of 'booking_id' field:", data[0].booking_id);
    }

    const itemsWithDisplayId = data.map(item => {
      return {
        ...item,
        booking_id: item.booking_id || "unknown"
      };
    });

    res.json({ items: itemsWithDisplayId, upcomingCount: data.length });
  } catch (err) {
    console.error("❌ Calendar fetch error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/// 🔹 Full list: Approved + Rejected bookings (for Manage Events page)
router.get("/approved/list", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .in("status", ["Approved", "Rejected"])
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("❌ Approved/Rejected list query error:", error);
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      console.error("   Details:", error.details);
      console.error("   Hint:", error.hint);
      console.error("   Query attempted: status IN ['Approved', 'Rejected']");
      console.error("   Full Error Object:", JSON.stringify(error));
      return res.status(400).json({ error: error.message, details: error.details, code: error.code });
    }

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First approved/rejected booking structure:", JSON.stringify(data[0]));
      console.log("📋 Available keys in first item:", Object.keys(data[0]));
      console.log("🔍 Value of 'id' field:", data[0].id);
      console.log("🔍 Value of 'booking_id' field:", data[0].booking_id);
    }

    const itemsWithDisplayId = data.map(item => {
      return {
        ...item,
        booking_id: item.booking_id || "unknown"
      };
    });

    res.json({ items: itemsWithDisplayId, count: data.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Update booking details (admin only)
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    // booking_id is UUID from database, use directly
    const bookingId = req.params.id;

    const { data, error } = await db
      .from("bookings")
      .update({
        event_name: req.body.event_name,
        purpose: req.body.purpose,
        attendees: req.body.attendees,
        venue: req.body.venue,
        start_datetime: req.body.start_datetime,
        end_datetime: req.body.end_datetime,
        additional_needs: req.body.additional_needs,
        status: req.body.status
      })
      .eq("booking_id", bookingId)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    const responseData = {
      ...data,
      booking_id: data.booking_id || bookingId
    };
    res.json({ updated: responseData });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Delete booking (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    // booking_id is UUID from database, use directly
    const bookingId = req.params.id;

    const { error } = await db
      .from("bookings")
      .delete()
      .eq("booking_id", bookingId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: `Booking ${req.params.id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;