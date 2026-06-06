function handleReset(e) {
  e.preventDefault();
  const email = document.getElementById('reset-email').value;
  if (!email) return;
  document.getElementById('forgot-form').classList.add('hidden');
  document.getElementById('sent-email').textContent = email;
  document.getElementById('success-msg').classList.add('visible');
}
