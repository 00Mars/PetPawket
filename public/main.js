// /public/main.js
// Resilient bootstrap: navbar/footer injection, search overlay wiring,
// cart utilities (merged from cartUtils.js), inlined nav mini, and a minimal featured grid fallback.

// ====== MODULAR CSS INJECTION ======
const cssFiles = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css',
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;700&display=swap',
  '/css/core.css',
  '/css/hero.css',
  '/css/pettypes.css',
  '/css/pets-traits.css',
  '/css/wishlist.css',
  '/css/ambient-mesh.css',
  '/css/fonts.css',
  '/css/footer.css',
  '/css/navbar.css?v=1' 
];

function isAbsoluteUrl(u) {
  return /^https?:\/\/|^\/\//i.test(String(u || ''));
}
function toCanonicalPath(p) {
  const s = String(p || '').replace(/^[./]+/, '').replace(/^\/+/, '');
  return '/' + s;
}
function normalizeHref(href) {
  try {
    const u = new URL(href, location.href);
    // include origin + path + search so we dedupe Google Fonts correctly
    return u.origin + u.pathname + (u.search || '');
  } catch {
    return String(href || '');
  }
}
function preconnect(href) {
  try {
    const u = new URL(href, location.href);
    const origins = new Set([u.origin]);
    // Google Fonts CSS pulls from fonts.gstatic.com
    if (u.hostname.includes('fonts.googleapis.com')) {
      origins.add('https://fonts.gstatic.com');
    }
    origins.forEach(origin => {
      if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'preconnect';
      l.href = origin;
      l.crossOrigin = '';
      document.head.appendChild(l);
    });
  } catch {}
}
function addCssIfMissing(file) {
  const wantHref = isAbsoluteUrl(file) ? file : toCanonicalPath(file);
  const wantKey = normalizeHref(wantHref);

  // If an identical stylesheet is already present, skip
  const links = document.querySelectorAll('link[rel="stylesheet"], link[data-pp-css]');
  for (const lnk of links) {
    const key = normalizeHref(lnk.href);
    if (key === wantKey) return;
  }

  // Add preconnect for known CDNs (reduces FOUT)
  if (isAbsoluteUrl(wantHref)) preconnect(wantHref);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = wantHref;
  link.setAttribute('data-pp-css', '1');
  link.onload = () => console.debug('[CSS] loaded', wantHref);
  link.onerror = () => console.warn('[CSS] failed to load', wantHref);
  document.head.appendChild(link);
}
cssFiles.forEach(addCssIfMissing);

// ====== OPTIONAL MODULE LOADER ======
async function tryImport(path) {
  try {
    const mod = await import(path);
    console.debug('[import] ok:', path);
    return mod;
  } catch {
    console.debug('[import] not found:', path);
    return null;
  }
}

// ====== UTILITIES ======
const hasEl = (sel) => document.querySelector(sel);

function highlightActiveNav() {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('[data-nav], nav a[href]').forEach((a) => {
    const target = a.getAttribute('href') || a.getAttribute('data-nav') || '/';
    const norm = (target || '/').replace(/\/+$/, '') || '/';
    if (norm === path) a.classList.add('active');
    else a.classList.remove('active');
  });
}

// Compatible search overlay opener (works with navbar.js overlay wiring)
function wiresearchOverlay() {
  const overlay = document.getElementById('searchOverlay') || document.querySelector('[data-searchOverlay]');
  if (!overlay) return;

  const open = () => {
    if (window.__petpawketSearch?.open) return window.__petpawketSearch.open();
    overlay.classList.remove('hidden', 'd-none');
    overlay.querySelector('input')?.focus();
    document.documentElement.style.overflow = 'hidden';
  };
  const toggleButtons = document.querySelectorAll('[data-action="open-search"], [data-toggle="searchOverlay"], [aria-controls="searchOverlay"]');
  toggleButtons.forEach((btn) => {
    if (btn.dataset.wiredSearch) return;
    btn.dataset.wiredSearch = '1';
    btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });
}

