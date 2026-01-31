// Uses Resend (Cuttlefish) for transactional notification emails
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send transactional email using Resend/Cuttlefish
 * @param {Object} param0
 * @param {string|string[]} param0.to - Recipient(s)
 * @param {string} param0.subject - Email subject
 * @param {string} param0.html - HTML body
 * @param {string} param0.text - Plain text body
 * @param {string} [param0.from] - Optional sender (defaults to SMTP_FROM env)
 */
export async function sendMail({ to, subject, html, text, from }) {
  return resend.emails.send({
    from: from || process.env.SMTP_FROM, // e.g., 'Church Booking <no-reply@cuttlefish.io>'
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
}
