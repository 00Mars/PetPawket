// /public/featuredGrid.js
// Featured grid — runs only when #pp-featured has data-auto="1"
import { getSession } from './auth.js';

const money = (v, c) => {
  const n = Number(v);
  return (Number.isFinite(n) ? n.toFixed(2) : '0.00') + (c ? ` ${c}` : '');
};

const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImageUrl = (value, fallback = '/assets/images/placeholder.png') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
};

async function ensureSignedInForWishlist() {
  const session = await getSession();
  if (session?.signedIn) return true;
  if (typeof window.PP_openAuthModal === 'function') window.PP_openAuthModal('login');
  else document.querySelector('[data-toggle="login-modal"]')?.click();
  return false;
}

// ---- Data ----
async function fetchFeatured(limit = 24) {
  const r = await fetch(`/api/products/featured?limit=${limit}`, { credentials: 'include' });
  if (!r.ok) throw new Error(`Featured HTTP ${r.status}`);
  const data = await r.json();
  const list = Array.isArray(data) ? data : (data?.items ?? data?.products ?? data?.products?.nodes ?? []);
  return list;
}

function resolveFeaturedLimit(opts = {}) {
  const desktopLimit = Number(opts.limit) || 12;
  const mobileLimit = Number(opts.mobileLimit) || desktopLimit;
  const isMobile = window.matchMedia?.('(max-width: 720px)')?.matches;
  return isMobile ? mobileLimit : desktopLimit;
}

// ---- Skeleton ----
function renderSkeleton(grid, count = 8) {
  grid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="pp-skeleton">
      <div class="pp-skel-thumb"></div>
      <div class="pp-skel-body">
        <div class="pp-bar w70"></div>
        <div class="pp-bar w30"></div>
      </div>
    </div>
  `).join('');
}

// ---- Cards ----
function cardHTML(p, index = 0) {
  const img = safeImageUrl(p.featuredImage?.url);
  const title = p.title || '';
  const handle = p.handle || '';
  const id = p.id || '';
  const category = p.productType || 'Featured';
  const minp = p.priceRange?.minVariantPrice, maxp = p.priceRange?.maxVariantPrice;
  const minAmount = Number(minp?.amount);
  const maxAmount = Number(maxp?.amount);
  const minValid = Number.isFinite(minAmount);
  const maxValid = Number.isFinite(maxAmount);
  const priceText = minValid && maxValid
    ? (minAmount === maxAmount
      ? money(minAmount, minp.currencyCode)
      : `${money(minAmount, minp.currencyCode)} – ${money(maxAmount, maxp.currencyCode)}`)
    : (minValid ? money(minAmount, minp.currencyCode) : '');
  const spotlight = index < 3 ? '<span class="pp-card-badge">Top pick</span>' : '';

  return `
    <article class="pp-card" data-product-id="${escapeHtml(id)}" data-product-handle="${escapeHtml(handle)}" data-category="${escapeHtml(p.productType || '')}">
      <a class="pp-link" href="/product.html?handle=${encodeURIComponent(handle)}" aria-label="${escapeHtml(title)}">
        <div class="pp-thumb">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(p.featuredImage?.altText || title)}" loading="lazy">
          ${spotlight}
        </div>
      </a>
      <div class="pp-body">
        <div class="pp-card-top">
          <span class="pp-card-type">${escapeHtml(category)}</span>
        </div>
        <a class="pp-link" href="/product.html?handle=${encodeURIComponent(handle)}">
          <div class="pp-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
        </a>
        <div class="pp-price">${escapeHtml(priceText)}</div>
        <div class="pp-row">
          <a class="pp-link" href="/product.html?handle=${encodeURIComponent(handle)}">View</a>
          <button class="pp-wish" data-action="wishlist-add" data-product-id="${escapeHtml(id)}" data-product-handle="${escapeHtml(handle)}" aria-label="Add to wishlist">
            <span class="bi bi-heart"></span><span>Save</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ---- Filtering/Sorting ----
