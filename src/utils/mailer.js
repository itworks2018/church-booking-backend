
// Uses Nodemailer with Gmail SMTP for transactional notification emails
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use TLS/STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
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
    from: from || process.env.EMAIL_USER,
    to: Array.isArray(to) ? to.join(',') : to,
    subject,
    html,
    text,
  };
  return await transporter.sendMail(mailOptions);
}
