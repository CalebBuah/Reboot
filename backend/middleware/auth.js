const crypto = require('crypto');
const db = require('../db');
const config = require('../config');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left || '');
  const rightBuffer = Buffer.from(right || '');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.reboot_session;
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    }

    const session = await db.getSession(hashToken(token));
    if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
      if (session) await db.deleteSession(session.token_hash);
      return res.status(401).json({ success: false, error: 'Session expired', code: 'SESSION_EXPIRED' });
    }

    req.user = session;
    next();
  } catch (err) {
    next(err);
  }
}

function requireDeviceAuth(req, res, next) {
  const configuredToken = config.ESP32_API_TOKEN;
  const suppliedToken = req.get('X-Device-Token');

  if (!configuredToken || !safeEqual(suppliedToken, configuredToken)) {
    return res.status(401).json({ success: false, error: 'Invalid device credentials', code: 'DEVICE_AUTH_REQUIRED' });
  }

  next();
}

module.exports = { hashToken, requireAuth, requireDeviceAuth };
