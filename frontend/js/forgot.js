const AUTH_API_BASE = window.location.port === '5000' && window.location.protocol !== 'file:'
  ? '/api'
  : 'http://localhost:5000/api';

async function handleReset(e) {
  e.preventDefault();
  const form = document.getElementById('forgot-form');
  const email = document.getElementById('reset-email').value;
  if (!email) return;

  try {
    const response = await fetch(`${AUTH_API_BASE}/auth/forgot-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to request reset');

    form.classList.add('hidden');
    document.getElementById('sent-email').textContent = email;
    document.getElementById('success-msg').classList.add('visible');

  } catch (error) {
    showFormError(form, getRequestError(error, 'Unable to request a password reset.'));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('reset-password-form');
  if (!form) return;

  const tokenFromLink = new URLSearchParams(window.location.search).get('token');
  if (tokenFromLink) {
    document.getElementById('forgot-form').classList.add('hidden');
    document.getElementById('success-msg').classList.add('visible');
    document.getElementById('reset-token').value = tokenFromLink;
    form.classList.remove('hidden');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${AUTH_API_BASE}/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: document.getElementById('reset-token').value,
          password: document.getElementById('replacement-password').value
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Password reset failed');
      showFormError(form, 'Password reset successfully. Redirecting to sign in...');
      window.location.href = '/signin.html';
    } catch (error) {
      showFormError(form, getRequestError(error, 'Password reset failed.'));
    }
  });
});
