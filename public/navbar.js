// /public/navbar.js
// current pp-* HTML aware
// - search overlay (server first, client fallback, skeleton)
// - real icon dropdowns for wishlist, cart, orders (pp-dropdown)
// - legacy dropdown toggles still called (if navbar.html has those classes)
// - priority nav (safe no-op on new markup)
// - huey re-trigger
// - no legacy #shop-by injection
// - WILL fetch /navbar.html like before, but if it fails, will wire existing DOM
// - ADDED: explicit cookie/JWT mode alignment + extra login form selector robustness
// - ADDED: defensive dropdown wiring for account/wishlist/cart/orders if present
// - ADDED: fallback auth repaint timer + console diagnostics

import { attachNavbarModals } from './navbarModals.js';
import { updateAuthDisplay, logout, login, onAuthChange } from './auth.js';
import { setupDropdownToggles } from './dropdownToggles.js';

/* ==========================================================================
   Auth mode alignment (ensure cookie-session unless override present)
   ========================================================================== */
window.__AUTH_CONFIG = Object.assign(
  {
    login: '/api/auth/login',
    me: '/api/me',
    logout: '/logout',
    logoutFallbacks: ['/logout','/api/logout','/api/auth/logout']
  },
  window.__AUTH_CONFIG || {}
);

/* ==========================================================================
   small helpers
   ========================================================================== */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function safeImageUrl(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
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
   dynamic nav offset (keeps body + widget dock aligned with real header size)
   ========================================================================== */
function readRootPxVar(name, fallback = 0) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function boundedMeasure(measured, fallback, min, max) {
  const value = Number(measured);
  if (!Number.isFinite(value) || value <= 0) return { value: fallback, valid: false };
  if (value < min || value > max) return { value: fallback, valid: false };
  return { value, valid: true };
}

function updateNavOffset() {
  const root = document.documentElement;
  const vh = Math.round(window.visualViewport?.height || window.innerHeight || 0);
  const header = document.querySelector('.pp-header');
  const subnav = document.querySelector('.pp-subnav');

  const headerFallback =
    readRootPxVar('--pp-header-h') ||
    readRootPxVar('--pp-topline-h', 42) + readRootPxVar('--pp-nav-h', 175);
  const subnavFallback = readRootPxVar('--pp-subnav-h', 56);
  const measuredHeaderH = header ? Math.round(header.getBoundingClientRect().height) : 0;
  const measuredSubnavH = subnav ? Math.round(subnav.getBoundingClientRect().height) : 0;

  const headerMeasure = boundedMeasure(measuredHeaderH, headerFallback, 120, 320);
  const subnavMeasure = boundedMeasure(measuredSubnavH, subnavFallback, 36, 72);
  const headerH = headerMeasure.value;
  const subnavH = subnavMeasure.value;

  if (headerMeasure.valid && headerH > 0) root.style.setProperty('--pp-header-h', `${headerH}px`);
  if (subnavMeasure.valid && subnavH > 0) root.style.setProperty('--pp-subnav-h', `${subnavH}px`);
  const navOffset = headerH + subnavH;
  if (navOffset > 0) root.style.setProperty('--nav-offset', `${navOffset}px`);
  if (vh > 0) root.style.setProperty('--pp-hero-vh', `${vh}px`);
}

function scheduleNavOffset() {
  updateNavOffset();
  requestAnimationFrame(updateNavOffset);
  setTimeout(updateNavOffset, 200);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => updateNavOffset()).catch(() => {});
  }
  if (window.__PP_NAV_OFFSET_WIRED) return;
  window.__PP_NAV_OFFSET_WIRED = true;
  let rafId = 0;
  const onResize = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateNavOffset();
    });
  };
  window.addEventListener('resize', onResize, { passive: true });
  window.visualViewport?.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', updateNavOffset, { once: true });
}

/* ==========================================================================
   optional auth fetch
   ========================================================================== */
export function authFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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
  // auth.js owns delegated login submission; this marker prevents duplicate requests.
  const form =
    root.querySelector?.('#loginForm, #login-form, [data-auth="login-form"]') ||
    document.getElementById('loginForm') ||
    document.getElementById('login-form');
  if (!form || form.dataset.wiredLogin) return;
  form.dataset.wiredLogin = 'delegated';
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
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
    return escapeHtml(text).replace(re, '<span class="mark">$1</span>');
  } catch {
    return escapeHtml(text);
  }
}

/* ===================== Pet image helpers (same logic as old file) ===================== */
function isHttpish(s) {
  return typeof s === 'string' && Boolean(safeImageUrl(s));
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
  if (isHttpish(known)) return safeImageUrl(known);
  const guessed = firstImageLike(p);
  return isHttpish(guessed) ? safeImageUrl(guessed) : '';
}

