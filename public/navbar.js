// /public/navbar.js
// current pp-* HTML aware
// - search overlay (server first, client fallback, skeleton)
// - real icon dropdowns for wishlist, cart, orders (pp-dropdown)
// - legacy dropdown toggles still called (if navbar.html has those classes)
// - priority nav (safe no-op on new markup)
// - huey re-trigger
// - no legacy #shop-by injection
// - WILL fetch /navbar.html like before, but if it fails, will wire existing DOM

import { attachNavbarModals } from './navbarModals.js';
import { updateAuthDisplay, logout, login, onAuthChange } from './auth.js';
import { toggleMobileMenu } from './mobileToggle.js';
import { setupDropdownToggles } from './dropdownToggles.js';
import { setupResponsiveMobileMenu } from './mobileRelocation.js';

/* ==========================================================================
   small helpers
   ========================================================================== */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function debounce(fn, ms = 180) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
const byId = (...ids) => {
  for (const id of ids) {
    const el = id ? document.getElementById(id) : null;
    if (el) return el;
  }
  return null;
};

/* ==========================================================================
   optional auth fetch
   ========================================================================== */
export function authFetch(url, options = {}) {
  const token = localStorage.getItem?.('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { credentials: 'include', ...options, headers });
}

/* ==========================================================================
   cart badge
   ========================================================================== */
function ensureCartBadge(root = document) {
  const cartLink = root.querySelector?.('.pp-cart-pill, .cart-count-link, [href="/cart.html"]');
  if (!cartLink) return;
  if (cartLink.querySelector('#cart-count, .cart-count, .cart-badge')) return;
  const badge = document.createElement('span');
  badge.id = 'cart-count';
  badge.className = 'cart-count';
  badge.textContent = '0';
  cartLink.appendChild(badge);
}

/* ==========================================================================
   auth UI
   ========================================================================== */
function wireLogoutButtons(root = document) {
  root.querySelectorAll?.('#logoutBtn, #logout-btn, [data-action="logout"]').forEach((btn) => {
    if (btn.dataset.wiredLogout) return;
    btn.dataset.wiredLogout = '1';
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try { await logout(); await updateAuthDisplay(); }
      catch (err) { console.error('[logout] error:', err); }
    });
  });
}

function wireLoginForm(root = document) {
  const form = root.querySelector?.('#loginForm') || document.getElementById('loginForm');
  if (!form || form.dataset.wiredLogin) return;
  form.dataset.wiredLogin = '1';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]')?.value || '';
    const password = form.querySelector('[name="password"]')?.value || '';
    try { await login(email, password); await updateAuthDisplay(); }
    catch (err) { console.error('[login] error:', err); }
  });
}

/* ==========================================================================
   optional: priority nav (safe no-op on your current HTML)
   ========================================================================== */
