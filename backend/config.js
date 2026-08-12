// ═══════════════════════════════════════════════
//  Backend Configuration
//  Environment-specific settings
// ═══════════════════════════════════════════════

const config = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'production',
  
  // Database
  DB_PATH: './reboot.db',
  
  // ESP32 Connection
  HEARTBEAT_TIMEOUT_MS: 35000,  // 30s heartbeat + 5s grace period
  HEARTBEAT_INTERVAL_MS: 30000, // ESP32 sends every 30s
  
  // Relay Configuration
  RELAY_DURATION_MS: 10000,      // 10 seconds
  RELAY_OFF_GRACE_MS: 5000,      // Extra time before resume
  
  // Ping Configuration
  PING_INTERVAL_MS: 30000,       // Every 30s
  FAILURE_THRESHOLD: 3,          // 3 consecutive fails
  PING_TARGET: '8.8.8.8',
  
  // Restart Limits
  RESTART_LIMIT_PER_HOUR: 5,
  RESTART_HOUR_WINDOW_MS: 3600000, // 1 hour
  
  // API Settings
  CORS_ORIGIN: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000']
    : ['http://localhost:5000']
};

module.exports = config;