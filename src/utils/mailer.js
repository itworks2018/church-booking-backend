
// Uses Nodemailer with Gmail SMTP for transactional notification emails

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

/**
 * Send transactional email using Gmail SMTP
 * @param {Object} param0
 * @param {string|string[]} param0.to - Recipient(s)
 * @param {string} param0.subject - Email subject
 * @param {string} param0.html - HTML body
 * @param {string} param0.text - Plain text body
 * @param {string} [param0.from] - Optional sender (defaults to EMAIL_USER env)
 */

export async function sendMail({ to, subject, html, text, from }) {
  const mailOptions = {
    from: from || process.env.GMAIL_USER,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html,
    text,
  };
  return await transporter.sendMail(mailOptions);
}

// Demo booking confirmation sender
export async function sendBookingConfirmation(toEmail, bookingId) {
  await transporter.sendMail({
    from: `"Booking Demo" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Booking Confirmation (Demo)",
    html: `<h2>Your booking is confirmed</h2>
           <p>Booking ID: <strong>${bookingId}</strong></p>
           <p style="color:gray;font-size:12px">This email is for demo purposes only.</p>`,
  });
}