function setupPriorityNav(root = document) {
  const container =
    root.getElementById?.('navbar-container') ||
    document.getElementById('navbar-container') ||
    document.querySelector('.pp-nav-inner');
  const navLeft = container?.querySelector('.pp-nav-left, .nav-left');
  const nav = navLeft?.querySelector('.pp-nav-links, .nav-links');
  if (!container || !navLeft || !nav) return;
  if (nav.dataset.priorityNavWired === '1') return;
  nav.dataset.priorityNavWired = '1';

  const initialItems = Array.from(nav.children).filter((li) => li.tagName === 'LI');

  let moreLi = nav.querySelector('li.nav-item.more');
  if (!moreLi) {
    moreLi = document.createElement('li');
    moreLi.className = 'nav-item dropdown more';
    moreLi.innerHTML = `
      <a href="#" class="nav-link" aria-expanded="false">More</a>
      <ul class="dropdown-menu" data-more-menu></ul>
    `;
    nav.appendChild(moreLi);
  }
  const moreMenu = moreLi.querySelector('[data-more-menu]');

  function sortToOriginal(listEl) {
    const kids = Array.from(listEl.children);
    kids.sort((a, b) => initialItems.indexOf(a) - initialItems.indexOf(b));
    kids.forEach((k) => listEl.appendChild(k));
  }
  function restoreAll() {
    sortToOriginal(moreMenu);
    Array.from(moreMenu.children).forEach((li) => nav.insertBefore(li, moreLi));
  }
  function visibleItems() {
    return Array.from(nav.children).filter((li) => li !== moreLi);
  }
  function fits(railWidth) {
    const buffer = 6;
    return nav.scrollWidth + buffer <= railWidth;
  }
  function redistribute() {
    const desktop = window.matchMedia('(min-width: 1281px)').matches;
    if (!desktop) {
      restoreAll();
      moreLi.style.display = 'none';
      return;
    }
    restoreAll();
    moreLi.style.display = 'none';

    const railWidthFresh = navLeft.clientWidth;
    if (fits(railWidthFresh)) return;

    moreLi.style.display = '';

    let guard = 100;
    while (!fits(navLeft.clientWidth) && visibleItems().length > 1 && guard-- > 0) {
      const items = visibleItems();
      const move = items[items.length - 1];
      if (!move) break;
      moreMenu.insertBefore(move, moreMenu.firstChild);
    }
    if (moreMenu.children.length === 0) moreLi.style.display = 'none';
  }

  const ro = new ResizeObserver(() => redistribute());
  try { ro.observe(navLeft); } catch {}
  window.addEventListener('resize', redistribute, { passive: true });
  window.addEventListener('load', () => setTimeout(redistribute, 0), { once: true });
  requestAnimationFrame(redistribute);
}

/* ==========================================================================
   SEARCH OVERLAY
   matches your current HTML (#searchOverlay) and CSS
   ========================================================================== */
function getOverlayEl() {
  return byId('searchOverlay', 'search-overlay');
}

