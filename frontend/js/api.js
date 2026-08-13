// ═══════════════════════════════════════════════
//  API Client - Centralized backend communication
// ═══════════════════════════════════════════════

const API_BASE_URL = 'http://localhost:5000/api';

// Error handler
async function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Device Status
async function getDeviceStatus() {
  const response = await fetch(`${API_BASE_URL}/device/status`);
  return handleResponse(response);
}

// Device GPIO States
async function getDeviceGPIO() {
  const response = await fetch(`${API_BASE_URL}/device/gpio`);
  return handleResponse(response);
}

// Device Config
async function getDeviceConfig() {
  const response = await fetch(`${API_BASE_URL}/device/config`);
  return handleResponse(response);
}

// Device Connectivity
async function getDeviceConnectivity() {
  const response = await fetch(`${API_BASE_URL}/device/connectivity`);
  return handleResponse(response);
}

// System Logs
async function getLogs(limit = 50) {
  const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}`);
  return handleResponse(response);
}

// Relay History
async function getRelayHistory(limit = 20) {
  const response = await fetch(`${API_BASE_URL}/relay/history?limit=${limit}`);
  return handleResponse(response);
}

// Ping History
async function getPingHistory(limit = 7) {
  const response = await fetch(`${API_BASE_URL}/ping/history?limit=${limit}`);
  return handleResponse(response);
}

// Trigger Relay Restart
async function triggerRestart(reason = 'USER_MANUAL') {
  const response = await fetch(`${API_BASE_URL}/relay/restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  return handleResponse(response);
}

// Reset Device
async function resetDevice() {
  const response = await fetch(`${API_BASE_URL}/device/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

// Simulation Endpoints (dev only)
async function simulateConnected() {
  const response = await fetch(`${API_BASE_URL}/simulate/connected`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateFailure() {
  const response = await fetch(`${API_BASE_URL}/simulate/failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateRelayRestart() {
  const response = await fetch(`${API_BASE_URL}/simulate/relay_restart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateReset() {
  const response = await fetch(`${API_BASE_URL}/simulate/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

// Export all functions
window.api = {
  getDeviceStatus,
  getDeviceGPIO,
  getDeviceConfig,
  getDeviceConnectivity,
  getLogs,
  getRelayHistory,
  getPingHistory,
  triggerRestart,
  resetDevice,
  simulateConnected,
  simulateFailure,
  simulateRelayRestart,
  simulateReset
};