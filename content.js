
const navbarToggle = document.querySelector('.navbar-toggle');
const navbarMenu   = document.querySelector('.navbar-menu');

navbarToggle.addEventListener('click', () => {
  navbarToggle.classList.toggle('active');
  navbarMenu.classList.toggle('active');
});

// Close menu when a nav link is clicked (mobile UX)
document.querySelectorAll('.navbar-menu li a').forEach(link => {
  link.addEventListener('click', () => {
    navbarToggle.classList.remove('active');
    navbarMenu.classList.remove('active');
  });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  if (!navbarToggle.contains(e.target) && !navbarMenu.contains(e.target)) {
    navbarToggle.classList.remove('active');
    navbarMenu.classList.remove('active');
  }
});
