import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html, text, from }) {
  return resend.emails.send({
    from: from || process.env.SMTP_FROM, // e.g., 'YourApp <noreply@yourdomain.com>'
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  });
}
