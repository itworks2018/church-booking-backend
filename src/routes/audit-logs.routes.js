import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// 🔹 Create audit log entry (admin only - middleware enforces admin check)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { booking_id, action } = req.body;
    const admin_id = req.user.id;

    if (!booking_id || !action) {
      return res.status(400).json({ error: "booking_id and action are required" });
    }

    // Validate action values (must match CHECK constraint)
    const allowedActions = ["Reviewed", "Approved", "Rejected"];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${allowedActions.join(", ")}` 
      });
    }

    // Import dynamically to get fresh db instance
    const { db } = await import("../config/supabase.js");

    // First, find the booking by booking_id to get the actual id (primary key)
    const { data: bookingData, error: bookingError } = await db
      .from("bookings")
      .select("id")
      .eq("booking_id", booking_id)
      .single();

    if (bookingError || !bookingData) {
      console.error("Booking lookup error:", bookingError);
      return res.status(400).json({ error: "Booking not found" });
    }

    // Insert the audit log (middleware already verified admin status)
    const { data, error } = await db
      .from("audit_logs")
      .insert([
        {
          booking_id: bookingData.id,  // Use the primary key
          admin_id,
          action
        }
      ])
      .select();

    if (error) {
      console.error("Audit log insert error:", error);
      return res.status(400).json({ error: error.message || "Failed to create audit log" });
    }

    console.log(`Audit log created: booking ${booking_id}, action ${action}, admin ${admin_id}`);
    res.status(201).json({ success: true, data, message: "Audit log created" });
  } catch (err) {
    console.error("Audit log creation error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// 🔹 Get all audit logs (admin only - middleware enforces admin check)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Import dynamically to get fresh db instance
    const { db } = await import("../config/supabase.js");

    // Fetch all audit logs with basic fields (middleware already verified admin status)
    const { data: auditLogs, error: auditError } = await db
      .from("audit_logs")
      .select("id, booking_id, admin_id, action, created_at")
      .order("created_at", { ascending: false });

    if (auditError) {
      console.error("Audit logs fetch error:", auditError);
      return res.status(400).json({ error: auditError.message });
    }

    if (!auditLogs || auditLogs.length === 0) {
      return res.json({ items: [], count: 0 });
    }

    // Get unique booking IDs and admin IDs (these are the primary keys from bookings table)
    const bookingPrimaryIds = [...new Set(auditLogs.map(log => log.booking_id).filter(Boolean))];
    const adminIds = [...new Set(auditLogs.map(log => log.admin_id).filter(Boolean))];

    // Fetch booking details by their primary ID
    let bookingsMap = {};
    if (bookingPrimaryIds.length > 0) {
      const { data: bookings, error: bookingsError } = await db
        .from("bookings")
        .select("id, booking_id, event_name, user_id")
        .in("id", bookingPrimaryIds);
      
      if (bookings) {
        bookingsMap = Object.fromEntries(bookings.map(b => [b.id, b]));
      }
      if (bookingsError) {
        console.error("Bookings fetch error:", bookingsError);
      }
    }

    // Fetch admin user details
    let adminsMap = {};
    if (adminIds.length > 0) {
      const { data: admins, error: adminsError } = await db
        .from("users")
        .select("user_id, full_name, email")
        .in("user_id", adminIds);
      
      if (admins) {
        adminsMap = Object.fromEntries(admins.map(a => [a.user_id, a]));
      }
      if (adminsError) {
        console.error("Admins fetch error:", adminsError);
      }
    }

    // Fetch booker details
    const bookerIds = [...new Set(Object.values(bookingsMap).map(b => b.user_id).filter(Boolean))];
    let bookersMap = {};
    if (bookerIds.length > 0) {
      const { data: bookers, error: bookersError } = await db
        .from("users")
        .select("user_id, email")
        .in("user_id", bookerIds);
      
      if (bookers) {
        bookersMap = Object.fromEntries(bookers.map(b => [b.user_id, b]));
      }
      if (bookersError) {
        console.error("Bookers fetch error:", bookersError);
      }
    }

    // Enrich audit logs with related data
    const enrichedLogs = auditLogs.map(log => {
      const booking = bookingsMap[log.booking_id];  // log.booking_id is the primary key
      const admin = adminsMap[log.admin_id];
      const booker = booking ? bookersMap[booking.user_id] : null;

      return {
        id: log.id,
        booking_id: booking?.booking_id || "N/A",  // Return the display booking_id
        event_name: booking?.event_name || "N/A",
        booker_email: booker?.email || "Unknown",
        action: log.action,
        admin_name: admin?.full_name || "N/A",
        admin_email: admin?.email || "N/A",
        created_at: log.created_at
      };
    });

    res.json({ items: enrichedLogs, count: enrichedLogs.length });
  } catch (err) {
    console.error("Audit logs error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

export default router;