function highlight(text, q) {
  if (!text || !q) return escapeHtml(text || '');
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`, 'ig');
    return escapeHtml(text).replace(re, '<span class="mark">$1</span>');
  } catch {
    return escapeHtml(text);
  }
}

/* ===================== Pet image helpers (same logic as old file) ===================== */
function isHttpish(s) {
  return typeof s === 'string' && (/^https?:\/\//i.test(s) || s.startsWith('/'));
}
function keyImpliesImage(key = '') {
  return /(image|photo|avatar|picture|thumb|thumbnail|media)/i.test(key);
}
function looksLikeImageUrlLoose(s) {
  if (!isHttpish(s)) return false;
  if (/^data:image\//i.test(s)) return true;
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|#|$)/i.test(s)) return true;
  return true;
}
function firstImageLike(val, depth = 0) {
  if (!val || depth > 3) return '';
  if (typeof val === 'string' && looksLikeImageUrlLoose(val)) return val;
  if (Array.isArray(val)) {
    for (const x of val) {
      const f = firstImageLike(x, depth + 1);
      if (f) return f;
    }
    return '';
  }
  if (typeof val === 'object') {
    const direct =
      val.url || val.src || val.href ||
      val.imageUrl || val.avatarUrl || val.pictureUrl || val.thumbnailUrl || val.thumbUrl ||
      (val.image && (val.image.url || val.image.src)) ||
      (val.photo && (val.photo.url || val.photo.src));
    if (looksLikeImageUrlLoose(direct)) return direct;
    for (const k of Object.keys(val)) {
      const v = val[k];
      if (typeof v === 'string') {
        if (keyImpliesImage(k) && isHttpish(v)) return v;
        if (looksLikeImageUrlLoose(v)) return v;
      }
      const f = firstImageLike(v, depth + 1);
      if (f) return f;
    }
  }
  return '';
}
function getPetPhoto(p) {
  const known =
    p.photoUrl ||
    p.imageUrl ||
    p.avatarUrl ||
    p.pictureUrl ||
    p.thumbnailUrl ||
    p.thumbUrl ||
    (Array.isArray(p.photos) && (p.photos[0]?.url || p.photos[0]?.src));
  if (isHttpish(known)) return known;
  const guessed = firstImageLike(p);
  return isHttpish(guessed) ? guessed : '';
}

/* render search results */
function renderResults(container, payload, { q, cat = 'all' }) {
  if (!container) return;
  const pets = payload?.pets || [];
  const journal = payload?.journal || [];
  const products = payload?.products || [];
  const sections = [];

  if ((cat === 'pets' || cat === 'all') && pets.length) {
    sections.push(`
      <div class="section-title">Pets</div>
      ${pets.map((p) => {
        const name = p.name || 'Pet';
        const photo = getPetPhoto(p);
        const initials = name.slice(0, 1).toUpperCase();
        const meta = [p.species, p.breed].filter(Boolean).join(' • ');
        return `
        <a class="result-item" href="/account.html#pets" tabindex="0" role="option">
          ${
            photo
              ? `<img class="result-thumb" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer">`
              : `<div class="result-thumb" aria-hidden="true">${escapeHtml(initials)}</div>`
          }
          <div class="result-body">
            <div class="title">${highlight(name, q)} <span class="tag">Profile</span></div>
            <div class="meta">${escapeHtml(meta)}</div>
          </div>
          <div class="price"><i class="bi bi-heart"></i></div>
        </a>`;
      }).join('') }
    `);
  }

  if ((cat === 'journal' || cat === 'all') && journal.length) {
    sections.push(`
      <div class="section-title">Journal</div>
      ${journal.map((e) => {
        const text = e.text || '';
        const snippet = text.length > 140 ? text.slice(0, 140) + '…' : text;
        return `
        <a class="result-item" href="/account.html#journal" tabindex="0" role="option">
          <div class="result-thumb" aria-hidden="true"><i class="bi bi-journals"></i></div>
          <div class="result-body">
            <div class="title">${highlight(e.petName || 'Pet', q)} <span class="tag">Entry</span></div>
            <div class="meta">${highlight(snippet, q)} ${e.mood ? `• Mood: ${escapeHtml(e.mood)}` : ''}</div>
          </div>
          <div class="price"><i class="bi bi-arrow-right-short"></i></div>
        </a>`;
      }).join('') }
    `);
  }

  if ((cat === 'products' || cat === 'all') && products.length) {
    sections.push(`
      <div class="section-title">Products</div>
      ${products.map((p) => {
        const img = p.featuredImage?.url || p.image || '';
        const price = p.price?.amount ?? p.variants?.[0]?.price ?? p.price;
        const handle = p.handle || p.id || '';
        return `
        <a class="result-item" href="/products/${encodeURIComponent(handle)}" tabindex="0" role="option">
          <img class="result-thumb" src="${escapeHtml(img || '/assets/images/placeholder.png')}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <div class="result-body">
            <div class="title">${highlight(p.title || 'Product', q)} ${p.availableForSale ? '' : '<span class="tag">Out</span>'}</div>
            <div class="meta">${p.productType ? escapeHtml(p.productType) : (p.type ? escapeHtml(p.type) : 'Product')}</div>
          </div>
          <div class="price">${Number.isFinite(Number(price)) ? `$${Number(price).toFixed(2)}` : ''}</div>
        </a>`;
      }).slice(0, 12).join('') }
    `);
  }

  container.innerHTML = sections.join('') || `
    <div class="section-title">No results</div>
    <div class="result-item">
      <div class="result-thumb">✦</div>
      <div class="result-body">
        <div class="title">No results for “${escapeHtml(q)}”.</div>
        <div class="meta">Try another keyword.</div>
      </div>
    </div>
  `;
}

/* client-side fallback */
async function clientFallbackSearch(q, catVal, results) {
  try {
    const prodMod = await import('./products.js');
    try { await prodMod.fetchAllProducts?.(); } catch {}
    const all = prodMod.allProducts || [];
    const qq = (q || '').toLowerCase();
    const filtered = all.filter((p) => {
      const t = (p.title || '').toLowerCase();
      const type = (p.type || p.productType || '').toLowerCase();
      const matchQ = !qq || t.includes(qq) || type.includes(qq);
      const matchCat = catVal === 'all' || catVal === 'products';
      return matchQ && matchCat;
    });
    renderResults(results, { products: filtered, pets: [], journal: [] }, { q, cat: 'products' });
    wireKeyboardNav(results);
  } catch (err) {
    console.warn('[search:fallback] failed:', err);
  }
}

