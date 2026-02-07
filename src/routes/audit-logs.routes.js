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
    const { data, error } = await db
      .from("audit_logs")
      .select(`
        id,
        booking_id,
        admin_id,
        action,
        created_at,
        bookings!inner (
          booking_id,
          event_name,
          user_id
        ),
        users!admin_id (
          full_name,
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    // Fetch user emails for bookers
    const bookingUserIds = [...new Set(data.map(log => log.bookings?.user_id).filter(Boolean))];
    let bookerEmails = {};
    
    if (bookingUserIds.length > 0) {
      const { data: usersData, error: usersError } = await db
        .from("users")
        .select("user_id, email")
        .in("user_id", bookingUserIds);
      
      if (!usersError && usersData) {
        bookerEmails = Object.fromEntries(usersData.map(u => [u.user_id, u.email]));
      }
    }

    // Enrich data with booker emails
    const enrichedData = data.map(log => ({
      ...log,
      booker_email: bookerEmails[log.bookings?.user_id] || "Unknown"
    }));

    res.json({ items: enrichedData, count: enrichedData.length });
  } catch (err) {
    console.error("Audit logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
