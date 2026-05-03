/* /public/shop.js - shop behavior for the redesigned Pet Pawket market surface
 *
 * Shop page - normal filters + optional "For My Pets" mode.
 * - Normal category/search/sort/items-per-page remain unchanged.
 * - "For My Pets" adds a guidance & recommendations pane above the grid.
 * - Optionally boosts ranking for products matching pets (toggleable flag).
 * - Pack-eligible add-on planner remains decoupled (modal + event).
 * - New: client-side pagination (page numbers) with URL sync (?p=)
 */

import { productCardHTML, productSkeletonHTML, formatMoney } from './components/productCard.js';
import { PetsBus } from './petsEvents.js';
import { api } from './api.js';
import { addToCart, getCart, getSubtotal, updateCartBadge } from './cartUtils.js';
import {
  buildPetProfile,
  buildPersonalizedShelf,
  firstVariant,
  petShelfHref,
  rankProductsForPets,
  productKey
} from './petPersonalization.js';

console.info('[shop.js] v5-compact-mypets+pager');

// incremental render invalidation token
let __pp_renderToken = 0;

const GRID         = document.getElementById('pp-grid');
const STATUS       = document.getElementById('pp-status');
const SEARCH       = document.getElementById('pp-search');
const SEL_CATEGORY = document.getElementById('pp-category');
const SEL_SORT     = document.getElementById('pp-sort');
const SEL_PAGE     = document.getElementById('pp-page-size');   // keep existing ID
const CHIPS_WRAP   = document.querySelector('.pp-chips');
const SUB_TOGGLE   = document.getElementById('pp-subscribe-toggle') || document.getElementById('pp-subscribe-only');
const MY_TOGGLE    = document.getElementById('pp-my-pets-toggle');
const MY_PANE      = document.getElementById('pp-my-pane');
const PAGE         = document.querySelector('.shop-page');
const SHOP_CURATED = document.getElementById('shop-curated');
const FILTER_SUMMARY = document.getElementById('shop-active-filters');
const SHOP_PREVIEW = document.querySelector('[data-shop-preview]');
const SHOP_TOTAL = document.querySelector('[data-shop-total]');
const SHOP_SOURCE = document.querySelector('[data-shop-source]');
const SHOP_CART_COUNT = document.querySelector('[data-shop-cart-count]');
const SHOP_CART_TOTAL = document.querySelector('[data-shop-cart-total]');

const MODAL_EL       = document.getElementById('pp-subscribe-modal');
const MODAL_TITLE    = document.getElementById('pp-subscribe-title');
const MODAL_SUMMARY  = document.getElementById('pp-subscribe-summary');
const MODAL_INTERVAL = document.getElementById('pp-subscribe-interval');
const MODAL_PRICE    = document.getElementById('pp-subscribe-price');
const MODAL_CONFIRM  = document.getElementById('pp-subscribe-confirm');

let bsModal = null;
if (MODAL_EL && typeof bootstrap !== 'undefined') {
  // eslint-disable-next-line no-undef
  bsModal = new bootstrap.Modal(MODAL_EL, { backdrop: true, keyboard: true });
}

const ALLOW_OFFLINE  = (PAGE?.getAttribute('data-allow-offline') === 'true') || hasQuery('offline');
const INITIAL_LIMIT  = 250;
const CHUNK_SIZE     = 16;

// Subscription config
const SUBSCRIBE_DEFAULT   = { intervals: ['2w','4w','8w'], discountPct: 10 };
const SUBSCRIBE_OVERRIDES = {};

// Categories (kept consistent with existing)
const CATEGORY_RULES = [
  { key: 'dog',         tests: [/dog/i, /canine/i, /puppy/i, /chew/i, /leash/i, /collar/i] },
  { key: 'cat',         tests: [/cat/i, /feline/i, /kitten/i, /litter/i, /scratcher/i] },
  { key: 'small-pet',   tests: [/hamster/i, /bunny|rabbit/i, /guinea/i, /gerbil/i, /small pet/i] },
  { key: 'bird',        tests: [/bird/i, /parrot/i, /aviary/i, /perch/i, /seed/i] },
  { key: 'fish',        tests: [/fish/i, /aquarium/i, /betta/i, /filter/i, /tank/i] },
  { key: 'reptile',     tests: [/reptile/i, /lizard/i, /gecko/i, /snake/i, /tortoise|turtle/i] },
  { key: 'toy',         tests: [/toy/i, /ball/i, /plush/i, /tug/i, /chew toy/i] },
  { key: 'treat',       tests: [/treat/i, /snack/i, /biscuit/i, /chew stick/i] },
  { key: 'accessories', tests: [/bowl/i, /bed/i, /toy/i, /treat/i, /accessor/i, /apparel|bandana/i] },
];
const CATEGORY_KEYS = CATEGORY_RULES.map(r => r.key);

