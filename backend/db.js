// ═══════════════════════════════════════════════
//  SQLite Database Connection & Helpers
// ═══════════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

const dbPath = path.join(__dirname, config.DB_PATH);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database:', dbPath);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS device_config (
    id INTEGER PRIMARY KEY,
    ping_interval INTEGER NOT NULL DEFAULT 30000,
    failure_threshold INTEGER NOT NULL DEFAULT 3,
    relay_duration_ms INTEGER NOT NULL DEFAULT 10000,
    restart_limit_per_hour INTEGER NOT NULL DEFAULT 5,
    backend_url TEXT DEFAULT 'http://192.168.x.x:5000',
    firmware_version TEXT,
    device_name TEXT DEFAULT 'ESP32 DevKit V1',
    wifi_security TEXT DEFAULT 'WPA2',
    relay_off_wait_ms INTEGER DEFAULT 60000,
    ping_target TEXT DEFAULT '8.8.8.8'
  )`);
  db.run("ALTER TABLE device_config ADD COLUMN device_name TEXT DEFAULT 'ESP32 DevKit V1'", () => {});
  db.run("ALTER TABLE device_config ADD COLUMN wifi_security TEXT DEFAULT 'WPA2'", () => {});
  db.run('ALTER TABLE device_config ADD COLUMN relay_off_wait_ms INTEGER DEFAULT 60000', () => {});
  db.run("ALTER TABLE device_config ADD COLUMN ping_target TEXT DEFAULT '8.8.8.8'", () => {});
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'personal',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);
});

// ── Helper: Run query with promise ──
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// ── Helper: Get single row ──
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ── Helper: Get all rows ──
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function createUser(user) {
  return dbRun(`
    INSERT INTO users (username, email, first_name, last_name, account_type, password_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [user.username, user.email, user.first_name, user.last_name, user.account_type, user.password_hash]);
}

async function getUserById(id) {
  return dbGet('SELECT * FROM users WHERE id = ?', [id]);
}

async function getUserByEmail(email) {
  return dbGet('SELECT * FROM users WHERE email = ?', [email]);
}

async function getUserByIdentifier(identifier) {
  return dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [identifier, identifier]);
}

