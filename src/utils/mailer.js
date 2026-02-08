import { Resend } from "resend";

// Initialize Resend email service
const resend = new Resend(process.env.RESEND_API_KEY);

// Fallback email for testing
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@ccfsandoval.com";

/**
 * Send email using Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @param {string} options.text - Plain text email body (optional)
 * @returns {Promise<Object>} Result from Resend API
 */
export async function sendMail({ to, subject, html, text }) {
  if (!to || !subject || !html) {
    console.error("❌ sendMail: Missing required parameters", { to, subject, html: !!html });
    return { error: "Missing required parameters" };
  }

  try {
    console.log(`📧 Sending email to: ${to}, Subject: ${subject}`);
    
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: subject,
      html: html,
      text: text || "Please view this email in HTML format",
      replyTo: process.env.REPLY_TO_EMAIL || "admin@ccfsandoval.com"
    });

    if (response.error) {
      console.error("❌ Resend API Error:", response.error);
      return { error: response.error };
    }

    console.log(`✅ Email sent successfully to ${to}. ID: ${response.data?.id}`);
    return response;
  } catch (err) {
    console.error("❌ sendMail error:", err.message);
    return { error: err.message };
  }
}

/**
 * Batch send emails to multiple recipients
 * @param {Array} recipients - Array of {to, subject, html, text}
 * @returns {Promise<Array>} Array of send results
 */
export async function sendMailBatch(recipients) {
  if (!Array.isArray(recipients)) {
    console.error("❌ sendMailBatch: recipients must be an array");
    return [];
  }

  console.log(`📧 Sending ${recipients.length} emails...`);
  const results = await Promise.all(
    recipients.map(recipient => sendMail(recipient))
  );

  const successful = results.filter(r => !r.error).length;
  console.log(`✅ Batch send complete: ${successful}/${recipients.length} sent`);
  return results;
}

