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
      .select("id, event_name, purpose, attendees, venue, start_datetime, end_datetime, additional_needs, status, created_at, user_id")
      .eq("status", "Pending")
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("❌ Pending list query error:", error);
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      console.error("   Details:", error.details);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} pending bookings`);

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First booking item structure:", JSON.stringify(data[0]));
    }

    // Generate display booking_id from numeric id (with defensive check)
    const itemsWithDisplayId = data.map(item => {
      if (!item.id) {
        console.warn("⚠️  Item missing id field:", item);
      }
      return {
        ...item,
        booking_id: item.id ? `BK-${String(item.id).padStart(6, "0")}` : "BK-000000"
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
      .select("id, event_name, purpose, attendees, venue, start_datetime, end_datetime, additional_needs, status, created_at, user_id")
      .in("status", ["Approved", "Pending"])
      .gte("start_datetime", now)
      .order("start_datetime", { ascending: true });

    if (error) {
      console.error("❌ Calendar query error:", error);
      console.error("   Code:", error.code);
      console.error("   Message:", error.message);
      return res.status(400).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} upcoming bookings`);

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First upcoming booking structure:", JSON.stringify(data[0]));
    }

    const itemsWithDisplayId = data.map(item => {
      if (!item.id) {
        console.warn("⚠️  Item missing id field:", item);
      }
      return {
        ...item,
        booking_id: item.id ? `BK-${String(item.id).padStart(6, "0")}` : "BK-000000"
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
      .select("id, event_name, purpose, attendees, venue, start_datetime, end_datetime, additional_needs, status, created_at, user_id")
      .in("status", ["Approved", "Rejected"])
      .order("start_datetime", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // Debug: Log first item structure to identify missing fields
    if (data?.length > 0) {
      console.log("📊 First approved/rejected booking structure:", JSON.stringify(data[0]));
    }

    const itemsWithDisplayId = data.map(item => {
      if (!item.id) {
        console.warn("⚠️  Item missing id field:", item);
      }
      return {
        ...item,
        booking_id: item.id ? `BK-${String(item.id).padStart(6, "0")}` : "BK-000000"
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
    // Parse the id - if it starts with "BK-", extract the numeric part
    let bookingId = req.params.id;
    if (bookingId.startsWith("BK-")) {
      bookingId = parseInt(bookingId.replace("BK-", ""), 10);
    } else {
      bookingId = parseInt(bookingId, 10);
    }

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
      .eq("id", bookingId)
      .select("id, event_name, purpose, attendees, venue, start_datetime, end_datetime, additional_needs, status, created_at, user_id")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    const responseData = {
      ...data,
      booking_id: `BK-${String(data.id).padStart(6, "0")}`
    };
    res.json({ updated: responseData });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Delete booking (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Parse the id - if it starts with "BK-", extract the numeric part
    let bookingId = req.params.id;
    if (bookingId.startsWith("BK-")) {
      bookingId = parseInt(bookingId.replace("BK-", ""), 10);
    } else {
      bookingId = parseInt(bookingId, 10);
    }

    const { error } = await db
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (error) return res.status(400).json({ error: error.message });

    res.json({ message: `Booking ${req.params.id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;