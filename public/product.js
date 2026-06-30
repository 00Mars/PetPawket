// /public/product.js
// PDP logic (scoped to this page)
import { getSession } from './auth.js';
import { getLoopAvailability } from './loopState.js';
import { addToCart, updateCartBadge } from './cartUtils.js';

/* -------------------------- URL / Money helpers -------------------------- */
function getHandleFromUrl() {
  const path = (location.pathname || '/').replace(/\/+$/,'') || '/';
  const m = path.match(/^\/products\/([^/]+)$/);
  if (m) return decodeURIComponent(m[1]);
  const u = new URL(location.href);
  return u.searchParams.get('handle') || '';
}

const moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const money = (n) => moneyFmt.format(Number(n || 0));
const moneyFor = (n, currency = 'USD') => {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
};

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function safeImageUrl(value, fallback = '/assets/images/placeholder.png') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}

function safeHref(value, fallback = '#') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(javascript|data|vbscript):/i.test(raw)) return fallback;
  if (raw.startsWith('//')) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return raw;
  } catch {}
  return fallback;
}

async function ensureSignedInForWishlist() {
  const session = await getSession();
  if (session?.signedIn) return true;
  if (typeof window.PP_openAuthModal === 'function') window.PP_openAuthModal('login');
  else document.querySelector('[data-toggle="login-modal"]')?.click();
  return false;
}

function sanitizeDescriptionHtml(html = '') {
  const template = document.createElement('template');
  template.innerHTML = String(html || '');
  template.content.querySelectorAll('script, iframe, object, embed, link, meta').forEach((node) => node.remove());
  template.content.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name);
        return;
      }
      if (['href', 'src', 'xlink:href'].includes(name) && safeHref(attr.value, '') === '') {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}

