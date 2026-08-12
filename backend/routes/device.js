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

// ── GET /api/device/connectivity ──
router.get('/connectivity', async (req, res) => {
  try {
    const status = await db.getDeviceStatus();
    const isOffline = status.last_heartbeat 
      ? (Date.now() - new Date(status.last_heartbeat).getTime()) > 35000
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