// Offline sample (tiny; used only if ALLOW_OFFLINE)
const SAMPLE_PRODUCTS = [
  { id: 'gid://shopify/Product/1', handle: 'rope-toy', title: 'Rope Toy', tags: ['dog','toy'], priceRange: { minVariantPrice: { amount: '9.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '9.99', currencyCode: 'USD' } }, featuredImage: { url: '/assets/images/pet-dog.png' } },
  { id: 'gid://shopify/Product/2', handle: 'cat-scratcher', title: 'Cat Scratcher', tags: ['cat','scratcher'], priceRange: { minVariantPrice: { amount: '19.99', currencyCode: 'USD' }, maxVariantPrice: { amount: '24.99', currencyCode: 'USD' } }, featuredImage: { url: '/assets/images/pet-cat.png' } },
];

// State
const state = {
  all: [],
  filtered: [],
  byKey: Object.create(null),
  subscribeOnly: false,
  myPetsMode: false,
  myPets: [],
  wishlist: new Set(),
  page: 1, // current page (1-based)
  source: '',
};

function setStatus(msg='') { if (STATUS) STATUS.textContent = msg; }

/* --------------------------------
   Boot + wiring
-------------------------------- */
const debouncedSearch = debounce(() => {
  updateQueryParam('q', SEARCH?.value || null);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
}, 200);

SEARCH?.addEventListener('input', debouncedSearch);

SEL_CATEGORY?.addEventListener('change', () => {
  const cat = getSelectedCategory();
  updateQueryParam('pet', cat || null);
  syncChips(cat);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

SEL_SORT?.addEventListener('change', () => {
  updateQueryParam('sort', SEL_SORT.value || null);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

SEL_PAGE?.addEventListener('change', () => {
  const val = Number(SEL_PAGE.value) || 0;
  updateQueryParam('per', val || null);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

CHIPS_WRAP?.addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  const cat = (btn.getAttribute('data-chip') || '');
  setCategory(cat);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

document.addEventListener('pp:cart:changed', updateShopCartSummary);
document.addEventListener('pp:cart:add', updateShopCartSummary);
window.addEventListener('storage', (event) => {
  if (event.key === 'cart') updateShopCartSummary();
});

SUB_TOGGLE?.addEventListener('change', () => {
  state.subscribeOnly = !!SUB_TOGGLE.checked;
  updateQueryParam('subscribe', state.subscribeOnly ? 1 : null);
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

MY_TOGGLE?.addEventListener('change', async () => {
  state.myPetsMode = !!MY_TOGGLE.checked;
  updateQueryParam('mypets', state.myPetsMode ? 1 : null);
  api.prefsSetForMyPets(state.myPetsMode).catch(() => {});
  if (state.myPetsMode) {
    await ensureMyPetsPane();
  } else {
    hideMyPetsPane();
  }
  state.page = 1; updateQueryParam('p', state.page);
  applyFiltersAndRender();
});

// Navbar bridge → sync
document.addEventListener('pp:shop:set', async (e) => {
  const d = e.detail || {};
  if (typeof d.pet === 'string') setCategory(d.pet);
  if (typeof d.q === 'string' && SEARCH) { SEARCH.value = d.q; updateQueryParam('q', d.q || null); }
  if (typeof d.sort === 'string' && SEL_SORT) { SEL_SORT.value = d.sort; updateQueryParam('sort', d.sort || null); }
  if (typeof d.per !== 'undefined' && SEL_PAGE) { SEL_PAGE.value = String(d.per); updateQueryParam('per', d.per || null); }
  if (d.subscribe != null) { state.subscribeOnly = !!d.subscribe; updateQueryParam('subscribe', state.subscribeOnly ? 1 : null); }
  if (d.myPets != null) {
    state.myPetsMode = !!d.myPets;
    updateQueryParam('mypets', state.myPetsMode ? 1 : null);
    api.prefsSetForMyPets(state.myPetsMode).catch(() => {});
  }
  if (typeof d.page === 'number') { state.page = Math.max(1, Math.floor(d.page)); }
  syncToggles();
  if (state.myPetsMode) await ensureMyPetsPane();
  applyFiltersAndRender();
});

MY_PANE?.addEventListener('click', async (e) => {
  const wish = e.target.closest('[data-action="my-pet-wish"]');
  if (wish) {
    e.preventDefault();
    await onPaneWishlistClick(wish);
    return;
  }

  const add = e.target.closest('[data-action="my-pet-add-cart"]');
  if (add) {
    e.preventDefault();
    onPaneAddToCartClick(add);
  }
});

window.addEventListener('popstate', async () => {
  hydrateFromURL();
  syncToggles();
  if (state.myPetsMode) await ensureMyPetsPane();
  else hideMyPetsPane();
  applyFiltersAndRender();
});

/* --------------------------------
   Data fetch / normalize
-------------------------------- */
async function loadProducts(limit) {
  const url = `/api/products/all?limit=${Number(limit) || INITIAL_LIMIT}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  const res = await fetch(url, { credentials: 'include', signal: ctrl.signal });
  clearTimeout(t);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const list = Array.isArray(data?.items) ? data.items
            : Array.isArray(data?.products) ? data.products
            : Array.isArray(data?.products?.nodes) ? data.products.nodes
            : [];
  if (!Array.isArray(list)) throw new Error('Unexpected products shape');
  return { list, source: data?.source || '' };
}

function enrichNode(p) { return { ...p, _category: inferCategory(p) }; }
function indexProducts() {
  state.byKey = Object.create(null);
  for (const p of state.all) {
    if (p?.id) state.byKey[p.id] = p;
    if (p?.handle) state.byKey[p.handle] = p;
  }
}

/* --------------------------------
   Rendering (UPGRADED: chunked + delegated)
-------------------------------- */
function renderSkeleton(n = 8) {
  if (!GRID) return;
  let html = '';
  for (let i = 0; i < n; i++) html += productSkeletonHTML();
  GRID.innerHTML = html;
}

function renderGrid(list) {
  if (!GRID) return;
  if (!Array.isArray(list) || list.length === 0) {
    GRID.innerHTML = `
      <li class="pp-empty" role="status">
        <strong>No products matched those filters.</strong>
        <span>Try a different category, clear search, or browse the curated box pages while this shelf grows.</span>
        <div class="pp-empty-actions">
          <a class="btn btn-primary btn-sm" href="/shop.html">Browse all products</a>
          <a class="btn btn-outline-secondary btn-sm" href="/packs.html">Compare Packs</a>
          <a class="btn btn-outline-secondary btn-sm" href="/account.html#account-pets">Add pet profile</a>
        </div>
      </li>`;
    return;
  }

  // Cancel any in-progress render
  __pp_renderToken++;
  const token = __pp_renderToken;

  GRID.innerHTML = '';

  // Single delegated listeners (prevents rebinding each render)
  if (!GRID.__pp_delegated) {
    GRID.addEventListener('click', (e) => {
      // Wishlist — prevent navigation from the stretched-link overlay
      const wish = e.target.closest('.pp-card .wish');
      if (wish) {
        e.preventDefault();
        e.stopPropagation();
        onWishClick(wish);
        return;
      }

      const add = e.target.closest('[data-action="shop-add-cart"]');
      if (add) {
        e.preventDefault();
        e.stopPropagation();
        onAddToCartClick(add);
      }
    });
    GRID.addEventListener('keydown', (e) => {
      // Make Enter/Space activate the stretched-link for accessibility parity
      const a = e.target.closest('.pp-card .view-link');
      if (!a) return;
      if (e.key === 'Enter' || e.key === ' ') { a.click(); e.preventDefault(); }
    });
    GRID.__pp_delegated = true;
  }

  const n = list.length;
  let i = 0;

  const step = () => {
    if (token !== __pp_renderToken) return; // canceled
    const slice = list.slice(i, i + CHUNK_SIZE).map(productCardHTML).join('');
    GRID.insertAdjacentHTML('beforeend', slice);
    syncWishlistButtons(GRID);
    i += CHUNK_SIZE;
    if (i < n) {
      requestAnimationFrame(step);
    } else {
      injectSubscribeButtons(); // only once all cards are present
    }
  };

  requestAnimationFrame(step);
}

/* Subscribe UI (main grid and panes) */
function injectSubscribeButtons() {
  injectSubscribeButtonsIn(GRID, state.subscribeOnly);
}
function injectSubscribeButtonsIn(root, force=false) {
  if (!root) return;
  if (!force) {
    root.querySelectorAll('.pp-subscribe-cta').forEach(el => el.remove());
    if (!state.subscribeOnly) return;
  }
  root.querySelectorAll('.pp-card').forEach(card => {
    if (card.querySelector('.pp-subscribe-cta')) return;
    const id     = card.getAttribute('data-id') || card.getAttribute('data-product-id') || '';
    const handle = card.getAttribute('data-handle') || card.getAttribute('data-product-handle') || '';
    const key    = id || handle;

    // Prefer adding the subscribe row near existing CTAs
    const host = card.querySelector('.shop-card-actions') || card.querySelector('.body') || card;
    const wrap = document.createElement('div');
    wrap.className = 'pp-subscribe-cta d-flex align-items-center justify-content-between mt-2';
    wrap.innerHTML = `
      <button type="button" class="btn btn-primary btn-sm" data-action="pp-subscribe" data-key="${escapeHtml(key)}">
        Save as add-on
      </button>
      <small class="text-muted ms-2">Box planning</small>
    `;
    host.appendChild(wrap);
  });

  // Attach once per root. A freshly created handler cannot be removed later.
  if (!root.__ppSubscribeHandler) {
    root.__ppSubscribeHandler = (e) => {
      const btn = e.target.closest('[data-action="pp-subscribe"]');
      if (!btn) return;
      openSubscribeModalForKey(btn.getAttribute('data-key') || '');
    };
    root.addEventListener('click', root.__ppSubscribeHandler);
  }
}

function openSubscribeModalForKey(key) {
  if (!MODAL_EL || !MODAL_TITLE || !MODAL_INTERVAL || !MODAL_PRICE || !MODAL_CONFIRM) return;

  let p = state.byKey[key];
  if (!p) {
    const card = document.querySelector(`.pp-card [data-action="pp-subscribe"][data-key="${CSS.escape(key)}"]`)?.closest('.pp-card');
    if (card) {
      p = {
        id:     card.getAttribute('data-id') || null,
        handle: card.getAttribute('data-handle') || null,
        title:  card.querySelector('.title')?.textContent?.trim() || 'Product',
        featuredImage: { url: card.querySelector('img')?.getAttribute('src') || '' },
      };
    }
  }
  if (!p) return;

  const { intervals } = getSubConfig(p);
  MODAL_TITLE.textContent   = 'Save as pack-eligible add-on';
  MODAL_SUMMARY && (MODAL_SUMMARY.textContent = `${p.title || 'This product'} can be saved for future Pawket Pack, Packet, or Pick planning. The curated box pages stay separate from the shop catalog.`);
  if (MODAL_CONFIRM) MODAL_CONFIRM.textContent = 'Save add-on';
  MODAL_INTERVAL.innerHTML  = intervals.map(v => `<option value="${v}">${formatInterval(v)}</option>`).join('');

  const [min] = readPrices(state.byKey[key] || p);
  MODAL_PRICE.textContent   = min != null
    ? `Current item price: ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(min)}`
    : 'Current item price appears on the product page.';

  bsModal?.show();

  const onConfirm = async () => {
    try {
      // Emit to your subscription flow if present
      PetsBus?.emit?.('subscribe:add', { product: p.handle || p.id, interval: MODAL_INTERVAL.value });
    } catch {}
    savePackPreview(p, MODAL_INTERVAL.value);
    gentleToast('Saved as pack-eligible.');
    bsModal?.hide();
    MODAL_CONFIRM.removeEventListener('click', onConfirm);
  };
  MODAL_CONFIRM.addEventListener('click', onConfirm, { once: true });
}

function savePackPreview(product, interval) {
  try {
    const key = 'pp_pack_preview';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const list = Array.isArray(current) ? current : [];
    const item = {
      id: product?.id || '',
      handle: product?.handle || '',
      title: product?.title || 'Product',
      interval,
      savedAt: new Date().toISOString()
    };
    const next = [item, ...list.filter(existing => String(existing.handle || existing.id) !== String(item.handle || item.id))].slice(0, 24);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}

/* -------------------------------
   Wishlist (uses event bus; toggles heart icon)
-------------------------------- */
async function loadWishlistState() {
  try {
    const res = await api.wishlistList();
    if (!res?.ok) return;
    const handles = Array.isArray(res.wishlist) ? res.wishlist : (Array.isArray(res.items) ? res.items : []);
    state.wishlist = new Set(handles.map(h => String(h || '').trim()).filter(Boolean));
  } catch {}
}

function setWishlistButtonState(btn, wished) {
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(!!wished));
  const icon = btn.querySelector('.bi');
  if (icon) {
    icon.classList.toggle('bi-heart', !wished);
    icon.classList.toggle('bi-heart-fill', !!wished);
  }
  const handle = btn.getAttribute('data-handle') || '';
  btn.setAttribute('aria-label', wished ? `Remove ${handle} from wishlist` : `Add ${handle} to wishlist`);
}

function syncWishlistButtons(root = document) {
  root.querySelectorAll('.pp-card .wish[data-handle]').forEach(btn => {
    const handle = btn.getAttribute('data-handle') || '';
    setWishlistButtonState(btn, state.wishlist.has(handle));
  });
}

async function onWishClick(btn) {
  const handle = btn.getAttribute('data-handle') || '';
  if (!handle) return;

  const wasWished = state.wishlist.has(handle) || btn.getAttribute('aria-pressed') === 'true';
  btn.disabled = true;
  try {
    const res = wasWished
      ? await api.wishlistRemove(handle)
      : await api.wishlistAdd(handle);

    if (!res?.ok) {
      if (res?.status === 401 || res?.status === 403) {
        if (typeof window.PP_openAuthModal === 'function') window.PP_openAuthModal('login');
        else document.querySelector('[data-toggle="login-modal"]')?.click();
        gentleToast('Sign in to save your wishlist.');
      } else {
        gentleToast('Wishlist update failed.');
      }
      return;
    }

    if (wasWished) {
      state.wishlist.delete(handle);
      try { PetsBus.emit('wishlist:remove', { handle }); } catch {}
      gentleToast('Removed from wishlist.');
    } else {
      state.wishlist.add(handle);
      try { PetsBus.emit('wishlist:add', { handle }); } catch {}
      gentleToast('Added to wishlist!');
    }
    syncWishlistButtons(GRID);
  } finally {
    btn.disabled = false;
  }
}

async function onPaneWishlistClick(btn) {
  const handle = btn.getAttribute('data-handle') || '';
  if (!handle) return;
  const wasWished = state.wishlist.has(handle) || btn.getAttribute('aria-pressed') === 'true';
  btn.disabled = true;
  try {
    const res = wasWished
      ? await api.wishlistRemove(handle)
      : await api.wishlistAdd(handle);

    if (!res?.ok) {
      if (res?.status === 401 || res?.status === 403) {
        if (typeof window.PP_openAuthModal === 'function') window.PP_openAuthModal('login');
        else document.querySelector('[data-toggle="login-modal"]')?.click();
        gentleToast('Sign in to save your wishlist.');
      } else {
        gentleToast('Wishlist update failed.');
      }
      return;
    }

    if (wasWished) {
      state.wishlist.delete(handle);
      try { PetsBus.emit('wishlist:remove', { handle }); } catch {}
      gentleToast('Removed from wishlist.');
    } else {
      state.wishlist.add(handle);
      try { PetsBus.emit('wishlist:add', { handle }); } catch {}
      gentleToast('Added to wishlist!');
    }
    syncWishlistButtons(GRID);
    syncMyPetsWishlistButtons(MY_PANE);
  } finally {
    btn.disabled = false;
  }
}

function onAddToCartClick(btn) {
  const card = btn.closest('.pp-card');
  if (!card) return;
  const variantId = card.getAttribute('data-variant-id') || '';
  if (!variantId) {
    gentleToast('Open details to choose an option.');
    const href = card.querySelector('.view-link')?.getAttribute('href');
    if (href) window.location.assign(href);
    return;
  }

  const item = {
    variantId,
    productId: card.getAttribute('data-id') || '',
    handle: card.getAttribute('data-handle') || '',
    title: card.getAttribute('data-title') || card.querySelector('.title')?.textContent?.trim() || 'Product',
    price: Number(card.getAttribute('data-price') || 0),
    image: card.getAttribute('data-image') || card.querySelector('img')?.getAttribute('src') || '',
    variantTitle: card.getAttribute('data-variant-title') || ''
  };

  addToCart(item, 1);
  updateCartBadge();
  updateShopCartSummary();

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-success');
  btn.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i> Added';
  gentleToast('Added to cart.');
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('btn-success');
    btn.classList.add('btn-primary');
    btn.innerHTML = original;
  }, 1300);
}

function onPaneAddToCartClick(btn) {
  const key = btn.getAttribute('data-key') || btn.getAttribute('data-handle') || '';
  const product = state.byKey[key] || state.all.find(p => productKey(p) === key);
  if (!product) return;
  const variant = firstVariant(product);
  if (!variant?.id || variant.available === false) {
    const handle = product.handle ? encodeURIComponent(product.handle) : '';
    gentleToast('Open details to choose an option.');
    if (handle) window.location.assign(`/product.html?handle=${handle}`);
    return;
  }

  const [min] = readPrices(product);
  const item = {
    variantId: variant.id,
    productId: product.id || '',
    handle: product.handle || '',
    title: product.title || 'Product',
    price: Number.isFinite(variant.price) ? variant.price : Number(min || 0),
    image: product?.featuredImage?.url || '',
    variantTitle: variant.title || ''
  };

  addToCart(item, 1);
  updateCartBadge();
  updateShopCartSummary();
  gentleToast('Added to cart.');
}

/* --------------------------------
   My Pets personalization pane
-------------------------------- */
async function ensureMyPetsPane() {
  const host = MY_PANE || document.getElementById('pp-my-pane');
  if (!host) return;
  host.classList.remove('d-none');
  host.innerHTML = loadingMyPetsHtml();
  try {
    const r = await api.petsList();
    if (r.status === 401 || r.status === 403) { host.innerHTML = needLoginHtml(); return; }
    if (!r.ok) throw new Error('pets');
    const pets = Array.isArray(r.pets) ? r.pets : [];
    state.myPets = pets;
    if (!state.myPets.length) { host.innerHTML = noPetsHtml(); return; }
    host.innerHTML = petsPaneHtml(state.myPets, state.all);
    syncMyPetsWishlistButtons(host);
  } catch {
    host.innerHTML = loadErrorHtml();
  }
}
function hideMyPetsPane() {
  const host = MY_PANE || document.getElementById('pp-my-pane');
  if (!host) return;
  host.innerHTML = '';
  host.classList.add('d-none');
}
function loadingMyPetsHtml() {
  return `
    <div class="pp-my-state" role="status">
      <div class="pp-my-state-icon"><div class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div></div>
      <div>
        <strong>Finding the right shelves...</strong>
        <span>Reading pet profiles before tuning product picks.</span>
      </div>
    </div>`;
}
function needLoginHtml() {
  return `
    <div class="pp-my-state">
      <div class="pp-my-state-icon"><i class="bi bi-person-badge" aria-hidden="true"></i></div>
      <div>
        <strong>Sign in to personalize this shelf.</strong>
        <span>For My Pets uses your saved pet profiles, traits, allergies, and journal signals.</span>
      </div>
      <div class="pp-my-state-actions">
        <a class="btn btn-primary btn-sm" href="/login.html" data-toggle="login-modal">Sign in</a>
        <a class="btn btn-outline-secondary btn-sm" href="/account.html#account-pets">Pet profiles</a>
      </div>
    </div>`;
}
function noPetsHtml() {
  return `
    <div class="pp-my-state">
      <div class="pp-my-state-icon"><i class="bi bi-person-heart" aria-hidden="true"></i></div>
      <div>
        <strong>Add a pet profile to tune the shop.</strong>
        <span>Species, size, detail fields, preferences, allergies, and future journals will shape these shelves.</span>
      </div>
      <div class="pp-my-state-actions">
        <a class="btn btn-primary btn-sm" href="/account.html#account-pets">Add pet profile</a>
      </div>
    </div>`;
}
function loadErrorHtml() {
  return `
    <div class="pp-my-state pp-my-state--warning">
      <div class="pp-my-state-icon"><i class="bi bi-exclamation-triangle" aria-hidden="true"></i></div>
      <div>
        <strong>We could not load your pets.</strong>
        <span>Please try again shortly, or continue browsing the full shop.</span>
      </div>
    </div>`;
}

async function fetchPetRecs(petId) {
  const r = await fetch(`/api/pets/${encodeURIComponent(petId)}/recs?limit=16`, { credentials: 'include' });
  if (!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j?.items) ? j.items.map(enrichNode) : [];
}
function petsPaneHtml(pets, products = []) {
  const shelves = pets.map(pet => buildPersonalizedShelf(products, pet, 4));
  const petCount = pets.length;
  const productCount = shelves.reduce((sum, shelf) => sum + shelf.picks.length, 0);
  const intro = `
    <header class="pp-my-intro">
      <div>
        <span class="shop-kicker">For My Pets</span>
        <h2>Personalized shelves from real profiles.</h2>
        <p>These picks are ranked from saved pet details, preferences, allergies, and care notes. Pet profiles stay in account; shopping happens here.</p>
      </div>
      <div class="pp-my-intro-stats" aria-label="Personalization summary">
        <span><strong>${petCount}</strong><small>${petCount === 1 ? 'profile' : 'profiles'}</small></span>
        <span><strong>${productCount}</strong><small>visible picks</small></span>
      </div>
    </header>`;

  const items = shelves.map(({ profile, picks }) => petShelfHTML(profile, picks)).join('');
  return `
    <div class="pp-my-wrap">
      ${intro}
      <div class="pp-my-grid">
        ${items}
      </div>
    </div>`;
}

function petShelfHTML(profile, picks = []) {
  const chips = profile.chips.map(chip => `<span>${escapeHtml(chip)}</span>`).join('');
  const insights = petInsightList(profile).map(item => `
    <li>
      <i class="bi ${escapeHtml(item.icon)}" aria-hidden="true"></i>
      <span>${escapeHtml(item.text)}</span>
    </li>`).join('');
  const products = picks.length
    ? picks.map(item => paneProductHTML(item, profile)).join('')
    : `<div class="pp-my-no-picks">This profile needs a little more catalog overlap. The full ${escapeHtml(profile.shelfLabel)} is still available.</div>`;

  return `
    <article class="pp-my-card" data-pet-id="${escapeHtml(profile.id || '')}">
      <div class="pp-my-card-head">
        <div class="pp-my-avatar" aria-hidden="true">${escapeHtml(initials(profile.name))}</div>
        <div>
          <span class="pp-my-eyebrow">${escapeHtml(profile.shelfLabel)}</span>
          <h3>For ${escapeHtml(profile.name)}</h3>
          <p>${escapeHtml(petShelfCopy(profile))}</p>
        </div>
        <a class="pp-my-profile-link" href="/account.html#account-pets">Edit profile</a>
      </div>
      ${chips ? `<div class="pp-my-chip-row" aria-label="${escapeHtml(profile.name)} profile signals">${chips}</div>` : ''}
      <ul class="pp-my-insights">${insights}</ul>
      <div class="pp-my-products" role="list" aria-label="Personalized picks for ${escapeHtml(profile.name)}">
        ${products}
      </div>
      <div class="pp-my-card-actions">
        <a class="btn btn-primary btn-sm" href="${escapeHtml(petShelfHref({ id: profile.id, name: profile.name, species: profile.species, breed: profile.detail, traits: profile.traits }))}">Open tuned shelf</a>
        <a class="btn btn-outline-secondary btn-sm" href="/packs.html">Box paths</a>
      </div>
    </article>`;
}

function paneProductHTML(item = {}, profile = {}) {
  const product = item.product || item;
  const title = product?.title || 'Product';
  const handle = String(product?.handle || '');
  const href = handle ? `/product.html?handle=${encodeURIComponent(handle)}` : '/shop.html';
  const img = product?.featuredImage?.url || '';
  const [min, max, cc] = readPrices(product);
  const price = Number.isFinite(min) && Number.isFinite(max)
    ? (min === max ? formatMoney(min, cc) : `${formatMoney(min, cc)} - ${formatMoney(max, cc)}`)
    : Number.isFinite(min) ? formatMoney(min, cc) : 'View details';
  const reasons = (item.reasons || []).map(reason => `<span>${escapeHtml(reason)}</span>`).join('');
  const variant = firstVariant(product);
  const key = productKey(product);
  const addDisabled = !variant?.id || variant.available === false;
  const wished = handle && state.wishlist.has(handle);

  return `
    <article class="pp-my-product" role="listitem" data-key="${escapeHtml(key)}">
      <a class="pp-my-product-media" href="${escapeHtml(href)}" aria-label="View ${escapeHtml(title)}">
        ${img ? `<img src="${escapeHtml(withWidth(img, 280))}" alt="" loading="lazy" decoding="async">` : '<span class="shop-mini-fallback" aria-hidden="true"><i class="bi bi-bag-heart"></i></span>'}
      </a>
      <div class="pp-my-product-body">
        <a href="${escapeHtml(href)}">${escapeHtml(title)}</a>
        <strong>${escapeHtml(price)}</strong>
        ${reasons ? `<div class="pp-my-reasons">${reasons}</div>` : ''}
        <div class="pp-my-product-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="my-pet-add-cart" data-key="${escapeHtml(key)}" ${addDisabled ? 'disabled aria-disabled="true"' : ''}>
            <i class="bi bi-cart-plus" aria-hidden="true"></i><span>Add</span>
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" data-action="my-pet-wish" data-handle="${escapeHtml(handle)}" aria-pressed="${wished ? 'true' : 'false'}" aria-label="${wished ? 'Remove from wishlist' : 'Add to wishlist'}">
            <i class="bi ${wished ? 'bi-heart-fill' : 'bi-heart'}" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </article>`;
}

function petInsightList(profile = {}) {
  const items = [];
  if (profile.detail) items.push({ icon: 'bi-patch-check', text: `Detail signal: ${profile.detailLabel || profile.detail}` });
  if (profile.allergies.length) items.push({ icon: 'bi-shield-check', text: `Avoiding ${profile.allergies.slice(0, 3).join(', ')}` });
  if (profile.play.length) items.push({ icon: 'bi-stars', text: `Play fit: ${profile.play.slice(0, 3).join(', ')}` });
  if (profile.flavors.length) items.push({ icon: 'bi-cup-hot', text: `Taste/diet notes: ${profile.flavors.slice(0, 3).join(', ')}` });
  if (profile.care.length) items.push({ icon: 'bi-journal-heart', text: `Care notes: ${profile.care.slice(0, 3).join(', ')}` });
  if (!items.length) items.push({ icon: 'bi-person-heart', text: 'Add traits or journal notes to make this shelf smarter.' });
  return items.slice(0, 3);
}

function petShelfCopy(profile = {}) {
  if (profile.allergies.length) return 'Product ranking excludes obvious allergy conflicts and favors matching profile signals.';
  if (profile.play.length || profile.flavors.length) return 'Product ranking favors saved preferences before generic pet-type matches.';
  if (profile.detail) return 'Product ranking uses species, detail fields, and catalog tags to avoid a one-size-fits-all shelf.';
  return 'This shelf starts from species and gets sharper as the profile and journals fill in.';
}

function syncMyPetsWishlistButtons(root = document) {
  root?.querySelectorAll?.('[data-action="my-pet-wish"][data-handle]').forEach(btn => {
    const handle = btn.getAttribute('data-handle') || '';
    const wished = state.wishlist.has(handle);
    btn.setAttribute('aria-pressed', String(wished));
    btn.setAttribute('aria-label', wished ? 'Remove from wishlist' : 'Add to wishlist');
    const icon = btn.querySelector('.bi');
    if (icon) {
      icon.classList.toggle('bi-heart', !wished);
      icon.classList.toggle('bi-heart-fill', wished);
    }
  });
}

function initials(value = '') {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] || 'P').toUpperCase();
}

/* --------------------------------
   Pagination (client-side, URL-synced)
-------------------------------- */

function ensurePager() {
  let el = document.getElementById('pp-pager');
  if (!el) {
    el = document.createElement('nav');
    el.id = 'pp-pager';
    el.className = 'pp-pager mt-2';
    GRID?.insertAdjacentElement('afterend', el);
  }
  if (!el.__wired) {
    el.addEventListener('click', (e) => {
      const a = e.target.closest('[data-page]');
      if (!a) return;
      e.preventDefault();
      const p = Number(a.getAttribute('data-page')) || 1;
      goToPage(p);
    });
    el.__wired = true;
  }
  return el;
}

function goToPage(p) {
  state.page = Math.max(1, Math.floor(p));
  updateQueryParam('p', state.page);
  applyFiltersAndRender();
}

function renderPager(totalPages, current) {
  const host = ensurePager();
  if (totalPages <= 1) {
    host.innerHTML = '';
    host.classList.add('d-none');
    return;
  }
  host.classList.remove('d-none');

  const btn = (label, page, disabled=false, active=false) => {
    const cls = [
      'pp-page',
      disabled ? 'disabled' : '',
      active ? 'active' : '',
    ].filter(Boolean).join(' ');
    const aria = active ? ' aria-current="page"' : '';
    const href = disabled ? '#' : `?p=${page}`;
    const dp = disabled ? '' : ` data-page="${page}"`;
    return `<a class="${cls}" href="${href}"${dp}${aria}>${label}</a>`;
  };

  // Build compact range with ellipses: 1 … (c-2,c-1,c,c+1,c+2) … N
  const parts = [];
  const N = totalPages;
  const c = Math.min(Math.max(1, current), N);
  const windowSize = 2;

  parts.push(btn('‹ Prev', Math.max(1, c - 1), c === 1, false));

  const range = new Set([1, N]);
  for (let i = c - windowSize; i <= c + windowSize; i++) {
    if (i >= 1 && i <= N) range.add(i);
  }
  const sorted = Array.from(range).sort((a,b)=>a-b);
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const prev = i > 0 ? sorted[i-1] : null;
    if (prev && p - prev > 1) parts.push(`<span class="gap" aria-hidden="true">…</span>`);
    parts.push(btn(String(p), p, false, p === c));
  }

  parts.push(btn('Next ›', Math.min(N, c + 1), c === N, false));

  host.innerHTML = `
    <div class="pp-pager-inner" role="navigation" aria-label="Pagination">
      ${parts.join('')}
    </div>
  `;
}

function updateShopCartSummary() {
  const cart = getCart();
  const itemCount = cart.reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);
  if (SHOP_CART_COUNT) SHOP_CART_COUNT.textContent = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
  if (SHOP_CART_TOTAL) SHOP_CART_TOTAL.textContent = `${formatMoney(getSubtotal(cart), 'USD')} ready`;
}

function renderShopSummary() {
  if (SHOP_TOTAL) SHOP_TOTAL.textContent = `${state.all.length} item${state.all.length === 1 ? '' : 's'}`;
  if (SHOP_SOURCE) {
    const source = state.source === 'offline'
      ? 'Offline demo products'
      : state.source === 'collection'
        ? 'Featured product collection'
        : 'Live product catalog';
    SHOP_SOURCE.textContent = source;
  }
  updateShopCartSummary();
}

function renderHeroPreview() {
  if (!SHOP_PREVIEW) return;
  const picks = uniqueProducts((state.all || []).filter(p => p?.featuredImage?.url)).slice(0, 3);
  if (!picks.length) {
    SHOP_PREVIEW.innerHTML = `
      <a class="shop-preview-card is-empty" href="/packs.html">
        <span>Pet Pawket</span>
        <strong>Packs, products, and care stories</strong>
      </a>`;
    return;
  }
  SHOP_PREVIEW.innerHTML = picks.map((product, index) => heroPreviewCardHTML(product, index)).join('');
}

function renderCuratedShelves() {
  if (!SHOP_CURATED) return;
  const products = state.all || [];
  if (!products.length) {
    SHOP_CURATED.innerHTML = '';
    return;
  }

  const value = products.filter(p => {
    const [min] = readPrices(p);
    return min != null && min <= 25;
  });
  const care = products.filter(p => /care|dental|health|diaper|hygiene|scoop|food|pad/i.test(productHaystack(p)));
  const play = products.filter(p => /toy|play|puzzle|enrichment|ball|plush|tug|scratcher|wand/i.test(productHaystack(p)));
  const packReady = products.filter(p => /bundle|box|kit|variety|starter|treat|care|toy|dental/i.test(productHaystack(p)));

  const shelves = [
    {
      title: 'Low-friction cart starters',
      copy: 'Useful add-ons under $25 for testing the live shop without turning the page into a discount bin.',
      href: '/shop.html?sort=price-asc&per=24',
      items: value,
    },
    {
      title: 'Care rhythm goods',
      copy: 'Dental, cleaning, hygiene, and daily support products that connect naturally to pet profiles.',
      href: '/shop.html?q=care',
      items: care,
    },
    {
      title: 'Play and enrichment shelf',
      copy: 'Toys and comfort items that make the catalog feel alive before deeper Pawket Pal systems arrive.',
      href: '/shop.html?q=toy',
      items: play,
    },
    {
      title: 'Pack-eligible add-ons',
      copy: 'Catalog items that could support future Pack, Packet, or Pick planning while the curated box pages stay separate.',
      href: '/shop.html?subscribe=1',
      items: packReady,
    },
  ].map(shelf => ({ ...shelf, items: uniqueProducts(shelf.items).slice(0, 4) }))
   .filter(shelf => shelf.items.length);

  SHOP_CURATED.innerHTML = `
    <div class="shop-curated-head">
      <div>
        <span class="shop-kicker">Built shelves</span>
        <h2>Curated paths without repeating the whole navigation.</h2>
      </div>
      <a href="/shop.html" class="shop-clear-link">View all inventory</a>
    </div>
    <div class="shop-shelves">
      ${shelves.map(shelf => `
        <article class="shop-shelf">
          <header>
            <div>
              <h3>${escapeHtml(shelf.title)}</h3>
              <p>${escapeHtml(shelf.copy)}</p>
            </div>
            <a href="${escapeHtml(shelf.href)}">Shop shelf</a>
          </header>
          <div class="shop-mini-grid">
            ${shelf.items.map(miniProductHTML).join('')}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderActiveFilters(totalItems, visibleItems, totalPages) {
  if (!FILTER_SUMMARY) return;
  const filters = [];
  const q = SEARCH?.value?.trim() || '';
  const cat = getSelectedCategory();
  if (q) filters.push({ label: `Search: ${q}`, href: queryWithout('q') });
  if (cat) filters.push({ label: `Category: ${categoryLabel(cat)}`, href: queryWithout('pet') });
  if (state.subscribeOnly) filters.push({ label: 'Pack-eligible', href: queryWithout('subscribe') });
  if (state.myPetsMode) filters.push({ label: 'For My Pets', href: queryWith('mypets', '0') });

  FILTER_SUMMARY.innerHTML = `
    <div class="shop-results-line">
      <strong>${totalItems}</strong>
      <span>${totalItems === 1 ? 'product matches' : 'products match'}${totalPages > 1 ? `, ${visibleItems} on this page` : ''}</span>
    </div>
    ${filters.length ? `
      <div class="shop-filter-pills" aria-label="Active filters">
        ${filters.map(filter => `<a href="${escapeHtml(filter.href)}">${escapeHtml(filter.label)} <i class="bi bi-x" aria-hidden="true"></i></a>`).join('')}
        <a href="${state.myPetsMode ? '/shop.html?mypets=0' : '/shop.html'}" class="is-clear">Clear all</a>
      </div>
    ` : ''}
  `;
}

/* --------------------------------
   Filter/sort pipeline
-------------------------------- */
function applyFiltersAndRender() {
  const per = getPageSize();
  const q = normalizeKey(SEARCH?.value || '');
  const selectedCat = getSelectedCategory();

  // Filter
  let list = state.all.slice();
  if (state.subscribeOnly) list = list.filter(isSubscribable);
  if (selectedCat) list = list.filter(p => (p._category || '') === selectedCat);
  if (q) list = list.filter(p => relevanceScore(p, q) > 0);

  // Sort
  const mode = SEL_SORT?.value || 'relevance';
  list.sort((a, b) => compareBy(mode, a, b, q));
  let personalizationApplied = false;
  if (state.myPetsMode && state.myPets.length) {
    const ranked = rankProductsForPets(list, state.myPets, { minScore: 0 });
    if (ranked.length) {
      ranked.sort((a, b) => b.score - a.score || compareBy(mode, a.product, b.product, q));
      personalizationApplied = ranked.some(item => item.score > 0);
      list = ranked.map(item => item.product);
    }
  }

  // Pagination
  const totalItems = list.length;
  const totalPages = per > 0 ? Math.max(1, Math.ceil(totalItems / per)) : 1;
  const current = per > 0 ? Math.min(Math.max(1, state.page || 1), totalPages) : 1;
  state.page = current;

  const start = per > 0 ? (current - 1) * per : 0;
  const visible = per > 0 ? list.slice(start, start + per) : list;

  state.filtered = visible;
  renderGrid(visible);
  renderPager(totalPages, current);
  renderActiveFilters(totalItems, visible.length, totalPages);

  const baseMsg = `${totalItems} product${totalItems === 1 ? '' : 's'} shown${per>0?` — page ${current} of ${totalPages} (${visible.length} visible this page)`:''}.`;
  setStatus(state.myPetsMode
    ? `${baseMsg} For My Pets is ${personalizationApplied ? `ranking from ${state.myPets.length} pet profile${state.myPets.length === 1 ? '' : 's'}.` : 'waiting for stronger profile/catalog matches.'}`
    : `${baseMsg}`);
}

/* Sorting helpers */
function compareBy(mode, a, b, q) {
  const [minA] = readPrices(a), [minB] = readPrices(b);
  if (mode === 'price-asc')  return (minA ?? Infinity) - (minB ?? Infinity);
  if (mode === 'price-desc') return (minB ?? -Infinity) - (minA ?? -Infinity);
  if (mode === 'title-asc')  return (a.title || '').localeCompare(b.title || '');
  if (mode === 'title-desc') return (b.title || '').localeCompare(a.title || '');
  const sa = relevanceScore(a, q), sb = relevanceScore(b, q);
  if (sb !== sa) return sb - sa;
  return (minA ?? Infinity) - (minB ?? Infinity);
}
function productHaystack(p) {
  return `${p?.title || ''} ${p?.description || ''} ${p?.productType || ''} ${(p?.tags || []).join(' ')}`;
}
function textScore(p, q) {
  const t = (p?.title || '').toLowerCase();
  const h = (p?.handle || '').toLowerCase();
  return (t.includes(q) ? 2 : 0) + (h.includes(q) ? 1 : 0);
}
function relevanceScore(p, q) {
  let s = textScore(p, q);
  if ((p._category || '') && getSelectedCategory() === (p._category || '')) s += 1;
  return s;
}
function readPriceUSD(p) {
  const min = Number(p?.priceRange?.minVariantPrice?.amount ?? p?.price?.amount ?? p?.price ?? NaN);
  return [isFinite(min) ? min : null];
}
const BUDGET_WINDOWS = {
  value:   { min: 0,   max: 25 },
  mid:     { min: 10,  max: 80 },
  premium: { min: 40,  max: 250 },
  luxury:  { min: 100, max: Infinity }
};
function inBudget([min], band='mid'){ const w=BUDGET_WINDOWS[band]||BUDGET_WINDOWS.mid; if(min==null)return true; return (min>=w.min && min<=w.max); }
function readPrices(p) {
  const min = Number(p?.priceRange?.minVariantPrice?.amount ?? NaN);
  const max = Number(p?.priceRange?.maxVariantPrice?.amount ?? NaN);
  const cc  = p?.priceRange?.minVariantPrice?.currencyCode || p?.priceRange?.maxVariantPrice?.currencyCode || 'USD';
  return [Number.isFinite(min) ? min : null, Number.isFinite(max) ? max : null, cc];
}
function isSubscribable(p) {
  const tags = (p?.tags || []).map(t => String(t).toLowerCase());
  return !tags.includes('no-subscribe');
}
function getSubConfig(p) {
  const handle = String(p?.handle || '').trim().toLowerCase();
  return SUBSCRIBE_OVERRIDES[handle] || SUBSCRIBE_DEFAULT;
}
function getDefaultDiscount(p) { return getSubConfig(p).discountPct ?? SUBSCRIBE_DEFAULT.discountPct; }
function formatInterval(v) {
  const m = /^(\d+)([dwmy])$/i.exec(String(v));
  if (!m) return v;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const map = { d:'day', w:'week', m:'month', y:'year' };
  return `Every ${n} ${map[unit]}${n > 1 ? 's' : ''}`;
}

/* --------------------------------
   URL + helpers
-------------------------------- */
function hasQuery(key) { return new URL(location.href).searchParams.has(key); }
function readQuery(key, def = '') { const u = new URL(location.href); return u.searchParams.get(key) ?? def; }
function updateQueryParam(key, val) {
  const u = new URL(location.href);
  if (!val && val !== 0) u.searchParams.delete(key);
  else u.searchParams.set(key, String(val));
  history.replaceState(null, '', u);
}
function hydrateFromURL() {
  const q         = readQuery('q','');
  const pet       = readQuery('pet','');
  const sort      = readQuery('sort','');
  const per       = readQuery('per','');
  const subscribe = readQuery('subscribe','');
  const my        = readQuery('mypets','');
  const p         = readQuery('p','');

  if (SEARCH) SEARCH.value = q;
  if (SEL_SORT) SEL_SORT.value = sort || 'relevance';
  setCategory(pet || '');
  if (SEL_PAGE && per !== '') SEL_PAGE.value = String(Number(per) || 0);

  state.subscribeOnly = (subscribe === '1' || subscribe === 'true');
  state.myPetsMode    = (my === '1' || my === 'true');
  state.page          = Math.max(1, Number(p) || 1);
}
function getPageSize() {
  const raw = (SEL_PAGE && SEL_PAGE.value !== undefined) ? Number(SEL_PAGE.value) : NaN;
  return Number.isFinite(raw) ? raw : 0;
}
function normalizeKey(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, '-'); }
function debounce(fn, ms) { let t = null; return (...args) => { if (t) clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function inferCategory(p) {
  const hay = productHaystack(p);
  for (const r of CATEGORY_RULES) if (r.tests.some(rx => rx.test(hay))) return r.key;
  return '';
}
function setCategory(k) {
  const val = CATEGORY_KEYS.includes(k) ? k : '';
  if (SEL_CATEGORY) SEL_CATEGORY.value = val;
  updateQueryParam('pet', val || null);
  syncChips(val);
}
function getSelectedCategory() {
  return (SEL_CATEGORY?.value && CATEGORY_KEYS.includes(SEL_CATEGORY.value)) ? SEL_CATEGORY.value : '';
}
function syncChips(activeKey='') {
  CHIPS_WRAP?.querySelectorAll('.chip').forEach(btn => {
    const key = btn.getAttribute('data-chip') || '';
    const pressed = key === activeKey;
    btn.setAttribute('aria-pressed', String(pressed));
    btn.classList.toggle('active', pressed);
  });
}
function syncToggles() {
  if (SUB_TOGGLE) SUB_TOGGLE.checked = !!state.subscribeOnly;
  if (MY_TOGGLE)  MY_TOGGLE.checked  = !!state.myPetsMode;
}

async function hydrateMyPetsPreference() {
  if (hasQuery('mypets')) return;
  try {
    const pref = await api.prefsGetForMyPets();
    if (!pref?.ok) return;
    state.myPetsMode = !!pref.on;
    updateQueryParam('mypets', state.myPetsMode ? 1 : null);
  } catch {}
}

function miniProductHTML(p = {}) {
  const title = p.title || 'Product';
  const handle = encodeURIComponent(String(p.handle || ''));
  const href = `/product.html?handle=${handle}`;
  const img = p?.featuredImage?.url || '';
  const [min, max, cc] = readPrices(p);
  const price = Number.isFinite(min) && Number.isFinite(max)
    ? (min === max ? formatMoney(min, cc) : `${formatMoney(min, cc)} - ${formatMoney(max, cc)}`)
    : Number.isFinite(min) ? formatMoney(min, cc) : '';
  return `
    <a class="shop-mini-card" href="${href}">
      ${img ? `<img src="${escapeHtml(withWidth(img, 240))}" alt="" loading="lazy" decoding="async">` : '<span class="shop-mini-fallback" aria-hidden="true"><i class="bi bi-bag-heart"></i></span>'}
      <span>${escapeHtml(title)}</span>
      <strong>${escapeHtml(price || 'View details')}</strong>
    </a>`;
}

function heroPreviewCardHTML(p = {}, index = 0) {
  const title = p.title || 'Product';
  const handle = encodeURIComponent(String(p.handle || ''));
  const href = `/product.html?handle=${handle}`;
  const img = p?.featuredImage?.url || '';
  const [min, max, cc] = readPrices(p);
  const price = Number.isFinite(min) && Number.isFinite(max)
    ? (min === max ? formatMoney(min, cc) : `${formatMoney(min, cc)} - ${formatMoney(max, cc)}`)
    : Number.isFinite(min) ? formatMoney(min, cc) : 'View details';
  return `
    <a class="shop-preview-card${index === 0 ? ' is-featured' : ''}" href="${href}">
      ${img ? `<img src="${escapeHtml(withWidth(img, index === 0 ? 760 : 360))}" alt="" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async">` : ''}
      <span>${escapeHtml(price)}</span>
      <strong>${escapeHtml(title)}</strong>
    </a>`;
}

function uniqueProducts(list = []) {
  const seen = new Set();
  return list.filter((product) => {
    const key = product?.handle || product?.id || product?.title;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function categoryLabel(value = '') {
  const map = {
    'small-pet': 'Small Pet',
    dog: 'Dog',
    cat: 'Cat',
    bird: 'Bird',
    fish: 'Fish',
    reptile: 'Reptile',
    toy: 'Toy',
    treat: 'Treat',
    accessories: 'Accessories'
  };
  return map[value] || String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function queryWithout(key) {
  const u = new URL(location.href);
  u.searchParams.delete(key);
  u.searchParams.delete('p');
  return `${u.pathname}${u.search || ''}`;
}

function queryWith(key, value) {
  const u = new URL(location.href);
  u.searchParams.set(key, value);
  u.searchParams.delete('p');
  return `${u.pathname}${u.search || ''}`;
}

function withWidth(url, w) {
  const raw = String(url || '').trim();
  if (!/^https?:\/\//i.test(raw) && !raw.startsWith('/')) return '';
  if (raw.includes('width=')) return raw.replace(/width=\d+/, `width=${w}`);
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}width=${w}`;
}

/* --------------------------------
   Tiny toast fallback (no dependency)
-------------------------------- */
function gentleToast(message = '') {
  try {
    // If you already have a site-wide toast, this will be ignored.
    const id = 'pp-gentle-toast';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.style.position = 'fixed';
      el.style.bottom = '1rem';
      el.style.right = '1rem';
      el.style.zIndex = '2000';
      document.body.appendChild(el);
    }
    const box = document.createElement('div');
    box.textContent = message;
    box.style.background = 'rgba(33, 37, 41, 0.9)';
    box.style.color = '#fff';
    box.style.padding = '0.5rem 0.75rem';
    box.style.borderRadius = '0.5rem';
    box.style.marginTop = '0.5rem';
    box.style.fontSize = '0.9rem';
    el.appendChild(box);
    setTimeout(() => box.remove(), 2000);
  } catch {}
}

/* --------------------------------
   Boot
-------------------------------- */
(async function boot() {
  try {
    hydrateFromURL();
    await hydrateMyPetsPreference();
    syncToggles();

    // show placeholders while loading
    const pageSize = Number(getPageSize?.() ?? 24) || 24;
    renderSkeleton(Math.max(8, Math.ceil(pageSize / 3)));

    const limit = (typeof INITIAL_LIMIT === 'number' && isFinite(INITIAL_LIMIT)) ? INITIAL_LIMIT : 250;
    await loadWishlistState();

    const loaded = (typeof ALLOW_OFFLINE !== 'undefined' && ALLOW_OFFLINE)
      ? { list: (SAMPLE_PRODUCTS || []), source: 'offline' }
      : await loadProducts(limit);

    const list = loaded?.list || [];
    state.all = list.map(enrichNode);
    state.source = loaded?.source || '';
    indexProducts();
    renderShopSummary();
    renderHeroPreview();
    renderCuratedShelves();
    if (state.myPetsMode) await ensureMyPetsPane();

    applyFiltersAndRender();
    if (!list.length) {
      setStatus(`No products returned from API${loaded?.source ? ` (source: ${loaded.source})` : ''}.`);
    }
  } catch (err) {
    console.error('[shop] failed to load', err);
    setStatus?.('Sorry — having trouble loading products right now. Please retry.');
    if (typeof GRID !== 'undefined' && GRID) GRID.innerHTML = '';
  }
})();
