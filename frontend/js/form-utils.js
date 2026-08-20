function showFormError(form, message) {
  let error = form.querySelector('.form-error');
  if (!error) {
    error = document.createElement('p');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');
    form.prepend(error);
  }
  error.textContent = message;
  error.hidden = false;
}

function clearFormError(form) {
  const error = form.querySelector('.form-error');
  if (error) {
    error.textContent = '';
    error.hidden = true;
  }
}

function setFormBusy(form, busy) {
  form.querySelectorAll('button, input').forEach((control) => {
    if (control.type !== 'button' || control.dataset.passwordToggle === undefined) {
      control.disabled = busy;
    }
  });
}

function getRequestError(error, fallback) {
  if (error instanceof TypeError) return 'Unable to connect to the Reboot server. Start the backend and try again.';
  return error.message || fallback;
}