const SEARCH_STATIC_ITEMS = [
  {
    id: 'shop',
    title: 'Shop products',
    meta: 'Toys, treats, gear, and everyday pet care.',
    href: '/shop.html',
    icon: 'bi-bag-heart',
    categories: ['products'],
    keywords: 'shop products toy toys treat treats collar gear food supplies ecommerce'
  },
  {
    id: 'dog-shop',
    title: 'The Dog Shelf',
    meta: 'Browse dog toys, treats, gear, and care picks.',
    href: '/shop.html?pet=dog&via=search',
    icon: 'bi-heart',
    categories: ['products', 'pets'],
    keywords: 'dog dogs puppy canine leash collar chew coat treat treats toy toys care product products shop pack'
  },
  {
    id: 'cat-shop',
    title: 'The Cat Shelf',
    meta: 'Browse cat play, scratch, comfort, treats, and care picks.',
    href: '/shop.html?pet=cat&via=search',
    icon: 'bi-heart',
    categories: ['products', 'pets'],
    keywords: 'cat cats kitten feline scratch scratcher litter toy toys treat treats comfort care product products shop'
  },
  {
    id: 'bird-shop',
    title: 'The Bird Shelf',
    meta: 'Browse bird toys, perches, treats, and care picks.',
    href: '/shop.html?pet=bird&via=search',
    icon: 'bi-feather',
    categories: ['products', 'pets'],
    keywords: 'bird birds parrot parrots cockatiel cockatiels blue-fronted amazon amazon parrot seed perch aviary companion toy toys treat treats care product products shop'
  },
  {
    id: 'small-pet-shop',
    title: 'The Small Pet Shelf',
    meta: 'Browse care picks for rabbits, hamsters, guinea pigs, and small companions.',
    href: '/shop.html?pet=small-pet&via=search',
    icon: 'bi-flower1',
    categories: ['products', 'pets'],
    keywords: 'small pet rabbit bunny hamster guinea pig gerbil chinchilla ferret toy toys treat treats care product products shop'
  },
  {
    id: 'fish-shop',
    title: 'The Fish Shelf',
    meta: 'Browse aquarium, betta, tank, filter, and water-care picks.',
    href: '/shop.html?pet=fish&via=search',
    icon: 'bi-water',
    categories: ['products', 'pets'],
    keywords: 'fish aquarium betta tank filter water aquatic care product products shop'
  },
  {
    id: 'reptile-shop',
    title: 'The Reptile Shelf',
    meta: 'Browse habitat, heat, terrarium, and care picks for reptiles.',
    href: '/shop.html?pet=reptile&via=search',
    icon: 'bi-brightness-high',
    categories: ['products', 'pets'],
    keywords: 'reptile lizard gecko snake turtle tortoise habitat heat lamp terrarium care product products shop'
  },
  {
    id: 'packs',
    title: 'Pawket Packs',
    meta: 'Subscription boxes in development for profile-aware care.',
    href: '/packs.html',
    icon: 'bi-box2-heart',
    categories: ['products'],
    keywords: 'pawket packs pack subscription monthly seasonal box'
  },
  {
    id: 'packets',
    title: 'Pawket Packets',
    meta: 'Smaller trials, samples, promos, and giftable starts.',
    href: '/packets.html',
    icon: 'bi-envelope-heart',
    categories: ['products'],
    keywords: 'pawket packets packet samples trial promo gift'
  },
  {
    id: 'picks',
    title: 'Pawket Picks',
    meta: 'Small extras, seasonal favorites, and care surprises.',
    href: '/picks.html',
    icon: 'bi-stars',
    categories: ['products', 'impact'],
    keywords: 'pawket picks pick rewards bonus threshold seasonal campaign'
  },
  {
    id: 'pals',
    title: 'Pawket Pals',
    meta: 'Private keepsakes and Pals inspired by real pet stories.',
    href: '/pals.html',
    icon: 'bi-stars',
    categories: ['impact'],
    keywords: 'pawket pals pal companion collectible digital world park tamagotchi neopets chao'
  },
  {
    id: 'charm',
    title: 'CHARM Foundation',
    meta: 'Caring Hearts for Animal Rescue and Medicine.',
    href: '/charm.html',
    icon: 'bi-heart-pulse',
    categories: ['impact'],
    keywords: 'charm foundation rescue medical medicine impact shelter adoption caring hearts'
  },
  {
    id: 'network',
    title: 'Pawket Network',
    meta: 'Verified pet services, rescues, shelters, vets, and partners.',
    href: '/pawket-network.html',
    icon: 'bi-patch-check',
    categories: ['impact'],
    keywords: 'pawket network partners partner vet vets groomer trainer shelter rescue verified'
  },
  {
    id: 'places',
    title: 'Pawket Places',
    meta: 'Dog parks, trails, travel stops, and pet-friendly places.',
    href: '/pawket-places.html',
    icon: 'bi-map',
    categories: ['impact', 'pets'],
    keywords: 'pawket places pet safe dog park dog parks parks trails trail beach beaches relief area travel pet friendly off leash map'
  },
  {
    id: 'passes',
    title: 'Pawket Passes',
    meta: 'Shareable passes for gifts, saved links, and CHARM kindness.',
    href: '/loop.html',
    icon: 'bi-ticket-perforated',
    categories: ['impact'],
    keywords: 'pawket pass passes heartcode heartcodes referral gift points'
  },
  {
    id: 'pets',
    title: 'Pet profiles',
    meta: 'Details that make shopping and care feel more personal.',
    href: '/account.html#pets',
    icon: 'bi-person-hearts',
    categories: ['pets'],
    keywords: 'pet profile pets species breed type traits charm'
  },
  {
    id: 'journal',
    title: 'Care journals',
    meta: 'Care notes, favorite memories, and saved story moments.',
    href: '/account.html#journal',
    icon: 'bi-journal-heart',
    categories: ['journal'],
    keywords: 'journal journals care story trail core memory memories checkpoint quest'
  }
];

