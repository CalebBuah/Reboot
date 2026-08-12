// ── System state (single source of truth) ──
let systemState = {
  connected: true,
  state: 'STATE_MONITORING',
  failures: 0,
  restarts: 0,
  uptime: 0,
  relayOn: false,
  ping1: '12ms',
  ping2: '18ms',
  ping3: '200 OK'
};

// ── Navbar toggle ──
const navbarToggle = document.querySelector('.navbar-toggle');
const navbarMenu   = document.querySelector('.navbar-menu');

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

// ── Helpers ──
function formatTime(s) {
  const h   = String(Math.floor(s / 3600)).padStart(2, '0');
  const m   = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

function addLog(type, tag, tagClass, msg) {
  const log   = document.getElementById('event-log');
  const entry = document.createElement('div');
  const now   = new Date().toLocaleTimeString();
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `
    <span class="log-time">${now}</span>
    <span class="log-tag ${tagClass}">${tag}</span>
    <span class="log-msg">${msg}</span>`;
  log.prepend(entry);
  
  // Keep log from growing infinitely (max 50 entries)
  const entries = log.querySelectorAll('.log-entry');
  if (entries.length > 50) {
    entries[entries.length - 1].remove();
  }
}

function clearLog() {
  document.getElementById('event-log').innerHTML = '';
  addLog('info', 'INFO', 'info-tag', 'Log cleared by user.');
}

function showAlert(msg) {
  const banner = document.getElementById('alert-banner');
  document.getElementById('alert-msg').textContent = msg;
  banner.classList.add('show');
}

function hideAlert() {
  document.getElementById('alert-banner').classList.remove('show');
}

// ── Set LED state ──
function setLed(id, stateId, isOn) {
  const led = document.getElementById(id);
  const st  = document.getElementById(stateId);
  if (!led || !st) return;
  led.classList.toggle('off', !isOn);
  st.textContent = isOn ? 'ON' : 'OFF';
  st.className   = `led-state ${isOn ? 'on' : 'off'}`;
}

// ── Render dashboard from state ──
function renderDashboard() {
  const { connected, state, failures, restarts, uptime, relayOn, ping1, ping2, ping3 } = systemState;

  // ── Internet status card ──
  const connEl    = document.getElementById('conn-status');
  const connBadge = document.getElementById('conn-badge');
  const liveLabel = document.getElementById('live-label');
  const liveDot   = document.querySelector('.live-dot');

  if (connected) {
    connEl.textContent    = 'Connected';
    connEl.className      = 'stat-value connected';
    connBadge.textContent = 'All endpoints reachable';
    connBadge.className   = 'stat-badge badge-ok';
    liveLabel.textContent = 'System online';
    liveLabel.style.color = '#22c55e';
    liveDot.style.background = '#22c55e';
    hideAlert();
  } else {
    connEl.textContent    = 'Disconnected';
    connEl.className      = 'stat-value disconnected';
    connBadge.textContent = `${failures} / 3 checks failed`;
    connBadge.className   = 'stat-badge badge-fail';
    liveLabel.textContent = 'System offline';
    liveLabel.style.color = '#ef4444';
    liveDot.style.background = '#ef4444';
    showAlert(`Internet failure detected — ${failures} consecutive checks failed.`);
  }

  // ── Uptime card ──
  document.getElementById('uptime-val').textContent = formatTime(uptime);

  // ── Restarts card ──
  document.getElementById('restart-count').textContent = restarts;

  // ── Relay card ──
  const relayEl    = document.getElementById('relay-state');
  const relayBadge = document.getElementById('relay-badge');
  if (relayOn) {
    relayEl.textContent    = 'Active';
    relayEl.className      = 'stat-value relay-active';
    relayBadge.textContent = 'GPIO 5 — HIGH';
    relayBadge.className   = 'stat-badge badge-active';
  } else {
    relayEl.textContent    = 'Idle';
    relayEl.className      = 'stat-value relay-idle';
    relayBadge.textContent = 'GPIO 5 — LOW';
    relayBadge.className   = 'stat-badge badge-idle';
  }

  // ── Firmware state ──
  const fwEl = document.getElementById('fw-state');
  fwEl.textContent = state;
  fwEl.className =
    state === 'STATE_MONITORING'    ? 'iv state-ok'  :
    state === 'STATE_RECOVERING'    ? 'iv state-err' :
    state === 'STATE_RECOVERY_WAIT' ? 'iv state-rel' :
    state === 'STATE_LIMIT_REACHED' ? 'iv state-err' : 'iv state-ok';

  // ── ESP32 badge ──
  const espBadge = document.getElementById('esp-badge');
  espBadge.textContent = connected ? 'Online' : 'Offline';
  espBadge.className   = connected ? 'panel-tag online' : 'panel-tag';

  // ── LEDs ──
  setLed('led-green', 'ls-green', connected && !relayOn);
  setLed('led-red',   'ls-red',   !connected && !relayOn);
  setLed('led-blue',  'ls-blue',  relayOn);

  // ── Ping badges ──
  function setPing(id, ok, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = ok ? `\u2713 ${val}` : '\u2717 Timeout';
    el.className   = ok ? 'ping-badge ok' : 'ping-badge fail';
  }
  setPing('ping1', connected, ping1);
  setPing('ping2', connected, ping2);
  setPing('ping3', connected, ping3);

  // ── Ping chart ──
  updateBarChart(connected);
}

// ── Ping activity bar chart ──
const barHistory = [1, 1, 1, 1, 0, 1, 1];
function updateBarChart(passed) {
  barHistory.shift();
  barHistory.push(passed ? 1 : 0);
  for (let i = 1; i <= 7; i++) {
    const bar = document.getElementById(`bar${i}`);
    if (!bar) continue;
    const ok = barHistory[i - 1];
    bar.className = ok ? 'bar' : 'bar dim';
    bar.style.height = ok ? `${55 + Math.floor(Math.random() * 40)}%` : '20%';
  }
}

// ── Local uptime ticker ──
setInterval(() => {
  systemState.uptime++;
  document.getElementById('uptime-val').textContent = formatTime(systemState.uptime);
}, 1000);

// ── Refresh button ──
function refreshData() {
  renderDashboard();
  addLog('info', 'INFO', 'info-tag', 'Manual refresh triggered.');

  const btn = document.querySelector('.hbtn.prim');
  if (btn) {
    const original = btn.textContent;
    btn.textContent = '✓ Refreshed';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #4ade80)';
    btn.style.boxShadow  = '0 4px 20px rgba(34,197,94,0.4)';
    setTimeout(() => {
      btn.textContent      = original;
      btn.style.background = '';
      btn.style.boxShadow  = '';
    }, 1000);
  }
}

// ── Force restart button ──
function forceRestart() {
  simulateRelay();
}

// ── Simulation controls ──
function simulateConnected() {
  systemState = {
    connected: true,
    state: 'STATE_MONITORING',
    failures: 0,
    restarts: systemState.restarts,
    uptime: systemState.uptime,
    relayOn: false,
    ping1: '12ms',
    ping2: '18ms',
    ping3: '200 OK'
  };
  renderDashboard();
  addLog('success', 'OK', 'ok-tag', 'Internet connectivity confirmed — all checks passed.');
}

function simulateFailure() {
  systemState = {
    connected: false,
    state: 'STATE_FAILURE_DETECTED',
    failures: 3,
    restarts: systemState.restarts,
    uptime: systemState.uptime,
    relayOn: false,
    ping1: 'timeout',
    ping2: 'timeout',
    ping3: 'timeout'
  };
  renderDashboard();
  addLog('danger', 'FAIL', 'danger-tag', 'Ping 8.8.8.8 — Timeout. Failure counter: 3 / 3.');
}

function simulateRelay() {
  const currentRestarts = systemState.restarts;

  // Step 1: Relay activates
  systemState = {
    ...systemState,
    state: 'STATE_RECOVERING',
    relayOn: true
  };
  renderDashboard();
  addLog('info', 'RELAY', 'relay-tag', 'Relay activated — GPIO 5 HIGH. Router power cut.');

  // Step 2: Relay off, waiting
  setTimeout(() => {
    systemState = {
      ...systemState,
      state: 'STATE_RECOVERY_WAIT',
      relayOn: false,
      restarts: currentRestarts + 1
    };
    renderDashboard();
    addLog('info', 'RELAY', 'relay-tag', 'Relay off — GPIO 5 LOW. Waiting for router boot (60s).');

    // Step 3: Router back online
    setTimeout(() => {
      systemState = {
        connected: true,
        state: 'STATE_MONITORING',
        failures: 0,
        restarts: currentRestarts + 1,
        uptime: systemState.uptime,
        relayOn: false,
        ping1: '14ms',
        ping2: '20ms',
        ping3: '200 OK'
      };
      renderDashboard();
      addLog('success', 'OK', 'ok-tag', 'Router back online — resuming STATE_MONITORING.');
    }, 4000);
  }, 3000);
}

function resetAll() {
  systemState = {
    connected: true,
    state: 'STATE_MONITORING',
    failures: 0,
    restarts: 0,
    uptime: 0,
    relayOn: false,
    ping1: '12ms',
    ping2: '18ms',
    ping3: '200 OK'
  };
  renderDashboard();
  document.getElementById('event-log').innerHTML = '';
  addLog('info', 'INFO', 'info-tag', 'System reset by user.');
}

// ── Initialize ──
renderDashboard();
addLog('info', 'INFO', 'info-tag', 'Dashboard initialized — ready for input.');