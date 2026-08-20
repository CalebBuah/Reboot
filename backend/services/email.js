const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function getTransporter() {
  if (!config.SMTP_USER || !config.SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS
      }
    });
  }
  return transporter;
}

async function sendPasswordResetEmail({ to, token }) {
  const mailer = getTransporter();
  if (!mailer) return false;

  const resetUrl = `${config.APP_BASE_URL}/forgot.html?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: config.MAIL_FROM,
    to,
    subject: 'Reboot password reset',
    text: `Reset your Reboot password using this link: ${resetUrl}\n\nThis link expires in one hour. If you did not request this, ignore this email.`,
    html: `<p>Reset your Reboot password by clicking the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour. If you did not request this, ignore this email.</p>`
  });
  return true;
}

async function sendWelcomeEmail({ to, firstName }) {
  const mailer = getTransporter();
  if (!mailer) return false;

  await mailer.sendMail({
    from: config.MAIL_FROM,
    to,
    subject: 'Welcome to Reboot',
    text: `Hi ${firstName},\n\nYour Reboot account has been created successfully. You can sign in at ${config.APP_BASE_URL}/signin.html.`,
    html: `<p>Hi ${firstName},</p><p>Your Reboot account has been created successfully.</p><p><a href="${config.APP_BASE_URL}/signin.html">Sign in to Reboot</a></p>`
  });
  return true;
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
