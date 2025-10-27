// public/navbar.js — navbar injection + search overlay + small UX polish
// - Overlay now has a client-side fallback if /api/search fails or returns no items.
// - Pets in overlay now show thumbnails when any plausible image URL is present (supports extensionless/signed URLs).
// - Priority+ nav overflow is built-in: long left-rail link lists auto-collapse into a "More" dropdown on desktop,
//   restore when space allows, and fully defer to the mobile drawer ≤1280px (no duplicate nav items).

import { attachNavbarModals } from './navbarModals.js';
import { updateAuthDisplay, logout, login, onAuthChange } from './auth.js';
import { toggleMobileMenu } from './mobileToggle.js';
import { setupDropdownToggles } from './dropdownToggles.js';
import { setupResponsiveMobileMenu } from './mobileRelocation.js';

// ------- small helpers -------
function escapeHtml(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function debounce(fn, ms=180){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
const byId = (...ids) => { for (const id of ids) { const el = id ? document.getElementById(id) : null; if (el) return el; } return null; };
const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);

// Optional helper (cookie auth is default; this only adds Bearer if present)
export function authFetch(url, options = {}) {
  const token = localStorage.getItem?.('authToken'); // may be null
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(url, { credentials: 'include', ...options, headers });
}

// -------------------------------
// Cart badge (robust: waits if needed)
// -------------------------------
function ensureCartBadge(root = document) {
  const cartLink = root.querySelector?.('.cart-link, [href="/cart.html"]');
  if (!cartLink) return;
  if (cartLink.querySelector('#cart-count, .cart-count, .cart-badge')) return;
  const badge = document.createElement('span');
  badge.className = 'cart-count';
  badge.id = 'cart-count';
  badge.textContent = '0';
  cartLink.appendChild(badge);
}

// -------------------------------
// Auth UI wiring (minimal)
// -------------------------------
function wireLogoutButtons(root=document){
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

function wireLoginForm(root=document){
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

/* ========================================================================
   Priority+ overflow controller for the left nav rail (desktop only)
======================================================================== */
function setupPriorityNav(root = document) {
  const container = root.getElementById ? root.getElementById('navbar-container') : document.getElementById('navbar-container');
  const navLeft = container?.querySelector('.nav-left');
  const nav = navLeft?.querySelector('.nav-links');
  if (!container || !navLeft || !nav) return;

  if (nav.dataset.priorityNavWired === '1') return;
  nav.dataset.priorityNavWired = '1';

  const initialItems = Array.from(nav.children).filter(li => li.tagName === 'LI');

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
    kids.forEach(k => listEl.appendChild(k));
  }

  function restoreAll() {
    sortToOriginal(moreMenu);
    Array.from(moreMenu.children).forEach((li) => nav.insertBefore(li, moreLi));
  }

  function visibleItems() {
    return Array.from(nav.children).filter(li => li !== moreLi);
  }

  function fits(railWidth) {
    const buffer = 6;
    return (nav.scrollWidth + buffer) <= railWidth;
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

/* ========================================================================
   Search Icon Micro-interaction (stable hover/press scaling)
======================================================================== */
function injectSearchIconStyles(){
  if (document.getElementById('pp-search-icon-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-search-icon-styles';
  style.textContent = `
  .pp-search-activator {
    --ppScale: 1;
    transform: translateZ(0) scale(var(--ppScale));
    transition: transform 160ms cubic-bezier(.2,.8,.2,1);
    will-change: transform;
    transform-origin: 50% 50%;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    contain: paint;
  }
  @media (hover:hover) and (pointer:fine) {
    .pp-search-activator:hover,
    .pp-search-activator.is-hover { --ppScale: 1.12; }
    .pp-search-activator:active,
    .pp-search-activator.is-pressing { --ppScale: .96; transition-duration: 90ms; }
    .pp-search-activator:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(28,100,242,.25); border-radius: 8px; }
  }
  @media (hover:none) {
    .pp-search-activator.is-pressing { --ppScale: .94; transition-duration: 90ms; }
  }
  .pp-search-activator[data-state="open"] { --ppScale: 1 !important; }
  `;
  document.head.appendChild(style);
}

function wireSearchIconMicroUX(root=document){
  injectSearchIconStyles();
  const triggers = root.querySelectorAll?.(
    '#search-icon, .nav-search-btn, [data-action="open-search"], [aria-controls="search-overlay"], [aria-controls="searchOverlay"]'
  ) || [];

  triggers.forEach((el) => {
    const target = el.querySelector?.('.bi-search, [data-icon="search"], svg, i') || el;
    if (target.classList.contains('pp-search-activator')) return;
    target.classList.add('pp-search-activator');

    el.addEventListener('pointerenter', (e)=>{ if (e.pointerType === 'mouse') target.classList.add('is-hover'); });
    el.addEventListener('pointerleave', ()=> target.classList.remove('is-hover'));

    const pressOn = ()=> target.classList.add('is-pressing');
    const pressOff= ()=> target.classList.remove('is-pressing');
    el.addEventListener('pointerdown', pressOn, { passive:true });
    el.addEventListener('pointerup',   pressOff, { passive:true });
    el.addEventListener('pointercancel', pressOff);
    el.addEventListener('lostpointercapture', pressOff);
  });

  // expose setter so overlay toggles the steady state
  window.__ppSearchIconState = (isOpen) => {
    triggers.forEach((el) => {
      const t = el.querySelector?.('.pp-search-activator') || el;
      if (!t) return;
      if (isOpen) t.setAttribute('data-state','open'); else t.removeAttribute('data-state');
    });
  };
}

/* ========================================================================
   Search Overlay — polished UI (glass), thumbnails, keyboard nav
======================================================================== */
function injectSearchOverlayStyles(){
  if (document.getElementById('search-overlayStyles')) return;
  const style = document.createElement('style');
  style.id = 'search-overlayStyles';
  style.textContent = `
  :root{
    --pp-surface: rgba(255,255,255,.78);
    --pp-stroke: rgba(0,0,0,.08);
    --pp-muted: #6c757d;
    --pp-ring: rgba(28,100,242,.25);
    --pp-hover: rgba(0,0,0,.04);
    --pp-shadow: 0 10px 30px rgba(0,0,0,.15);
  }
  .hidden{display:none!important}
  #search-overlay, #searchOverlay, .search-overlay, .searchOverlay {
    position:fixed; inset:0; z-index:2147483000;
    display:flex; align-items:flex-start; justify-content:center;
    padding:10vh 16px;
    background:rgba(240,248,255,.28);
    -webkit-backdrop-filter: blur(14px) saturate(120%);
    backdrop-filter: blur(14px) saturate(120%);
  }
  .search-card{ width:min(980px,96vw); background:var(--pp-surface); border-radius:18px; border:1px solid var(--pp-stroke); box-shadow: var(--pp-shadow); overflow:hidden; }
  .search-head{ display:flex; align-items:center; gap:.75rem; padding:.75rem 1rem; border-bottom:1px solid var(--pp-stroke); position:sticky; top:0; background:var(--pp-surface); z-index:2; }
  .search-head .input-wrap{ position:relative; flex:1; display:flex; align-items:center; }
  .search-head .input-wrap i{ position:absolute; left:10px; font-size:18px; opacity:.55; }
  .search-head input{ width:100%; border:1px solid rgba(0,0,0,.12); border-radius:12px; padding:.55rem .9rem .55rem 2rem; font-size:16px; outline:none; background:#fff; }
  .search-head input:focus{ box-shadow:0 0 0 3px var(--pp-ring); border-color:rgba(28,100,242,.35); }
  .search-hints{ margin-left:auto; display:flex; gap:.35rem; align-items:center; color:var(--pp-muted); font-size:12px; }
  .kbd{border:1px solid rgba(0,0,0,.2);border-bottom-width:2px;border-radius:6px;padding:2px 6px;font-size:12px;color:#333;background:#f7f7f8}
  .search-tools{ display:flex; gap:.5rem; align-items:center; padding:.5rem 1rem; border-bottom:1px solid var(--pp-stroke);
    background:linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.65)); position:sticky; top:54px; z-index:1; }
  .search-results{ max-height:60vh; overflow:auto; padding:10px 12px; }
  .section-title{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--pp-muted); margin:10px 6px 6px; }
  .result-item{ display:grid; grid-template-columns:56px 1fr auto; gap:12px; align-items:center; padding:10px; border-radius:12px; border:1px solid var(--pp-stroke); background:#fff; transition:transform .06s ease, box-shadow .06s ease, background-color .06s ease; text-decoration:none; color:inherit; }
  .result-item + .result-item{ margin-top:8px; }
  .result-item:hover{ transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.08); background:#fff; }
  .result-thumb{ width:56px; height:56px; border-radius:10px; object-fit:cover; background:#f4f5f7; border:1px solid var(--pp-stroke); display:flex; align-items:center; justify-content:center; font-weight:700; color:#444; }
  img.result-thumb{ display:block; width:56px; height:56px; border-radius:10px; object-fit:cover; background:#f4f5f7; border:1px solid var(--pp-stroke); }
  .result-body .title{ font-weight:700; line-height:1.2; }
  .result-body .meta{ font-size:12px; color:var(--pp-muted); }
  .price{ font-weight:700; opacity:.9; }
  .tag{ display:inline-block; font-size:11px; padding:.15rem .4rem; border-radius:999px; border:1px solid var(--pp-stroke); margin-left:8px; color:#555; background:#fafafa; }
  .mark{ background: #fff2ac; border-radius:4px; padding:0 2px; }
  .skeleton{ animation: sk 1.1s linear infinite alternate; background:linear-gradient(90deg, #f2f3f4 0%, #f7f7f8 50%, #f2f3f4 100%); background-size:200% 100%; }
  .sk-line{ height:14px; border-radius:6px; }
  .sk-thumb{ width:56px; height:56px; border-radius:10px; }
  @keyframes sk { from{background-position:0% 0;} to{background-position:100% 0;} }
  `;
  document.head.appendChild(style);
}

function getOverlayEl(){ return byId('search-overlay', 'searchOverlay'); }

function ensureSearchOverlayMarkup(){
  let overlay = getOverlayEl();
  if (overlay) return overlay; // reuse if navbar.html already has it
  overlay = document.createElement('div');
  overlay.id = 'search-overlay';
  overlay.className = 'search-overlay hidden';
  overlay.innerHTML = `
    <div class="search-card" role="dialog" aria-modal="true" aria-labelledby="searchLabel">
      <div class="search-head">
        <div class="input-wrap">
          <i class="bi bi-search"></i>
          <input id="searchInput" type="text" placeholder="Search your pets, journal & products…" aria-label="Search" />
        </div>
        <div class="search-hints">
          <span class="d-none d-md-inline">Press</span><span class="kbd">/</span><span class="d-none d-md-inline">or</span><span class="kbd">⌘K</span>
          <button id="searchCloseBtn" class="search-close" title="Close" aria-label="Close">×</button>
        </div>
      </div>
      <div class="search-tools">
        <select id="searchCategory" aria-label="Category">
          <option value="all" selected>All Categories</option>
          <option value="products">Products</option>
          <option value="pets">Pets</option>
          <option value="journal">Journal</option>
        </select>
        <button id="searchGo" type="button">Search</button>
      </div>
      <div class="search-results" id="searchResults" role="listbox" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function openSearchOverlay(){
  injectSearchOverlayStyles();
  const overlay = ensureSearchOverlayMarkup();
  overlay.classList.remove('hidden');
  const input = overlay.querySelector('#searchInput, [data-search-input]');
  const results = overlay.querySelector('#searchResults, #search-results, .search-results');
  if (input && results){ input.value=''; results.innerHTML=''; setTimeout(()=>input.focus(),0); }
  document.documentElement.style.overflow = 'hidden';
  window.__petpawketSearch = window.__petpawketSearch || {};
  window.__petpawketSearch.open = openSearchOverlay;
  window.__petpawketSearch.close = closeSearchOverlay;
  window.__ppSearchIconState?.(true);
  wireSearchOverlayOnce();
}

function closeSearchOverlay(){
  const overlay = getOverlayEl();
  if (!overlay) return;
  overlay.classList.add('hidden');
  const input = overlay.querySelector('#searchInput, [data-search-input]');
  const results = overlay.querySelector('#searchResults, #search-results, .search-results');
  if (input) input.value = '';
  if (results) results.innerHTML = '';
  document.documentElement.style.overflow = '';
  window.__ppSearchIconState?.(false);
}

// Client-side fallback: load products and filter locally
async function clientFallbackSearch(q, catVal, results) {
  try {
    const prodMod = await import('./products.js');
    try { await prodMod.fetchAllProducts?.(); } catch {}
    const all = prodMod.allProducts || [];
    const qq = (q || '').toLowerCase();

    const filtered = all.filter(p => {
      const t = (p.title || '').toLowerCase();
      const type = (p.type || p.productType || '').toLowerCase();
      const matchQ = !qq || t.includes(qq) || type.includes(qq);
      const matchCat = (catVal === 'all' || catVal === 'products'); // overlay fallback supports products
      return matchQ && matchCat;
    });

    const payload = { products: filtered, pets: [], journal: [] };
    renderResults(results, payload, { q, cat: 'products' });
    wireKeyboardNav(results);
  } catch (err) {
    console.warn('[search:fallback] failed:', err);
    if (results) {
      results.innerHTML = `
        <div class="section-title">Search failed</div>
        <div class="result-item"><div class="result-body"><div class="title">Could not load products.</div><div class="meta">Please try again.</div></div></div>`;
    }
  }
}

function wireSearchOverlayOnce(){
  const overlay = getOverlayEl();
  if (!overlay || overlay.dataset.wiredOverlay) return;
  overlay.dataset.wiredOverlay = '1';
  const input    = overlay.querySelector('#searchInput, [data-search-input]');
  const results  = overlay.querySelector('#searchResults, #search-results, .search-results');
  const closeBtn = overlay.querySelector('#searchCloseBtn, .search-close, [data-close]');
  const goBtn    = overlay.querySelector('#searchGo');
  const catSel   = overlay.querySelector('#searchCategory');

  // Backdrop click closes (outside the card)
  overlay.addEventListener('click', (e) => {
    const card = overlay.querySelector('.search-card');
    if (card && !card.contains(e.target)) closeSearchOverlay();
  });
  if (closeBtn) closeBtn.addEventListener('click', (e)=>{ e.preventDefault(); closeSearchOverlay(); });

  const setSkeleton = () => {
    if (!results) return;
    const block = (i) => `
      <div class="result-item">
        <div class="result-thumb skeleton sk-thumb"></div>
        <div class="result-body" style="display:flex;flex-direction:column;gap:6px;">
          <div class="skeleton sk-line" style="width:${70 + i*5}%"></div>
          <div class="skeleton sk-line" style="width:${40 + i*2}%"></div>
        </div>
      </div>`;
    results.innerHTML = `<div class="section-title">Searching…</div>${block(1)}${block(2)}${block(3)}`;
  };

  const runSearch = debounce(async () => {
    const q = (input?.value || '').trim();
    if (!q) { if (results) results.innerHTML = ''; return; }
    setSkeleton();

    // Try server search first
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

  if (input){
    input.addEventListener('input', runSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } });
  }
  if (goBtn) goBtn.addEventListener('click', (e)=>{ e.preventDefault(); runSearch(); });
  if (catSel) catSel.addEventListener('change', runSearch);

  // Hotkeys
  document.addEventListener('keydown', (e) => {
    const isMac = (navigator.platform || '').toUpperCase().includes('MAC');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearchOverlay(); }
    const tag = document.activeElement?.tagName;
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(tag || '')) { e.preventDefault(); openSearchOverlay(); }
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) { e.preventDefault(); closeSearchOverlay(); }
  });
}

function highlight(text, q){
  if (!text || !q) return escapeHtml(text || '');
  try {
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')})`,'ig');
    return escapeHtml(text).replace(re, '<span class="mark">$1</span>');
  } catch { return escapeHtml(text); }
}

/* ===================== Pet image detection (extensionless-friendly) ===================== */
function isHttpish(s) {
  return typeof s === 'string' && (/^https?:\/\//i.test(s) || s.startsWith('/'));
}
// Accept without extension if the key name implies image/photo/avatar
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
      (val.photo && (val.photo.url || val.photo.src)) ||
      (val.avatar && (val.avatar.url || val.avatar.src)) ||
      (val.picture && (val.picture.url || val.picture.src));
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
    p.photoUrl || p.imageUrl || p.avatarUrl || p.pictureUrl || p.thumbnailUrl || p.thumbUrl ||
    p.photo?.url || p.photo?.src ||
    p.image?.url || p.image?.src ||
    p.avatar?.url || p.avatar?.src ||
    p.picture?.url || p.picture?.src ||
    (Array.isArray(p.photos)  && (p.photos[0]?.url  || p.photos[0]?.src)) ||
    (Array.isArray(p.images)  && (p.images[0]?.url  || p.images[0]?.src)) ||
    (Array.isArray(p.media)   && (p.media[0]?.url   || p.media[0]?.src   || p.media[0]?.image?.url));

  if (isHttpish(known)) return known;

  const guessed = firstImageLike(p);
  return isHttpish(guessed) ? guessed : '';
}
/* ========================================================================================= */

function renderResults(container, payload, { q, cat='all'}){
  if (!container) return;
  const pets = payload?.pets || [];
  const journal = payload?.journal || [];
  const products = payload?.products || [];

  const sections = [];

  // PETS — prefer photo (supports extensionless/signed URLs), fallback to initials
  if ((cat==='pets' || cat==='all') && pets.length){
    sections.push(`
      <div class="section-title">Pets</div>
      ${pets.map(p => {
        const name = p.name || 'Pet';
        const initials = (name || '?').slice(0,1).toUpperCase();
        const photo = getPetPhoto(p);
        const thumb = photo
          ? `<img class="result-thumb" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer">`
          : `<div class="result-thumb" aria-hidden="true">${escapeHtml(initials)}</div>`;
        const meta = [p.species, p.breed].filter(Boolean).join(' • ');
        return `
        <a class="result-item" href="/account.html#pets" tabindex="0" role="option">
          ${thumb}
          <div class="result-body">
            <div class="title">${highlight(name, q)} <span class="tag">Profile</span></div>
            <div class="meta">${escapeHtml(meta)}</div>
          </div>
          <div class="price"><i class="bi bi-heart"></i></div>
        </a>`;
      }).join('')}
    `);
  }

  if ((cat==='journal' || cat==='all') && journal.length){
    sections.push(`
      <div class="section-title">Journal</div>
      ${journal.map(e => {
        const text = (e.text || '');
        const snippet = text.length > 140 ? text.slice(0,140)+'…' : text;
        return `
        <a class="result-item" href="/account.html#journal" tabindex="0" role="option">
          <div class="result-thumb" aria-hidden="true"><i class="bi bi-journals"></i></div>
          <div class="result-body">
            <div class="title">${highlight(e.petName || 'Pet', q)} <span class="tag">Entry</span></div>
            <div class="meta">${highlight(snippet, q)} ${e.mood ? `• Mood: ${escapeHtml(e.mood)}` : ''}</div>
          </div>
          <div class="price"><i class="bi bi-arrow-right-short"></i></div>
        </a>`;
      }).join('')}
    `);
  }

  if ((cat==='products' || cat==='all') && products.length){
    sections.push(`
      <div class="section-title">Products</div>
      ${products.map(p => {
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
      }).slice(0,12).join('')}
    `);
  }

  container.innerHTML = sections.join('') || `
    <div class="section-title">No results</div>
    <div class="result-item"><div class="result-thumb">✦</div><div class="result-body"><div class="title">No results for “${escapeHtml(q)}”.</div><div class="meta">Try another keyword.</div></div></div>
  `;
}

// Keyboard nav for results list (↑/↓/Enter)
function wireKeyboardNav(container){
  if (!container) return;
  const items = [...container.querySelectorAll('.result-item')];
  if (!items.length) return;
  let idx = 0;
  const focusItem = (i) => {
    idx = (i + items.length) % items.length;
    items[idx].focus();
    items[idx].scrollIntoView({ block:'nearest', inline:'nearest' });
  };
  items[0].setAttribute('tabindex','0');
  container.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown'){ e.preventDefault(); focusItem(idx+1); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); focusItem(idx-1); }
    else if (e.key === 'Enter'){
      const a = document.activeElement?.closest('.result-item');
      if (a && a.getAttribute('href')) { window.location.href = a.getAttribute('href'); }
    }
  }, { passive:false });
}

// Global delegated click: works even if navbar not yet injected
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="open-search"], [data-toggle="search-overlay"], [aria-controls="search-overlay"], [aria-controls="searchOverlay"], #searchOpenBtn, .nav-search-btn, .search-toggle, #search-icon');
  if (!btn) return;
  e.preventDefault();
  openSearchOverlay();
});

/* ========================================================================
   Sub-navbar canonical markup & injection
   - Always replace any existing #shop-by with one canonical section
   - Observe and remove other injectors that try to add a different #shop-by
======================================================================== */
function canonicalSubnavMarkup() {
  return `
<section id="shop-by" aria-label="Secondary navigation" data-injected-by="pp-subnav">
  <div class="sb-ribbon">
    <div class="container">
      <div class="sb-wrap">
        <nav class="sb-rail" aria-label="Browse site and categories">
          <span class="sb-label">Shop by</span>

          <!-- Site links -->
          <a class="sb-chip" href="/about.html">About</a>
          <a class="sb-chip" href="/community.html">Community</a>
          <a class="sb-chip" href="/events.html">Events</a>
          <a class="sb-chip" href="/charm.html">CHARM Foundation</a>
          <a class="sb-chip" href="/contact.html">Contact</a>
          <a class="sb-chip" href="/privacy.html">Privacy &amp; Terms</a>

          <!-- Shop categories -->
          <a class="sb-chip" href="/shop.html" data-shop-cat="" data-key="all">All</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="dog">Dogs</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="cat">Cats</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="bird">Birds</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="fish">Fish</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="reptiles">Reptiles</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="small-pet">Small Pets</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="accessories">Accessories</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="treats">Treats</a>
          <a class="sb-chip" href="/shop.html" data-shop-cat="toys">Toys</a>
          <a class="sb-chip" href="/shop.html?subscribe=1" data-subscribe="1">Subscribe &amp; Save</a>
          <a class="sb-chip" href="/shop.html?mypets=1" data-my="1">For My Pets</a>
        </nav>
      </div>
    </div>
  </div>
</section>`;
}

function injectSubnavStyles(){
  if (document.getElementById('pp-subnav-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-subnav-styles';
  style.textContent = `
    /* Small, high-specificity rules to keep the tray visible and centered */
    #shop-by { position: relative; z-index: 1200; }
    #shop-by .sb-ribbon { margin-top: 0; padding: 6px 0; }
    #shop-by .sb-head, #shop-by .sb-sub { display: none !important; }
    #shop-by .sb-wrap { display: grid !important; grid-template-columns: 1fr; justify-items: center; }
    #shop-by .sb-rail { display: inline-flex !important; align-items: center; gap: 12px; padding: 8px 12px; background: transparent; border-radius: 24px; box-shadow: 0 6px 18px rgba(0,0,0,.06); }
    #shop-by .sb-label { display: inline-block !important; font-weight: 900; font-size: 0.95rem; color: #0b2530; white-space: nowrap; margin-right: 8px; user-select: none; z-index: 2; }
    #shop-by .sb-chip { padding: 8px 10px; background: transparent; border-radius: 999px; text-decoration: none; color: inherit; }
  `;
  document.head.appendChild(style);
}

function observeAndRemoveForeignSubnavs() {
  if (window.__ppSubnavObserver) return;
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.id === 'shop-by' && n.dataset.injectedBy !== 'pp-subnav') {
          // A foreign injector added a shop-by — remove it to keep canonical content
          try { n.remove(); } catch (e) { /* best-effort */ }
        }
      }
    }
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
  window.__ppSubnavObserver = observer;
}

async function injectSubnav(container) {
  // Ensure canonical styles first
  injectSubnavStyles();

  // Remove any existing shop-by nodes (foreign or previous)
  try {
    document.querySelectorAll('#shop-by')?.forEach(n => n.remove());
  } catch (e) {}

  // Insert canonical markup immediately after the navbar container (if provided),
  // otherwise prepend to body
  const html = canonicalSubnavMarkup();
  if (container) container.insertAdjacentHTML('afterend', html);
  else document.body.insertAdjacentHTML('afterbegin', html);

  // Hook an observer to remove any future foreign injects
  observeAndRemoveForeignSubnavs();
}

/* ========================================================================
   Desktop layout tweaks requested:
   - Hide top-bar nav links on desktop
   - Move Search, Account, Wishlist to the left; keep Cart, Orders, Counter on right
   - Make icons slightly larger on desktop
   - Nudge logo/frame upward to re-center vertically
======================================================================== */
function injectDesktopNavbarRules(){
  if (document.getElementById('pp-navbar-desktop-rules')) return;
  const style = document.createElement('style');
  style.id = 'pp-navbar-desktop-rules';
  style.textContent = `
    @media (min-width:1281px){
      /* Hide horizontal links on the top bar */
      nav .nav-left .nav-links,
      .custom-navbar .nav-left .nav-links,
      #navbar-container .nav-links { display: none !important; }

      /* Left icon rail container (new) */
      .nav-left .icon-area-left { display: inline-flex; align-items: center; gap: 16px; }

      /* Slightly larger icons on desktop */
      .nav-left .icon-area-left .icon,
      .nav-right .icon-area .icon { font-size: 2.1rem; }

      /* Nudge the brand frame up to look vertically centered */
      .custom-navbar .charlie-frame-wrapper { position: relative; top: -6px; }
      .custom-navbar .brand-icon { top: 8px; } /* was ~13px originally */
    }
  `;
  document.head.appendChild(style);
}

function rearrangeIcons(container){
  const navLeft = container.querySelector('.nav-left');
  const navRightArea = container.querySelector('.nav-right .icon-area');
  if (!navLeft || !navRightArea) return;

  // Only rearrange on desktop to avoid fighting the mobile drawer
  if (!window.matchMedia('(min-width:1281px)').matches) return;

  // Ensure a left icon rail exists (insert before any nav-links so it occupies their spot)
  let leftArea = navLeft.querySelector('.icon-area-left');
  const navLinks = navLeft.querySelector('.nav-links');
  if (!leftArea) {
    leftArea = document.createElement('div');
    leftArea.className = 'icon-area icon-area-left';
    if (navLinks) navLeft.insertBefore(leftArea, navLinks);
    else navLeft.appendChild(leftArea);
  }

  // Move Search, Account, Wishlist (be forgiving with selectors)
  const searchBtn = container.querySelector('[data-action="open-search"], .nav-search-btn');
  const accountDD = container.querySelector('#nav-account-toggle')?.closest('.icon-dropdown') ||
                    container.querySelector('[data-icon="account"]')?.closest('.icon-dropdown') ||
                    container.querySelector('.icon-account, [href*="account"]')?.closest('.icon-dropdown') || null;
  const wishDD    = container.querySelector('#nav-wish-toggle')?.closest('.icon-dropdown') ||
                    container.querySelector('[data-icon="wishlist"]')?.closest('.icon-dropdown') ||
                    container.querySelector('.icon-wishlist, [href*="wishlist"]')?.closest('.icon-dropdown') || null;

  const move = (node) => {
    if (!node) return;
    if (node.dataset.movedLeft === '1') return;
    leftArea.appendChild(node);
    node.dataset.movedLeft = '1';
  };

  move(searchBtn);
  move(accountDD);
  move(wishDD);
}

// -------------------------------
// Exported: injectNavbar
// -------------------------------
export function injectNavbar(callback){
  fetch('/navbar.html', { credentials: 'include' })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.text(); })
    .then((html) => {
      let container = document.getElementById('navbar-container');
      if (!container){ container = document.createElement('div'); container.id = 'navbar-container'; document.body.prepend(container); }
      container.innerHTML = html;

      // Normalize legacy IDs so CSS works consistently
      (function normalizeIds() {
        const map = {
          'searchOverlay': 'search-overlay',
          'searchResults': 'search-results',
          'mobileMenu': 'mobile-menu',
          'mobileToggle-left': 'mobile-toggle-left',
          'mobileToggle-center': 'mobile-toggle-center',
          'heroCarousel': 'hero-carousel',
          'editPetJournal': 'edit-pet-journal',
          'journalModal': 'journal-modal',
        };
        for (const [oldId, nextId] of Object.entries(map)) {
          const oldEl = document.getElementById(oldId);
          if (oldEl && !document.getElementById(nextId)) oldEl.id = nextId;
        }
      })();

      wireSearchIconMicroUX(container);

      // If navbar.html already includes the overlay structure, preload styles
      (function ensureOverlayStylesIfPresent() {
        const overlay = byId('search-overlay', 'searchOverlay');
        if (!overlay) return;
        injectSearchOverlayStyles();
      })();

      requestAnimationFrame(async () => {
        attachNavbarModals?.();
        onAuthChange?.(updateAuthDisplay);
        updateAuthDisplay?.();
        wireLogoutButtons(container);
        wireLoginForm(container);
        ensureCartBadge(container);

        // Mobile menu wiring (relocates links and icons into the drawer at ≤1280px)
        setupResponsiveMobileMenu?.();
        setupDropdownToggles?.();

        // Desktop-only Priority+ overflow for the left nav rail (kept)
        try { setupPriorityNav(document); } catch (e) { console.warn('[nav overflow]', e); }

        // Sub-navbar: styles + canonical injection (inline "Shop by", centered, consistent everywhere)
        // try { injectSubnavStyles(); await injectSubnav(container); } catch (e) { console.warn('[subnav]', e); }

        // Apply requested desktop layout changes
        try { injectDesktopNavbarRules(); rearrangeIcons(container); } catch (e) { console.warn('[navbar desktop]', e); }

        try { callback?.(); } catch (e) { console.warn('[injectNavbar] callback warn:', e); }

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch-device');

        const toggles = container.querySelectorAll('.mobile-menu-toggle');
        toggles.forEach((t) => t.addEventListener('click', toggleMobileMenu));

        // Signal that the navbar is ready
        try { document.dispatchEvent(new CustomEvent('pp:navbar:ready')); } catch {}
      });
    })
    .catch((err) => console.error('[injectNavbar] Injection failed:', err));
}

// Note: main.js calls injectNavbar() and coordinates other lazy loaders.