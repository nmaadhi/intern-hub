const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const FROM = 'InternHub <onboarding@resend.dev>';

async function sendMentorWelcome({ name, email, tempPassword, setupToken }) {
  const setPasswordLink = setupToken
    ? `${APP_URL}/reset-password?token=${setupToken}`
    : `${APP_URL}/forgot-password`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to InternHub — Your Mentor Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">Welcome to InternHub, ${name}!</h2>
          <p>Your mentor account has been created. Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;">
            <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="${APP_URL}/login">${APP_URL}/login</a></p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0; font-size: 18px;">
              <strong>Temporary Password:</strong>
              <span style="background:#fff; padding:4px 10px; border-radius:4px; font-family:monospace; color:#7c3aed; font-size:16px; letter-spacing:1px;">
                ${tempPassword}
              </span>
            </p>
          </div>
          <p style="color: #374151;">
            You can login directly using the temporary password above.<br/>
            <strong>Optionally</strong>, if you want to set your own password, click the button below:
          </p>
          <a href="${setPasswordLink}"
            style="background:#7c3aed; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:12px 0; font-weight:bold;">
            Set My Own Password (Optional)
          </a>
          <p style="color:#e53e3e; font-size:12px; margin-top:8px;">
            ⚠️ This link expires in <strong>1 hour</strong>. After that, use the temporary password to login.
          </p>
          <p style="color:#9ca3af; font-size:11px; margin-top:16px;">
            If you did not expect this email, please ignore it.
          </p>
        </div>
      `,
    });
    console.log(`✅ Welcome email sent to mentor: ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send mentor welcome email:`, err.message);
    throw err;
  }
}

async function sendInternWelcome({ name, email, internId, tempPassword, setupToken }) {
  const setPasswordLink = setupToken
    ? `${APP_URL}/reset-password?token=${setupToken}`
    : `${APP_URL}/forgot-password`;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Welcome to InternHub — Your Intern Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Welcome to InternHub, ${name}!</h2>
          <p>Your intern account has been created. Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #059669;">
            <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="${APP_URL}/login">${APP_URL}/login</a></p>
            <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 4px 0;"><strong>Intern ID:</strong> ${internId}</p>
            <p style="margin: 8px 0; font-size: 18px;">
              <strong>Temporary Password:</strong>
              <span style="background:#fff; padding:4px 10px; border-radius:4px; font-family:monospace; color:#059669; font-size:16px; letter-spacing:1px;">
                ${tempPassword}
              </span>
            </p>
          </div>
          <p style="color: #374151;">
            You can login directly using the temporary password above.<br/>
            <strong>Optionally</strong>, if you want to set your own password, click the button below:
          </p>
          <a href="${setPasswordLink}"
            style="background:#059669; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:12px 0; font-weight:bold;">
            Set My Own Password (Optional)
          </a>
          <p style="color:#e53e3e; font-size:12px; margin-top:8px;">
            ⚠️ This link expires in <strong>1 hour</strong>. After that, use the temporary password to login.
          </p>
          <p style="color:#9ca3af; font-size:11px; margin-top:16px;">
            If you did not expect this email, please ignore it.
          </p>
        </div>
      `,
    });
    console.log(`✅ Welcome email sent to intern: ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send intern welcome email:`, err.message);
    throw err;
  }
}

async function sendPasswordReset({ name, email, resetToken }) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'InternHub — Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1d4ed8;">Reset Your Password</h2>
          <p>Hi ${name},</p>
          <p>We received a request to reset your InternHub password. Click the button below:</p>
          <a href="${resetLink}"
            style="background:#1d4ed8; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:16px 0; font-weight:bold;">
            Reset My Password
          </a>
          <p style="color:#e53e3e; font-size:13px;">
            ⚠️ This link expires in <strong>1 hour</strong>.
          </p>
          <p style="color:#6b7280; font-size:12px;">
            If you did not request this, ignore this email — your password will not change.
          </p>
          <p style="color:#9ca3af; font-size:11px; margin-top:16px;">
            Or copy this link: ${resetLink}
          </p>
        </div>
      `,
    });
    console.log(`✅ Password reset email sent to: ${email}`);
  } catch (err) {
    console.error(`❌ Failed to send password reset email:`, err.message);
    throw err;
  }
}

module.exports = { sendMentorWelcome, sendInternWelcome, sendPasswordReset };