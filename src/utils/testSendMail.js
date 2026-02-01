import "dotenv/config";
// Test email sender for booking templates
import { sendMail } from "./mailer.js";
import { renderEmailTemplate } from "./renderEmailTemplate.js";

async function sendTest() {
  const html = await renderEmailTemplate("booking-request", {
    name: "Test User",
    event_name: "Test Event",
    purpose: "Testing",
    venue: "Main Hall",
    attendees: "50",
    start_datetime: "2026-02-10 10:00",
    end_datetime: "2026-02-10 12:00",
    additional_needs: "Projector"
  });
  const result = await sendMail({
    to: "itworks.shimt2018@gmail.com",
    subject: "[Test] Booking Request Submitted",
    html
  });
  console.log("Test email sendMail result:", result);
  console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "Loaded" : "Missing");
  console.log("Test email sent.");
}

sendTest().catch(console.error);
