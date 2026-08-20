const crypto = require('crypto');
const { promisify } = require('util');
const express = require('express');
const db = require('../db');
const config = require('../config');
const { hashToken, requireAuth } = require('../middleware/auth');
const { sendPasswordResetEmail, sendWelcomeEmail } = require('../services/email');

const router = express.Router();
const scrypt = promisify(crypto.scrypt);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeIdentifier(identifier) {
  return String(identifier || '').trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name
  };
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [, salt, expectedHex] = String(storedHash || '').split('$');
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expectedHex, 'hex'));
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

function setSessionCookie(res, token) {
  res.cookie('reboot_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    maxAge: config.SESSION_TTL_MS,
    path: '/'
  });
}

async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_MS).toISOString();
  await db.addSession(userId, hashToken(token), expiresAt);
  return token;
}

router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name } = req.body;
    const email = normalizeEmail(req.body.email);
    const username = normalizeIdentifier(req.body.username || email);
    const password = req.body.password || req.body['new-password'];
    const confirmPassword = req.body.confirm_password || req.body['confirm-password'];
    const acceptedTerms = req.body.accepted_terms === true;

    if (!first_name || !last_name || !email || !username || !validatePassword(password) || !validatePassword(confirmPassword) || !acceptedTerms) {
      return res.status(400).json({ success: false, error: 'Name, email, matching passwords, and terms acceptance are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }
    const passwordHash = await hashPassword(password);
    const result = await db.createUser({ username, email, first_name, last_name, account_type: 'personal', password_hash: passwordHash });
    const user = await db.getUserById(result.lastID);
    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);

    let emailSent = false;
    try {
      emailSent = await sendWelcomeEmail({ to: user.email, firstName: user.first_name });
    } catch (mailError) {
      console.error('Welcome email error:', mailError.message);
    }

    res.status(201).json({ success: true, email_sent: emailSent, user: publicUser(user) });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ success: false, error: 'An account with that username or email already exists' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const user = await db.getUserByEmail(email);

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const sessionToken = await createSession(user.id);
    setSessionCookie(res, sessionToken);
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = req.user;
  res.json({ success: true, user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.reboot_session;
  if (token) await db.deleteSession(hashToken(token));
  res.clearCookie('reboot_session', { httpOnly: true, sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/' });
  res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await db.getUserByEmail(email);
    const response = { success: true, message: 'If an account exists, reset instructions have been prepared' };

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + config.RESET_TOKEN_TTL_MS).toISOString();
      await db.addPasswordResetToken(user.id, hashToken(rawToken), expiresAt);
      await db.addLog('info', 'AUTH', 'Password reset requested', 'USER');
      try {
        const delivered = await sendPasswordResetEmail({ to: user.email, token: rawToken });
        if (!delivered) {
          return res.status(503).json({ success: false, error: 'Password reset email is not configured' });
        }
      } catch (mailError) {
        console.error('Password reset email error:', mailError.message);
        return res.status(503).json({ success: false, error: 'Password reset email is temporarily unavailable' });
      }
    }

    res.json(response);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !validatePassword(password)) {
      return res.status(400).json({ success: false, error: 'A reset token and password of 8-128 characters are required' });
    }

    const reset = await db.getPasswordResetToken(hashToken(token));
    if (!reset || reset.used_at || new Date(reset.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ success: false, error: 'Reset token is invalid or expired' });
    }

    await db.updateUserPassword(reset.user_id, await hashPassword(password));
    await db.usePasswordResetToken(reset.id);
    await db.deleteUserSessions(reset.user_id);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
