function updatePasswordToggle(button, input) {
  const visible = input.type === 'text';
  button.setAttribute('aria-pressed', String(visible));
  button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  button.title = visible ? 'Hide password' : 'Show password';
  button.innerHTML = visible
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-3.1 4.1"/><path d="M6.2 6.2C3.1 8.2 1 12 1 12s4 8 11 8a10.8 10.8 0 0 0 2.1-.2"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    updatePasswordToggle(button, input);
    button.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      updatePasswordToggle(button, input);
    });
  });
});