/* keyboard nav inside results */
function wireKeyboardNav(container) {
  if (!container) return;
  const items = [...container.querySelectorAll('.result-item')];
  if (!items.length) return;
  let idx = 0;
  const focusItem = (i) => {
    idx = (i + items.length) % items.length;
    items[idx].focus();
    items[idx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  container.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(idx - 1); }
    else if (e.key === 'Enter') {
      const a = document.activeElement?.closest('.result-item');
      if (a && a.getAttribute('href')) window.location.href = a.getAttribute('href');
    }
  }, { passive: false });
}

/* wire overlay once */
function wireSearchOverlayOnce() {
  const overlay = getOverlayEl();
  if (!overlay || overlay.dataset.wiredOverlay) return;
  overlay.dataset.wiredOverlay = '1';

  const input = overlay.querySelector('#searchInput');
  const results = overlay.querySelector('#searchResults, .search-results');
  const closeBtn = overlay.querySelector('#searchCloseBtn, .search-close');
  const goBtn = overlay.querySelector('#searchGo');
  const catSel = overlay.querySelector('#searchCategory');

  const setSkeleton = () => {
    if (!results) return;
    const block = (i) => `
      <div class="result-item">
        <div class="result-thumb skeleton sk-thumb"></div>
        <div class="result-body" style="display:flex;flex-direction:column;gap:6px;">
          <div class="skeleton sk-line" style="width:${70 + i * 5}%"></div>
          <div class="skeleton sk-line" style="width:${40 + i * 2}%"></div>
        </div>
      </div>`;
    results.innerHTML = `<div class="section-title">Searching…</div>${block(1)}${block(2)}${block(3)}`;
  };

  overlay.addEventListener('click', (e) => {
    const card = overlay.querySelector('.search-card');
    if (card && !card.contains(e.target)) closeSearchOverlay();
  });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeSearchOverlay(); });

  const runSearch = debounce(async () => {
    const q = (input?.value || '').trim();
    if (!q) { if (results) results.innerHTML = ''; return; }
    setSkeleton();

    let usedFallback = false;
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        const hasAny = (data?.products?.length || data?.pets?.length || data?.journal?.length);
        if (hasAny) {
          renderResults(results, data, { q, cat: catSel?.value || 'all' });
          wireKeyboardNav(results);
        } else {
          usedFallback = true;
        }
      } else {
        usedFallback = true;
      }
    } catch {
      usedFallback = true;
    }

    if (usedFallback) {
      await clientFallbackSearch(q, catSel?.value || 'all', results);
    }
  }, 240);

  if (input) {
    input.addEventListener('input', runSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
  }
  if (goBtn) goBtn.addEventListener('click', (e) => { e.preventDefault(); runSearch(); });
  if (catSel) catSel.addEventListener('change', runSearch);

  document.addEventListener('keydown', (e) => {
    const isMac = (navigator.platform || '').toUpperCase().includes('MAC');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearchOverlay(); }
    const tag = document.activeElement?.tagName;
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(tag || '')) { e.preventDefault(); openSearchOverlay(); }
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) { e.preventDefault(); closeSearchOverlay(); }
  });
}

/* open/close */
function openSearchOverlay() {
  const overlay = getOverlayEl();
  if (!overlay) return;
  overlay.classList.remove('hidden');
  const input = overlay.querySelector('#searchInput');
  const results = overlay.querySelector('#searchResults, .search-results');
  if (input && results) {
    input.value = '';
    results.innerHTML = '';
    setTimeout(() => input.focus(), 0);
  }
  document.documentElement.style.overflow = 'hidden';
  wireSearchOverlayOnce();
}
function closeSearchOverlay() {
  const overlay = getOverlayEl();
  if (!overlay) return;
  overlay.classList.add('hidden');
  const results = overlay.querySelector('#searchResults, .search-results');
  if (results) results.innerHTML = '';
  document.documentElement.style.overflow = '';
}

/* ==========================================================================
   pp-dropdowns (wishlist, cart, orders) — for .pp-dropdown
   ========================================================================== */
