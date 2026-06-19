// server/utils/email.js
// Email sending via Resend (https://resend.com)

const { Resend } = require('resend');

let resend = null;
function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY missing in .env');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM_ADDRESS = 'InternHub <onboarding@resend.dev>';
const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function sendEmail({ to, subject, html, text }) {
  try {
    const result = await getResend().emails.send({ from: FROM_ADDRESS, to, subject, html, text });
    if (result.error) {
      console.error('📧 Resend error:', result.error);
      throw new Error(result.error.message || 'Email send failed');
    }
    console.log(`📧 Email sent to ${to} (id: ${result.data?.id})`);
    return { sent: true, id: result.data?.id, to };
  } catch (err) {
    console.error('💥 Failed to send email:', err);
    throw err;
  }
}

// Welcome email - sent when admin creates a mentor or intern.
// Gives them BOTH a temp password (instant login) AND a link to set
// their own password right away (valid 48 hours).
async function sendWelcomeEmail({ name, email, role, tempPassword, identifier, resetLink }) {
  const subject = `Welcome to InternHub, ${name}!`;

  const text = `Hi ${name},

Your InternHub account has been created.

  Role:        ${role}
  Login with:  ${identifier}
  Temporary password:  ${tempPassword}

You can log in with the temporary password above (you will be asked to
change it on first login), OR set your own password right away using
this link (valid for 48 hours):

  ${resetLink}

Log in here: ${APP_URL}/login

- The InternHub Team`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #2E75B6;">Welcome to InternHub, ${name}!</h2>
  <p>Your InternHub account has been created.</p>

  <table style="background: #f4f4f4; padding: 16px; border-radius: 6px; margin: 16px 0; width: 100%;">
    <tr><td style="padding: 4px 8px;"><strong>Role:</strong></td><td>${role}</td></tr>
    <tr><td style="padding: 4px 8px;"><strong>Login with:</strong></td><td>${identifier}</td></tr>
    <tr><td style="padding: 4px 8px;"><strong>Temp password:</strong></td>
        <td><code style="background:#fff;padding:2px 6px;border-radius:3px;">${tempPassword}</code></td></tr>
  </table>

  <p>You can log in with the temporary password above (you will be asked to change it
     on first login), or set your own password right away using the button below.</p>

  <p style="margin: 24px 0;">
    <a href="${resetLink}" style="background: #16A34A; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block; margin-right: 10px;">Set Your Own Password</a>
  </p>

  <p style="margin: 16px 0;">
    <a href="${APP_URL}/login" style="background: #2E75B6; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block;">Log in to InternHub</a>
  </p>

  <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
    The password-setup link above expires in 48 hours.<br/>
    - The InternHub Team
  </p>
</div>`;

  return sendEmail({ to: email, subject, html, text });
}

// Password reset email - sent for "forgot password" requests.
// No credentials shown, just a secure link (valid 1 hour).
async function sendPasswordResetEmail({ name, email, resetLink }) {
  const subject = 'Reset your InternHub password';

  const text = `Hi ${name},

We received a request to reset your InternHub password.

Reset your password here (valid for 1 hour):
  ${resetLink}

If you did not request this, you can safely ignore this email.

- The InternHub Team`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #2E75B6;">Reset your password</h2>
  <p>Hi ${name}, we received a request to reset your InternHub password.</p>

  <p style="margin: 24px 0;">
    <a href="${resetLink}" style="background: #2E75B6; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; display: inline-block;">Reset Password</a>
  </p>

  <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>

  <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
    - The InternHub Team
  </p>
</div>`;

  return sendEmail({ to: email, subject, html, text });
}

module.exports = { sendEmail, sendWelcomeEmail, sendPasswordResetEmail };