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
      .or(`and(start_datetime,lt.${end_datetime}),and(end_datetime,gt.${start_datetime})`);

    if (conflictError) {
      console.error("Supabase conflict check error:", conflictError);
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
      .single(); // ensures Supabase returns the inserted row

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: error.message });
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

    await db.from("audit_logs").insert([
      {
        booking_id: req.params.id,
        admin_id: req.user.id,
        action: `status_changed_to_${status}`,
      },
    ]);

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