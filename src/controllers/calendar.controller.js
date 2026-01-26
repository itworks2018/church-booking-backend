import { db } from "../config/supabase.js";

// Get all bookings (pending and approved) for a venue
export const getVenueBookings = async (req, res) => {
  const { venueId } = req.params;
  try {
    const { data, error } = await db
      .from("bookings")
      .select("booking_id, user_id, event_name, purpose, attendees, venue, start_datetime, end_datetime, additional_needs, status, created_at")
      .eq("venue", venueId) // ✅ match your actual column name
      .in("status", ["Pending", "Approved"]);

    if (error) return res.status(400).json({ error: error.message });
    res.json(data); // ✅ always returns an array
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get available slots for a venue on a specific date
export const getVenueAvailableSlots = async (req, res) => {
  const { venueId } = req.params;
  const { date } = req.query; // Expecting YYYY-MM-DD
  try {
    // Get all approved bookings for this venue on this date
    const { data: bookings, error } = await db
      .from("bookings")
      .select("start_datetime, end_datetime")
      .eq("venue_id", venueId)
      .eq("status", "Approved")
      .gte("start_datetime", `${date}T00:00:00`)
      .lt("start_datetime", `${date}T23:59:59`);
    if (error) return res.status(400).json({ error: error.message });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
