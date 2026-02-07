import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { db } from "../config/supabase.js";

const router = Router();

// 🔹 Create audit log entry (admin only)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { booking_id, action } = req.body;
    const admin_id = req.user.id;

    if (!booking_id || !action) {
      return res.status(400).json({ error: "booking_id and action are required" });
    }

    const { data, error } = await db
      .from("audit_logs")
      .insert([
        {
          booking_id,
          admin_id,
          action
        }
      ])
      .select();

    if (error) return res.status(400).json({ error: error.message });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🔹 Get all audit logs (admin only)
router.get("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    // First, fetch all audit logs with basic fields
    const { data: auditLogs, error: auditError } = await db
      .from("audit_logs")
      .select("id, booking_id, admin_id, action, created_at")
      .order("created_at", { ascending: false });

    if (auditError) return res.status(400).json({ error: auditError.message });

    if (!auditLogs || auditLogs.length === 0) {
      return res.json({ items: [], count: 0 });
    }

    // Get unique booking IDs and admin IDs
    const bookingIds = [...new Set(auditLogs.map(log => log.booking_id).filter(Boolean))];
    const adminIds = [...new Set(auditLogs.map(log => log.admin_id).filter(Boolean))];

    // Fetch booking details
    let bookingsMap = {};
    if (bookingIds.length > 0) {
      const { data: bookings } = await db
        .from("bookings")
        .select("id, booking_id, event_name, user_id")
        .in("id", bookingIds);
      
      if (bookings) {
        bookingsMap = Object.fromEntries(bookings.map(b => [b.id, b]));
      }
    }

    // Fetch admin user details
    let adminsMap = {};
    if (adminIds.length > 0) {
      const { data: admins } = await db
        .from("users")
        .select("user_id, full_name, email")
        .in("user_id", adminIds);
      
      if (admins) {
        adminsMap = Object.fromEntries(admins.map(a => [a.user_id, a]));
      }
    }

    // Fetch booker details
    const bookerIds = [...new Set(Object.values(bookingsMap).map(b => b.user_id).filter(Boolean))];
    let bookersMap = {};
    if (bookerIds.length > 0) {
      const { data: bookers } = await db
        .from("users")
        .select("user_id, email")
        .in("user_id", bookerIds);
      
      if (bookers) {
        bookersMap = Object.fromEntries(bookers.map(b => [b.user_id, b]));
      }
    }

    // Enrich audit logs with related data
    const enrichedLogs = auditLogs.map(log => {
      const booking = bookingsMap[log.booking_id];
      const admin = adminsMap[log.admin_id];
      const booker = booking ? bookersMap[booking.user_id] : null;

      return {
        id: log.id,
        booking_id: booking?.booking_id || log.booking_id,
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
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