async function j(url, init){ const r = await fetch(url, init); if(!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r.json(); }

/* ------------------------------- Data load ------------------------------- */
async function loadProduct(handle){
  const url = `/api/products/handle/${encodeURIComponent(handle)}`;
  const payload = await j(url, { credentials:'include' });
  const raw = payload?.product || payload;
  if (!raw) throw new Error(payload?.error || 'Product not found');

  const images = (raw.images?.edges || raw.images || []).map(e => {
    const n = e?.node || e;
    return { url: n?.url || n, altText: n?.altText || raw.title || '' };
  }).filter(i => i?.url);

  if (!images.length && raw.featuredImage?.url) {
    images.push({ url: raw.featuredImage.url, altText: raw.title || '' });
  }

  const variants = (raw.variants?.edges || raw.variants || []).map(e => {
    const n = e?.node || e;
    const price = Number(n?.price?.amount ?? n?.price ?? 0);
    return {
      id: n?.id,
      title: n?.title || 'Default',
      price,
      available: n?.availableForSale !== false && n?.available !== false
    };
  }).filter(v => v.id);

  const minFromRange = Number(raw?.priceRange?.minVariantPrice?.amount ?? NaN);
  const maxFromRange = Number(raw?.priceRange?.maxVariantPrice?.amount ?? NaN);
  const min = Number.isFinite(minFromRange) ? minFromRange : Math.min(...variants.map(v => v.price || Infinity));
  const max = Number.isFinite(maxFromRange) ? maxFromRange : Math.max(...variants.map(v => v.price || 0));

  return {
    ...raw,
    images,
    variants,
    priceRange: {
      minVariantPrice: { amount: Number.isFinite(min) ? min : 0, currencyCode: raw?.priceRange?.minVariantPrice?.currencyCode || 'USD' },
      maxVariantPrice: { amount: Number.isFinite(max) ? max : Number.isFinite(min) ? min : 0, currencyCode: raw?.priceRange?.maxVariantPrice?.currencyCode || 'USD' },
    }
  };
}

/* ----------------------------- Sticky offsets ---------------------------- */
/** Measure fixed header/announcement heights and feed CSS custom props. */
function updateStickyOffsets() {
  let h = 0;

  // Candidates that might be fixed at the top.
  const candidates = [
    document.querySelector('#navbar-container'),
    document.querySelector('.site-header'),
    document.querySelector('header'),
    document.querySelector('nav'),
    document.querySelector('.announcement-bar'),
    document.querySelector('#announcement'),
    document.querySelector('[data-announcement]')
  ];

  for (const el of candidates) {
    if (!el) continue;
    const cs = getComputedStyle(el);
    const fixedLike = cs.position === 'fixed' || cs.position === 'sticky';
    const topIsZeroish = (parseInt(cs.top, 10) || 0) <= 4; // guard against bottom-fixed bars
    if (fixedLike && topIsZeroish) {
      h = Math.max(h, el.getBoundingClientRect().height);
    }
  }

  if (!h) h = 80; // sane default
  const px = `${Math.round(h)}px`;
  document.documentElement.style.setProperty('--nav-fixed-h', px);
  document.documentElement.style.setProperty('--pdp-sticky-top', `calc(${px} + 8px)`);
}

// Light throttle for resize
function throttle(fn, ms=150){
  let t = 0, pending = null;
  return (...args) => {
    const now = Date.now();
    const run = () => { t = now; pending = null; fn(...args); };
    if (now - t >= ms) run();
    else if (!pending) pending = setTimeout(run, ms - (now - t));
  };
}

/* --------------------------------- Render -------------------------------- */
function render(root, p){
  const hero = safeImageUrl(p.images?.[0]?.url);
  const thumbs = (p.images || []).slice(0, 8);

  const variantOptions = (p.variants || []).map(v =>
    `<option value="${esc(v.id)}" ${v.available ? '' : 'disabled'}>${esc(v.title)} — ${esc(money(v.price))}</option>`
  ).join('');

  const minp = p.priceRange?.minVariantPrice?.amount ?? null;
  const maxp = p.priceRange?.maxVariantPrice?.amount ?? null;
  const priceRangeStr = (minp != null && maxp != null)
    ? (minp === maxp ? money(minp) : `${money(minp)} – ${money(maxp)}`)
    : '';

  root.innerHTML = `
    <div class="pdp-grid">
      <!-- LEFT: gallery, then sticky buy box -->
      <div class="pdp-col-left">
        <div class="pdp-card pdp-gallery">
          <img class="pdp-media-hero" src="${esc(hero)}" alt="${esc(p.title || '')}">
          ${thumbs.length ? `
            <div class="pdp-thumbs">
              ${thumbs.map((t,i)=>`<img src="${esc(safeImageUrl(t.url))}" alt="${esc(t.altText || p.title || '')}" data-role="thumb" ${i===0?'aria-current="true"':''}>`).join('')}
            </div>` : ``}
        </div>

        <div class="pdp-card pdp-buy pdp-buy--left">
          <div id="pdp-price" class="pdp-price">${priceRangeStr}</div>

          ${(p.variants && p.variants.length) ? `
            <div class="mb-2">
              <label class="form-label">Options</label>
              <select class="form-select pdp-variant" id="pdp-variant">${variantOptions}</select>
            </div>` : ``}

          <div class="d-flex align-items-center gap-2">
            <label for="pdp-qty" class="form-label m-0">Qty</label>
            <input id="pdp-qty" class="form-control pdp-qty" type="number" min="1" step="1" value="1">
          </div>

          <div class="pdp-cta-row">
            <button class="btn btn-primary" id="pdp-add">Add to cart</button>
            <button class="btn btn-outline-secondary" id="pdp-wish"><i class="bi bi-heart"></i> Wishlist</button>
          </div>

          <div class="pdp-impact">
            <div class="pdp-impact-head">
              <span>CHARM preview</span>
              <strong id="pdp-impact-amount">CHARM care stories</strong>
            </div>
            <div class="pdp-impact-case" id="pdp-impact-case">This product can stay connected to Pet Pawket care, CHARM kindness, and Pawket Pass sharing.</div>
            <button class="pp-impact-btn pdp-impact-btn" type="button" data-loop-open hidden>Share Pawket Pass</button>
          </div>

          <div class="pdp-trust">
            <span><i class="bi bi-shield-lock"></i> Secure payments</span>
            <span><i class="bi bi-box-seam"></i> Ships in 24–48h</span>
            <span><i class="bi bi-recycle"></i> Easy returns</span>
          </div>
        </div>
      </div>

      <!-- RIGHT: description starts at the top -->
      <div class="pdp-col-right">
        <div class="pdp-card pdp-desc-top">
          <h2 class="pdp-section-title">Details</h2>
          <article id="pdp-desc-html">${sanitizeDescriptionHtml(p.descriptionHtml || '')}</article>
        </div>
      </div>
    </div>
  `;

  // Title + doc title
  document.getElementById('pdp-title').textContent = p.title || 'Product';
  document.title = `${p.title || 'Product'} • Pet Pawket`;

  // Thumbs interaction
  root.querySelectorAll('[data-role="thumb"]').forEach(imgEl => {
    imgEl.addEventListener('click', () => {
      root.querySelectorAll('[data-role="thumb"]').forEach(t => t.removeAttribute('aria-current'));
      imgEl.setAttribute('aria-current','true');
      const big = root.querySelector('.pdp-media-hero');
      if (big) big.src = imgEl.src;
    });
  });

  // Variant price change
  const priceEl = document.getElementById('pdp-price');
  const variantSel = document.getElementById('pdp-variant');
  function updatePriceFromVariant(){
    if(!variantSel || !priceEl) return;
    const v = (p.variants || []).find(x => String(x.id) === String(variantSel.value));
    if (v) priceEl.textContent = money(v.price);
  }
  variantSel?.addEventListener('change', updatePriceFromVariant);

  updateLoopShareAvailability(root);

  // Add to cart
  document.getElementById('pdp-add')?.addEventListener('click', () => {
    const qty = Math.max(1, Number(document.getElementById('pdp-qty')?.value || 1));
    const variantId = variantSel ? variantSel.value : (p.variants?.[0]?.id || '');
    const variant = (p.variants || []).find(x => String(x.id) === String(variantId));
    if (!variantId) return alert('No variant available.');
    if (variant?.available === false) return alert('This option is not available.');

    addToCart({
      productId: p.id,
      handle: p.handle,
      variantId,
      title: p.title || 'Product',
      price: variant?.price ?? Number(p.priceRange?.minVariantPrice?.amount || 0),
      image: hero,
      variantTitle: variant?.title || ''
    }, qty);
    updateCartBadge();

    const btn = document.getElementById('pdp-add');
    if (btn) {
      btn.innerHTML = '<i class="bi bi-check-lg"></i> Added';
      btn.classList.replace('btn-primary','btn-success');
      setTimeout(() => {
        btn.textContent = 'Add to cart';
        btn.classList.replace('btn-success','btn-primary');
      }, 1600);
    }
  });

  // Wishlist
  document.getElementById('pdp-wish')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!(await ensureSignedInForWishlist())) return;
    try{
      const res = await fetch('/api/wishlist', {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ productId: p.id, handle: p.handle })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const btn = e.currentTarget;
      btn.innerHTML = '<i class="bi bi-heart-fill"></i> Wishlisted';
      btn.classList.replace('btn-outline-secondary','btn-secondary');
    } catch {
      const status = document.getElementById('pdp-status');
      if (status) status.textContent = 'Could not save this item yet. Please sign in and try again.';
    }
  });
}

