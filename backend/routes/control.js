// ═══════════════════════════════════════════════
//  Control Endpoints
//  POST /api/relay/restart, /api/device/reset
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

// ── POST /api/relay/restart ──
router.post('/relay/restart', async (req, res) => {
  try {
    const { reason = 'USER_MANUAL' } = req.body;

    const restartCount = await db.getRestartCountThisHour();
    
    if (restartCount >= config.RESTART_LIMIT_PER_HOUR) {
      await db.addLog(
        'danger',
        'LIMIT',
        `Restart limit reached (${config.RESTART_LIMIT_PER_HOUR}/hour)`,
        'BACKEND'
      );
      
      return res.status(429).json({
        status: 'error',
        message: `Restart limit reached: ${config.RESTART_LIMIT_PER_HOUR} per hour`,
        code: 'RESTART_LIMIT_EXCEEDED',
        current_count: restartCount
      });
    }

    await db.addRelayEvent('ACTIVATED', reason, true, `Manual restart triggered by user`);
    await db.addLog('info', 'RELAY', 'Manual restart requested', 'USER');

    res.json({
      success: true,
      message: 'Relay restart command sent to ESP32',
      restarts_this_hour: restartCount + 1,
      limit: config.RESTART_LIMIT_PER_HOUR
    });

    console.log(`🔄 Manual relay restart triggered: ${reason}`);

  } catch (err) {
    console.error('❌ Restart error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      code: 'RESTART_FAILED'
    });
  }
});

// ── POST /api/device/reset ──
router.post('/device/reset', async (req, res) => {
  try {
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
      message: 'Device state reset'
    });

    console.log('🔄 Device reset');

  } catch (err) {
    console.error('❌ Reset error:', err);
    res.status(500).json({
      status: 'error',
      message: err.message,
      code: 'RESET_FAILED'
    });
  }
});

module.exports = router;