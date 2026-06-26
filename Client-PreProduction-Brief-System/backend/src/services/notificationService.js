const db = require('../config/db');
const { sendEmail } = require('./emailService');

// Premium HTML Email wrapper template
const getEmailWrapper = (title, bodyContent) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f9fc; color: #333333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); margin-top: 20px; border: 1px solid #eef2f5; }
    .header { background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 40px 30px; line-height: 1.6; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { background-color: #4f46e5; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DigiQuest Studio</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>This is an automated notification from DigiQuest Studio Client Pre-Production System.</p>
      <p>&copy; 2026 DigiQuest Studio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Create an in-app notification and dispatch an email.
 */
const notify = async ({ userId, message, type, briefId, emailTo, emailSubject, emailBodyHtml }) => {
  try {
    // 1. Insert in-app notification
    const inAppQuery = `
      INSERT INTO notifications (user_id, message, type, brief_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    await db.query(inAppQuery, [userId, message, type, briefId]);

    // 2. Send Email if recipient provided
    if (emailTo) {
      const plainText = message; // Basic fallback text
      const htmlContent = getEmailWrapper(emailSubject, emailBodyHtml);
      await sendEmail({
        to: emailTo,
        subject: emailSubject,
        text: plainText,
        html: htmlContent
      });
    }
  } catch (error) {
    console.error('Notification Service Error:', error);
  }
};

/**
 * Trigger notification when a new brief is submitted
 */
const notifyBriefSubmission = async (brief, clientName) => {
  // Notify all PMs and Admins
  try {
    const staffRes = await db.query(
      "SELECT id, email FROM users WHERE role IN ('Admin', 'Project Manager')"
    );
    
    for (const staff of staffRes.rows) {
      const message = `New Pre-Production Brief submitted by ${clientName}: "${brief.project_name}"`;
      const emailSubject = `[New Brief] ${brief.project_name} submitted`;
      const emailBodyHtml = `
        <h2>New Brief Submission</h2>
        <p>A new pre-production brief has been submitted for review.</p>
        <p><strong>Project Name:</strong> ${brief.project_name}</p>
        <p><strong>Client:</strong> ${clientName}</p>
        <p><strong>Project Type:</strong> ${brief.project_type}</p>
        <p><strong>Priority:</strong> ${brief.priority}</p>
        <div class="button-container">
          <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">View Brief Details</a>
        </div>
      `;

      await notify({
        userId: staff.id,
        message,
        type: 'submission',
        briefId: brief.id,
        emailTo: staff.email,
        emailSubject,
        emailBodyHtml
      });
    }

    // Also notify the brief creator (the Client)
    if (brief.created_by) {
      const creatorRes = await db.query(
        "SELECT id, email, username FROM users WHERE id = $1",
        [brief.created_by]
      );
      if (creatorRes.rows.length > 0) {
        const creator = creatorRes.rows[0];
        const message = `Your Pre-Production Brief "${brief.project_name}" has been submitted successfully to DigiQuest Studio.`;
        const emailSubject = `[Submission Confirmed] "${brief.project_name}" has been submitted`;
        const emailBodyHtml = `
          <h2>Brief Submission Confirmed</h2>
          <p>Hello ${creator.username},</p>
          <p>Thank you for submitting your pre-production brief. Our team has been notified and will review your requirements shortly.</p>
          <p><strong>Project Name:</strong> ${brief.project_name}</p>
          <p><strong>Project Type:</strong> ${brief.project_type}</p>
          <p><strong>Priority:</strong> ${brief.priority}</p>
          <p>You can track the progress of your brief using the link below:</p>
          <div class="button-container">
            <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">View Brief Details</a>
          </div>
        `;

        await notify({
          userId: creator.id,
          message,
          type: 'submission',
          briefId: brief.id,
          emailTo: creator.email,
          emailSubject,
          emailBodyHtml
        });

        // Also email the specified approval contact if provided and different from the creator
        if (brief.approval_contact_email && brief.approval_contact_email !== creator.email) {
          await sendEmail({
            to: brief.approval_contact_email,
            subject: emailSubject,
            text: message,
            html: getEmailWrapper(emailSubject, emailBodyHtml)
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in notifyBriefSubmission:', error);
  }
};

/**
 * Trigger notification when status changes (e.g. Under Review, Revision Requested, Approved, Rejected)
 */
const notifyStatusChange = async (brief, oldStatus, newStatus, updaterUser) => {
  try {
    // Notify the brief creator
    const creatorRes = await db.query("SELECT email, username FROM users WHERE id = $1", [brief.created_by]);
    if (creatorRes.rows.length === 0) return;

    const creator = creatorRes.rows[0];
    const message = `Your brief "${brief.project_name}" status changed from "${oldStatus}" to "${newStatus}" by ${updaterUser.username}.`;
    const emailSubject = `[Status Update] ${brief.project_name} is now ${newStatus}`;
    
    let extraDetails = '';
    if (newStatus === 'Revision Requested') {
      extraDetails = `<p style="color: #e11d48; font-weight: bold;">Action Required: Please review the comments and adjust the brief requirements.</p>`;
    } else if (newStatus === 'Approved') {
      extraDetails = `<p style="color: #16a34a; font-weight: bold;">Congratulations! Your pre-production brief has been approved. DigiQuest Studio will begin onboarding your project.</p>`;
    }

    const emailBodyHtml = `
      <h2>Brief Status Update</h2>
      <p>Hello ${creator.username},</p>
      <p>The status of your pre-production brief has been updated.</p>
      <p><strong>Project:</strong> ${brief.project_name}</p>
      <p><strong>New Status:</strong> <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; background-color: #eef2f5;">${newStatus}</span></p>
      ${extraDetails}
      <div class="button-container">
        <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">View Brief</a>
      </div>
    `;

    await notify({
      userId: brief.created_by,
      message,
      type: 'status_change',
      briefId: brief.id,
      emailTo: creator.email,
      emailSubject,
      emailBodyHtml
    });

    // Also notify the specified approval contact if provided and different from the creator
    if (brief.approval_contact_email && brief.approval_contact_email !== creator.email) {
      await sendEmail({
        to: brief.approval_contact_email,
        subject: emailSubject,
        text: message,
        html: getEmailWrapper(emailSubject, emailBodyHtml)
      });
    }
  } catch (error) {
    console.error('Error in notifyStatusChange:', error);
  }
};

/**
 * Trigger notification when comment is added
 */
const notifyCommentAdded = async (comment, brief, commentatorUser) => {
  try {
    // Determine who to notify:
    // If client comments, notify Admin/PM who has commented or is standard recipient.
    // If PM/Admin comments, notify the client (brief creator).
    const isCommentatorStaff = ['Admin', 'Project Manager'].includes(commentatorUser.role);
    
    if (isCommentatorStaff) {
      // Notify client (brief creator)
      const creatorRes = await db.query("SELECT email, username FROM users WHERE id = $1", [brief.created_by]);
      if (creatorRes.rows.length > 0) {
        const creator = creatorRes.rows[0];
        const message = `${commentatorUser.username} added a comment on brief: "${brief.project_name}"`;
        const emailSubject = `[New Comment] ${commentatorUser.username} on ${brief.project_name}`;
        const emailBodyHtml = `
          <h2>New Comment Added</h2>
          <p>Hello ${creator.username},</p>
          <p>A new comment has been added to your brief: <strong>"${brief.project_name}"</strong>.</p>
          <p><strong>From:</strong> ${commentatorUser.username} (${commentatorUser.role})</p>
          <blockquote style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; font-style: italic;">
            "${comment.comment}"
          </blockquote>
          <div class="button-container">
            <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">Reply to Comment</a>
          </div>
        `;

        await notify({
          userId: brief.created_by,
          message,
          type: 'comment',
          briefId: brief.id,
          emailTo: creator.email,
          emailSubject,
          emailBodyHtml
        });
      }
    } else {
      // Notify staff (Admin & PM)
      const staffRes = await db.query("SELECT id, email FROM users WHERE role IN ('Admin', 'Project Manager')");
      for (const staff of staffRes.rows) {
        const message = `Client ${commentatorUser.username} added a comment on brief: "${brief.project_name}"`;
        const emailSubject = `[Client Comment] ${commentatorUser.username} on ${brief.project_name}`;
        const emailBodyHtml = `
          <h2>New Comment from Client</h2>
          <p>A client has commented on a pre-production brief.</p>
          <p><strong>Brief:</strong> ${brief.project_name}</p>
          <p><strong>From:</strong> ${commentatorUser.username}</p>
          <blockquote style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; font-style: italic;">
            "${comment.comment}"
          </blockquote>
          <div class="button-container">
            <a href="http://localhost:5173/briefs/${brief.id}" class="button" style="color: #ffffff;">Respond to Comment</a>
          </div>
        `;

        await notify({
          userId: staff.id,
          message,
          type: 'comment',
          briefId: brief.id,
          emailTo: staff.email,
          emailSubject,
          emailBodyHtml
        });
      }
    }
  } catch (error) {
    console.error('Error in notifyCommentAdded:', error);
  }
};

module.exports = {
  notify,
  notifyBriefSubmission,
  notifyStatusChange,
  notifyCommentAdded
};