const SEARCH_CATEGORY_LABELS = {
  all: 'All',
  products: 'Shop',
  pets: 'Pets',
  journal: 'Journals',
  impact: 'Impact'
};

let lastSearchTrigger = null;
let searchAbortController = null;
let searchRequestId = 0;

const SEARCH_PET_TYPE_RULES = [
  { pet: 'dog', label: 'Dog', terms: ['dog', 'dogs', 'puppy', 'puppies', 'canine', 'leash', 'collar', 'chew'] },
  { pet: 'cat', label: 'Cat', terms: ['cat', 'cats', 'kitten', 'kittens', 'feline', 'litter', 'scratcher'] },
  { pet: 'bird', label: 'Bird', terms: ['bird', 'birds', 'parrot', 'parrots', 'cockatiel', 'cockatiels', 'blue-fronted', 'amazon', 'aviary', 'perch', 'seed'] },
  { pet: 'small-pet', label: 'Small Pet', terms: ['small pet', 'rabbit', 'rabbits', 'bunny', 'hamster', 'guinea', 'gerbil', 'ferret', 'chinchilla'] },
  { pet: 'fish', label: 'Fish', terms: ['fish', 'betta', 'aquarium', 'tank', 'filter', 'aquatic'] },
  { pet: 'reptile', label: 'Reptile', terms: ['reptile', 'lizard', 'gecko', 'snake', 'turtle', 'tortoise', 'terrarium'] }
];

function categoryMatches(item, cat = 'all') {
  return cat === 'all' || item.categories?.includes(cat);
}

function filterStaticSearchItems(q, cat = 'all') {
  const query = String(q || '').trim().toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  return SEARCH_STATIC_ITEMS.filter((item) => {
    if (!categoryMatches(item, cat)) return false;
    if (!query) return true;
    const hay = [item.title, item.meta, item.keywords].join(' ').toLowerCase();
    return hay.includes(query) || tokens.every((token) => hay.includes(token));
  });
}

function inferPetShelf(q = '') {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return null;
  return SEARCH_PET_TYPE_RULES.find((rule) => rule.terms.some((term) => query.includes(term))) || null;
}

function buildShopHref(q = '', options = {}) {
  const params = new URLSearchParams();
  const query = String(q || '').trim();
  if (query) params.set('q', query);
  if (options.pet) params.set('pet', options.pet);
  if (options.subscribe) params.set('subscribe', '1');
  params.set('via', 'search');
  const qs = params.toString();
  return `/shop.html${qs ? `?${qs}` : ''}`;
}

