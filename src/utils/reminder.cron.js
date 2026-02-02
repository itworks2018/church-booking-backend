// Schedules 24-hour reminder emails for approved bookings
import cron from "node-cron";
import { db as supabase } from "../config/supabase.js";
import { sendMail } from "../utils/mailer.js";
import { renderEmailTemplate } from "./renderEmailTemplate.js";

// Runs every hour
cron.schedule("0 * * * *", async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in24hStart = new Date(in24h);
  in24hStart.setMinutes(0, 0, 0); // round to hour
  const in24hEnd = new Date(in24hStart);
  in24hEnd.setMinutes(59, 59, 999);

  // Find bookings starting in 24 hours
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*, users: user_id (email, full_name)")
    .eq("status", "Approved")
    .gte("start_datetime", in24hStart.toISOString())
    .lte("start_datetime", in24hEnd.toISOString());

  if (error) {
    console.error("Reminder cron error:", error);
    return;
  }

  for (const booking of bookings || []) {
    if (booking.users?.email) {
      const html = await renderEmailTemplate("booking-reminder", {
        name: booking.users.full_name || "User",
        event_name: booking.event_name,
        venue: booking.venue,
        start_datetime: booking.start_datetime,
        requested_at: booking.created_at || ""
      });
      await sendMail({
        to: booking.users.email,
        subject: "Booking Reminder: 24 Hours Left",
        html
      });
    }
  }
});
