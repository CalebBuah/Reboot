// ═══════════════════════════════════════════════
//  ESP32 Endpoints
//  POST /api/esp32/heartbeat, /api/esp32/log
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');
const config = require('../config');

// ── POST /api/esp32/heartbeat ──
// ESP32 sends status every 30 seconds
router.post('/heartbeat', async (req, res) => {
  try {
    const {
      state,
      relay_on,
      uptime,
      restart_count,
      failure_count,
      gpio13,
      gpio14,
      gpio15,
      ping_latency_ms,
      ping_success
    } = req.body;

    if (state === undefined || relay_on === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: state, relay_on'
      });
    }

    const previousStatus = await db.getDeviceStatus();
    await db.updateDeviceStatus({
      connected: ping_success === true,
      last_heartbeat: new Date().toISOString(),
      state,
      relay_on,
      uptime,
      restart_count,
      failure_count,
      ping_latency_ms: ping_latency_ms || null,
      gpio13_green: gpio13,
      gpio14_red: gpio14,
      gpio15_blue: gpio15
    });

    if (ping_latency_ms !== undefined && ping_success !== undefined) {
      await db.addPingResult(config.PING_TARGET, ping_latency_ms, ping_success);
    }

    if (state === 'STATE_RECOVERING' && previousStatus?.state !== 'STATE_RECOVERING') {
      await db.addRelayEvent('ACTIVATED', 'ESP32', true, 'Relay activated by watchdog');
      await db.addLog('info', 'RELAY', 'Relay activated — GPIO 5 HIGH', 'ESP32');
    } else if (state === 'STATE_RECOVERY_WAIT') {
      await db.addLog('info', 'RELAY', 'Relay off — GPIO 5 LOW. Waiting for router boot.', 'ESP32');
    } else if (state === 'STATE_MONITORING' && !relay_on) {
      await db.addLog('success', 'OK', 'Back to monitoring mode', 'ESP32');
    }

    res.json({
      success: true,
      message: 'Heartbeat received',
      timestamp: new Date().toISOString()
    });

    console.log(`Heartbeat from ESP32: state=${state}, relay=${relay_on}, uptime=${uptime}s`);

  } catch (err) {
    console.error('Heartbeat error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ── POST /api/esp32/command ──
// ESP32 polls for pending commands
router.post('/command', async (req, res) => {
  try {
    const pendingCommand = await db.claimPendingCommand();
    
    if (!pendingCommand) {
      return res.json({
        success: true,
        command: null,
        message: 'No pending commands'
      });
    }
    
    res.json({
      success: true,
      command_id: pendingCommand.id,
      command: pendingCommand.command
    });
    
    console.log(`Command queued: ${pendingCommand.command}`);
    
  } catch (err) {
    console.error('Command fetch error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ── POST /api/esp32/command-complete ──
// ESP32 confirms command execution
router.post('/command-complete', async (req, res) => {
  try {
    const { command_id } = req.body;
    
    if (!command_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing command_id'
      });
    }
    
    await db.completeCommand(command_id);
    await db.addLog('info', 'RELAY', 'Command executed successfully', 'ESP32');
    
    res.json({
      success: true,
      message: 'Command marked complete'
    });
    
    console.log(`Command ${command_id} completed`);
    
  } catch (err) {
    console.error('Command complete error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ── POST /api/esp32/log ──
router.post('/log', async (req, res) => {
  try {
    const { level, tag, message } = req.body;

    if (!level || !tag || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: level, tag, message'
      });
    }

    await db.addLog(level, tag, message, 'ESP32');

    res.json({
      success: true,
      message: 'Log entry created'
    });

    console.log(`ESP32 Log [${level}/${tag}]: ${message}`);

  } catch (err) {
    console.error('❌ Log error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;