async function updateLoopShareAvailability(root) {
  const btn = root?.querySelector?.('[data-loop-open]');
  if (!btn) return;
  const state = await getLoopAvailability();
  const show = !!state?.available;
  btn.hidden = !show;
  btn.setAttribute('aria-hidden', String(!show));
  if (!btn.dataset.loopAvailabilityWired) {
    btn.dataset.loopAvailabilityWired = '1';
    document.addEventListener('pp:loop:summary', (e) => {
      const avail = !!e.detail?.available;
      btn.hidden = !avail;
      btn.setAttribute('aria-hidden', String(!avail));
    });
  }
}

function renderProductFinder(root, statusEl, options = {}) {
  const mode = options.mode || 'missing';
  const isError = mode === 'error';
  const title = isError ? 'Product unavailable' : 'Find a product';
  const body = isError
    ? 'We could not load that product right now. You can keep shopping or search for another Pet Pawket item.'
    : 'Choose a product from the shop to view details, options, and add it to your cart.';

  document.getElementById('pdp-title').textContent = title;
  document.title = `${title} • Pet Pawket`;
  if (statusEl) statusEl.textContent = '';
  if (!root) return;

  root.innerHTML = `
    <div class="pdp-card pdp-product-finder${isError ? ' is-error' : ''}">
      <div class="pdp-product-finder-icon"><i class="bi ${isError ? 'bi-exclamation-circle' : 'bi-search-heart'}" aria-hidden="true"></i></div>
      <div>
        <h2>${esc(title)}</h2>
        <p>${esc(body)}</p>
        <form class="pdp-product-search" data-pdp-product-search>
          <label class="visually-hidden" for="pdp-product-search-input">Search products</label>
          <input id="pdp-product-search-input" type="search" placeholder="Search toys, treats, care goods..." autocomplete="off" />
          <button class="btn btn-primary" type="submit">Search Shop</button>
        </form>
        <div class="pdp-product-actions">
          <a class="btn btn-outline-secondary" href="/shop.html">Browse all products</a>
          <a class="btn btn-outline-secondary" href="/packs.html">Explore Pawket Packs</a>
        </div>
      </div>
    </div>
  `;

  root.querySelector('[data-pdp-product-search]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const q = root.querySelector('#pdp-product-search-input')?.value?.trim() || '';
    const url = new URL('/shop.html', window.location.origin);
    if (q) url.searchParams.set('q', q);
    window.location.assign(url.toString());
  });
}

/* --------------------------------- Boot ---------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Initial + reactive sticky offsets
  updateStickyOffsets();
  window.addEventListener('resize', throttle(updateStickyOffsets, 150));

  // Observe navbar injection/size changes
  const nav = document.querySelector('#navbar-container') || document.querySelector('header, nav');
  if (nav) {
    try {
      new ResizeObserver(throttle(updateStickyOffsets, 50)).observe(nav);
    } catch {}
  }
  const mo = new MutationObserver(throttle(updateStickyOffsets, 50));
  mo.observe(document.documentElement, { childList: true, subtree: true });

  const handle = getHandleFromUrl();
  const statusEl = document.getElementById('pdp-status');
  const root = document.getElementById('pdp-root');

  try{
    if(!handle) {
      renderProductFinder(root, statusEl);
      updateStickyOffsets();
      return;
    }
    statusEl.textContent = 'Loading…';
    const product = await loadProduct(handle);
    render(root, product);
    statusEl.textContent = '';

    // One more pass in case layout shifted after render
    updateStickyOffsets();
  }catch(e){
    console.error('[PDP] load error:', e);
    renderProductFinder(root, statusEl, { mode: 'error' });
  }
});