async function addSession(userId, tokenHash, expiresAt) {
  return dbRun('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);
}

async function getSession(tokenHash) {
  return dbGet(`
    SELECT sessions.*, users.username, users.email, users.first_name, users.last_name, users.account_type
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `, [tokenHash]);
}

async function deleteSession(tokenHash) {
  return dbRun('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
}

async function deleteUserSessions(userId) {
  return dbRun('DELETE FROM sessions WHERE user_id = ?', [userId]);
}

async function addPasswordResetToken(userId, tokenHash, expiresAt) {
  return dbRun('INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)', [userId, tokenHash, expiresAt]);
}

async function getPasswordResetToken(tokenHash) {
  return dbGet('SELECT * FROM password_reset_tokens WHERE token_hash = ?', [tokenHash]);
}

async function updateUserPassword(userId, passwordHash) {
  return dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
}

async function usePasswordResetToken(id) {
  return dbRun('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

// ── Device Status ──
async function getDeviceStatus() {
  return dbGet('SELECT * FROM device_status WHERE id = 1');
}

async function updateDeviceStatus(updates) {
  // updates = { connected, state, relay_on, uptime, ... }
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  
  const sql = `UPDATE device_status SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`;
  return dbRun(sql, values);
}

// ── System Logs ──
async function addLog(level, tag, message, source = 'SYSTEM') {
  const sql = `
    INSERT INTO system_logs (level, tag, message, source, timestamp)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  return dbRun(sql, [level, tag, message, source]);
}

async function getLogs(limit = 50, level = 'all') {
  let sql = 'SELECT * FROM system_logs ORDER BY id DESC LIMIT ?';
  const params = [limit];
  
  if (level !== 'all') {
    sql = 'SELECT * FROM system_logs WHERE level = ? ORDER BY id DESC LIMIT ?';
    params.unshift(level);
  }
  
  return dbAll(sql, params);
}

// ── Relay Events ──
async function addRelayEvent(action, trigger, success, message) {
  const sql = `
    INSERT INTO relay_events (action, trigger, success, message, timestamp)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `;
  return dbRun(sql, [action, trigger, success, message]);
}

async function getRelayHistory(limit = 20) {
  return dbAll('SELECT * FROM relay_events ORDER BY id DESC LIMIT ?', [limit]);
}

// ── Ping History ──
async function addPingResult(target, latencyMs, success) {
  const sql = `
    INSERT INTO ping_history (target, latency_ms, success, timestamp)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `;
  await dbRun(sql, [target, latencyMs, success]);
  
  // Keep only last 7 ping results per target
  await dbRun(`
    DELETE FROM ping_history
    WHERE target = ? AND id NOT IN (
      SELECT id FROM ping_history WHERE target = ? ORDER BY id DESC LIMIT 7
    )
  `, [target, target]);
}

async function getLastPings(target, limit = 7) {
  return dbAll(
    'SELECT * FROM ping_history WHERE target = ? ORDER BY id DESC LIMIT ?',
    [target, limit]
  );
}

// ── Device Config ──
async function getDeviceConfig() {
  return dbGet('SELECT * FROM device_config WHERE id = 1');
}

async function updateDeviceConfig(updates) {
  const fields = Object.keys(updates)
    .map(key => `${key} = ?`)
    .join(', ');
  const values = Object.values(updates);
  
  const sql = `UPDATE device_config SET ${fields} WHERE id = 1`;
  return dbRun(sql, values);
}

// ── Restart Count (per hour) ──
async function getRestartCountThisHour() {
  const oneHourAgo = new Date(Date.now() - config.RESTART_HOUR_WINDOW_MS).toISOString();
  const result = await dbGet(`
    SELECT COUNT(*) as count FROM relay_events
    WHERE action IN ('ACTIVATION_REQUESTED', 'ACTIVATED') AND timestamp > ?
  `, [oneHourAgo]);
  
  return result?.count || 0;
}

// ── Utility: Format device status for API response ──
function formatDeviceStatus(row) {
  if (!row) return null;
  
  const isOffline = row.last_heartbeat 
    ? (Date.now() - new Date(row.last_heartbeat).getTime()) > config.HEARTBEAT_TIMEOUT_MS
    : true;
  
  return {
    connected: row.connected && !isOffline,
    last_heartbeat: row.last_heartbeat,
    state: row.state,
    relay_on: Boolean(row.relay_on),
    uptime: row.uptime,
    restart_count: row.restart_count,
    failure_count: row.failure_count,
    ping_latency_ms: row.ping_latency_ms,
    updated_at: row.updated_at,
    is_offline: isOffline
  };
}
// ── Commands ──
async function getPendingCommand() {
  return dbGet(`
    SELECT * FROM device_commands 
    WHERE status = 'PENDING' 
    ORDER BY id ASC 
    LIMIT 1
  `);
}

async function claimPendingCommand() {
  await dbRun('BEGIN IMMEDIATE TRANSACTION');
  try {
    const command = await dbGet(`
      SELECT * FROM device_commands
      WHERE status = 'PENDING'
      ORDER BY id ASC
      LIMIT 1
    `);
    if (!command) {
      await dbRun('COMMIT');
      return null;
    }

    await dbRun("UPDATE device_commands SET status = 'CLAIMED' WHERE id = ? AND status = 'PENDING'", [command.id]);
    await dbRun('COMMIT');
    return { ...command, status: 'CLAIMED' };
  } catch (err) {
    await dbRun('ROLLBACK');
    throw err;
  }
}

async function addCommand(command) {
  const sql = `
    INSERT INTO device_commands (command, status, created_at)
    VALUES (?, 'PENDING', CURRENT_TIMESTAMP)
  `;
  return dbRun(sql, [command]);
}

async function completeCommand(commandId) {
  const sql = `
    UPDATE device_commands 
    SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND status = 'CLAIMED'
  `;
  return dbRun(sql, [commandId]);
}

async function getCommandHistory(limit = 20) {
  return dbAll(`
    SELECT * FROM device_commands 
    ORDER BY id DESC 
    LIMIT ?
  `, [limit]);
}

// ── Export ──
module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByIdentifier,
  addSession,
  getSession,
  deleteSession,
  deleteUserSessions,
  addPasswordResetToken,
  getPasswordResetToken,
  updateUserPassword,
  usePasswordResetToken,
  getDeviceStatus,
  updateDeviceStatus,
  addLog,
  getLogs,
  addRelayEvent,
  getRelayHistory,
  addPingResult,
  getLastPings,
  getDeviceConfig,
  updateDeviceConfig,
  getRestartCountThisHour,
  formatDeviceStatus,
  getPendingCommand,
  claimPendingCommand,
  addCommand,
  completeCommand,
  getCommandHistory
};