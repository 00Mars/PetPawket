// public/auth.js — stable token/cookie hybrid with stricter identity check

console.info('[auth] stable v2025-11-14r1');

const DEFAULT_CONFIG = {
  login: '/api/auth/login',
  me: '/api/me',
  logout: '/api/auth/logout',
  storageKey: 'authToken',
  expectToken: true,
  logoutFallbacks: ['/api/auth/logout', '/api/logout'],
};

const CFG = (() => {
  const override = (typeof window !== 'undefined' && window.__AUTH_CONFIG) || {};
  return { ...DEFAULT_CONFIG, ...override };
})();

const bus = new EventTarget();
function emit(detail) {
  try { bus.dispatchEvent(new CustomEvent('auth:changed', { detail })); }
  catch (e) { console.warn('[auth] emit error', e); }
}
export function onAuthChange(handler) {
  const h = (e) => handler?.(e.detail);
  bus.addEventListener('auth:changed', h);
  return () => bus.removeEventListener('auth:changed', h);
}

// Token helpers
function getToken() { if (!CFG.expectToken) return ''; try { return localStorage.getItem(CFG.storageKey) || ''; } catch { return ''; } }
function setToken(t) { if (!CFG.expectToken) return; try { if (t) localStorage.setItem(CFG.storageKey, t); } catch {} }
function clearToken() { try { localStorage.removeItem(CFG.storageKey); } catch {} }

export async function authFetch(url, init = {}) {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (CFG.expectToken && token) headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', headers.get('Accept') || 'application/json');
  return fetch(url, { ...init, headers, credentials: 'include', cache: 'no-store' });
}

// Stricter identity extraction
function extractIdentity(data) {
  const email = data?.email || data?.user?.email || data?.customer?.email || '';
  const id = data?.id || data?.user?.id || data?.customer?.id || '';
  return { email: (email || '').trim(), id: String(id || '').trim() };
}

// A user counts as signed in only if /api/me is 200 AND we have email OR id
export async function getSession() {
  if (CFG.expectToken && !getToken()) return { signedIn: false };
  try {
    const res = await authFetch(CFG.me);
    if (!res.ok) {
      if (res.status === 401) { clearToken(); console.info('[auth] 401 from /me -> cleared token'); }
      return { signedIn: false };
    }
    const data = await res.json().catch(() => ({}));
    const ident = extractIdentity(data);
    const fullyIdentified = !!(ident.email || ident.id);
    return {
      signedIn: fullyIdentified,
      customer: fullyIdentified ? { email: ident.email, id: ident.id } : null,
      raw: data
    };
  } catch (err) {
    console.warn('[auth] getSession error:', err);
    return { signedIn: false };
  }
}

export async function login(email, password) {
  console.info('[auth] login start');
  let res, data = {};
  try {
    res = await fetch(CFG.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch (e) {
    emit({ action: 'login-failed', error: 'Network error' });
    throw new Error('Network error');
  }
  try { data = await res.json(); } catch {}

  if (!res.ok) {
    const msg = data?.message || data?.error || `Login failed (${res.status})`;
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }

  if (CFG.expectToken) {
    const token = data?.token || data?.access_token || '';
    if (!token) {
      const msg = 'Login succeeded but no token returned. Set expectToken=false if cookie-only.';
      emit({ action: 'login-failed', error: msg });
      throw new Error(msg);
    }
    setToken(token);
  }

  const session = await getSession();
  if (!session.signedIn) {
    if (CFG.expectToken) clearToken();
    const msg = 'Session validation failed after login (missing identity).';
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }
  emit({ action: 'login', session });
  try { document.dispatchEvent(new CustomEvent('auth:login')); } catch {}
  return session;
}

export async function logout() {
  console.info('[auth] logout start');
  for (const ep of CFG.logoutFallbacks || [CFG.logout]) {
    try {
      const r = await authFetch(ep, { method: 'POST' });
      console.info('[auth] logout endpoint', ep, 'status', r.status);
      break;
    } catch (e) {
      console.warn('[auth] logout endpoint failed', ep, e);
    }
  }
  clearToken();
  const session = await getSession();
  emit({ action: 'logout', session });
  try { document.dispatchEvent(new CustomEvent('auth:logout')); } catch {}
  return session;
}

function toggle(el, show) {
  if (!el) return;
  el.classList.toggle('hidden', !show);
  el.classList.toggle('d-none', !show);
  if (show) el.style.removeProperty('display');
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
  const id = session.customer?.id || '';

  setDataAuthAttr(signedIn);

  document.querySelectorAll('[data-auth="signed-in"]').forEach(el => toggle(el, signedIn));
  document.querySelectorAll('[data-auth="signed-out"]').forEach(el => toggle(el, !signedIn));
  toggle(document.getElementById('auth-menu-user'), signedIn);
  toggle(document.getElementById('auth-menu-guest'), !signedIn);

  const displayName = email || id || ''; // if neither, leave blank
  ['#accountName','.account-name','[data-auth="account-name"]'].forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.textContent = signedIn
        ? (displayName || 'Account')
        : 'Sign in';
    });
  });

  // Generic gated areas
  document.querySelectorAll('.requires-auth,[data-auth-visible="signed-in"]').forEach(el => toggle(el, signedIn));
  document.querySelectorAll('.requires-guest,[data-auth-visible="signed-out"]').forEach(el => toggle(el, !signedIn));

  const statusEl = document.getElementById('auth-status');
  if (statusEl) {
    if (signedIn && displayName) {
      statusEl.textContent = `Signed in as ${displayName}`;
    } else if (signedIn && !displayName) {
      statusEl.textContent = 'Signed in (no profile email/id returned)';
    } else {
      statusEl.textContent = 'You are not signed in.';
    }
  }
  return session;
}

// Global wiring (guarded)
function wireFormsOnce() {
  if (window.__authFormsWired) return;
  window.__authFormsWired = true;

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#loginForm, #login-form, [data-auth="login-form"]');
    if (!form) return;
    e.preventDefault();
    const email = form.querySelector('input[name="email"], input[type="email"]')?.value?.trim() || '';
    const password = form.querySelector('input[name="password"], input[type="password"]')?.value || '';
    const msg = form.querySelector('[data-login-msg]') || document.querySelector('[data-login-msg]');
    try {
      await login(email, password);
      if (msg) msg.textContent = 'Signed in!';
      form.closest('.custom-modal, .modal')?.classList.add('hidden');
      await updateAuthDisplay();
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Login failed';
      else alert(err.message || 'Login failed');
    }
  });

  document.addEventListener('click', async (e) => {
    const out = e.target.closest('#logoutBtn, #logout-btn, [data-action="logout"]');
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

  // Initial paint
  updateAuthDisplay().catch(e => console.warn('[auth] initial paint error', e));
}

wireFormsOnce();