function applyFilters(state) {
  const q = state.q?.toLowerCase() || '';
  const cat = state.cat || 'all';
  let list = state.raw.slice();

  if (q) {
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.productType || '').toLowerCase().includes(q)
    );
  }
  if (cat !== 'all') {
    list = list.filter(p => (p.productType || '') === cat);
  }
  switch (state.sort) {
    case 'price-asc': list.sort((a, b) => (Number(a?.priceRange?.minVariantPrice?.amount) || 0) - (Number(b?.priceRange?.minVariantPrice?.amount) || 0)); break;
    case 'price-desc': list.sort((a, b) => (Number(b?.priceRange?.minVariantPrice?.amount) || 0) - (Number(a?.priceRange?.minVariantPrice?.amount) || 0)); break;
    case 'alpha-asc': list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))); break;
    case 'alpha-desc': list.sort((a, b) => String(b.title || '').localeCompare(String(a.title || ''))); break;
    default: break; // relevance
  }
  return list;
}

// ---- Controls ----
function buildControls(container, state) {
  container.innerHTML = `
    <div class="pp-controls">
      <div class="pp-field">
        <label for="pp-search" class="me-1">Search</label>
        <input id="pp-search" class="pp-input" placeholder="Search products..." />
      </div>
      <div class="pp-field" id="pp-cat-wrap" style="display:none">
        <label for="pp-cat" class="me-1">Category</label>
        <select id="pp-cat" class="pp-select"></select>
      </div>
      <div class="pp-field">
        <label for="pp-sort" class="me-1">Sort</label>
        <select id="pp-sort" class="pp-select">
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="alpha-asc">Title: A → Z</option>
          <option value="alpha-desc">Title: Z → A</option>
        </select>
      </div>
    </div>
  `;

  const q = container.querySelector('#pp-search');
  const sort = container.querySelector('#pp-sort');
  const cat = container.querySelector('#pp-cat');
  const catWrap = container.querySelector('#pp-cat-wrap');

  const cats = [...new Set(state.raw.map(p => p.productType).filter(Boolean))];
  if (cats.length > 1) {
    catWrap.style.display = '';
    cat.innerHTML = `<option value="all">All</option>` + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  if (state.q) q.value = state.q;
  if (state.sort) sort.value = state.sort;
  if (state.cat) cat.value = state.cat;

  const run = () => {
    state.q = q.value.trim();
    state.sort = sort.value;
    state.cat = (catWrap.style.display === 'none') ? 'all' : (cat.value || 'all');
    state.apply();
  };

  q.addEventListener('input', debounce(run, 180));
  sort.addEventListener('change', run);
  cat.addEventListener('change', run);

  return { q, sort, cat, catWrap, categories: cats };
}

function renderQuickFilters(container, state, controlsRef) {
  if (!container || !controlsRef) return;
  const categories = Array.isArray(controlsRef.categories) ? controlsRef.categories : [];
  if (!categories.length || controlsRef.catWrap.style.display === 'none') {
    container.innerHTML = '';
    container.classList.add('d-none');
    return;
  }

  const options = ['all', ...categories.slice(0, 7)];
  container.classList.remove('d-none');
  container.innerHTML = options.map((value) => `
    <button class="pp-quick-chip${state.cat === value ? ' is-active' : ''}" data-quick-cat="${escapeHtml(value)}" type="button">
      ${value === 'all' ? 'All picks' : escapeHtml(value)}
    </button>
  `).join('');

  if (container.dataset.bound !== '1') {
    container.dataset.bound = '1';
    container.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-quick-cat]');
      if (!chip) return;
      const value = chip.getAttribute('data-quick-cat') || 'all';
      state.cat = value;
      if (controlsRef.cat) controlsRef.cat.value = value;
      state.apply();
    });
  }
}

function updateFeaturedMeta(mount, state, showing) {
  const count = mount.querySelector('[data-featured-count]');
  if (!count) return;
  const total = Array.isArray(state.raw) ? state.raw.length : 0;
  count.textContent = `${showing} of ${total} showing`;
}

