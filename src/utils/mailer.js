// Uses Resend (Cuttlefish) for transactional notification emails

import nodemailer from 'nodemailer';

/**
 * Send transactional email using Gmail SMTP
 * @param {Object} param0
 * @param {string|string[]} param0.to - Recipient(s)
 * @param {string} param0.subject - Email subject
 * @param {string} param0.html - HTML body
 * @param {string} param0.text - Plain text body
 * @param {string} [param0.from] - Optional sender (defaults to SMTP_FROM env)
 */
export async function sendMail({ to, subject, html, text, from }) {
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 1025;
  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port,
    secure,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
    tls: { rejectUnauthorized: false },
  });
  return transporter.sendMail({
    from: from || process.env.SMTP_FROM || 'no-reply@localhost',
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
}
