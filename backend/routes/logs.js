// ═══════════════════════════════════════════════
//  Logs Endpoints
//  GET /api/logs, /api/relay/history, /api/ping/history
// ═══════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const db = require('../db');

// ── GET /api/logs ──
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const level = req.query.level || 'all';

    const logs = await db.getLogs(limit, level);
    
    res.json({
      success: true,
      count: logs.length,
      logs: logs
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// ── GET /api/relay/history ──
router.get('/relay/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const history = await db.getRelayHistory(limit);

    res.json({
      success: true,
      count: history.length,
      events: history
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// ── GET /api/ping/history ──
router.get('/ping/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 7;
    const history = await db.getLastPings('8.8.8.8', limit);

    res.json({
      success: true,
      count: history.length,
      pings: history
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

module.exports = router;