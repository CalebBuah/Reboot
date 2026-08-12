// ═══════════════════════════════════════════════
//  SQLite Database Connection & Helpers
// ═══════════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

const dbPath = path.join(__dirname, config.DB_PATH);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database:', dbPath);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

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
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const result = await dbGet(`
    SELECT COUNT(*) as count FROM relay_events
    WHERE action = 'ACTIVATED' AND timestamp > ?
  `, [oneHourAgo]);
  
  return result?.count || 0;
}

// ── Utility: Format device status for API response ──
function formatDeviceStatus(row) {
  if (!row) return null;
  
  const isOffline = row.last_heartbeat 
    ? (Date.now() - new Date(row.last_heartbeat).getTime()) > 35000
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

// ── Export ──
module.exports = {
  db,
  dbRun,
  dbGet,
  dbAll,
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
  formatDeviceStatus
};