function wirePPDropdowns(root = document) {
  const dropdowns = root.querySelectorAll('.pp-dropdown');
  const closeAll = () => {
    dropdowns.forEach((d) => {
      const m = d.querySelector('.dropdown-menu, .icon-dropdown-menu');
      if (m) {
        m.setAttribute('hidden', '');
        d.classList.remove('open');
      }
    });
  };
  dropdowns.forEach((dd) => {
    const btn = dd.querySelector('button, .pp-icon-btn, [aria-controls]');
    const menu = dd.querySelector('.dropdown-menu, .icon-dropdown-menu');
    if (!btn || !menu) return;
    if (btn.dataset.wiredPPDD === '1') return;
    btn.dataset.wiredPPDD = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isHidden = menu.hasAttribute('hidden');
      closeAll();
      if (isHidden) {
        menu.removeAttribute('hidden');
        dd.classList.add('open');
      }
    });
  });
  document.addEventListener('click', closeAll);
}

/* ==========================================================================
   huey animation re-trigger
   ========================================================================== */
function wireHueyAnimation(root = document) {
  const frame = root.querySelector('#pp-logo-frame');
  const huey = root.querySelector('#huey');
  if (!huey) return;
  const trigger = () => {
    huey.classList.remove('huey-animate');
    void huey.offsetWidth; // reflow
    huey.classList.add('huey-animate');
  };
  frame?.addEventListener('pointerenter', trigger);
  frame?.addEventListener('focusin', trigger);
  setTimeout(trigger, 350);
}

/* ==========================================================================
   subnav active state
   ========================================================================== */
function wirePPSubnav(root = document) {
  const bar = root.querySelector('.pp-subnav .pp-subnav-inner');
  if (!bar || bar.dataset.wiredSubnav === '1') return;
  bar.dataset.wiredSubnav = '1';
  bar.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    bar.querySelectorAll('a.active').forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
  });
}

/* ==========================================================================
   global delegated click to open search
   ========================================================================== */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pp="search"], [data-action="open-search"], .search-toggle, .nav-search-btn, [aria-controls="searchOverlay"]');
  if (!btn) return;
  e.preventDefault();
  openSearchOverlay();
});

/* ==========================================================================
   main wiring that runs AFTER we have navbar HTML (either fetched or inline)
   ========================================================================== */
function wireNavbar(container = document) {
  // modals + auth
  attachNavbarModals?.();
  onAuthChange?.(updateAuthDisplay);
  updateAuthDisplay?.();
  wireLogoutButtons(container);
  wireLoginForm(container);

  // cart
  ensureCartBadge(container);

  // dropdowns: legacy + new pp-dropdowns
  setupDropdownToggles?.();     // for any .nav-item.dropdown / .icon-dropdown in fetched navbar.html
  wirePPDropdowns(container);   // for your .pp-dropdown buttons

  // search overlay hot wiring
  wireSearchOverlayOnce();

  // priority nav (no-op if no .nav-links)
  setupPriorityNav(document);

  // subnav
  wirePPSubnav(document);

  // huey
  wireHueyAnimation(container);

  // mobile
  setupResponsiveMobileMenu?.();
  const toggles = container.querySelectorAll('.mobile-menu-toggle');
  toggles.forEach((t) => t.addEventListener('click', toggleMobileMenu));

  // mark touch
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  }

  // signal
  try { document.dispatchEvent(new CustomEvent('pp:navbar:ready')); } catch {}
}

/* ==========================================================================
   export: injectNavbar
   still fetches /navbar.html (like your original), but if that fails we just
   wire whatever is already on the page
   ========================================================================== */
export function injectNavbar(callback) {
  fetch('/navbar.html', { credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((html) => {
      let container = document.getElementById('navbar-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'navbar-container';
        document.body.prepend(container);
      }
      container.innerHTML = html;

      requestAnimationFrame(() => {
        wireNavbar(container);
        try { callback?.(); } catch (e) { console.warn('[injectNavbar callback]', e); }
      });
    })
    .catch((err) => {
      console.error('[injectNavbar] Injection failed, wiring existing markup:', err);
      // fall back to whatever HTML is already in the page (your current inline navbar.html)
      requestAnimationFrame(() => {
        wireNavbar(document);
        try { callback?.(); } catch (e) { console.warn('[injectNavbar callback]', e); }
      });
    });
}
