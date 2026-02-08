import "dotenv/config";
import { sendMail } from "./mailer.js";
import { renderEmailTemplate } from "./renderEmailTemplate.js";

/**
 * Test 1: Send a simple test email
 */
async function sendSimpleTest() {
  console.log("\n=== TEST 1: Simple Test Email ===");
  const result = await sendMail({
    to: process.env.EMAIL_USER || "test@example.com",
    subject: "[Test] Resend Email Service Working",
    html: "<h2>✅ Email Service is Working!</h2><p>If you received this email, Resend is configured correctly.</p>",
    text: "Email service is working!"
  });
  console.log("Result:", result.data?.id ? "✅ Sent" : "❌ Failed", result.error || "");
}

/**
 * Test 2: Send a booking request email
 */
async function sendBookingRequestTest() {
  console.log("\n=== TEST 2: Booking Request Email ===");
  const html = await renderEmailTemplate("booking-request", {
    name: "John Doe",
    event_name: "Wedding Reception",
    purpose: "Wedding Celebration",
    venue: "Main Hall",
    attendees: "150",
    start_datetime: "2026-02-15 10:00 AM",
    end_datetime: "2026-02-15 2:00 PM",
    additional_needs: "Sound system, projector, tables for 25 guests",
    requested_at: new Date().toLocaleString()
  });

  const result = await sendMail({
    to: process.env.EMAIL_USER || "test@example.com",
    subject: "Booking Request Submitted - CCF Sandoval Events",
    html: html
  });
  console.log("Result:", result.data?.id ? "✅ Sent" : "❌ Failed", result.error || "");
}

/**
 * Test 3: Send a booking approved email
 */
async function sendBookingApprovedTest() {
  console.log("\n=== TEST 3: Booking Approved Email ===");
  const html = await renderEmailTemplate("booking-approved", {
    name: "John Doe",
    event_name: "Wedding Reception",
    purpose: "Wedding Celebration",
    venue: "Main Hall",
    attendees: "150",
    start_datetime: "2026-02-15 10:00 AM",
    end_datetime: "2026-02-15 2:00 PM",
    additional_needs: "Sound system, projector, tables for 25 guests",
    requested_at: new Date().toLocaleString()
  });

  const result = await sendMail({
    to: process.env.EMAIL_USER || "test@example.com",
    subject: "Your Booking is Approved - CCF Sandoval Events",
    html: html
  });
  console.log("Result:", result.data?.id ? "✅ Sent" : "❌ Failed", result.error || "");
}

/**
 * Test 4: Send a booking rejected email
 */
async function sendBookingRejectedTest() {
  console.log("\n=== TEST 4: Booking Rejected Email ===");
  const html = await renderEmailTemplate("booking-rejected", {
    name: "John Doe",
    event_name: "Wedding Reception",
    purpose: "Wedding Celebration",
    venue: "Main Hall",
    attendees: "150",
    start_datetime: "2026-02-15 10:00 AM",
    end_datetime: "2026-02-15 2:00 PM",
    additional_needs: "Sound system, projector, tables for 25 guests",
    requested_at: new Date().toLocaleString()
  });

  const result = await sendMail({
    to: process.env.EMAIL_USER || "test@example.com",
    subject: "Booking Request Status Update - CCF Sandoval Events",
    html: html
  });
  console.log("Result:", result.data?.id ? "✅ Sent" : "❌ Failed", result.error || "");
}

/**
 * Test 5: Send a 24-hour reminder email
 */
async function sendReminderTest() {
  console.log("\n=== TEST 5: 24-Hour Reminder Email ===");
  const html = await renderEmailTemplate("booking-reminder", {
    name: "John Doe",
    event_name: "Wedding Reception",
    venue: "Main Hall",
    start_datetime: "2026-02-15 10:00 AM",
    requested_at: new Date().toLocaleString()
  });

  const result = await sendMail({
    to: process.env.EMAIL_USER || "test@example.com",
    subject: "Your Event is Tomorrow - Booking Reminder",
    html: html
  });
  console.log("Result:", result.data?.id ? "✅ Sent" : "❌ Failed", result.error || "");
}

/**
 * Run all tests or specific test
 */
async function runTests() {
  const testType = process.argv[2] || "all";
  
  console.log("🧪 Church Booking System - Email Tests");
  console.log("====================================");
  console.log(`Testing with: ${process.env.RESEND_API_KEY ? "✅ Resend API" : "❌ No Resend API Key"}`);

  try {
    if (testType === "all" || testType === "1") await sendSimpleTest();
    if (testType === "all" || testType === "2") await sendBookingRequestTest();
    if (testType === "all" || testType === "3") await sendBookingApprovedTest();
    if (testType === "all" || testType === "4") await sendBookingRejectedTest();
    if (testType === "all" || testType === "5") await sendReminderTest();
    
    console.log("\n✅ All tests completed!");
  } catch (err) {
    console.error("❌ Test error:", err);
  }
}

// Run tests
runTests().catch(console.error);

// Export for use in other files
export { sendSimpleTest, sendBookingRequestTest, sendBookingApprovedTest, sendBookingRejectedTest, sendReminderTest };