function formatCurrency(amount, currency = 'USD') {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function productPriceText(p = {}) {
  const min = p.priceRange?.minVariantPrice;
  const max = p.priceRange?.maxVariantPrice;
  const minAmount = min?.amount ?? p.price?.amount ?? p.variants?.edges?.[0]?.node?.price?.amount ?? p.variants?.[0]?.price ?? p.price;
  const maxAmount = max?.amount;
  const currency = min?.currencyCode || max?.currencyCode || p.price?.currencyCode || 'USD';
  const minText = formatCurrency(minAmount, currency);
  const maxText = formatCurrency(maxAmount, currency);
  if (minText && maxText && Number(minAmount) !== Number(maxAmount)) return `${minText}+`;
  return minText;
}

function productHref(p = {}) {
  const handle = p.handle || '';
  if (handle) return `/product.html?handle=${encodeURIComponent(handle)}`;
  const q = p.title ? `?q=${encodeURIComponent(p.title)}` : '';
  return `/shop.html${q}`;
}

function productImage(p = {}) {
  return safeImageUrl(
    p.featuredImage?.url ||
    p.image ||
    p.images?.edges?.[0]?.node?.url ||
    p.images?.edges?.[0]?.node?.src ||
    '',
    '/assets/images/placeholder.png'
  );
}

function renderSearchHome(container) {
  if (!container) return;
  const featured = ['shop', 'packs', 'pals', 'charm', 'network', 'places']
    .map((id) => SEARCH_STATIC_ITEMS.find((item) => item.id === id))
    .filter(Boolean);
  container.removeAttribute('aria-busy');
  container.innerHTML = `
    <div class="search-state search-state--home">
      <div class="search-state-card">
        <span class="search-state-icon" aria-hidden="true"><i class="bi bi-compass"></i></span>
        <div>
          <div class="search-state-title">Where should we search first?</div>
          <div class="search-state-copy">Products, care records, story pages, impact, and partner tools are connected here.</div>
        </div>
      </div>
      <div class="search-quick-grid" aria-label="Quick search pages">
        ${featured.map(renderStaticQuickLink).join('')}
      </div>
      <div class="search-suggest-row" aria-label="Suggested searches">
        ${['Pawket Packs', 'CHARM', 'care journal', 'bird toys'].map((term) => `
          <button class="search-suggest" type="button" data-search-suggestion="${escapeHtml(term)}">${escapeHtml(term)}</button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderStaticQuickLink(item) {
  return `
    <a class="search-quick-link" href="${escapeHtml(item.href)}">
      <span aria-hidden="true"><i class="bi ${escapeHtml(item.icon)}"></i></span>
      <strong>${escapeHtml(item.title)}</strong>
    </a>
  `;
}

function renderStaticResult(item, q) {
  return `
    <a class="result-item result-item--path" href="${escapeHtml(item.href)}" tabindex="0" role="listitem">
      <span class="result-thumb result-thumb--icon" aria-hidden="true"><i class="bi ${escapeHtml(item.icon)}"></i></span>
      <span class="result-body">
        <span class="title">${highlight(item.title, q)} <span class="tag">${escapeHtml(SEARCH_CATEGORY_LABELS[item.categories?.[0]] || 'Path')}</span></span>
        <span class="meta">${highlight(item.meta, q)}</span>
      </span>
      <span class="price" aria-hidden="true"><i class="bi bi-arrow-right-short"></i></span>
    </a>
  `;
}

function renderNoResults(container, q, cat) {
  const fallbackItems = filterStaticSearchItems('', cat).slice(0, 4);
  container.innerHTML = `
    <div class="search-state search-state--empty">
      <div class="search-state-card">
        <span class="search-state-icon" aria-hidden="true"><i class="bi bi-search-heart"></i></span>
        <div>
          <div class="search-state-title">No results for “${escapeHtml(q)}”.</div>
          <div class="search-state-copy">Try another phrase or jump into a nearby Pet Pawket page.</div>
        </div>
      </div>
      <div class="search-quick-grid" aria-label="Related pages">
        ${fallbackItems.map(renderStaticQuickLink).join('')}
      </div>
      ${renderSearchHandoff(q, cat, { compact: true })}
    </div>
  `;
}

function renderSearchHandoff(q, cat, options = {}) {
  const query = String(q || '').trim();
  if (!query) return '';
  const petShelf = inferPetShelf(query);
  const productIntent = cat === 'all' || cat === 'products';
  const isImpactIntent = cat === 'impact' || /\b(charm|rescue|shelter|vet|partner|network|places|park|trail|impact|heartcode|pass)\b/i.test(query);
  const isCareIntent = cat === 'pets' || cat === 'journal' || /\b(journal|memory|profile|pet|pets|care|story|quest|checkpoint)\b/i.test(query);
  const actions = [];

  if (productIntent) {
    actions.push({
      href: buildShopHref(query, { pet: petShelf?.pet }),
      icon: 'bi-bag-heart',
      label: petShelf ? `Search the ${petShelf.label.toLowerCase()} shelf` : 'Search all products',
      meta: petShelf ? 'Uses this search inside the shelf' : 'Shop catalog results'
    });
    actions.push({
      href: buildShopHref(query, { subscribe: true }),
      icon: 'bi-box2-heart',
      label: 'Pack-eligible add-ons',
      meta: 'Shop items for later box planning'
    });
  }

  if (petShelf && !productIntent) {
    actions.push({
      href: buildShopHref('', { pet: petShelf.pet }),
      icon: petShelf.pet === 'bird' ? 'bi-feather' : 'bi-heart',
      label: `Open the ${petShelf.label.toLowerCase()} shelf`,
      meta: 'Browse that pet shelf'
    });
  }

  if (isCareIntent) {
    actions.push({
      href: cat === 'journal' ? '/account.html#journal' : '/account.html#pets',
      icon: cat === 'journal' ? 'bi-journal-heart' : 'bi-person-hearts',
      label: cat === 'journal' ? 'Open care journals' : 'Open pet profiles',
      meta: 'Account pages'
    });
  }

  if (isImpactIntent) {
    actions.push({
      href: '/charm.html',
      icon: 'bi-heart-pulse',
      label: 'CHARM impact',
      meta: 'Rescue and medicine'
    });
    actions.push({
      href: '/pawket-network.html',
      icon: 'bi-patch-check',
      label: 'Pawket Network',
      meta: 'Verified partners'
    });
    actions.push({
      href: '/pawket-places.html',
      icon: 'bi-map',
      label: 'Pawket Places',
      meta: 'Pet-safe locations'
    });
  }

  const unique = [];
  const seen = new Set();
  for (const action of actions) {
    if (seen.has(action.href)) continue;
    seen.add(action.href);
    unique.push(action);
    if (unique.length >= (options.compact ? 3 : 4)) break;
  }
  if (!unique.length) return '';

  return `
    <div class="search-handoff" aria-label="Search action links">
      <div class="search-handoff-title">${options.compact ? 'Try a page' : 'Useful next steps'}</div>
      <div class="search-action-row">
        ${unique.map((action) => `
          <a class="search-action-link" href="${escapeHtml(action.href)}">
            <span aria-hidden="true"><i class="bi ${escapeHtml(action.icon)}"></i></span>
            <strong>${escapeHtml(action.label)}</strong>
            <small>${escapeHtml(action.meta)}</small>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

/* render search results */
function renderResults(container, payload, { q, cat = 'all' }) {
  if (!container) return;
  const pets = Array.isArray(payload?.pets) ? payload.pets : [];
  const journal = Array.isArray(payload?.journal) ? payload.journal : [];
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const paths = filterStaticSearchItems(q, cat).slice(0, 7);
  const sections = [];
  const totalCount =
    (cat === 'all' || cat === 'products' ? products.length : 0) +
    (cat === 'all' || cat === 'pets' ? pets.length : 0) +
    (cat === 'all' || cat === 'journal' ? journal.length : 0) +
    paths.length;

  if ((cat === 'pets' || cat === 'all') && pets.length) {
    sections.push(`
      <div class="section-title">Pets</div>
      ${pets.map((p) => {
        const name = p.name || 'Pet';
        const photo = getPetPhoto(p);
        const initials = name.slice(0, 1).toUpperCase();
        const meta = [p.species, p.breed].filter(Boolean).join(' • ');
        return `
        <a class="result-item result-item--pet" href="/account.html#pets" tabindex="0" role="listitem">
          ${
            photo
              ? `<img class="result-thumb" src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" referrerpolicy="no-referrer">`
              : `<div class="result-thumb" aria-hidden="true">${escapeHtml(initials)}</div>`
          }
          <div class="result-body">
            <div class="title">${highlight(name, q)} <span class="tag">Profile</span></div>
            <div class="meta">${escapeHtml(meta || 'Pet profile')}</div>
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
        <a class="result-item result-item--journal" href="/account.html#journal" tabindex="0" role="listitem">
          <div class="result-thumb result-thumb--icon" aria-hidden="true"><i class="bi bi-journals"></i></div>
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
      <div class="section-title">Shop</div>
      ${products.map((p) => {
        const img = productImage(p);
        const price = productPriceText(p);
        const type = p.productType || p.type || 'Product';
        return `
        <a class="result-item result-item--product" href="${escapeHtml(productHref(p))}" tabindex="0" role="listitem">
          <img class="result-thumb" src="${escapeHtml(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" />
          <div class="result-body">
            <div class="title">${highlight(p.title || 'Product', q)} ${p.availableForSale ? '' : '<span class="tag">Out</span>'}</div>
            <div class="meta">${escapeHtml(type)}</div>
          </div>
          <div class="price">${escapeHtml(price)}</div>
        </a>`;
      }).slice(0, 12).join('') }
    `);
  }

  if (paths.length) {
    sections.push(`
      <div class="section-title">Pet Pawket pages</div>
      ${paths.map((item) => renderStaticResult(item, q)).join('')}
    `);
  }

  if (!sections.length) {
    renderNoResults(container, q, cat);
    return;
  }

  container.innerHTML = `
    <div class="search-results-summary">${totalCount} ${totalCount === 1 ? 'result' : 'results'} in ${escapeHtml(SEARCH_CATEGORY_LABELS[cat] || 'Search')}</div>
    ${renderSearchHandoff(q, cat)}
    ${sections.join('')}
  `;
}

async function loadLocalProductMatches(q, catVal) {
  if (!(catVal === 'all' || catVal === 'products')) return [];
  try {
    const prodMod = await import('./products.js');
    try { await prodMod.fetchAllProducts?.(120); } catch {}
    const all = prodMod.allProducts || [];
    const qq = (q || '').toLowerCase();
    return all.filter((p) => {
      const t = (p.title || '').toLowerCase();
      const type = (p.type || p.productType || '').toLowerCase();
      return !qq || t.includes(qq) || type.includes(qq);
    }).slice(0, 12);
  } catch (err) {
    console.warn('[search:fallback] failed:', err);
    return [];
  }
}

/* keyboard nav inside results */
function wireKeyboardNav(container) {
  if (!container) return;
  if (container.dataset.keyboardNavWired === '1') return;
  container.dataset.keyboardNavWired = '1';
  const focusItem = (items, i) => {
    if (!items.length) return;
    const idx = (i + items.length) % items.length;
    items[idx]?.focus();
    items[idx]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  container.addEventListener('keydown', (e) => {
    const items = [...container.querySelectorAll('.result-item')];
    if (!items.length) return;
    const current = document.activeElement?.closest?.('.result-item');
    const idx = Math.max(0, items.indexOf(current));
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(items, idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(items, idx - 1); }
    else if (e.key === 'Enter') {
      const a = document.activeElement?.closest('.result-item');
      if (a && a.getAttribute('href')) window.location.href = a.getAttribute('href');
    }
  }, { passive: false });
}

function syncSearchCategoryUI(overlay, value = 'all') {
  overlay?.querySelectorAll('[data-search-category-button]')?.forEach((btn) => {
    const active = btn.dataset.searchCategoryButton === value;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

function setSearchTriggerState(isOpen) {
  document.querySelectorAll('[data-pp="search"], [data-action="open-search"], .search-toggle, .nav-search-btn, [aria-controls="searchOverlay"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', String(isOpen));
  });
}

function setSearchBusy(results, isBusy) {
  if (!results) return;
  if (isBusy) results.setAttribute('aria-busy', 'true');
  else results.removeAttribute('aria-busy');
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
  const categoryButtons = overlay.querySelectorAll('[data-search-category-button]');

  const setSkeleton = () => {
    if (!results) return;
    setSearchBusy(results, true);
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

  const runSearchNow = async () => {
    const q = (input?.value || '').trim();
    const catVal = catSel?.value || 'all';
    syncSearchCategoryUI(overlay, catVal);
    if (!q) { renderSearchHome(results); return; }
    setSkeleton();

    const requestId = ++searchRequestId;
    if (searchAbortController) searchAbortController.abort();
    searchAbortController = new AbortController();
    let data = { pets: [], journal: [], products: [] };
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        credentials: 'include',
        signal: searchAbortController.signal
      });
      if (r.ok) {
        data = await r.json();
      }
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }

    const localProducts = await loadLocalProductMatches(q, catVal);
    if (requestId !== searchRequestId) return;
    if ((!Array.isArray(data.products) || data.products.length === 0) && localProducts.length) {
      data.products = localProducts;
    }

    setSearchBusy(results, false);
    renderResults(results, data, { q, cat: catVal });
    wireKeyboardNav(results);
  };

  const runSearch = debounce(runSearchNow, 240);

  if (input) {
    input.addEventListener('input', runSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSearchNow(); } });
  }
  if (goBtn) goBtn.addEventListener('click', (e) => { e.preventDefault(); runSearchNow(); });
  if (catSel) catSel.addEventListener('change', () => {
    syncSearchCategoryUI(overlay, catSel.value || 'all');
    runSearchNow();
  });
  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.searchCategoryButton || 'all';
      if (catSel) catSel.value = next;
      syncSearchCategoryUI(overlay, next);
      runSearchNow();
    });
  });
  results?.addEventListener('click', (e) => {
    const suggest = e.target.closest('[data-search-suggestion]');
    if (!suggest) return;
    e.preventDefault();
    if (input) {
      input.value = suggest.dataset.searchSuggestion || '';
      input.focus();
    }
    runSearchNow();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...overlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', (e) => {
    const isMac = (navigator.platform || '').toUpperCase().includes('MAC');
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearchOverlay(); }
    const tag = document.activeElement?.tagName;
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(tag || '')) { e.preventDefault(); openSearchOverlay(); }
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) { e.preventDefault(); closeSearchOverlay(); }
  });
  syncSearchCategoryUI(overlay, catSel?.value || 'all');
  renderSearchHome(results);
}

/* open/close */
function openSearchOverlay(trigger = null) {
  const overlay = getOverlayEl();
  if (!overlay) return;
  wireSearchOverlayOnce();
  lastSearchTrigger = trigger || document.activeElement || null;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  const input = overlay.querySelector('#searchInput');
  const results = overlay.querySelector('#searchResults, .search-results');
  const catSel = overlay.querySelector('#searchCategory');
  if (catSel) catSel.value = 'all';
  syncSearchCategoryUI(overlay, catSel?.value || 'all');
  if (input && results) {
    input.value = '';
    renderSearchHome(results);
    setTimeout(() => input.focus(), 0);
  }
  document.documentElement.style.overflow = 'hidden';
  setSearchTriggerState(true);
}
function closeSearchOverlay() {
  const overlay = getOverlayEl();
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  const results = overlay.querySelector('#searchResults, .search-results');
  if (results) renderSearchHome(results);
  document.documentElement.style.overflow = '';
  setSearchTriggerState(false);
  if (lastSearchTrigger && typeof lastSearchTrigger.focus === 'function') {
    setTimeout(() => {
      try { lastSearchTrigger.focus({ preventScroll: true }); } catch {}
    }, 0);
  }
}

window.__petpawketSearch = {
  ...(window.__petpawketSearch || {}),
  open: openSearchOverlay,
  close: closeSearchOverlay
};

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
  const toggleSelector = '[data-subnav-toggle]';

  function setActiveFromLocation() {
    const links = Array.from(bar.querySelectorAll('a'));
    if (!links.length) return;
    links.forEach((x) => x.classList.remove('active'));
    bar.querySelectorAll('.pp-subnav-group.has-active').forEach((g) => g.classList.remove('has-active'));

    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const url = new URL(window.location.href);
    const cat = url.searchParams.get('cat') || url.searchParams.get('category') || url.searchParams.get('shop');
    const stored = sessionStorage.getItem('ppSubnavActive') || '';

    const linkInfo = links.map((a) => {
      const href = a.getAttribute('href') || '';
      if (!href || href === '#') return { a, url: null };
      try {
        return { a, url: new URL(href, window.location.origin) };
      } catch {
        return { a, url: null };
      }
    });

    const exactMatches = linkInfo
      .filter(({ url: linkUrl }) => {
        if (!linkUrl || linkUrl.origin !== window.location.origin) return false;
        const linkPath = linkUrl.pathname.replace(/\/+$/, '') || '/';
        if (linkPath !== path || linkUrl.search !== url.search) return false;
        return url.hash ? linkUrl.hash === url.hash : !linkUrl.hash;
      })
      .map(({ a }) => a);

    const pathMatches = linkInfo
      .filter(({ url: linkUrl }) => {
        if (!linkUrl || linkUrl.origin !== window.location.origin) return false;
        const linkPath = linkUrl.pathname.replace(/\/+$/, '') || '/';
        return linkPath === path && !linkUrl.search && !linkUrl.hash;
      })
      .map(({ a }) => a);

    let activeTargets = [];

    if (!activeTargets.length && cat) {
      const match = links.find((a) => a.dataset.shopCat === cat);
      if (match) activeTargets = [match];
    }

    if (!activeTargets.length && stored) {
      const match =
        links.find((a) => a.dataset.shopCat && a.dataset.shopCat === stored) ||
        links.find((a) => (a.textContent || '').trim().toLowerCase() === stored);
      if (match) activeTargets = [match];
    }

    if (!activeTargets.length && exactMatches.length) {
      activeTargets = exactMatches;
    }

    if (!activeTargets.length && path === '/shop.html') {
      activeTargets = links.filter((a) => {
        const href = a.getAttribute('href') || '';
        try {
          const linkUrl = new URL(href, window.location.origin);
          return linkUrl.pathname === '/shop.html' && !linkUrl.search && !linkUrl.hash && !a.dataset.shopCat;
        } catch {
          return false;
        }
      });
    }

    if (!activeTargets.length && pathMatches.length) {
      activeTargets = pathMatches;
    }

    activeTargets.forEach((match) => {
      match.classList.add('active');
      match.closest('.pp-subnav-group')?.classList.add('has-active');
    });
    if (!activeTargets.length) {
      bar.querySelectorAll('.pp-subnav-group.is-open').forEach((group) => group.classList.remove('has-active'));
    }
  }

  // Drag-to-scroll + wheel-to-horizontal
  let dragging = false;
  let dragArmed = false;
  let didDrag = false;
  let pressX = 0;
  let startLeft = 0;
  const DRAG_ACTIVATE = 6;
  const maxLeft = () => Math.max(0, bar.scrollWidth - bar.clientWidth);
  let suppressClick = false;

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    dragArmed = false;
    didDrag = false;
    pressX = e.clientX;
    startLeft = bar.scrollLeft;
  }

  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - pressX;
    if (!dragArmed && Math.abs(dx) >= DRAG_ACTIVATE) {
      dragArmed = true;
      didDrag = true;
      bar.classList.add('is-dragging');
      try { bar.setPointerCapture?.(e.pointerId); } catch {}
    }
    if (dragArmed) {
      bar.scrollLeft = Math.min(maxLeft(), Math.max(0, startLeft - dx));
    }
  }

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    bar.classList.remove('is-dragging');
    try { bar.releasePointerCapture?.(e.pointerId); } catch {}
    if (didDrag) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
    }
    dragArmed = false;
  }

  bar.addEventListener('pointerdown', onPointerDown, { passive: true });
  bar.addEventListener('pointermove', onPointerMove, { passive: true });
  bar.addEventListener('pointerup', endDrag, { passive: true });
  bar.addEventListener('pointercancel', endDrag, { passive: true });
  bar.addEventListener('lostpointercapture', endDrag, { passive: true });
  bar.addEventListener('click', (e) => {
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const closeBtn = e.target.closest('[data-subnav-close]');
    if (closeBtn) {
      e.preventDefault();
      bar.classList.remove('is-focused');
      bar.querySelectorAll('.pp-subnav-group').forEach((g) => {
        g.classList.remove('is-open');
        const toggle = g.querySelector(toggleSelector);
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
      setActiveFromLocation();
      return;
    }
    const toggle = e.target.closest(toggleSelector);
    if (toggle) {
      e.preventDefault();
      const group = toggle.closest('.pp-subnav-group');
      if (!group) return;
      const isFocused = bar.classList.contains('is-focused');
      const isOpen = group.classList.contains('is-open');

      if (!isFocused) {
        bar.classList.add('is-focused');
        bar.querySelectorAll('.pp-subnav-group').forEach((g) => {
          const shouldOpen = g === group;
          g.classList.toggle('is-open', shouldOpen);
          const t = g.querySelector(toggleSelector);
          if (t) t.setAttribute('aria-expanded', String(shouldOpen));
        });
        return;
      }

      if (isFocused && isOpen) {
        bar.classList.remove('is-focused');
        group.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        setActiveFromLocation();
        return;
      }

      bar.querySelectorAll('.pp-subnav-group').forEach((g) => {
        const shouldOpen = g === group;
        g.classList.toggle('is-open', shouldOpen);
        const t = g.querySelector(toggleSelector);
        if (t) t.setAttribute('aria-expanded', String(shouldOpen));
      });
      return;
    }
    const a = e.target.closest('a');
    if (!a) return;
    const key = a.dataset.shopCat || (a.textContent || '').trim().toLowerCase();
    if (key) sessionStorage.setItem('ppSubnavActive', key);
    bar.querySelectorAll('a.active').forEach((x) => x.classList.remove('active'));
    bar.querySelectorAll('.pp-subnav-group.has-active').forEach((g) => g.classList.remove('has-active'));
    a.classList.add('active');
    const group = a.closest('.pp-subnav-group');
    if (group) {
      group.classList.add('has-active');
      group.classList.add('is-open');
      const toggle = group.querySelector(toggleSelector);
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      bar.classList.add('is-focused');
    }
  });

  bar.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      bar.scrollLeft = Math.min(maxLeft(), Math.max(0, bar.scrollLeft + e.deltaY));
    }
  }, { passive: false });

  // Keep left edge reachable on small screens (avoid centered overflow)
  const syncOverflow = () => {
    const over = (bar.scrollWidth - bar.clientWidth) > 1;
    bar.classList.toggle('is-overflowing', over);
    if (!over) bar.scrollLeft = 0;
  };
  const rafSync = () => requestAnimationFrame(syncOverflow);
  window.addEventListener('resize', rafSync, { passive: true });
  requestAnimationFrame(syncOverflow);
  if (document.fonts?.ready) {
    document.fonts.ready.then(rafSync).catch(() => {});
  }

  setActiveFromLocation();
}

/* ==========================================================================
   Dropdown toggles for pp-dropdown elements (account, wish, cart, orders)
   ========================================================================== */
function wireIconDropdowns(root = document) {
  const ddSelectors = [
    { toggle: '#nav-account-toggle', menu: '#nav-account-toggle + .dropdown-menu' },
    { toggle: '#nav-wish-toggle',    menu: '#pp-wish-menu' },
    { toggle: '#nav-cart-toggle',    menu: '#cart-menu' },
    { toggle: '#nav-orders-toggle',  menu: '#orders-menu' },
  ];
  ddSelectors.forEach(({ toggle, menu }) => {
    const btn = root.querySelector(toggle);
    const panel = root.querySelector(menu);
    if (!btn || !panel || btn.dataset.wiredDD) return;
    if (btn.closest('.pp-dropdown, .nav-item.dropdown, .icon-dropdown')) {
      return;
    }
    btn.dataset.wiredDD = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    });
    document.addEventListener('click', (e) => {
      if (panel.hidden) return;
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
      }
    });
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

  // dropdowns
  wireIconDropdowns(container);
  setupDropdownToggles?.(container); // legacy safety

  // cart badge
  ensureCartBadge(container);

  // search overlay
  wireSearchOverlayOnce();

  // priority nav
  setupPriorityNav(document);

  // subnav active states
  wirePPSubnav(document);

  // huey animation
  wireHueyAnimation(container);

  // mark touch
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.body.classList.add('touch-device');
  }

  // ensure body offset + subnav top use real header height
  scheduleNavOffset();

  // defensive repaint if auth state changes late
  setTimeout(() => { try { updateAuthDisplay?.(); } catch {} }, 300);

  // signal
  try { document.dispatchEvent(new CustomEvent('pp:navbar:ready')); } catch {}
}

/* ==========================================================================
   export: injectNavbar
   ========================================================================== */
async function fetchNavbarHtml() {
  const pref = window.__PP_PREFETCH?.navbar;
  if (pref) {
    try { return await pref; } catch (e) { console.debug('[injectNavbar] prefetch failed:', e); }
  }
  const res = await fetch('/navbar.html', { credentials: 'include', cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function hasNavbarMarkup(container) {
  if (!container) return false;
  if (container.dataset.ppNavbarInjected === '1') return true;
  return !!container.querySelector('.pp-header, .pp-nav, .pp-subnav');
}

export function injectNavbar(callback) {
  return new Promise((resolve) => {
    let container = document.getElementById('navbar-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'navbar-container';
      document.body.prepend(container);
    }

    const finish = () => {
      try { callback?.(); } catch (e) { console.warn('[injectNavbar callback]', e); }
      resolve();
    };

    if (hasNavbarMarkup(container)) {
      requestAnimationFrame(() => {
        wireNavbar(container);
        finish();
      });
      return;
    }

    fetchNavbarHtml()
      .then((html) => {
        container.innerHTML = html;
        container.dataset.ppNavbarInjected = '1';
        requestAnimationFrame(() => {
          wireNavbar(container);
          finish();
        });
      })
      .catch((err) => {
        console.error('[injectNavbar] Injection failed, wiring existing markup:', err);
        // fall back to existing inline markup
        requestAnimationFrame(() => {
          wireNavbar(document);
          finish();
        });
      });
  });
}

// Optional auto-init if needed outside main.js
if (!window.__PP_NAVBAR_AUTO_INIT && !document.getElementById('navbar-container')?.children.length) {
  // Allow main.js to set window.__PP_NAVBAR_AUTO_INIT = false to disable
  window.__PP_NAVBAR_AUTO_INIT = true;
  try { injectNavbar(); } catch {}
}
