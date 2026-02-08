// Fetch all bookings (pending and approved) for all users
export const getAllBookings = async (req, res) => {
  try {
    const { data, error } = await db
      .from("bookings")
      .select("*")
      .in("status", ["Pending", "Approved"])
      .order("start_datetime", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
import { db } from "../config/supabase.js";
import { sendMail } from "../utils/mailer.js";
import { renderEmailTemplate } from "../utils/renderEmailTemplate.js";
import { db as supabase } from "../config/supabase.js";

export const createBooking = async (req, res) => {
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

  try {
    // Check for overlapping approved bookings for the same venue
    const { data: conflicts, error: conflictError } = await db
      .from("bookings")
      .select("*")
      .eq("venue", venue)
      .eq("status", "Approved")
      .lt("start_datetime", end_datetime)
      .gt("end_datetime", start_datetime);

    if (conflictError) {
      console.error("Supabase conflict check error:", conflictError);
      return res.status(500).json({ error: conflictError.message });
    }
    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ error: "This venue is already booked for the selected date and time. Please choose a different schedule or venue." });
    }

    // Generate a human-friendly booking ID (e.g., BK-001, BK-002, etc.)
    const { count, error: countError } = await db
      .from("bookings")
      .select("*", { count: "exact", head: true });
    
    const bookingNumber = (count || 0) + 1;
    const generatedBookingId = `BK-${String(bookingNumber).padStart(6, "0")}`;

    const { data, error } = await db
      .from("bookings")
      .insert([
        {
          booking_id: generatedBookingId,
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
      .single(); // ensures Supabase returns the inserted row

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Insert audit log for booking creation (no longer needed but keeping as reference)
    // await db.from("audit_logs").insert([
    //   {
    //     booking_id: data.id,  // Use primary key id, not booking_id display field
    //     admin_id: null, // created by user, not admin
    //     action: "created",
    //     notes: `Booking created by user_id: ${req.user.id}`,
    //     created_at: new Date().toISOString()
    //   }
    // ]);

    // Fetch user email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("user_id", req.user.id)
      .single();
    if (!userError && user?.email) {
      // Send custom email notification to user with full booking details
      const html = await renderEmailTemplate("booking-request", {
        name: user.full_name || "User",
        event_name,
        purpose,
        venue,
        attendees,
        start_datetime,
        end_datetime,
        additional_needs: additional_needs || 'None',
        requested_at: data.created_at || new Date().toISOString()
      });
      await sendMail({
        to: user.email,
        subject: "Booking Request Submitted",
        html
      });
    }

    return res.status(201).json({ booking: data });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["Pending", "Approved", "Rejected"];

  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const { data, error } = await db
      .from("bookings")
      .update({ status })
      .eq("booking_id", req.params.id)   // ✅ use booking_id instead of id
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ error: "Update failed" });
    }

    // ℹ️ Audit logging is now handled by the /api/audit-logs endpoint
    // Frontend calls logAuditAction BEFORE calling updateBookingStatus

    // If approved or rejected, send email to user
    if ((status === "Approved" || status === "Rejected") && data?.user_id) {
      // Fetch user email and booking details
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("email, full_name")
        .eq("user_id", data.user_id)
        .single();
      if (!userError && user?.email) {
        const templateName = status === "Approved" ? "booking-approved" : "booking-rejected";
        const html = await renderEmailTemplate(templateName, {
          name: user.full_name || "User",
          event_name: data.event_name,
          purpose: data.purpose,
          venue: data.venue,
          attendees: data.attendees,
          start_datetime: data.start_datetime,
          end_datetime: data.end_datetime,
          additional_needs: data.additional_needs || 'None',
          requested_at: data.created_at || new Date().toISOString()
        });
        await sendMail({
          to: user.email,
          subject: status === "Approved" ? "Booking Approved" : "Booking Rejected",
          html
        });
      }
    }

    return res.json({ booking: data });
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