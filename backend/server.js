const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { requireAuth, requireDeviceAuth } = require('./middleware/auth');

const path = require('path');

// Import routes
const deviceRoutes = require('./routes/device');
const esp32Routes = require('./routes/esp32');
const controlRoutes = require('./routes/control');
const logsRoutes = require('./routes/logs');
const simulateRoutes = require('./routes/simulate');
<<<<<<< HEAD
const authRoutes = require('./routes/auth');
=======
const diagnosticsRoutes = require('./routes/diagnostics');
>>>>>>> 46052d36ae8f62eaeb55ed8120faed401bc1393b

const app = express();

// ── Middleware ──
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const developmentFileOrigin = config.NODE_ENV === 'development' && (!origin || origin === 'null');
    callback(null, developmentFileOrigin || config.CORS_ORIGIN.includes(origin));
  },
  credentials: true
}));

// ── Serve Frontend Static Files ──
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res) => {
    if (config.NODE_ENV === 'development') res.setHeader('Cache-Control', 'no-store');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/device', requireAuth, deviceRoutes);
app.use('/api/esp32', requireDeviceAuth, esp32Routes);
app.use('/api', requireAuth, controlRoutes);
app.use('/api', requireAuth, logsRoutes);
app.use('/api/simulate', requireAuth, simulateRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    status: 'error',
    message: err.message,
    code: 'INTERNAL_ERROR'
  });
});

<<<<<<< HEAD
=======
// ── Routes ──
app.use('/api/device', deviceRoutes);
app.use('/api/esp32', esp32Routes);
app.use('/api', controlRoutes);
app.use('/api', logsRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/', diagnosticsRoutes);

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

>>>>>>> 46052d36ae8f62eaeb55ed8120faed401bc1393b
// ── Not found ──
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// ── Start Server ──
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log('\n');
  console.log('Reboot Backend Server Started');
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Database: ${config.DB_PATH}`);
  /* 
  console.log('\nAvailable Endpoints:');
  console.log(`   GET  /health`);
  console.log(`   GET  /api/device/status`);
  console.log(`   GET  /api/device/gpio`);
  console.log(`   GET  /api/device/config`);
  console.log(`   GET  /api/device/connectivity`);
  console.log(`   POST /api/esp32/heartbeat`);
  console.log(`   POST /api/esp32/log`);
  console.log(`   POST /api/relay/restart`);
  console.log(`   POST /api/device/reset`);
  console.log(`   GET  /api/logs`);
  console.log(`   GET  /api/relay/history`);
  console.log(`   GET  /api/ping/history`);
  
  if (config.NODE_ENV === 'development') {
    console.log('\n Development Simulation Endpoints:');
    console.log(`   POST /api/simulate/connected`);
    console.log(`   POST /api/simulate/failure`);
    console.log(`   POST /api/simulate/relay_restart`);
    console.log(`   POST /api/simulate/reset`);
  }
  console.log('\n'); */
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n Shutting down gracefully...');
  process.exit(0);
});
