require('dotenv').config();

// ═══════════════════════════════════════════════
//  Backend Configuration
//  Environment-specific settings
// ═══════════════════════════════════════════════

const parseList = (value, fallback) => (value || fallback)
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const config = {
  // Server
  PORT: Number(process.env.PORT || 5000),
  NODE_ENV: process.env.NODE_ENV || 'production',
  SESSION_TTL_MS: Number(process.env.SESSION_TTL_MS || 86400000),
  RESET_TOKEN_TTL_MS: Number(process.env.RESET_TOKEN_TTL_MS || 3600000),
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5000',
  
  // Database
  DB_PATH: process.env.DB_PATH || './reboot.db',
  
  // ESP32 Connection
  HEARTBEAT_TIMEOUT_MS: Number(process.env.HEARTBEAT_TIMEOUT_MS || 35000),
  HEARTBEAT_INTERVAL_MS: Number(process.env.HEARTBEAT_INTERVAL_MS || 30000),
  
  // Relay Configuration
  RELAY_DURATION_MS: Number(process.env.RELAY_DURATION_MS || 10000),
  RELAY_OFF_GRACE_MS: Number(process.env.RELAY_OFF_GRACE_MS || 5000),
  
  // Ping Configuration
  PING_INTERVAL_MS: Number(process.env.PING_INTERVAL_MS || 30000),
  FAILURE_THRESHOLD: Number(process.env.FAILURE_THRESHOLD || 3),
  PING_TARGET: process.env.PING_TARGET || '8.8.8.8',
  
  // Restart Limits
  RESTART_LIMIT_PER_HOUR: Number(process.env.RESTART_LIMIT_PER_HOUR || 5),
  RESTART_HOUR_WINDOW_MS: Number(process.env.RESTART_HOUR_WINDOW_MS || 3600000),
  
  // API Settings
  CORS_ORIGIN: parseList(
    process.env.CORS_ORIGIN,
    'http://localhost:5000,http://localhost:3000,http://127.0.0.1:5000'
  ),
  ESP32_API_TOKEN: process.env.ESP32_API_TOKEN || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: Number(process.env.SMTP_PORT || 465),
  SMTP_SECURE: process.env.SMTP_SECURE !== 'false',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || process.env.SMTP_USER || ''
};

module.exports = config;