// ---- Wishlist wiring ----
function wireWishlist(root) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="wishlist-add"]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const productId = btn.getAttribute('data-product-id') || '';
    const handle = btn.getAttribute('data-product-handle') || '';
    if (!(await ensureSignedInForWishlist())) return;
    btn.disabled = true;
    try {
      const r = await fetch('/api/wishlist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, handle }),
      });
      if (!r.ok) throw new Error(await r.text());
      btn.classList.add('active');
      btn.querySelector('span:last-child')?.replaceChildren('Saved');
      btn.firstElementChild?.classList.remove('bi-heart');
      btn.firstElementChild?.classList.add('bi-heart-fill');
    } catch (err) {
      console.error('[wishlist] add error:', err);
      btn.setAttribute('aria-label', 'Could not save to wishlist yet');
    } finally {
      btn.disabled = false;
    }
  });
}

// ---- Init ----
export async function initFeaturedGrid(opts = {}) {
  const mountSel = opts.mount || '#pp-featured';
  const limit = resolveFeaturedLimit(opts);

  const mount = document.querySelector(mountSel);
  if (!mount) return;

  mount.classList.add('pp-featured');
  mount.innerHTML = `
    <div class="container">
      <header class="pp-featured-head">
        <div class="pp-featured-head-copy">
          <span class="pp-featured-kicker">Pawket Picks</span>
          <h2 class="pp-featured-title">A curated shelf for the next care moment.</h2>
          <p class="pp-featured-sub">Featured products sit between the subscription box and the story layer: useful add-ons, seasonal rewards, and easy saves for each pet profile.</p>
        </div>
        <div class="pp-featured-head-meta">
          <span class="pp-featured-count" data-featured-count>0 showing</span>
          <a class="pp-featured-shop-link" href="/shop.html">Open full shop</a>
        </div>
      </header>
      <div class="pp-featured-story" aria-label="Featured product lanes">
        <span><i class="bi bi-box-seam" aria-hidden="true"></i> Pack add-ons</span>
        <span><i class="bi bi-gift" aria-hidden="true"></i> Threshold rewards</span>
        <span><i class="bi bi-heart-pulse" aria-hidden="true"></i> CHARM-friendly picks</span>
      </div>
      <div class="pp-controls-wrap" id="pp-controls"></div>
      <div class="pp-featured-quick d-none" id="pp-featured-quick"></div>
      <div class="pp-grid" id="pp-grid" aria-live="polite"></div>
      <div class="pp-empty d-none" id="pp-empty">No products match your filters.</div>
    </div>
  `;

  const controls = mount.querySelector('#pp-controls');
  const quick = mount.querySelector('#pp-featured-quick');
  const grid = mount.querySelector('#pp-grid');
  const empty = mount.querySelector('#pp-empty');

  renderSkeleton(grid, Math.min(8, limit));

  const state = {
    raw: [],
    q: '',
    sort: 'relevance',
    cat: 'all',
    apply() {
      const filtered = applyFilters(state);
      if (!filtered.length) {
        grid.innerHTML = '';
        empty.classList.remove('d-none');
        updateFeaturedMeta(mount, state, 0);
        renderQuickFilters(quick, state, state.controlsRef);
        return;
      }
      empty.classList.add('d-none');
      grid.innerHTML = filtered.map((product, idx) => cardHTML(product, idx)).join('');
      updateFeaturedMeta(mount, state, filtered.length);
      renderQuickFilters(quick, state, state.controlsRef);
    }
  };

  try {
    const list = await fetchFeatured(limit);
    state.raw = list;
    state.controlsRef = buildControls(controls, state);
    state.apply();
  } catch (err) {
    console.error('[featured] fetch error:', err);
    grid.innerHTML = `<div class="pp-empty" role="status">Failed to load featured products.</div>`;
  }

  wireWishlist(mount);
}

// ---- Auto-init ONLY when explicitly requested ----
function shouldAutoInit() {
  const el = document.querySelector('#pp-featured');
  return !!(el && el.getAttribute('data-auto') === '1');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (shouldAutoInit()) initFeaturedGrid({ mount: '#pp-featured' });
  });
} else {
  if (shouldAutoInit()) initFeaturedGrid({ mount: '#pp-featured' });
}
