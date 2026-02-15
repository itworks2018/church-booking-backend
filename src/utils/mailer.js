import { Resend } from "resend";

// Initialize Resend email service
const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend test domain for development
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

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
      replyTo: process.env.REPLY_TO_EMAIL || "onboarding@resend.dev"
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

/**
 * Send change request status notification email
 * @param {Object} options - Email options
 * @param {string} options.userEmail - User's email address
 * @param {string} options.userName - User's full name
 * @param {string} options.eventName - Event name
 * @param {string} options.status - Status (Approved or Rejected)
 * @param {string} options.adminNotes - Admin's response notes
 * @returns {Promise<Object>} Result from sendMail
 */
export async function sendChangeRequestStatusEmail({ userEmail, userName, eventName, status, adminNotes }) {
  const isApproved = status === "Approved";
  const subject = isApproved 
    ? `Your Booking Change Request for "${eventName}" Has Been Approved` 
    : `Your Booking Change Request for "${eventName}" Has Been Rejected`;
  
  const statusColor = isApproved ? "#10b981" : "#ef4444";
  const statusBgColor = isApproved ? "#d1fae5" : "#fee2e2";
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .status-box { background: ${statusBgColor}; border-left: 4px solid ${statusColor}; padding: 16px; margin: 20px 0; border-radius: 4px; }
          .status-label { color: ${statusColor}; font-weight: bold; font-size: 18px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #e5e7eb; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #666; }
          .notes { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid ${statusColor}; }
          .footer { text-align: center; font-size: 12px; color: #999; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Change Request Update</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${userName || "User"}</strong>,</p>
            
            <p>Thank you for submitting a change request for your booking. We have reviewed your request and wanted to let you know of our decision.</p>
            
            <div class="status-box">
              <div class="status-label">${isApproved ? "✅ APPROVED" : "❌ REJECTED"}</div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Event Name:</span> ${eventName}
              </div>
            </div>
            
            <div class="notes">
              <p><strong>Admin Response:</strong></p>
              <p>${adminNotes || "No additional notes provided."}</p>
            </div>
            
            <p>If you have any questions or need further assistance, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            Church Calendar & Facility Booking System<br>
            CCF Sandoval</p>
            
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>&copy; 2026 CCF Sandoval. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return sendMail({
    to: userEmail,
    subject: subject,
    html: html,
    text: `Your change request for "${eventName}" has been ${isApproved ? "approved" : "rejected"}. Admin notes: ${adminNotes}`
  });
}

