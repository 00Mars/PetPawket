// public/footer.js
console.debug('[footer] module loaded');

const CART_KEY = 'cart';
const LAST_PATH_KEY = 'pp_footer_last_path';

const ROUTE_LABELS = [
  ['/', 'Home'],
  ['/index.html', 'Home'],
  ['/shop.html', 'Shop'],
  ['/packs.html', 'Pawket Packs'],
  ['/packets.html', 'Pawket Packets'],
  ['/picks.html', 'Pawket Picks'],
  ['/account.html', 'Account'],
  ['/charm.html', 'CHARM Foundation'],
  ['/pawket-network.html', 'Pawket Network'],
  ['/community.html', 'Community'],
  ['/pals.html', 'Pawket Pals'],
  ['/loop.html', 'Pawket Passes'],
  ['/order-tracker.html', 'Order Tracker'],
  ['/contact.html', 'Support'],
  ['/privacy.html', 'Privacy and Terms'],
  ['/partner-portal.html', 'Partner Portal'],
];

async function fetchWithFallback(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { credentials: 'same-origin' });
      if (res.ok) return await res.text();
      console.warn(`[footer] fetch ${p} -> ${res.status}`);
    } catch (e) {
      console.warn(`[footer] fetch ${p} failed:`, e);
    }
  }
  throw new Error(`[footer] template not found at any of: ${paths.join(', ')}`);
}

function extractFooterHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const footer = doc.querySelector('footer');
    if (footer) return footer.outerHTML;
    if (doc.body && doc.body.innerHTML.trim()) return doc.body.innerHTML;
  } catch {}
  return html;
}

async function fetchFooterHtml() {
  const pref = window.__PP_PREFETCH?.footer;
  if (pref) {
    try { return await pref; } catch (e) { console.debug('[footer] prefetch failed:', e); }
  }
  return await fetchWithFallback(['/footer.html', '/partials/footer.html', 'footer.html']);
}

function getCartCount() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!Array.isArray(cart)) return 0;
    return cart.reduce((sum, item) => sum + Math.max(1, Number(item?.quantity ?? item?.qty ?? 1) || 1), 0);
  } catch {
    return 0;
  }
}

function toCurrentUrl() {
  return `${location.pathname}${location.search || ''}${location.hash || ''}`;
}

function routeLabel(rawUrl) {
  try {
    const url = new URL(rawUrl || '/', location.href);
    const hit = ROUTE_LABELS.find(([path]) => path === url.pathname);
    if (hit) return hit[1];
    return url.pathname
      .replace(/^\//, '')
      .replace(/\.html$/, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, ch => ch.toUpperCase()) || 'Home';
  } catch {
    return 'Home';
  }
}

function updateFooterCart(root) {
  const count = getCartCount();
  const countEl = root.querySelector('[data-footer-cart-count]');
  const copyEl = root.querySelector('[data-footer-cart-copy]');
  const cartLink = root.querySelector('[data-footer-cart-link]');
  if (countEl) countEl.textContent = String(count);
  if (copyEl) copyEl.textContent = count ? `${count} item${count === 1 ? '' : 's'} ready for checkout` : 'Ready when you are';
  if (cartLink) cartLink.classList.toggle('is-empty', count === 0);
}

function updateLastStop(root) {
  const link = root.querySelector('[data-footer-last-link]');
  const label = root.querySelector('[data-footer-last-label]');
  const current = toCurrentUrl();
  let previous = '';
  try {
    previous = localStorage.getItem(LAST_PATH_KEY) || '';
    if (previous && previous !== current && link && label) {
      link.href = previous;
      label.textContent = routeLabel(previous);
    } else if (link && label) {
      link.href = '/';
      label.textContent = 'Home';
    }
    localStorage.setItem(LAST_PATH_KEY, current);
  } catch {
    if (link && label) {
      link.href = '/';
      label.textContent = 'Home';
    }
  }
}

function highlightCurrentPath(root) {
  const currentPath = location.pathname === '/' ? '/index.html' : location.pathname;
  root.querySelectorAll('[data-footer-path]').forEach(anchor => {
    try {
      const path = new URL(anchor.href, location.href).pathname;
      const isCurrent = path === currentPath || (path === '/index.html' && location.pathname === '/');
      if (isCurrent) anchor.setAttribute('aria-current', 'page');
      else anchor.removeAttribute('aria-current');
    } catch {}
  });
}

function wireJump(root) {
  const form = root.querySelector('[data-footer-jump]');
  if (!form || form.dataset.footerJumpWired === '1') return;
  form.dataset.footerJumpWired = '1';
  const select = form.querySelector('[data-footer-jump-select]');
  const status = form.querySelector('[data-footer-jump-status]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const target = select?.value || '/shop.html';
    if (status) status.textContent = `Opening ${routeLabel(target)}...`;
    window.location.href = target;
  });
}

function wireBackToTop(root) {
  const btn = root.querySelector('[data-footer-top]');
  if (!btn || btn.dataset.footerTopWired === '1') return;
  btn.dataset.footerTopWired = '1';
  btn.addEventListener('click', () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    const nav = document.getElementById('navbar-container') || document.querySelector('main, body');
    try { nav?.focus?.({ preventScroll: true }); } catch {}
  });
}

async function refreshAccountState(root) {
  const el = root.querySelector('[data-footer-account-state]');
  if (!el) return;
  try {
    const res = await fetch('/api/session', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    const signedIn = !!(data?.signedIn || data?.customer?.email || data?.email);
    el.textContent = signedIn ? 'Pets, journals, and progress are ready' : 'Sign in to save pets and journals';
  } catch {
    // Keep the static copy.
  }
}

function wireFooterInteractions(container) {
  const root = container.querySelector('[data-footer-root]') || container.querySelector('footer');
  if (!root || root.dataset.footerWired === '1') return;
  root.dataset.footerWired = '1';

  wireJump(root);
  wireBackToTop(root);
  updateFooterCart(root);
  updateLastStop(root);
  highlightCurrentPath(root);
  refreshAccountState(root);

  document.addEventListener('pp:cart:changed', () => updateFooterCart(root));
  document.addEventListener('pp:cart:add', () => updateFooterCart(root));
  document.addEventListener('auth:login', () => refreshAccountState(root));
  document.addEventListener('auth:logout', () => refreshAccountState(root));
  window.addEventListener('storage', (event) => {
    if (event.key === CART_KEY) updateFooterCart(root);
  });
}

export async function injectFooter() {
  const container = document.getElementById('footer-container');
  if (!container) {
    console.warn('[footer] #footer-container not found; skipping injection');
    return;
  }
  if (container.dataset.ppFooterInjected === '1' || container.querySelector('footer')) {
    console.debug('[footer] already present; skipping injection');
    return;
  }

  try {
    const html = await fetchFooterHtml();
    container.innerHTML = extractFooterHtml(html);
    container.dataset.ppFooterInjected = '1';
    wireFooterInteractions(container);
    try { document.dispatchEvent(new CustomEvent('pp:footer:ready')); } catch {}
    console.log('[footer] injected');
  } catch (e) {
    console.error('[footer] injection failed:', e);
  }
}
