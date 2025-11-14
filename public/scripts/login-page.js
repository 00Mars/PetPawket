// Dedicated login page — delegates to token-based auth.js
import { login, updateAuthDisplay } from '../auth.js';

function getNextUrl() {
  const u = new URL(location.href);
  const next = u.searchParams.get('next');
  return (next && /^\/[^\s]*$/.test(next)) ? next : '/account.html';
}

const form = document.getElementById('login-form') || document.getElementById('loginForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const scope = form;
    const email = scope.querySelector('input[name="email"], input[type="email"]')?.value?.trim() || '';
    const password = scope.querySelector('input[name="password"], input[type="password"]')?.value || '';
    const msg = scope.querySelector('[data-login-msg]') || document.querySelector('[data-login-msg]');
    try {
      await login(email, password);   // stores token and verifies /api/me
      await updateAuthDisplay();      // repaint UI based on real session
      if (msg) msg.textContent = 'Signed in!';
      window.location.assign(getNextUrl());
    } catch (err) {
      if (msg) msg.textContent = err?.message || 'Login failed';
      else alert(err?.message || 'Login failed');
    }
  });
}