const express = require('express');
const router = express.Router();
const db = require('../db');

// ────── POST /api/esp32/diagnostic ──────
// ESP32 sends diagnostic report when failure detected
router.post('/api/esp32/diagnostic', async (req, res) => {
  try {
    const diagnostic = req.body;
    
    console.log('Received diagnostic from ESP32:', diagnostic);
    
    // Validate required fields
    if (!diagnostic.root_cause) {
      return res.status(400).json({
        success: false,
        message: 'Missing root_cause field'
      });
    }
    
    // Store in database
    await db.addDiagnosticResult({
      timestamp: new Date().toISOString(),
      rootCause: diagnostic.root_cause,
      layerFailed: diagnostic.layer_failed || 0,
      latencyMs: diagnostic.latency_ms || 0,
      details: {
        layer1: diagnostic.layer1 || 'unknown',
        layer2: diagnostic.layer2 || 'unknown',
        layer3: diagnostic.layer3 || 'unknown',
        layer4: diagnostic.layer4 || 'unknown',
        layer5: diagnostic.layer5 || 'unknown'
      }
    });
    
    console.log('Diagnostic stored in database');
    
    res.json({
      success: true,
      message: 'Diagnostic report received and stored'
    });
  } catch (err) {
    console.error('Error handling diagnostic:', err);
    res.status(500).json({
      success: false,
      message: 'Error storing diagnostic',
      error: err.message
    });
  }
});

// ────── GET /api/diagnostics/latest ──────
// Get most recent diagnostic
router.get('/api/diagnostics/latest', async (req, res) => {
  try {
    const diagnostic = await db.getLatestDiagnostic();
    
    if (!diagnostic) {
      return res.json({
        success: true,
        diagnostic: null,
        message: 'No diagnostics available'
      });
    }
    
    // Parse details if it's a JSON string
    if (typeof diagnostic.details === 'string') {
      diagnostic.details = JSON.parse(diagnostic.details);
    }
    
    res.json({
      success: true,
      diagnostic: diagnostic
    });
  } catch (err) {
    console.error('Error getting latest diagnostic:', err);
    res.status(500).json({
      success: false,
      message: 'Error retrieving diagnostic',
      error: err.message
    });
  }
});

// ────── GET /api/diagnostics/history ──────
// Get diagnostic history
router.get('/api/diagnostics/history', async (req, res) => {
  try {
    const limit = req.query.limit || 20;
    const diagnostics = await db.getDiagnosticHistory(limit);
    
    // Parse details for each diagnostic
    diagnostics.forEach(d => {
      if (typeof d.details === 'string') {
        d.details = JSON.parse(d.details);
      }
    });
    
    res.json({
      success: true,
      count: diagnostics.length,
      diagnostics: diagnostics
    });
  } catch (err) {
    console.error('Error getting diagnostic history:', err);
    res.status(500).json({
      success: false,
      message: 'Error retrieving diagnostic history',
      error: err.message
    });
  }
});

// ────── GET /api/diagnostics/summary ──────
// Get summary of all diagnostics (root cause breakdown)
router.get('/api/diagnostics/summary', async (req, res) => {
  try {
    const diagnostics = await db.getDiagnosticHistory(1000);
    
    // Count root causes
    const summary = {
      total: diagnostics.length,
      wifi: 0,
      local_network: 0,
      isp: 0,
      dns: 0,
      content: 0,
      unknown: 0
    };
    
    diagnostics.forEach(d => {
      if (d.root_cause === 'WiFi_Down') summary.wifi++;
      else if (d.root_cause === 'LocalNetwork_Down') summary.local_network++;
      else if (d.root_cause === 'ISP_Down') summary.isp++;
      else if (d.root_cause === 'DNS_Down') summary.dns++;
      else if (d.root_cause === 'Internet_Down') summary.content++;
      else summary.unknown++;
    });
    
    res.json({
      success: true,
      summary: summary
    });
  } catch (err) {
    console.error('Error getting diagnostic summary:', err);
    res.status(500).json({
      success: false,
      message: 'Error retrieving summary',
      error: err.message
    });
  }
});

module.exports = router;