-- Diagnostics and Analytics Tables
-- Run this if reboot.db doesn't have these tables

CREATE TABLE IF NOT EXISTS diagnostic_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  root_cause TEXT NOT NULL,
  layer_failed INTEGER,
  latency_ms INTEGER DEFAULT 0,
  details TEXT,
  verified BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  uptime_percent REAL DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  mtbf_hours REAL DEFAULT 0,
  mttr_minutes REAL DEFAULT 0,
  total_restart_time_minutes INTEGER DEFAULT 0,
  wifi_failures INTEGER DEFAULT 0,
  local_failures INTEGER DEFAULT 0,
  isp_failures INTEGER DEFAULT 0,
  dns_failures INTEGER DEFAULT 0,
  content_failures INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_diagnostic_timestamp ON diagnostic_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_diagnostic_root_cause ON diagnostic_results(root_cause);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);