// public/auth.js — Robust hybrid (JWT + cookie) client session handling
// Behavior:
// - If a JWT exists locally, prefer /api/me with Authorization.
// - If JWT is missing or invalid (401), fall back to /api/session (cookie-based).
// - Never spin indefinitely: always resolve a session and update the UI.

console.info('[auth] hybrid client mode: JWT preferred, cookie fallback');

const DEFAULT_CONFIG = {
  login: '/api/auth/login',
  signup: '/api/auth/signup',
  me: '/api/me',
  session: '/api/session',
  logout: '/logout',
  storageKey: 'authToken',       // used only when server returns a JWT
  logoutFallbacks: ['/logout', '/api/logout', '/api/auth/logout'],
};

const CFG = (() => {
  const override = (typeof window !== 'undefined' && window.__AUTH_CONFIG) || {};
  return { ...DEFAULT_CONFIG, ...override };
})();

const bus = new EventTarget();
let sessionCache = null;
let sessionCacheAt = 0;
const SESSION_CACHE_MS = 30 * 1000;

function emit(detail) {
  try { bus.dispatchEvent(new CustomEvent('auth:changed', { detail })); }
  catch (e) { console.warn('[auth] emit error', e); }
}
export function onAuthChange(handler) {
  const h = (e) => handler?.(e.detail);
  bus.addEventListener('auth:changed', h);
  return () => bus.removeEventListener('auth:changed', h);
}

// -------------------------------
// DB health banner (login modal)
// -------------------------------
function ensureLoginDbBanner() {
  const modal = document.getElementById('loginModal');
  if (!modal) return null;
  let banner = modal.querySelector('[data-login-db-banner]');
  if (!banner) {
    banner = document.createElement('div');
    banner.setAttribute('data-login-db-banner', '1');
    banner.setAttribute('role', 'alert');
    banner.className = 'pp-login-banner hidden';
    banner.textContent = 'Database is offline. Please start Postgres and try again.';
    const form = modal.querySelector('form');
    if (form) form.insertAdjacentElement('beforebegin', banner);
    else modal.insertAdjacentElement('afterbegin', banner);
  }
  return banner;
}

function setLoginDbBanner(message, show) {
  const banner = ensureLoginDbBanner();
  if (!banner) return;
  if (message) banner.textContent = message;
  if (show) {
    banner.classList.remove('hidden');
    banner.hidden = false;
  } else {
    banner.classList.add('hidden');
    banner.hidden = true;
  }
}

async function checkDbHealth() {
  const banner = ensureLoginDbBanner();
  if (!banner) return;
  try {
    const res = await fetch('/health/db', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      setLoginDbBanner('', false);
    } else {
      setLoginDbBanner(data?.error || 'Database is offline. Please start Postgres and try again.', true);
    }
  } catch {
    setLoginDbBanner('Database is offline. Please start Postgres and try again.', true);
  }
}

// JWT token helpers
function getToken() { try { return localStorage.getItem(CFG.storageKey) || ''; } catch { return ''; } }
function setToken(t) { try { if (t) localStorage.setItem(CFG.storageKey, t); else localStorage.removeItem(CFG.storageKey); } catch {} }
function clearToken() { setToken(''); }
function cacheSession(session) {
  sessionCache = session || { signedIn: false };
  sessionCacheAt = Date.now();
  return sessionCache;
}
function clearSessionCache() {
  sessionCache = null;
  sessionCacheAt = 0;
}

export async function authFetch(url, init = {}) {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', headers.get('Accept') || 'application/json');
  return fetch(url, { ...init, headers, credentials: 'include', cache: 'no-store' });
}

function extractIdentity(data) {
  const email = data?.email || data?.user?.email || data?.customer?.email || '';
  const id    = data?.id || data?.user?.id || data?.customer?.id || '';
  return { email: (email || '').trim(), id: String(id || '').trim() };
}

async function getSessionViaMe() {
  const res = await authFetch(CFG.me);
  if (!res.ok) return { ok: false, status: res.status };
  const data = await res.json().catch(() => ({}));
  const ident = extractIdentity(data);
  const ok = !!(ident.email || ident.id);
  return ok ? { ok: true, customer: { email: ident.email, id: ident.id }, raw: data }
            : { ok: false, status: 200 };
}

