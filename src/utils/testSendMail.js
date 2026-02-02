import "dotenv/config";
// Test email sender for booking templates
import { sendMail } from "./mailer.js";
import { renderEmailTemplate } from "./renderEmailTemplate.js";

async function sendTest() {
  const html = '<h2>This is a test email</h2><p>If you received this, your Gmail SMTP is working!</p>';
  const result = await sendMail({
    to: process.env.EMAIL_USER,
    subject: '[Test] Gmail SMTP is working',
    html,
    text: 'This is a test email. If you received this, your Gmail SMTP is working!'
  });
  console.log('Test email sendMail result:', result && result.accepted);
  console.log('Test email sent using Gmail SMTP.');
}

sendTest().catch(console.error);
