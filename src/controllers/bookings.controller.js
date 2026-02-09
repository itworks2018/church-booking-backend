// Fetch all bookings (pending and approved) for all users
export const getAllBookings = async (req, res) => {
  try {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .in("status", ["Pending", "Approved"])
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
};
import { db } from "../config/supabase.js";
import { sendMail } from "../utils/mailer.js";
import { renderEmailTemplate } from "../utils/renderEmailTemplate.js";
import { db as supabase } from "../config/supabase.js";

export const createBooking = async (req, res) => {
  try {
    const {
      event_name,
      purpose,
      attendees,
      venue,
      start_datetime,
      end_datetime,
      additional_needs
    } = req.body;

    // Validate required fields
    if (!event_name || !purpose || !attendees || !venue || !start_datetime || !end_datetime) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const start = new Date(start_datetime);
    const end = new Date(end_datetime);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (end <= start) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    // Check for overlapping approved bookings for the same venue
    const { data: conflicts, error: conflictError } = await db
      .from("bookings")
      .select("*")
      .eq("venue", venue)
      .eq("status", "Approved")
      .lt("start_datetime", end_datetime)
      .gt("end_datetime", start_datetime);

    if (conflictError) {
      console.error("❌ Conflict check error:", conflictError);
      return res.status(500).json({ error: conflictError.message });
    }
    
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: "This venue is already booked for the selected date and time. Please choose a different schedule or venue." });
    }

    const { data, error } = await db
      .from("bookings")
      .insert([
        {
          user_id: req.user.id,
          event_name,
          purpose,
          attendees,
          venue,
          start_datetime,
          end_datetime,
          additional_needs,
          status: "Pending"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Insert error:", error.message);
      return res.status(500).json({ error: error.message });
    }

    // Generate display booking ID from the numeric id
    const responseData = {
      ...data,
      booking_id: `BK-${String(data.id).padStart(6, "0")}`
    };

    console.log("✅ Booking created - ID:", responseData.booking_id);

    // Fetch user details for email (non-blocking if fails)
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("user_id", req.user.id)
      .single();

    if (!userError && user?.email) {
      try {
        const html = await renderEmailTemplate("booking-request", {
          name: user.full_name || "User",
          event_name,
          purpose,
          venue,
          attendees,
          start_datetime,
          end_datetime,
          additional_needs: additional_needs || 'None',
          requested_at: responseData.created_at || new Date().toISOString()
        });
        
        await sendMail({
          to: user.email,
          subject: "Booking Request Submitted",
          html
        });
        console.log("✅ Email sent to:", user.email);
      } catch (emailErr) {
        console.error("⚠️  Email failed (non-blocking):", emailErr.message);
      }
    } else if (userError) {
      console.error("⚠️  User lookup failed (non-blocking):", userError.message);
    }

    return res.status(201).json({ booking: responseData });

  } catch (err) {
    console.error("❌ FATAL ERROR:", err.message);
    return res.status(500).json({ error: err.message || "Server error" });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["Pending", "Approved", "Rejected"];

  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    // booking_id is UUID from database, use directly (no parsing)
    const bookingId = req.params.id;

    const { data, error } = await db
      .from("bookings")
      .update({ status })
      .eq("booking_id", bookingId)
      .select()
      .single();

    if (error) {
      console.error("❌ Update error:", error.message);
      return res.status(500).json({ error: "Update failed" });
    }

    // Data already has booking_id (UUID) from database
    const responseData = {
      ...data
    };

    // ℹ️ Audit logging is now handled by the /api/audit-logs endpoint
    // Frontend calls logAuditAction BEFORE calling updateBookingStatus

    // If approved or rejected, send email to user
    if ((status === "Approved" || status === "Rejected") && responseData?.user_id) {
      // Fetch user email and booking details
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("user_id", responseData.user_id)
        .single();
      if (!userError && user?.email) {
        const templateName = status === "Approved" ? "booking-approved" : "booking-rejected";
        const html = await renderEmailTemplate(templateName, {
          name: user.full_name || "User",
          event_name: responseData.event_name,
          purpose: responseData.purpose,
          venue: responseData.venue,
          attendees: responseData.attendees,
          start_datetime: responseData.start_datetime,
          end_datetime: responseData.end_datetime,
          additional_needs: responseData.additional_needs || 'None',
          requested_at: responseData.created_at || new Date().toISOString()
        });
        await sendMail({
          to: user.email,
          subject: status === "Approved" ? "Booking Approved" : "Booking Rejected",
          html
        });
      }
    }

    return res.json({ booking: responseData });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get all upcoming approved bookings
export const getUpcomingBookings = async (req, res) => {
  try {
    const { data, error } = await db
      .from("admin_bookings_view") // ✅ use the view
      .select("*")
      .eq("status", "Approved")
      .gte("date", new Date().toISOString()) // only future events
      .order("date", { ascending: true });

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ items: data, upcomingCount: data.length });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};