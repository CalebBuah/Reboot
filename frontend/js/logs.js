function appendLog(container, log, message = log.message, tag = log.tag) {
  const row = document.createElement('div');
  row.className = `log-entry ${log.level || 'info'}`;
  const time = document.createElement('span');
  time.className = 'log-time';
  time.textContent = formatTimestamp(log.timestamp);
  const label = document.createElement('span');
  label.className = 'log-tag info-tag';
  label.textContent = tag || 'INFO';
  const text = document.createElement('span');
  text.className = 'log-msg';
  text.textContent = message || '';
  row.append(time, label, text);
  container.appendChild(row);
}

async function loadLogs() {
  const logList = document.getElementById('log-list');
  const relayList = document.getElementById('relay-list');
  const count = document.getElementById('log-count');
  try {
    const [logs, relay] = await Promise.all([api.getLogs(200), api.getRelayHistory(50)]);
    logList.replaceChildren();
    relayList.replaceChildren();
    logs.logs.forEach((log) => appendLog(logList, log));
    relay.events.forEach((event) => appendLog(relayList, { ...event, level: event.success ? 'success' : 'danger' }, `${event.action}: ${event.message}`, event.trigger));
    count.textContent = `${logs.count} events`;
  } catch (error) {
    count.textContent = 'Unavailable';
    const message = document.createElement('p');
    message.className = 'form-error';
    message.textContent = error.message;
    logList.replaceChildren(message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('refresh-logs')?.addEventListener('click', loadLogs);
  loadLogs();
});
