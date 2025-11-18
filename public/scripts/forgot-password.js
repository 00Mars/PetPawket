const form = document.getElementById('forgotForm');
const msg = document.getElementById('forgotMsg');
const dev = document.getElementById('devResetLink');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  dev.innerHTML = '';
  const email = form.querySelector('input[name="email"]')?.value?.trim() || '';
  if (!email) {
    msg.textContent = 'Please enter your email.';
    return;
  }
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json().catch(() => ({}));
    msg.textContent = 'If an account exists, a reset link has been sent.';
    if (data?.resetLink) {
      // Development convenience
      const a = document.createElement('a');
      a.href = data.resetLink;
      a.textContent = 'Click here to reset your password (DEV)';
      a.rel = 'noopener';
      dev.appendChild(a);
    }
  } catch (err) {
    console.error('forgot-password error:', err);
    msg.textContent = 'Failed to request reset. Please try again.';
  }
});