/* ======================================================================== */
/*                        CART UTILS (merged)                               */
/*   Exported so page UIs (e.g., /cart.js) can import from /main.js         */
/* ======================================================================== */
export function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
  } catch {}
  try { updateCartBadge(); } catch {}
  try { updateCartBadgeCompat(); } catch {}
}

export function updateCartBadge() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
  const badge = document.querySelector('#cart-count');
  if (badge) badge.textContent = String(totalItems);
}

// Also update class-based badge hosts without touching legacy logic
export function updateCartBadgeCompat() {
  try {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    const nodes = document.querySelectorAll('.cart-count, .cart-badge');
    nodes.forEach(el => { el.textContent = String(totalItems); });
  } catch {}
}

// Global listeners to keep badges fresh
(function wireCartBadgeListeners(){
  if (typeof document === 'undefined') return;
  try { updateCartBadge(); updateCartBadgeCompat(); } catch {}
  try {
    document.addEventListener('pp:cart:changed', () => { try { updateCartBadge(); updateCartBadgeCompat(); } catch {} });
    document.addEventListener('pp:cart:add',     () => { try { updateCartBadge(); updateCartBadgeCompat(); } catch {} });
    document.addEventListener('DOMContentLoaded',() => { try { updateCartBadgeCompat(); } catch {} }, { once:true });
  } catch {}
})();

