// ═══════════════════════════════════════════════
//  Device Endpoints
//  GET /api/device/*
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

// ── GET /api/device/status ──
router.get('/status', async (req, res) => {
  try {
    const status = await db.getDeviceStatus();
    const formatted = db.formatDeviceStatus(status);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/device/gpio ──
router.get('/gpio', async (req, res) => {
  try {
    const status = await db.getDeviceStatus();
    res.json({
      gpio13_green: Boolean(status.gpio13_green),
      gpio14_red: Boolean(status.gpio14_red),
      gpio15_blue: Boolean(status.gpio15_blue)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/device/config ──
router.get('/config', async (req, res) => {
  try {
    const config = await db.getDeviceConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/device/config ──
router.patch('/config', async (req, res) => {
  try {
    const allowed = ['ping_interval', 'failure_threshold', 'relay_duration_ms', 'restart_limit_per_hour'];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const value = Number(req.body[key]);
        if (!Number.isInteger(value) || value <= 0) {
          return res.status(400).json({ success: false, error: `${key} must be a positive integer` });
        }
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'No editable settings supplied' });
    }

    await db.updateDeviceConfig(updates);
    await db.addLog('info', 'CONFIG', 'Device configuration updated', 'USER');
    res.json({ success: true, config: await db.getDeviceConfig() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/device/connectivity ──
router.get('/connectivity', async (req, res) => {
  try {
    const status = await db.getDeviceStatus();
    const isOffline = status.last_heartbeat 
      ? (Date.now() - new Date(status.last_heartbeat).getTime()) > config.HEARTBEAT_TIMEOUT_MS
      : true;
    
    res.json({
      connected: status.connected && !isOffline,
      is_offline: isOffline,
      last_heartbeat: status.last_heartbeat,
      state: status.state,
      uptime_seconds: status.uptime,
      message: isOffline 
        ? 'ESP32 offline - no heartbeat received'
        : `Online - last heartbeat ${Math.floor((Date.now() - new Date(status.last_heartbeat).getTime()) / 1000)}s ago`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;