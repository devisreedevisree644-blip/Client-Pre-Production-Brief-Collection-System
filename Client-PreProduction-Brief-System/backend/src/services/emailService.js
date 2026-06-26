const fs = require('fs');
const path = require('path');

// Dynamically try to load nodemailer if available (avoiding crashes if node_modules are not fully built yet)
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

const sendEmail = async ({ to, subject, text, html }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM || 'no-reply@digiqueststudio.com';
  const fromName = process.env.SMTP_FROM_NAME || 'DigiQuest Studio';

  const isSMTPConfigured = smtpHost && smtpUser && smtpPass;

  if (isSMTPConfigured && nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`[Email Service] Email sent successfully: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[Email Service] Failed to send real email via SMTP:', error);
      // Fallback to mock log
    }
  }

  // Fallback / Mock delivery for local testing
  const mockEmailDir = process.env.VERCEL
    ? '/tmp/mock_emails'
    : path.join(__dirname, '../uploads/mock_emails');

  if (!fs.existsSync(mockEmailDir)) {
    fs.mkdirSync(mockEmailDir, { recursive: true });
  }

  const timestamp = Date.now();
  const fileSafeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const emailLogPath = path.join(mockEmailDir, `email_${timestamp}_${fileSafeSubject}.html`);

  const fullLogContent = `
<!--
  RECIPIENT: ${to}
  SUBJECT: ${subject}
  TIMESTAMP: ${new Date().toISOString()}
  TEXT VERSION:
  ${text}
-->
${html}
`;

  fs.writeFileSync(emailLogPath, fullLogContent);

  console.log('================================================================');
  console.log(`[MOCK EMAIL SENT]`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Saved:   ${process.env.VERCEL ? '/tmp/mock_emails/' : 'backend/src/uploads/mock_emails/'}email_${timestamp}_${fileSafeSubject}.html`);
  console.log('================================================================');
  
  return true;
};

module.exports = { sendEmail };
