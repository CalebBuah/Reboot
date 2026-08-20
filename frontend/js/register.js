const AUTH_API_BASE = window.location.port === '5000' && window.location.protocol !== 'file:'
  ? '/api'
  : 'http://localhost:5000/api';
const DASHBOARD_URL = window.location.port === '5000' && window.location.protocol !== 'file:'
  ? '/dashboard.html'
  : 'http://localhost:5000/dashboard.html';

function togglePassword(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }
}

function handleFile(input) {
  if (input.files && input.files[0]) {
    document.getElementById('upload-icon').textContent = '✅';
    document.getElementById('upload-text').innerHTML = '<strong>' + input.files[0].name + '</strong>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    clearFormError(form);
    submit.disabled = true;
    try {
      const response = await fetch(`${AUTH_API_BASE}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: document.getElementById('first-name').value,
          last_name: document.getElementById('last-name').value,
          email: document.getElementById('email').value,
          password: document.getElementById('new-password').value,
          confirm_password: document.getElementById('confirm-password').value,
          accepted_terms: document.getElementById('terms-and-conditions').checked
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Registration failed');
      window.location.href = DASHBOARD_URL;
    } catch (error) {
      showFormError(form, getRequestError(error, 'Registration failed.'));
      submit.disabled = false;
    }
  });

  const password = document.getElementById('new-password');
  const confirmation = document.getElementById('confirm-password');
  const validateMatch = () => {
    confirmation.setCustomValidity(password.value === confirmation.value ? '' : 'Passwords do not match');
  };
  password.addEventListener('input', validateMatch);
  confirmation.addEventListener('input', validateMatch);

  const modal = document.getElementById('policy-modal');
  const title = document.getElementById('policy-title');
  const terms = document.getElementById('terms-policy');
  const privacy = document.getElementById('privacy-policy');
  document.querySelectorAll('[data-policy]').forEach((button) => {
    button.addEventListener('click', () => {
      const showTerms = button.dataset.policy === 'terms';
      title.textContent = showTerms ? 'Terms of Service' : 'Privacy Policy';
      terms.classList.toggle('hidden', !showTerms);
      privacy.classList.toggle('hidden', showTerms);
      modal.classList.remove('hidden');
    });
  });
  document.querySelectorAll('[data-close-policy]').forEach((element) => {
    element.addEventListener('click', () => modal.classList.add('hidden'));
  });
});
