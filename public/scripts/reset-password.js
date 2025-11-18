function getToken() {
  const u = new URL(window.location.href);
  return u.searchParams.get('token') || '';
}
const form = document.getElementById('resetForm');
const msg = document.getElementById('resetMsg');
const token = getToken();

if (!token) {
  msg.textContent = 'Reset token is missing. Please use the link from your email.';
  form?.classList.add('hidden');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const p1 = form.querySelector('input[name="password"]')?.value || '';
  const p2 = form.querySelector('input[name="confirm"]')?.value || '';
  if (p1.length < 8) {
    msg.textContent = 'Password must be at least 8 characters.';
    return;
  }
  if (p1 !== p2) {
    msg.textContent = 'Passwords do not match.';
    return;
  }
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ token, password: p1 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      msg.textContent = data?.error || 'Failed to reset password.';
      return;
    }
    msg.textContent = 'Password reset! You can now log in.';
    setTimeout(() => { window.location.href = '/login' }, 1500);
  } catch (err) {
    console.error('reset-password error:', err);
    msg.textContent = 'Failed to reset password. Please try again.';
  }
});