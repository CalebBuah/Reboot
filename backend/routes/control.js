// ═══════════════════════════════════════════════
//  Control Endpoints
//  POST /api/relay/restart, /api/device/reset
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

// ── POST /api/relay/restart ──
// Trigger a manual relay restart
router.post('/relay/restart', async (req, res) => {
  try {
    const { reason = 'USER_MANUAL' } = req.body;

    const deviceConfig = await db.getDeviceConfig();
    const restartLimit = deviceConfig?.restart_limit_per_hour || config.RESTART_LIMIT_PER_HOUR;
    const restartCount = await db.getRestartCountThisHour();
    
    if (restartCount >= restartLimit) {
      await db.addLog(
        'danger',
        'LIMIT',
        `Restart limit reached (${restartLimit}/hour)`,
        'BACKEND'
      );
      
      return res.status(429).json({
        status: 'error',
        message: `Restart limit reached: ${restartLimit} per hour`,
        code: 'RESTART_LIMIT_EXCEEDED',
        current_count: restartCount
      });
    }

    // Create pending command for ESP32
    await db.addCommand('RESTART_RELAY');
    await db.addRelayEvent('ACTIVATION_REQUESTED', reason, true, `Restart requested by ${reason}`);
    await db.addLog('info', 'RELAY', `Manual restart requested (${reason})`, 'USER');

    res.json({
      success: true,
      message: 'Relay restart command queued',
      restarts_this_hour: restartCount + 1,
      limit: restartLimit
    });

    console.log(`Relay restart queued: ${reason}`);

  } catch (err) {
    console.error('Restart error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      code: 'RESTART_FAILED'
    });
  }
});

// ── POST /api/device/reset ──
// Reset all counters and state (backend only)
router.post('/device/reset', async (req, res) => {
  try {
    await db.addCommand('RESET_STATE');
    await db.updateDeviceStatus({
      connected: 0,
      state: 'STATE_INIT',
      relay_on: 0,
      uptime: 0,
      restart_count: 0,
      failure_count: 0
    });

    await db.addLog('info', 'INFO', 'System reset by user', 'USER');

    res.json({
      success: true,
      message: 'Device reset command queued'
    });

    console.log('Device reset');

  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      code: 'RESET_FAILED'
    });
  }
});

module.exports = router;