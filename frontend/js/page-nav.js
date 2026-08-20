document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.navbar-toggle');
  const menu = document.querySelector('.navbar-menu');
  const signout = document.getElementById('signout-link');
  if (toggle && menu) toggle.addEventListener('click', () => {
    toggle.classList.toggle('active');
    menu.classList.toggle('active');
  });
  if (signout) signout.addEventListener('click', async (event) => {
    event.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/signin.html';
  });
});
