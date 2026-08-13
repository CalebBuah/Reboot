// ═══════════════════════════════════════════════
//  Dashboard - UI Logic (uses api.js)
// ═══════════════════════════════════════════════

let pollInterval = null;
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

// ── Initialize ──
function init() {
  setupNavbar();
  startPolling();
}

// ── Navbar Toggle ──
function setupNavbar() {
  const navbarToggle = document.querySelector('.navbar-toggle');
  const navbarMenu = document.querySelector('.navbar-menu');

  if (!navbarToggle || !navbarMenu) return;

  navbarToggle.addEventListener('click', () => {
    navbarToggle.classList.toggle('active');
    navbarMenu.classList.toggle('active');
  });

  document.querySelectorAll('.navbar-menu li a').forEach(link => {
    link.addEventListener('click', () => {
      navbarToggle.classList.remove('active');
      navbarMenu.classList.remove('active');
    });
  });

  document.addEventListener('click', (e) => {
    if (!navbarToggle.contains(e.target) && !navbarMenu.contains(e.target)) {
      navbarToggle.classList.remove('active');
      navbarMenu.classList.remove('active');
    }
  });
}

// ── Start Polling ──
function startPolling() {
  updateDashboard();
  pollInterval = setInterval(updateDashboard, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollInterval) clearInterval(pollInterval);
}

// ── Main Update Function ──
async function updateDashboard() {
  try {
    const status = await api.getDeviceStatus();
    const logs = await api.getLogs(50);
    const pings = await api.getPingHistory(7);

    renderStatus(status);
    renderLogs(logs.logs || []);
    renderPingChart(pings.pings || []);
  } catch (err) {
    console.error('Dashboard update error:', err);
    showError('Failed to fetch device data');
  }
}

// ── Render Status ──
function renderStatus(status) {
  if (!status) return;

  const offline = status.is_offline;
  const connected = status.connected && !offline;

  // Internet Status
  const connEl = document.getElementById('conn-status');
  const connBadge = document.getElementById('conn-badge');
  const liveLabel = document.getElementById('live-label');
  const liveDot = document.querySelector('.live-dot');

  if (connEl && connBadge && liveLabel && liveDot) {
    if (connected) {
      connEl.textContent = 'Connected';
      connEl.className = 'stat-value connected';
      connBadge.textContent = 'All endpoints reachable';
      connBadge.className = 'stat-badge badge-ok';
      liveLabel.textContent = 'System online';
      liveLabel.style.color = '#22c55e';
      liveDot.style.background = '#22c55e';
      hideAlert();
    } else {
      connEl.textContent = offline ? 'Offline' : 'Disconnected';
      connEl.className = 'stat-value disconnected';
      const msg = offline 
        ? 'ESP32 not communicating' 
        : `${status.failure_count || 0} checks failed`;
      connBadge.textContent = msg;
      connBadge.className = 'stat-badge badge-fail';
      liveLabel.textContent = offline ? 'System offline' : 'System offline';
      liveLabel.style.color = '#ef4444';
      liveDot.style.background = '#ef4444';
      showAlert(offline ? 'ESP32 offline - no heartbeat received' : 'Internet failure detected');
    }
  }

  // Uptime
  const uptimeEl = document.getElementById('uptime-val');
  if (uptimeEl) {
    uptimeEl.textContent = formatTime(status.uptime || 0);
  }

  // Restart Count
  const restartEl = document.getElementById('restart-count');
  if (restartEl) {
    restartEl.textContent = status.restart_count || 0;
  }

  // Relay State
  const relayEl = document.getElementById('relay-state');
  const relayBadge = document.getElementById('relay-badge');
  if (relayEl && relayBadge) {
    if (status.relay_on) {
      relayEl.textContent = 'Active';
      relayEl.className = 'stat-value relay-active';
      relayBadge.textContent = 'GPIO 5 — HIGH';
      relayBadge.className = 'stat-badge badge-active';
    } else {
      relayEl.textContent = 'Idle';
      relayEl.className = 'stat-value relay-idle';
      relayBadge.textContent = 'GPIO 5 — LOW';
      relayBadge.className = 'stat-badge badge-idle';
    }
  }

  // Firmware State
  const fwEl = document.getElementById('fw-state');
  if (fwEl) {
    fwEl.textContent = status.state || 'UNKNOWN';
    fwEl.className = status.state === 'STATE_MONITORING' ? 'iv state-ok' :
                     status.state === 'STATE_RECOVERING' ? 'iv state-err' :
                     status.state === 'STATE_RECOVERY_WAIT' ? 'iv state-rel' :
                     status.state === 'STATE_LIMIT_REACHED' ? 'iv state-err' : 'iv state-ok';
  }

  // ESP32 Badge
  const espBadge = document.getElementById('esp-badge');
  if (espBadge) {
    espBadge.textContent = offline ? 'Offline' : 'Online';
    espBadge.className = offline ? 'panel-tag' : 'panel-tag online';
  }

  // LEDs
  setLED('led-green', 'ls-green', connected);
  setLED('led-red', 'ls-red', !connected && !status.relay_on);
  setLED('led-blue', 'ls-blue', status.relay_on);

  // Disable buttons if offline
  const restartBtn = document.querySelector('.restart-btn');
  if (restartBtn) {
    restartBtn.disabled = offline;
    restartBtn.title = offline ? 'Device offline' : 'Manually trigger router restart';
  }
}

