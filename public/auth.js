// public/auth.js — Cookie-based Shopify auth compatibility (no JWT expected)
// MINIMAL PATCH: expectToken=false + resilience when login returns only { ok:true }.
// Keeps prior event system & display logic.

console.info('[auth] cookie-session mode active');

const DEFAULT_CONFIG = {
  login: '/api/auth/login',       // server login that sets shopify_token cookie
  me: '/api/me',
  logout: '/logout',              // server logout clears cookie
  storageKey: 'authToken',        // retained for legacy (may remain empty)
  expectToken: false,             // CRITICAL: do NOT require JWT token
  logoutFallbacks: ['/logout', '/api/logout', '/api/auth/logout'],
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

// Token helpers become no-ops in cookie mode
function getToken() { if (!CFG.expectToken) return ''; try { return localStorage.getItem(CFG.storageKey) || ''; } catch { return ''; } }
function setToken(t) { if (!CFG.expectToken) return; try { if (t) localStorage.setItem(CFG.storageKey, t); } catch {} }
function clearToken() { try { localStorage.removeItem(CFG.storageKey); } catch {} }

export async function authFetch(url, init = {}) {
  const headers = new Headers(init.headers || {});
  // Only attach Authorization if we actually elected to keep expectToken true (legacy)
  if (CFG.expectToken) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Accept', headers.get('Accept') || 'application/json');
  return fetch(url, { ...init, headers, credentials: 'include', cache: 'no-store' });
}

function extractIdentity(data) {
  const email = data?.email || data?.user?.email || data?.customer?.email || '';
  const id    = data?.id || data?.user?.id || data?.customer?.id || '';
  return { email: (email || '').trim(), id: String(id || '').trim() };
}

export async function getSession() {
  // In cookie mode we do NOT bail out just because there is no local token
  try {
    const res = await authFetch(CFG.me);
    if (!res.ok) {
      if (res.status === 401 && CFG.expectToken) {
        clearToken();
        console.info('[auth] 401 from /me; cleared token');
      }
      return { signedIn: false };
    }
    const data = await res.json().catch(() => ({}));
    const ident = extractIdentity(data);
    const ok = !!(ident.email || ident.id);
    return {
      signedIn: ok,
      customer: ok ? { email: ident.email, id: ident.id } : null,
      raw: data
    };
  } catch (err) {
    console.warn('[auth] getSession error:', err);
    return { signedIn: false };
  }
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
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }

  // In cookie mode server does not return token; tolerate missing data.token
  if (CFG.expectToken) {
    const token = data?.token || data?.access_token || '';
    if (!token) {
      const msg = 'Login succeeded but no token returned.';
      emit({ action: 'login-failed', error: msg });
      throw new Error(msg);
    }
    setToken(token);
  }

  const session = await getSession();
  if (!session.signedIn) {
    if (CFG.expectToken) clearToken();
    const msg = 'Session validation failed after login.';
    emit({ action: 'login-failed', error: msg });
    throw new Error(msg);
  }

  emit({ action: 'login', session });
  try { document.dispatchEvent(new CustomEvent('auth:login')); } catch {}
  return session;
}

export async function logout() {
  for (const ep of CFG.logoutFallbacks || [CFG.logout]) {
    try {
      await authFetch(ep, { method: 'POST' });
      break;
    } catch (e) {
      console.warn('[auth] logout endpoint failed', ep, e);
    }
  }
  clearToken(); // harmless in cookie mode
  const session = await getSession();
  emit({ action: 'logout', session });
  try { document.dispatchEvent(new CustomEvent('auth:logout')); } catch {}
  return session;
}

function toggle(el, show) {
  if (!el) return;
  if (show) {
    el.classList.remove('hidden', 'd-none');
    el.hidden = false;
  } else {
    el.classList.add('hidden');
    el.hidden = true;
  }
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

  // Any elements using data-auth markers
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

// Wiring (navbar injects markup later; we allow deferred forms)
function wireFormsOnce() {
  if (window.__authFormsWired) return;
  window.__authFormsWired = true;

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('#loginForm, #login-form, [data-auth="login-form"]');
    if (!form) return;
    e.preventDefault();
    const email = form.querySelector('input[name="email"], input[type="email"]')?.value?.trim() || '';
    const password = form.querySelector('input[name="password"], input[type="password"]')?.value || '';
    const msg = form.querySelector('[data-login-msg]');
    try {
      await login(email, password);
      if (msg) msg.textContent = 'Signed in!';
      form.closest('.custom-modal')?.classList.add('hidden');
      await updateAuthDisplay();
    } catch (err) {
      if (msg) msg.textContent = err.message || 'Login failed';
      else alert(err.message || 'Login failed');
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

  // Initial paint (wait a tick to allow navbar injection)
  setTimeout(() => updateAuthDisplay().catch(e => console.warn('[auth] initial paint error', e)), 50);
}

wireFormsOnce();