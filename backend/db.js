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
// ── Commands ──
async function getPendingCommand() {
  return dbGet(`
    SELECT * FROM device_commands 
    WHERE status = 'PENDING' 
    ORDER BY id ASC 
    LIMIT 1
  `);
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
    WHERE id = ?
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

// ────── DIAGNOSTICS FUNCTIONS ──────

async function addDiagnosticResult(diagnosticReport) {
  const sql = `
    INSERT INTO diagnostic_results 
    (timestamp, root_cause, layer_failed, latency_ms, details)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  try {
    const result = await dbRun(sql, [
      diagnosticReport.timestamp || new Date().toISOString(),
      diagnosticReport.rootCause,
      diagnosticReport.layerFailed || 0,
      diagnosticReport.latencyMs || 0,
      JSON.stringify(diagnosticReport.details || {})
    ]);
    return result;
  } catch (err) {
    console.error('Error adding diagnostic:', err);
    throw err;
  }
}

async function getDiagnosticHistory(limit = 20) {
  const sql = `
    SELECT * FROM diagnostic_results 
    ORDER BY timestamp DESC 
    LIMIT ?
  `;
  
  try {
    return await dbAll(sql, [limit]);
  } catch (err) {
    console.error('Error getting diagnostic history:', err);
    throw err;
  }
}

async function getLatestDiagnostic() {
  const sql = `
    SELECT * FROM diagnostic_results 
    ORDER BY timestamp DESC 
    LIMIT 1
  `;
  
  try {
    return await dbGet(sql, []);
  } catch (err) {
    console.error('Error getting latest diagnostic:', err);
    throw err;
  }
}

// ────── ANALYTICS FUNCTIONS ──────

async function updateDailyMetrics(date, metrics) {
  const sql = `
    INSERT OR REPLACE INTO daily_metrics 
    (date, uptime_percent, failure_count, mtbf_hours, mttr_minutes, 
     total_restart_time_minutes, wifi_failures, local_failures, 
     isp_failures, dns_failures, content_failures, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  
  try {
    return await dbRun(sql, [
      date,
      metrics.uptime_percent || 0,
      metrics.failure_count || 0,
      metrics.mtbf_hours || 0,
      metrics.mttr_minutes || 0,
      metrics.total_restart_time_minutes || 0,
      metrics.wifi_failures || 0,
      metrics.local_failures || 0,
      metrics.isp_failures || 0,
      metrics.dns_failures || 0,
      metrics.content_failures || 0
    ]);
  } catch (err) {
    console.error('Error updating daily metrics:', err);
    throw err;
  }
}

async function getDailyMetrics(days = 7) {
  const sql = `
    SELECT * FROM daily_metrics 
    WHERE date >= date('now', '-' || ? || ' days')
    ORDER BY date ASC
  `;
  
  try {
    return await dbAll(sql, [days]);
  } catch (err) {
    console.error('Error getting daily metrics:', err);
    throw err;
  }
}

async function getReliabilityMetrics(days = 7) {
  const metrics = await getDailyMetrics(days);
  
  if (metrics.length === 0) {
    return {
      uptime_percent: 0,
      avg_mtbf_hours: 0,
      avg_mttr_minutes: 0,
      total_failures: 0
    };
  }
  
  const avgUptime = (metrics.reduce((sum, m) => sum + m.uptime_percent, 0) / metrics.length).toFixed(2);
  const avgMTBF = (metrics.reduce((sum, m) => sum + m.mtbf_hours, 0) / metrics.length).toFixed(2);
  const avgMTTR = (metrics.reduce((sum, m) => sum + m.mttr_minutes, 0) / metrics.length).toFixed(2);
  const totalFailures = metrics.reduce((sum, m) => sum + m.failure_count, 0);
  
  return {
    uptime_percent: parseFloat(avgUptime),
    avg_mtbf_hours: parseFloat(avgMTBF),
    avg_mttr_minutes: parseFloat(avgMTTR),
    total_failures: totalFailures,
    days: days
  };
}

async function getFailurePatterns(days = 7) {
  const metrics = await getDailyMetrics(days);
  
  if (metrics.length === 0) {
    return {
      wifi: 0,
      local: 0,
      isp: 0,
      dns: 0,
      content: 0,
      total: 0
    };
  }
  
  const totals = {
    wifi: metrics.reduce((sum, m) => sum + (m.wifi_failures || 0), 0),
    local: metrics.reduce((sum, m) => sum + (m.local_failures || 0), 0),
    isp: metrics.reduce((sum, m) => sum + (m.isp_failures || 0), 0),
    dns: metrics.reduce((sum, m) => sum + (m.dns_failures || 0), 0),
    content: metrics.reduce((sum, m) => sum + (m.content_failures || 0), 0)
  };
  
  totals.total = Object.values(totals).reduce((a, b) => a + b, 0);
  
  // Convert to percentages
  if (totals.total > 0) {
    return {
      wifi: ((totals.wifi / totals.total) * 100).toFixed(1),
      local: ((totals.local / totals.total) * 100).toFixed(1),
      isp: ((totals.isp / totals.total) * 100).toFixed(1),
      dns: ((totals.dns / totals.total) * 100).toFixed(1),
      content: ((totals.content / totals.total) * 100).toFixed(1),
      total: totals.total
    };
  }
  
  return totals;
}

async function cleanupOldDiagnostics(daysToKeep = 30) {
  const sql = `
    DELETE FROM diagnostic_results 
    WHERE timestamp < datetime('now', '-' || ? || ' days')
  `;
  
  try {
    return await dbRun(sql, [daysToKeep]);
  } catch (err) {
    console.error('Error cleaning up diagnostics:', err);
    throw err;
  }
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
  formatDeviceStatus,
  getPendingCommand,
  addCommand,
  completeCommand,
  getCommandHistory,


    // New diagnostic functions
  addDiagnosticResult,
  getDiagnosticHistory,
  getLatestDiagnostic,
  
  // New analytics functions
  updateDailyMetrics,
  getDailyMetrics,
  getReliabilityMetrics,
  getFailurePatterns,
  cleanupOldDiagnostics
};