/* ======================================================================== */
/*                 SEARCH OVERLAY STYLES (fallback injector)                */
/* ======================================================================== */
function ensureSearchOverlayStyles() {
  if (document.getElementById('pp-search-overlay-styles')) return;
  const style = document.createElement('style');
  style.id = 'pp-search-overlay-styles';
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
  .search-card{
    width:min(980px,96vw);
    background:var(--pp-surface);
    border-radius:18px;
    border:1px solid var(--pp-stroke);
    box-shadow: var(--pp-shadow);
    overflow:hidden;
  }
  .search-head{
    display:flex; align-items:center; gap:.75rem;
    padding:.75rem 1rem; border-bottom:1px solid var(--pp-stroke);
    position:sticky; top:0; background:var(--pp-surface); z-index:2;
  }
  .search-head .input-wrap{ position:relative; flex:1; display:flex; align-items:center; }
  .search-head .input-wrap i{ position:absolute; left:10px; font-size:18px; opacity:.55; }
  .search-head input{
    width:100%; border:1px solid rgba(0,0,0,.12);
    border-radius:12px; padding:.55rem .9rem .55rem 2rem; font-size:16px; outline:none; background:#fff;
  }
  .search-head input:focus{ box-shadow:0 0 0 3px var(--pp-ring); border-color:rgba(28,100,242,.35); }
  .search-hints{ margin-left:auto; display:flex; gap:.35rem; align-items:center; color:var(--pp-muted); font-size:12px; }
  .kbd{border:1px solid rgba(0,0,0,.2);border-bottom-width:2px;border-radius:6px;padding:2px 6px;font-size:12px;color:#333;background:#f7f7f8}
  .search-tools{
    display:flex; gap:.5rem; align-items:center; padding:.5rem 1rem; border-bottom:1px solid var(--pp-stroke);
    background:linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.65));
    position:sticky; top:54px; z-index:1;
  }
  .search-results{ max-height:60vh; overflow:auto; padding:10px 12px; }
  .section-title{ font-size:12px; letter-spacing:.06em; text-transform:uppercase; color:var(--pp-muted); margin:10px 6px 6px; }
  .result-item{
    display:grid; grid-template-columns:56px 1fr auto; gap:12px; align-items:center;
    padding:10px; border-radius:12px; border:1px solid var(--pp-stroke); background:#fff;
    transition:transform .06s ease, box-shadow .06s ease, background-color .06s ease;
    text-decoration:none; color:inherit;
  }
  .result-item + .result-item{ margin-top:8px; }
  .result-item:hover{ transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.08); background:#fff; }
  .result-thumb{ width:56px; height:56px; border-radius:10px; object-fit:cover; background:#f4f5f7; border:1px solid var(--pp-stroke); display:flex; align-items:center; justify-content:center; font-weight:700; color:#444; }
  .result-body .title{ font-weight:700; line-height:1.2; }
  .result-body .meta{ font-size:12px; color:var(--pp-muted); }
  .price{ font-weight:700; opacity:.9; }
  .tag{ display:inline-block; font-size:11px; padding:.15rem .4rem; border-radius:999px; border:1px solid var(--pp-stroke); margin-left:8px; color:#555; background:#fafafa; }
  .mark{ background: #fff2ac; border-radius:4px; padding:0 2px; }
  .skeleton{ animation: sk 1.1s linear infinite alternate; background:linear-gradient(90deg, #f2f3f4 0%, #f7f8f9 50%, #f2f3f4 100%); background-size:200% 100%; }
  .sk-line{ height:14px; border-radius:6px; }
  .sk-thumb{ width:56px; height:56px; border-radius:10px; }
  @keyframes sk { from{background-position:0% 0;} to{background-position:100% 0;} }
  `;
  document.head.appendChild(style);
}

/* ======================================================================== */
/*                 NAV OFFSET MEASUREMENT (added)                           */
/*   Measures real fixed navbar height and stores it in --nav-offset        */
/* ======================================================================== */
function setNavOffset() {
  try {
    const sticky = document.querySelector('#navbar-container .sticky-wrapper');
    const h = Math.round((sticky?.getBoundingClientRect?.().height || 170));
    document.documentElement.style.setProperty('--nav-offset', h + 'px');
  } catch {}
}

/* ======================================================================== */
/*                             BRIDGE LOADER                                */
/*   - Lazy-loads wishlist.js and accountPetsBridge.js only                 */
/*   - navMini is inlined below (no imports)                                */
/* ======================================================================== */

const BR_WL_REL   = new URL('./wishlist.js', import.meta.url).href;
const BR_PETS_REL = new URL('./accountPetsBridge.js', import.meta.url).href;

const BR_WL_ABS   = ['/wishlist.js', '/public/wishlist.js'];
const BR_PETS_ABS = ['/accountPetsBridge.js', '/public/accountPetsBridge.js'];

const bridgeLoaded = { wishlist: false, pets: false };
const BR_SEL_WISHLIST = ['#wishlistPane', '[data-wishlist-list]', '.js-wishlist-list'];

function brHasAny(arr) { return arr.some(sel => document.querySelector(sel)); }
function brHasPetsPane() {
  return document.getElementById('myPetsPane')
      && document.getElementById('toggleMyPetsPane')
      && document.getElementById('myPetsContent');
}

async function brImportFirst(urls, tag) {
  let lastErr;
  for (const u of urls) {
    try {
      console.info(`[pp:boot] trying ${tag}: ${u}`);
      const mod = await import(/* @vite-ignore */ u);
      console.info(`[pp:boot] loaded ${tag}: ${u}`);
      return mod;
    } catch (e) {
      lastErr = e;
      console.warn(`[pp:boot] ${tag} import failed: ${u}`, e);
    }
  }
  throw lastErr;
}

async function brTryLoad() {
  if (!bridgeLoaded.wishlist && brHasAny(BR_SEL_WISHLIST)) {
    bridgeLoaded.wishlist = true;
    try { await brImportFirst([BR_WL_REL, ...BR_WL_ABS], 'wishlist'); }
    catch (e) { bridgeLoaded.wishlist = false; console.error('[pp:boot] wishlist load failed completely', e); }
  }

  if (!bridgeLoaded.pets && brHasPetsPane()) {
    bridgeLoaded.pets = true;
    try { await brImportFirst([BR_PETS_REL, ...BR_PETS_ABS], 'pets'); }
    catch (e) { bridgeLoaded.pets = false; console.error('[pp:boot] pets load failed completely', e); }
  }
}

function brBoot() {
  brTryLoad();
  if ('MutationObserver' in window) {
    const mo = new MutationObserver(() => brTryLoad());
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } else {
    setInterval(brTryLoad, 1000);
  }
}

/* ======================================================================== */
/*                          INLINED NAV MINI (no imports)                   */
/*   - Mini cart + wishlist dropdowns                                       */
/*   - Uses /api/wishlist + /api/products/handle/:handle                    */
/*   - Uses getCart() from the merged cart utils above                      */
/* ======================================================================== */

function navMini_find(el) {
  const $ = (sel, root=document) => root.querySelector(sel);
  return {
    cartToggle: $('#nav-cart-toggle') || $('[data-nav-cart-toggle]') || $('[aria-controls="cart-menu"]'),
    cartMenu:   $('#cart-menu') || $('[data-cart-menu]'),
    wishToggle: $('#nav-wish-toggle') || $('[data-nav-wish-toggle]') || $('[aria-controls="pp-wish-menu"]'),
    wishMenu:   $('#pp-wish-menu') || $('[data-wish-menu]'),
  };
}

async function navMini_fetchWishlistHandles() {
  try {
    const r = await fetch('/api/wishlist', { credentials: 'include' });
    if (r.status === 401) return { auth: false, handles: [] };
    const j = await r.json().catch(() => ({}));
    const handles = Array.isArray(j) ? j
                 : Array.isArray(j?.items) ? j.items
                 : Array.isArray(j?.wishlist) ? j.wishlist
                 : [];
    return { auth: true, handles };
  } catch {
    return { auth: true, handles: [], error: true };
  }
}

async function navMini_fetchProductByHandle(handle) {
  const r = await fetch(`/api/products/handle/${encodeURIComponent(handle)}`, { credentials: 'include' });
  if (!r.ok) throw new Error('product fetch ' + r.status);
  const j = await r.json().catch(() => ({}));
  return j?.product || j;
}

const navMini_cache = new Map();
const NAV_TTL_MS = 5 * 60 * 1000;
function navMini_getCached(h) {
  const hit = navMini_cache.get(h);
  if (!hit) return null;
  if (Date.now() - hit.t > NAV_TTL_MS) { navMini_cache.delete(h); return null; }
  return hit.v;
}
function navMini_setCached(h, v) { navMini_cache.set(h, { t: Date.now(), v }); }

function navMini_money(n) {
  const v = Number(n);
  return Number.isFinite(v)
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(v)
    : '';
}

async function navMini_renderCart(menuEl) {
  if (!menuEl) return;
  try {
    const cart = getCart() || [];
    if (!Array.isArray(cart) || cart.length === 0) {
      menuEl.innerHTML = `
        <div class="p-3">
          <div class="text-center text-muted small">Your cart is empty.</div>
          <div class="d-grid mt-2">
            <a class="btn btn-sm btn-primary" href="/shop">Shop now</a>
          </div>
        </div>`;
      return;
    }
    const max = 6;
    const items = cart.slice(0, max);
    const subtotal = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const lines = items.map(it => `
      <div class="d-flex align-items-center gap-2 p-2">
        ${it.image ? `<img src="${it.image}" alt="" class="flex-shrink-0 rounded" style="width:48px;height:48px;object-fit:cover;">` : ''}
        <div class="flex-grow-1 small">
          <div class="fw-semibold text-truncate" title="${it.title || ''}">${it.title || ''}</div>
          <div class="text-muted">${navMini_money(it.price)} × ${Number(it.quantity)||1}</div>
        </div>
      </div>`).join('');
    menuEl.innerHTML = `
      <div class="p-2">${lines}</div>
      <div class="border-top p-2 d-flex align-items-center justify-content-between">
        <div class="small text-muted">Subtotal</div>
        <div class="fw-semibold">${navMini_money(subtotal)}</div>
      </div>
      <div class="p-2 d-grid gap-2">
        <a class="btn btn-sm btn-primary" href="/cart.html">Go to cart</a>
      </div>`;
  } catch (e) {
    console.warn('[navMini] cart render error:', e);
  }
}

async function navMini_renderWishlist(menuEl) {
  if (!menuEl) return;
  const state = await navMini_fetchWishlistHandles();
  if (!state.auth) {
    menuEl.innerHTML = `
      <div class="p-3 text-center">
        <div class="text-muted small">Sign in to view your wishlist.</div>
        <a class="btn btn-sm btn-primary mt-2" href="/account/login">Sign in</a>
      </div>`;
    return;
  }
  const handles = state.handles.slice(0, 8);
  if (!handles.length) {
    menuEl.innerHTML = `<div class="p-3 text-center text-muted small">Wishlist is empty.</div>`;
    return;
  }
  const products = [];
  for (const h of handles) {
    const cached = navMini_getCached(h);
    if (cached) { products.push(cached); continue; }
    try {
      const p = await navMini_fetchProductByHandle(h);
      navMini_setCached(h, p);
      products.push(p);
    } catch { /* ignore single failures */ }
  }
  menuEl.innerHTML = products.map(p => {
    const img = p?.featuredImage?.url || p?.image || '/assets/images/placeholder.png';
    const price = p?.price?.amount ?? p?.variants?.[0]?.price ?? p?.priceRange?.minVariantPrice?.amount;
    return `
      <a class="d-flex align-items-center gap-2 p-2 text-decoration-none text-reset" href="/products/${encodeURIComponent(p?.handle || '')}">
        <img src="${img}" alt="" class="flex-shrink-0 rounded" style="width:40px;height:40px;object-fit:cover;">
        <div class="flex-grow-1 small text-truncate">
          <div class="fw-semibold text-truncate">${p?.title || 'Product'}</div>
          <div class="text-muted">${price ? navMini_money(price) : ''}</div>
        </div>
      </a>`;
  }).join('');
}

function navMini_wire() {
  const { cartToggle, cartMenu, wishToggle, wishMenu } = navMini_find(document);
  const onOpenCart = () => navMini_renderCart(cartMenu);
  const onOpenWish = () => navMini_renderWishlist(wishMenu);
  if (cartToggle && cartMenu) {
    ['click','mouseenter','focusin'].forEach(ev => cartToggle.addEventListener(ev, onOpenCart, { passive: true }));
  }
  if (wishToggle && wishMenu) {
    ['click','mouseenter','focusin'].forEach(ev => wishToggle.addEventListener(ev, onOpenWish, { passive: true }));
  }
  document.addEventListener('show.bs.dropdown', (e) => {
    const toggle = e.target?.querySelector?.('[data-bs-toggle="dropdown"], .dropdown-toggle') || e.target;
    if (!toggle) return;
    const controls = toggle.getAttribute('aria-controls') || '';
    if (controls === 'cart-menu') onOpenCart();
    if (controls === 'pp-wish-menu') onOpenWish();
  });
}

function enhanceShopBy() {
  try {
    import('./js/nav-glide.js')
      .then(mod => { try { mod.initNavGlide(); } catch (e) { console.warn('[nav-glide init]', e); } })
      .catch(err => console.warn('[nav-glide import]', err));
  } catch (e) {
    console.warn('[enhanceShopBy shim]', e);
  }
}

/* ======================================================================== */

// ====== BOOT ======
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[BOOT] main.js starting…');
  brBoot();

  // Load required/primary modules. Use dynamic imports to avoid hard failures.
  const [
    productsMod,
    navbarMod,
    footerMod,
    searchMod,
    heroMod,
    missionMod,
    navOverlayMod,
    navAnimMod,
    authMod,
  ] = await Promise.all([
    tryImport('./products.js'),
    tryImport('./navbar.js'),
    tryImport('./footer.js'),
    tryImport('./searchLogic.js'),
    tryImport('./hero.js'),
    tryImport('./mission.js'),
    tryImport('./navbarOverlay.js'),
    tryImport('./navbarAnimation.js'),
    tryImport('./auth.js'),
  ]);
  const newsMod = (await tryImport('./newsModule.js')) || (await tryImport('./news.js'));

  const fetchFeaturedProducts = productsMod?.fetchFeaturedProducts;
  const setupEventListeners   = productsMod?.setupEventListeners;
  const allProducts           = productsMod?.allProducts || [];
  const injectNavbar                = navbarMod?.injectNavbar;
  const injectFooter                = footerMod?.injectFooter;
  const setupSearchFunctionality    = searchMod?.setupSearchFunctionality;
  const injectHero                  = heroMod?.injectHero;
  const injectMission               = missionMod?.injectMission;
  const injectNews                  = newsMod?.injectNews || newsMod?.initNews;
  const setupNavbarOverlayHandlers  = navOverlayMod?.setupNavbarOverlayHandlers;
  const setupHueyAnimation          = navAnimMod?.setupHueyAnimation;
  const wireAuthUI                  = authMod?.wireAuthUI;
  const updateAuthDisplay           = authMod?.updateAuthDisplay;

  // === NAVBAR ===
  try {
    if (typeof injectNavbar === 'function') {
      console.log('[Navbar] Injecting…');
      const afterNavbar = async () => {
        console.log('[Navbar] Ready. Initializing features…');
        try {
          setNavOffset();
          window.addEventListener('resize', setNavOffset, { passive: true });
          setupNavbarOverlayHandlers?.();
          setupHueyAnimation?.();
          ensureSearchOverlayStyles();

          // Only wire searchLogic (page search) if a page-level container exists.
          try {
            const pageSearchContainer = document.querySelector('#search-results-container, [data-search-results]');
            if (pageSearchContainer && setupSearchFunctionality) {
              try { await productsMod?.fetchAllProducts?.(); } catch {}
              const products = productsMod?.allProducts || allProducts || [];
              setupSearchFunctionality(products);
              console.info('[Search] page search wired with', products.length, 'products');
            } else {
              console.debug('[Search] no page search container; overlay will use its own renderer.');
            }
          } catch (e) {
            console.warn('[Search] wiring failed:', e);
          }

          updateCartBadge();
          highlightActiveNav();
          wiresearchOverlay();
          wireAuthUI?.();
          await updateAuthDisplay?.();

          // Wire inlined nav mini after navbar is present
          navMini_wire();

          // Enhance the Shop-By pill
          enhanceShopBy();

          // Re-run bridge loader post-inject in case elements appeared
          brTryLoad();
        } catch (e) {
          console.warn('[Navbar] post-inject setup warning:', e);
        }
      };
      const maybe = injectNavbar(afterNavbar);
      if (maybe && typeof maybe.then === 'function') await maybe;
      else await afterNavbar();
    } else {
      console.warn('[Navbar] injector missing — navbar will not render.');
    }
  } catch (e) {
    console.error('[Navbar] Injection error:', e);
  }

  // === HERO ===
  try {
    if (hasEl('#hero-container') && typeof injectHero === 'function') {
      console.log('[Hero] Injecting…');
      await injectHero();
    }
  } catch (e) {
    console.warn('[Hero] warning:', e);
  }

  // === MISSION ===
  try {
    if (hasEl('#mission-container') && typeof injectMission === 'function') {
      console.log('[Mission] Injecting…');
      await injectMission();
    }
  } catch (e) {
    console.warn('[Mission] warning:', e);
  }

  // === PRODUCTS ===
  try {
    if (hasEl('#featured-products') || hasEl('#featuredProducts')) {
      console.log('[Products] Fetching & rendering featured…');
      await fetchFeaturedProducts?.();
      setupEventListeners?.();
    } else {
      console.debug('[Products] No featured container on this page — skipping.');
    }
  } catch (e) {
    console.warn('[Products] warning:', e);
  }

  // === NEWS ===
  try {
    if (hasEl('#news-container')) {
      console.log('[News] Injecting…');
      if (typeof injectNews === 'function') {
        await injectNews();
      } else {
        console.debug('[News] injector not found (no news module present).');
      }
    } else {
      console.debug('[News] No #news-container on this page — skipping.');
    }
  } catch (e) {
    console.warn('[News] warning:', e);
  }

  // === FOOTER ===
  try {
    if (hasEl('#footer-container') && typeof injectFooter === 'function') {
      console.log('[Footer] Injecting…');
      await injectFooter();
    } else if (hasEl('#footer-container')) {
      console.warn('[Footer] injector missing — footer will not render.');
    }
  } catch (e) {
    console.warn('[Footer] warning:', e);
  }

  console.log('[BOOT] main.js complete.');
});

// Global last-chance logger
window.addEventListener('error', (e) => {
  console.error('[GlobalError]', e.message || e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledRejection]', e.reason || e);
});

// ========= Featured Products (minimal, layout-safe) =========
(function setupFeaturedProducts(){
  const path = (location.pathname || '/').replace(/\/+$/,'') || '/';
  if (path !== '/' && path !== '/index.html') return;

  const root = document.getElementById('featuredProducts') 
            || document.getElementById('featured-products');

  async function loadFeaturedProducts(limit = 8) {
    try {
      const r = await fetch(`/api/products/featured?limit=${limit}`, { credentials: 'include' });
      if (!r.ok) throw new Error('featured load failed');
      const data = await r.json();
      const items = data?.items ?? data?.products ?? data?.products?.nodes ?? [];
      render(items);
    } catch (e) {
      console.warn('[featured] failed:', e);
    }
  }

  const money = (v, c) => {
    const n = Number(v);
    return (Number.isFinite(n) ? n.toFixed(2) : '0.00') + (c ? ` ${c}` : '');
  };

  function card(p) {
    const img = p.featuredImage?.url || '/assets/images/placeholder.png';
    const title = p.title || '';
    const handle = p.handle || '';
    const id = p.id || '';
    const minp = p.priceRange?.minVariantPrice, maxp = p.priceRange?.maxVariantPrice;
    const price = minp
      ? (minp.amount === maxp?.amount
          ? money(minp.amount, minp.currencyCode)
          : `${money(minp.amount, minp.currencyCode)} – ${money(maxp.amount, maxp.currencyCode)}`)
      : '';

    return `
      <div class="col-6 col-md-3">
        <div class="card h-100" data-product-id="${id}" data-product-handle="${handle}">
          <a href="/products/${encodeURIComponent(handle)}"
             class="text-decoration-none text-reset product-link d-block"
             data-handle="${handle}" aria-label="${title}">
            <div class="ratio ratio-1x1 mb-2">
              <img src="${img}" class="card-img-top" alt="${title}" loading="lazy" style="object-fit:cover;height:190px;">
            </div>
          </a>
          <div class="card-body d-flex flex-column">
            <a href="/products/${encodeURIComponent(handle)}"
               class="stretched-link text-decoration-none text-reset product-link"
               data-handle="${handle}">
              <div class="fw-semibold text-truncate" title="${title}">${title}</div>
            </a>
            <div class="text-muted small mt-1">${price}</div>
            <div class="mt-auto">
              <button class="btn btn-sm btn-outline-primary mt-2"
                      data-action="wishlist-add"
                      data-product-id="${id}"
                      data-product-handle="${handle}">
                <i class="bi bi-heart"></i> Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function render(items) {
    const grid = document.getElementById('featuredGrid') || document.querySelector('#featuredGrid');
    if (!grid) return;
    if (!items.length) {
      grid.innerHTML = `<div class="text-muted">No featured products.</div>`;
      return;
    }
    grid.innerHTML = items.map(card).join('');
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action="wishlist-add"]');
    if (!btn) return;
    const productId = btn.getAttribute('data-product-id') || '';
    const handle = btn.getAttribute('data-product-handle') || '';
    try {
      const r = await fetch('/api/wishlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, handle }),
      });
      if (!r.ok) throw new Error(await r.text());
      btn.innerHTML = `<i class="bi bi-heart-fill"></i> Wishlisted`;
      btn.classList.remove('btn-outline-primary');
      btn.classList.add('btn-primary');
    } catch (err) {
      console.error('[wishlist] add error:', err);
      alert('Could not add to wishlist. Are you signed in?');
    }
  });

  loadFeaturedProducts(8);
})();