async function getSessionViaCookie() {
  try {
    const res = await fetch(CFG.session, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return { ok: false, status: res.status };
    const data = await res.json().catch(() => ({}));
    if (data?.signedIn) {
      const email = data.email || data.customer?.email || '';
      const id = data.customer?.id || '';
      return { ok: true, customer: { email, id }, raw: data };
    }
    return { ok: false, status: 200 };
  } catch {
    return { ok: false, status: 0 };
  }
}

export async function getSession({ force = false } = {}) {
  if (!force && sessionCache && (Date.now() - sessionCacheAt) < SESSION_CACHE_MS) {
    return sessionCache;
  }

  // 1) If we have a token, try /api/me
  const token = getToken();
  if (token) {
    const me = await getSessionViaMe();
    if (me.ok) return cacheSession({ signedIn: true, customer: me.customer, raw: me.raw });
    if (me.status === 401) {
      // Token invalid: clear it and fall back to cookie session
      clearToken();
    } // else: try cookie session anyway
  }

  // 2) No token or invalid token: try cookie session
  const ck = await getSessionViaCookie();
  if (ck.ok) return cacheSession({ signedIn: true, customer: ck.customer, raw: ck.raw });

  // 3) Out of options
  return cacheSession({ signedIn: false });
}

export async function login(email, password) {
  let res, data = {};
  try {
    res = await fetch(CFG.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    emit({ action: 'login-failed', error: 'Network error' });
    throw new Error('Network error');
  }
  try { data = await res.json(); } catch {}

  if (!res.ok || data?.ok === false) {
    const msg = data?.error || data?.message || `Login failed (${res.status})`;
    if (data?.code === 'DB_UNAVAILABLE' || res.status === 503) {
      setLoginDbBanner(msg, true);
    }
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }

  // Store JWT if provided (site-local auth)
  const token = data?.token || data?.access_token || '';
  if (token) setToken(token);

  // Validate final session via JWT-first, then cookie fallback
  clearSessionCache();
  const session = await getSession({ force: true });
  if (!session.signedIn) {
    clearToken();
    const msg = 'Session validation failed after login.';
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }

  emit({ action: 'login', session });
  try { document.dispatchEvent(new CustomEvent('auth:login')); } catch {}
  return session;
}

export async function signup({ email, password, firstName = '', lastName = '' } = {}) {
  let res, data = {};
  try {
    res = await fetch(CFG.signup, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName }),
      cache: 'no-store',
    });
  } catch {
    emit({ action: 'signup-failed', error: 'Network error' });
    throw new Error('Network error');
  }
  try { data = await res.json(); } catch {}

  if (!res.ok || data?.ok === false) {
    const msg = data?.error || data?.message || `Signup failed (${res.status})`;
    emit({ action: 'signup-failed', error: msg });
    throw new Error(msg);
  }

  const token = data?.token || data?.access_token || '';
  if (token) setToken(token);

  clearSessionCache();
  const session = await getSession({ force: true });
  if (!session.signedIn) {
    clearToken();
    const msg = 'Session validation failed after signup.';
    emit({ action: 'signup-failed', error: msg });
    throw new Error(msg);
  }

  emit({ action: 'signup', session });
  try { document.dispatchEvent(new CustomEvent('auth:signup')); } catch {}
  return session;
}

export async function logout() {
  for (const ep of CFG.logoutFallbacks || [CFG.logout]) {
    try { await authFetch(ep, { method: 'POST' }); break; }
    catch (e) { console.warn('[auth] logout endpoint failed', ep, e); }
  }
  clearToken();
  clearSessionCache();
  const session = await getSession({ force: true });
  emit({ action: 'logout', session });
  try { document.dispatchEvent(new CustomEvent('auth:logout')); } catch {}
  return session;
}

function toggle(el, show) {
  if (!el) return;
  if (show) { el.classList.remove('hidden', 'd-none'); el.hidden = false; }
  else { el.classList.add('hidden'); el.hidden = true; }
}

