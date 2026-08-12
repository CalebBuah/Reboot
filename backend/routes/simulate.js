// ═══════════════════════════════════════════════
//  Simulation Endpoints (Development Only)
//  POST /api/simulate/*
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

// Middleware: Only allow in development
router.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      status: 'error',
      message: 'Simulation endpoints only available in development mode',
      code: 'FORBIDDEN'
    });
  }
  next();
});

// ── POST /api/simulate/connected ──
router.post('/connected', async (req, res) => {
  try {
    await db.updateDeviceStatus({
      connected: 1,
      state: 'STATE_MONITORING',
      failure_count: 0,
      relay_on: 0,
      gpio13_green: 1,
      gpio14_red: 0,
      gpio15_blue: 0,
      ping_latency_ms: 12,
      last_heartbeat: new Date().toISOString()
    });

    await db.addPingResult(config.PING_TARGET, 12, true);
    await db.addLog('success', 'OK', 'Simulated: Internet connectivity confirmed', 'SIMULATE');

    res.json({
      success: true,
      message: 'Simulated: Device connected'
    });

    console.log('🟢 [SIM] Connected');

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/simulate/failure ──
router.post('/failure', async (req, res) => {
  try {
    await db.updateDeviceStatus({
      connected: 0,
      state: 'STATE_FAILURE_DETECTED',
      failure_count: 3,
      relay_on: 0,
      gpio13_green: 0,
      gpio14_red: 1,
      gpio15_blue: 0,
      ping_latency_ms: null,
      last_heartbeat: new Date().toISOString()
    });

    await db.addPingResult(config.PING_TARGET, 0, false);
    await db.addLog('danger', 'FAIL', 'Simulated: 3 consecutive pings failed', 'SIMULATE');

    res.json({
      success: true,
      message: 'Simulated: Connectivity failure'
    });

    console.log('🔴 [SIM] Failure');

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/simulate/relay_restart ──
router.post('/relay_restart', async (req, res) => {
  try {
    await db.updateDeviceStatus({
      state: 'STATE_RECOVERING',
      relay_on: 1,
      gpio15_blue: 1,
      last_heartbeat: new Date().toISOString()
    });

    await db.addRelayEvent('ACTIVATED', 'SIMULATED', true, 'Relay activated');
    await db.addLog('info', 'RELAY', 'Simulated: Relay activated — GPIO 5 HIGH', 'SIMULATE');

    res.json({
      success: true,
      message: 'Simulated relay restart (step 1/3)',
      step: 1
    });

    console.log('🔵 [SIM] Relay ON');

    // Step 2: After 3s, relay off
    setTimeout(async () => {
      try {
        const status = await db.getDeviceStatus();
        await db.updateDeviceStatus({
          state: 'STATE_RECOVERY_WAIT',
          relay_on: 0,
          gpio15_blue: 0,
          restart_count: (status.restart_count || 0) + 1,
          last_heartbeat: new Date().toISOString()
        });
        await db.addLog('info', 'RELAY', 'Simulated: Relay off — GPIO 5 LOW. Waiting for router boot.', 'SIMULATE');
        console.log('⚪ [SIM] Relay OFF (waiting)');
      } catch (err) {
        console.error('Error in relay off:', err);
      }
    }, 3000);

    // Step 3: After 7s total, router back online
    setTimeout(async () => {
      try {
        await db.updateDeviceStatus({
          connected: 1,
          state: 'STATE_MONITORING',
          failure_count: 0,
          relay_on: 0,
          gpio13_green: 1,
          gpio14_red: 0,
          gpio15_blue: 0,
          ping_latency_ms: 14,
          last_heartbeat: new Date().toISOString()
        });
        await db.addPingResult(config.PING_TARGET, 14, true);
        await db.addLog('success', 'OK', 'Simulated: Router back online', 'SIMULATE');
        console.log('🟢 [SIM] Router online');
      } catch (err) {
        console.error('Error in recovery:', err);
      }
    }, 7000);

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/simulate/reset ──
router.post('/reset', async (req, res) => {
  try {
    await db.updateDeviceStatus({
      connected: 0,
      state: 'STATE_INIT',
      relay_on: 0,
      uptime: 0,
      restart_count: 0,
      failure_count: 0,
      gpio13_green: 0,
      gpio14_red: 0,
      gpio15_blue: 0,
      ping_latency_ms: null
    });

    await db.addLog('info', 'INFO', 'Simulated: System reset', 'SIMULATE');

    res.json({
      success: true,
      message: 'Simulated: System reset'
    });

    console.log('🔄 [SIM] Reset');

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;