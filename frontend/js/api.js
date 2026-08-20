// ═══════════════════════════════════════════════
//  API Client - Centralized backend communication
// ═══════════════════════════════════════════════

const API_BASE_URL = window.location.protocol === 'file:' || window.location.port !== '5000'
  ? 'http://localhost:5000/api'
  : '/api';

const SIGNIN_URL = window.location.protocol === 'file:' || window.location.port !== '5000'
  ? 'http://localhost:5000/signin.html'
  : '/signin.html';

// Error handler
async function handleResponse(response) {
  if (!response.ok) {
    if (response.status === 401) {
      window.location.href = SIGNIN_URL;
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Device Status
async function getDeviceStatus() {
  const response = await fetch(`${API_BASE_URL}/device/status`, { credentials: 'include' });
  return handleResponse(response);
}

// Device GPIO States
async function getDeviceGPIO() {
  const response = await fetch(`${API_BASE_URL}/device/gpio`, { credentials: 'include' });
  return handleResponse(response);
}

// Device Config
async function getDeviceConfig() {
  const response = await fetch(`${API_BASE_URL}/device/config`, { credentials: 'include' });
  return handleResponse(response);
}

async function updateDeviceConfig(updates) {
  const response = await fetch(`${API_BASE_URL}/device/config`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return handleResponse(response);
}

// Device Connectivity
async function getDeviceConnectivity() {
  const response = await fetch(`${API_BASE_URL}/device/connectivity`, { credentials: 'include' });
  return handleResponse(response);
}

// System Logs
async function getLogs(limit = 50) {
  const response = await fetch(`${API_BASE_URL}/logs?limit=${limit}`, { credentials: 'include' });
  return handleResponse(response);
}

// Relay History
async function getRelayHistory(limit = 20) {
  const response = await fetch(`${API_BASE_URL}/relay/history?limit=${limit}`, { credentials: 'include' });
  return handleResponse(response);
}

// Ping History
async function getPingHistory(limit = 7) {
  const response = await fetch(`${API_BASE_URL}/ping/history?limit=${limit}`, { credentials: 'include' });
  return handleResponse(response);
}

// Latest five-layer diagnostic report
async function getLatestDiagnostic() {
  const response = await fetch(`${API_BASE_URL}/diagnostics/latest`, { credentials: 'include' });
  return handleResponse(response);
}

// Trigger Relay Restart
async function triggerRestart(reason = 'USER_MANUAL') {
  const response = await fetch(`${API_BASE_URL}/relay/restart`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  return handleResponse(response);
}

// Reset Device
async function resetDevice() {
  const response = await fetch(`${API_BASE_URL}/device/reset`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

// Simulation Endpoints (dev only)
async function simulateConnected() {
  const response = await fetch(`${API_BASE_URL}/simulate/connected`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateFailure() {
  const response = await fetch(`${API_BASE_URL}/simulate/failure`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateRelayRestart() {
  const response = await fetch(`${API_BASE_URL}/simulate/relay_restart`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

async function simulateReset() {
  const response = await fetch(`${API_BASE_URL}/simulate/reset`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  });
  return handleResponse(response);
}

// Export all functions
window.api = {
  getDeviceStatus,
  getDeviceGPIO,
  getDeviceConfig,
  updateDeviceConfig,
  getDeviceConnectivity,
  getLogs,
  getRelayHistory,
  getPingHistory,
  getLatestDiagnostic,
  triggerRestart,
  resetDevice,
  simulateConnected,
  simulateFailure,
  simulateRelayRestart,
  simulateReset
};