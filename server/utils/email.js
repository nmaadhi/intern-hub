const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_USER,
  process.env.MAILJET_PASS
);

const APP_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const FROM_EMAIL = 'nmaadhithya13@gmail.com';
const FROM_NAME = 'InternHub';

async function sendMentorWelcome({ name, email, tempPassword, setupToken }) {
  const setPasswordLink = setupToken
    ? `${APP_URL}/reset-password?token=${setupToken}`
    : `${APP_URL}/forgot-password`;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [{
      From: { Email: FROM_EMAIL, Name: FROM_NAME },
      To: [{ Email: email, Name: name }],
      Subject: 'Welcome to InternHub — Your Mentor Account',
      HTMLPart: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #7c3aed;">Welcome to InternHub, ${name}!</h2>
          <p>Your mentor account has been created. Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #7c3aed;">
            <p><strong>Login URL:</strong> <a href="${APP_URL}/login">${APP_URL}/login</a></p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> <span style="font-family:monospace; color:#7c3aed;">${tempPassword}</span></p>
          </div>
          <a href="${setPasswordLink}" style="background:#7c3aed; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:12px 0; font-weight:bold;">
            Set My Own Password (Optional)
          </a>
          <p style="color:#e53e3e; font-size:12px;">⚠️ This link expires in <strong>1 hour</strong>.</p>
        </div>
      `
    }]
  });
  console.log(`✅ Welcome email sent to mentor: ${email}`);
}

async function sendInternWelcome({ name, email, internId, tempPassword, setupToken }) {
  const setPasswordLink = setupToken
    ? `${APP_URL}/reset-password?token=${setupToken}`
    : `${APP_URL}/forgot-password`;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [{
      From: { Email: FROM_EMAIL, Name: FROM_NAME },
      To: [{ Email: email, Name: name }],
      Subject: 'Welcome to InternHub — Your Intern Account',
      HTMLPart: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #059669;">Welcome to InternHub, ${name}!</h2>
          <p>Your intern account has been created. Here are your login details:</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #059669;">
            <p><strong>Login URL:</strong> <a href="${APP_URL}/login">${APP_URL}/login</a></p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Intern ID:</strong> ${internId}</p>
            <p><strong>Temporary Password:</strong> <span style="font-family:monospace; color:#059669;">${tempPassword}</span></p>
          </div>
          <a href="${setPasswordLink}" style="background:#059669; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:12px 0; font-weight:bold;">
            Set My Own Password (Optional)
          </a>
          <p style="color:#e53e3e; font-size:12px;">⚠️ This link expires in <strong>1 hour</strong>.</p>
        </div>
      `
    }]
  });
  console.log(`✅ Welcome email sent to intern: ${email}`);
}

async function sendPasswordReset({ name, email, resetToken }) {
  const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

  await mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [{
      From: { Email: FROM_EMAIL, Name: FROM_NAME },
      To: [{ Email: email, Name: name }],
      Subject: 'InternHub — Reset Your Password',
      HTMLPart: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1d4ed8;">Reset Your Password</h2>
          <p>Hi ${name},</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="background:#1d4ed8; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; display:inline-block; margin:16px 0; font-weight:bold;">
            Reset My Password
          </a>
          <p style="color:#e53e3e; font-size:13px;">⚠️ This link expires in <strong>1 hour</strong>.</p>
          <p style="color:#9ca3af; font-size:11px;">Or copy this link: ${resetLink}</p>
        </div>
      `
    }]
  });
  console.log(`✅ Password reset email sent to: ${email}`);
}

module.exports = { sendMentorWelcome, sendInternWelcome, sendPasswordReset };