function showSettingsMessage(message, isError = false) {
  const state = document.getElementById('settings-state');
  const error = document.getElementById('settings-error');
  state.textContent = isError ? 'Error' : message;
  state.className = isError ? 'panel-tag offline' : 'panel-tag online';
  error.hidden = !isError;
  error.textContent = isError ? message : '';
}

function renderSettings(config) {
  document.getElementById('ping-interval').value = String(config.ping_interval);
  document.getElementById('restart-limit').value = config.restart_limit_per_hour;
  document.getElementById('failure-threshold').value = config.failure_threshold;
  document.getElementById('relay-duration').value = String(config.relay_duration_ms);
  showSettingsMessage('Loaded');
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    renderSettings(await api.getDeviceConfig());
  } catch (error) {
    showSettingsMessage(error.message, true);
  }

  document.getElementById('settings-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api.updateDeviceConfig({
        ping_interval: Number(document.getElementById('ping-interval').value),
        restart_limit_per_hour: Number(document.getElementById('restart-limit').value),
        failure_threshold: Number(document.getElementById('failure-threshold').value),
        relay_duration_ms: Number(document.getElementById('relay-duration').value)
      });
      renderSettings(result.config);
      showSettingsMessage('Saved');
    } catch (error) {
      showSettingsMessage(error.message, true);
    } finally {
      button.disabled = false;
    }
  });
});