// ── Set LED ──
function setLED(ledId, stateId, isOn) {
  const led = document.getElementById(ledId);
  const state = document.getElementById(stateId);
  if (led && state) {
    led.classList.toggle('off', !isOn);
    state.textContent = isOn ? 'ON' : 'OFF';
    state.className = isOn ? 'led-state on' : 'led-state off';
  }
}

// ── Render Logs ──
function renderLogs(logs) {
  const logContainer = document.getElementById('event-log');
  if (!logContainer) return;

  // Keep last 20 logs in reverse order
  const displayLogs = logs.slice(0, 20);

  logContainer.innerHTML = displayLogs.map(log => `
    <div class="log-entry ${log.level}">
      <span class="log-time">${formatTimestamp(log.timestamp)}</span>
      <span class="log-tag ${getLogTagClass(log.level)}">${log.tag}</span>
      <span class="log-msg">${log.message}</span>
    </div>
  `).join('');
}

function getLogTagClass(level) {
  const map = {
    'info': 'info-tag',
    'success': 'ok-tag',
    'ok': 'ok-tag',
    'danger': 'danger-tag',
    'warn': 'warn-tag'
  };
  return map[level] || 'info-tag';
}

// ── Render Ping Chart ──
function renderPingChart(pings) {
  if (!pings || pings.length === 0) return;

  // Sort by ID to get chronological order
  const sorted = pings.sort((a, b) => a.id - b.id);
  const last7 = sorted.slice(-7);

  for (let i = 0; i < 7; i++) {
    const barEl = document.getElementById(`bar${i + 1}`);
    if (!barEl) continue;

    const ping = last7[i];
    if (!ping) {
      barEl.className = 'bar dim';
      barEl.style.height = '20%';
    } else {
      const isSuccess = ping.success;
      barEl.className = isSuccess ? 'bar' : 'bar dim';
      
      if (isSuccess) {
        // Map latency to bar height (0-300ms = 20-95%)
        const height = Math.max(20, Math.min(95, 20 + (ping.latency_ms / 3)));
        barEl.style.height = `${height}%`;
      } else {
        barEl.style.height = '20%';
      }
    }
  }
}

// ── Alert Banner ──
function showAlert(msg) {
  const banner = document.getElementById('alert-banner');
  const alertMsg = document.getElementById('alert-msg');
  if (banner && alertMsg) {
    alertMsg.textContent = msg;
    banner.classList.add('show');
  }
}

function hideAlert() {
  const banner = document.getElementById('alert-banner');
  if (banner) {
    banner.classList.remove('show');
  }
}

// ── Error Display ──
function showError(msg) {
  console.error(msg);
  const banner = document.getElementById('alert-banner');
  const alertMsg = document.getElementById('alert-msg');
  if (banner && alertMsg) {
    alertMsg.textContent = `Error: ${msg}`;
    banner.classList.add('show');
  }
}

// ── Button Handlers ──
async function refreshData() {
  await updateDashboard();
  const btn = document.querySelector('.hbtn.prim');
  if (btn) {
    const original = btn.textContent;
    btn.textContent = 'Refreshed';
    btn.style.opacity = '0.7';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.opacity = '1';
    }, 1000);
  }
}

async function forceRestart() {
  const status = await api.getDeviceStatus();
  if (status.is_offline) {
    alert('Cannot restart: Device is offline');
    return;
  }

  try {
    await api.triggerRestart('USER_MANUAL');
    await updateDashboard();
  } catch (err) {
    showError('Failed to trigger restart: ' + err.message);
  }
}

async function clearLog() {
  const logContainer = document.getElementById('event-log');
  if (logContainer) {
    logContainer.innerHTML = '<div class="log-entry info"><span class="log-time">Now</span><span class="log-tag info-tag">INFO</span><span class="log-msg">Log cleared</span></div>';
  }
}

async function resetAll() {
  if (!confirm('Reset all system data?')) return;
  
  try {
    await api.resetDevice();
    await updateDashboard();
  } catch (err) {
    showError('Failed to reset: ' + err.message);
  }
}

// ── Simulation Handlers ──
async function simulateConnected() {
  try {
    await api.simulateConnected();
    await updateDashboard();
  } catch (err) {
    showError('Simulation failed: ' + err.message);
  }
}

async function simulateFailure() {
  try {
    await api.simulateFailure();
    await updateDashboard();
  } catch (err) {
    showError('Simulation failed: ' + err.message);
  }
}

async function simulateRelay() {
  try {
    await api.simulateRelayRestart();
    await updateDashboard();
  } catch (err) {
    showError('Simulation failed: ' + err.message);
  }
}

// ── Initialize on Load ──
document.addEventListener('DOMContentLoaded', init);