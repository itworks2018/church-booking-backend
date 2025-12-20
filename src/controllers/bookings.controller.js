import { db } from "../config/supabase.js";

export const createBooking = async (req, res) => {
  const { event_name, start_datetime, end_datetime, venue_id } = req.body;

  if (!event_name || !start_datetime || !end_datetime || !venue_id)
    return res.status(400).json({ error: "Missing fields" });

  const start = new Date(start_datetime);
  const end = new Date(end_datetime);

  if (isNaN(start) || isNaN(end))
    return res.status(400).json({ error: "Invalid date format" });

  if (end <= start)
    return res
      .status(400)
      .json({ error: "End time must be after start time" });

  try {
    const { data, error } = await db.from("bookings").insert([
      {
        user_id: req.user.id,
        event_name,
        start_datetime,
        end_datetime,
        venue_id,
        status: "pending",
      },
    ]);

    if (error) return res.status(500).json({ error: "Booking failed" });

    return res.status(201).json({ booking: data[0] });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["pending", "approved", "rejected", "cancelled"];

  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  try {
    const { data, error } = await db
      .from("bookings")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Update failed" });

    await db.from("audit_logs").insert([
      {
        booking_id: req.params.id,
        admin_id: req.user.id,
        action: `status_changed_to_${status}`,
      },
    ]);

    return res.json({ booking: data });
  } catch {
    return res.status(500).json({ error: "Server error" });
  }
};