function hideContainingModal(form) {
  const modal = form?.closest?.('.custom-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.classList.add('hidden');
  modal.hidden = true;
}

function ensureFormMessage(form, attrName, className = 'small text-danger mt-2') {
  let msg = form?.querySelector?.(`[${attrName}]`);
  if (!msg && form) {
    msg = document.createElement('div');
    msg.setAttribute(attrName, '');
    msg.className = className;
    msg.setAttribute('aria-live', 'polite');
    const button = form.querySelector('button[type="submit"], button');
    if (button) button.insertAdjacentElement('beforebegin', msg);
    else form.appendChild(msg);
  }
  return msg;
}

function setDataAuthAttr(signedIn) {
  const val = signedIn ? 'signed-in' : 'signed-out';
  document.documentElement?.setAttribute('data-auth', val);
  const body = document.body;
  if (body) {
    body.setAttribute('data-auth', val);
    body.classList.toggle('authenticated', signedIn);
    body.classList.toggle('guest', !signedIn);
  }
}

export async function updateAuthDisplay() {
  const session = await getSession();
  const signedIn = !!session.signedIn;
  const email = session.customer?.email || '';
  const id    = session.customer?.id || '';
  const displayName = email || id || '';

  setDataAuthAttr(signedIn);
  toggle(document.getElementById('auth-menu-user'), signedIn);
  toggle(document.getElementById('auth-menu-guest'), !signedIn);

  document.querySelectorAll('[data-auth="signed-in"]').forEach(el => toggle(el, signedIn));
  document.querySelectorAll('[data-auth="signed-out"]').forEach(el => toggle(el, !signedIn));

  ['#accountName','.account-name','[data-auth="account-name"]'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.textContent = signedIn ? (displayName || 'Account') : 'Sign in';
    });
  });

  const statusEl = document.getElementById('auth-status');
  if (statusEl) {
    if (signedIn && displayName) statusEl.textContent = `Signed in as ${displayName}`;
    else if (signedIn)           statusEl.textContent = 'Signed in';
    else                         statusEl.textContent = 'You are not signed in.';
  }
  return session;
}

// Wire login/logout and initial paint
(function wireFormsOnce() {
  if (window.__authFormsWired) return;
  window.__authFormsWired = true;

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#loginForm, #login-form, [data-auth="login-form"]');
    if (!form) return;
    e.preventDefault();
    const email = form.querySelector('input[name="email"], input[type="email"]')?.value?.trim() || '';
    const password = form.querySelector('input[name="password"], input[type="password"]')?.value || '';
    const msg = ensureFormMessage(form, 'data-login-msg');
    if (msg) msg.textContent = '';
    try {
      await login(email, password);
      if (msg) msg.textContent = 'Signed in!';
      hideContainingModal(form);
      await updateAuthDisplay();
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Login failed';
    }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#signupForm, #signup-form, [data-auth="signup-form"]');
    if (!form) return;
    e.preventDefault();
    const email = form.querySelector('input[name="email"], input[type="email"]')?.value?.trim() || '';
    const password = form.querySelector('input[name="password"], input[type="password"]')?.value || '';
    const confirm = form.querySelector('input[name="confirmPassword"], input[name="confirm"], [data-auth="confirm-password"]')?.value || '';
    const firstName = form.querySelector('input[name="firstName"], input[name="first_name"]')?.value?.trim() || '';
    const lastName = form.querySelector('input[name="lastName"], input[name="last_name"]')?.value?.trim() || '';
    const msg = ensureFormMessage(form, 'data-signup-msg');

    if (msg) msg.textContent = '';
    if (password.length < 8) {
      if (msg) msg.textContent = 'Password must be at least 8 characters.';
      return;
    }
    if (confirm && password !== confirm) {
      if (msg) msg.textContent = 'Passwords do not match.';
      return;
    }

    try {
      await signup({ email, password, firstName, lastName });
      if (msg) msg.textContent = 'Account created!';
      hideContainingModal(form);
      await updateAuthDisplay();
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Signup failed';
    }
  });

  document.addEventListener('click', async (e) => {
    const out = e.target.closest('#logout-btn, #logoutBtn, [data-action="logout"]');
    if (!out) return;
    e.preventDefault();
    try {
      await logout();
      await updateAuthDisplay();
    } catch (err) {
      console.warn('[auth] logout error', err);
    }
  });

  onAuthChange(async () => { await updateAuthDisplay(); });
  setTimeout(() => updateAuthDisplay().catch(e => console.warn('[auth] initial paint error', e)), 50);
})();

// Trigger DB health check when the login modal opens
document.addEventListener('click', (e) => {
  const openLogin = e.target.closest('[data-toggle="login-modal"]');
  if (!openLogin) return;
  setTimeout(() => checkDbHealth(), 50);
});

// Also check once on boot in case the modal is already visible
setTimeout(() => checkDbHealth(), 300);
