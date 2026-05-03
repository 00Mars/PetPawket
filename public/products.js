// public/products.js
// Products data + UI helpers with idempotent loaders
// - Exports singletons: featuredProducts, allProducts
// - Safe to import from multiple places (overlay, pages). Fetch is single-flight.
// - fetchAllProducts(): loads once (memoized). Subsequent calls reuse the same data.
// - fetchFeaturedProducts(): ensures all products are loaded, then derives a featured slice.
// - Includes existing render, filters, cart badge helpers, and delegated "add-to-cart" click.

import { addToCart as addCartItem, updateCartBadge as updateCartBadgeFromUtils } from './cartUtils.js';

export let featuredProducts = [];
export let allProducts = [];

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function safeImageUrl(value, fallback = '/assets/images/placeholder.png') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}

// ---- Memoization / single-flight guards ----
let _loadedAll = false;
let _loadingAll = null;
let _lastAllAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // optional TTL in case you want to refresh periodically

// ---- Mapping helpers ----
function mapProducts(list = []) {
  return list.map((node = {}) => ({
    id: node.id,
    title: node.title,
    handle: node.handle,
    image: safeImageUrl(node.featuredImage?.url || node.image || ''),
    price: parseFloat(node.priceRange?.minVariantPrice?.amount || node.price || '0'),
    variantId: node.variants?.edges?.[0]?.node?.id || node.variantId || '',
    type: node.productType || node.type || 'Uncategorized',
  }));
}

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    const msg = data?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/**
 * Idempotent loader for all products used by search and page UIs.
 * - Single-flight: concurrent callers share the same promise
 * - Memoized: subsequent calls reuse data until TTL expires
 */
export async function fetchAllProducts(limit = 250) {
  const now = Date.now();
  if (_loadedAll && now - _lastAllAt < CACHE_TTL_MS) {
    return allProducts;
  }
  if (_loadingAll) {
    return _loadingAll; // share in-flight
  }

  console.log('[Products] fetchAllProducts…');

  _loadingAll = (async () => {
    try {
      const result = await fetchJSON(`/api/products/all?limit=${limit}`);
      const items = result?.items || result?.products || [];
      allProducts = mapProducts(items);
      _loadedAll = true;
      _lastAllAt = Date.now();
      console.log(`[Products] Loaded ${allProducts.length} products.`);
      return allProducts;
    } catch (err) {
      console.error('[Products] Error in fetchAllProducts:', err);
      // Reset flags on failure so a later call can retry
      _loadingAll = null;
      _loadedAll = false;
      throw err;
    } finally {
      // Allow future refresh after completion; keep memoized allProducts for consumers
      _loadingAll = null;
    }
  })();

  return _loadingAll;
}

/**
 * Featured loader — derives from allProducts (ensures it’s loaded).
 * Keeps current page’s render side-effects intact.
 */
export async function fetchFeaturedProducts(count = 6) {
  console.log('[Products] Starting fetchFeaturedProducts…');
  try {
    // Reuse the idempotent loader
    const products = await fetchAllProducts(Math.max(250, count)); // ensure we have enough
    featuredProducts = products.slice(0, count);

    // Side effects preserved from your original code:
    renderProducts(products);
    populateFilterOptions(products.map(p => p.type));
  } catch (err) {
    console.error('[Products] Error fetching featured products:', err);
  }
}

// ---- UI helpers (kept as-is with small safety tweaks) ----
export function renderProducts(products) {
  const container = document.getElementById('featured-products');
  if (!container) {
    console.warn('[renderProducts] #featured-products container not found!');
    return;
  }

  console.log(`[renderProducts] Rendering ${products.length} products…`);
  container.innerHTML = '';

  products.forEach(product => {
    const title = escapeHtml(product.title || 'Product');
    const image = escapeHtml(safeImageUrl(product.image));
    const id = escapeHtml(product.id || '');
    const variantId = escapeHtml(product.variantId || '');
    const price = Number(product.price);
    const priceText = Number.isFinite(price) ? price.toFixed(2) : '0.00';
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${image}" alt="${title}" class="card-img-top">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${title}</h5>
          <p class="card-text text-muted">$${priceText}</p>
          <a href="#" class="btn btn-primary mt-auto add-to-cart"
            aria-label="Add ${title} to cart"
            data-id="${id}"
            data-variant-id="${variantId}"
            data-title="${title}"
            data-price="${priceText}"
            data-image="${image}">
            Add to Cart
          </a>
        </div>
      </div>
    `;
    container.appendChild(col);
  });
  console.log('[renderProducts] Finished rendering.');
}

export function getCartItemCount() {
  try {
    // Support multiple legacy stores: 'cart', 'cartItems', or object with .items
    const raw =
      localStorage.getItem('cart') ||
      sessionStorage.getItem('cart') ||
      localStorage.getItem('cartItems') ||
      sessionStorage.getItem('cartItems');

    if (!raw) return 0;
    const data = JSON.parse(raw);

    if (Array.isArray(data)) {
      return data.reduce(
        (n, it) => n + (Number(it?.qty ?? it?.quantity ?? 1) || 0),
        0
      );
    }
    if (data && Array.isArray(data.items)) {
      return data.items.reduce(
        (n, it) => n + (Number(it?.qty ?? it?.quantity ?? 1) || 0),
        0
      );
    }
    return 0;
  } catch {
    return 0;
  }
}

export function updateCartBadge(countOverride = null) {
  const findBadge = () => document.querySelector('#cart-count, .cart-count');

  const apply = () => {
    const el = findBadge();
    if (!el) { console.warn('[Cart] badge element not found (will keep watching)'); return false; }
    const count = (countOverride != null) ? countOverride : getCartItemCount();
    el.textContent = String(count);
    return true;
  };

  // try now
  if (apply()) return;

  // wait for navbar/DOM injection
  const obs = new MutationObserver(() => {
    if (apply()) obs.disconnect();
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

// Optional: if you have an “add to cart” flow, call this after mutation
export function addToCart(item) {
  addCartItem(item, Number(item?.quantity || 1));
  updateCartBadgeFromUtils();
}

export function populateFilterOptions(categories) {
  const dropdown = document.getElementById('filter-options');
  if (!dropdown) {
    console.warn('[Filters] #filter-options not found!');
    return;
  }

  const unique = [...new Set(categories)].filter(c => c && c.trim() !== '');
  console.log(`[Filters] Populating ${unique.length} filter options…`);

  unique.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    dropdown.appendChild(option);
  });
}

export function setupEventListeners() {
  const sort = document.getElementById('sort-options');
  const filter = document.getElementById('filter-options');

  if (sort) {
    sort.addEventListener('change', () => {
      const sorted = [...allProducts].sort((a, b) =>
        sort.value === 'price-asc' ? a.price - b.price : b.price - a.price
      );
      console.log(`[Sort] Applied sort: ${sort.value}`);
      renderProducts(sorted);
    });
  } else {
    console.warn('[Sort] #sort-options not found!');
  }

  if (filter) {
    filter.addEventListener('change', () => {
      const f = filter.value;
      const filtered = f === 'all' ? allProducts : allProducts.filter(p => p.type === f);
      console.log(`[Filter] Applied filter: ${f}, ${filtered.length} product(s) matched.`);
      renderProducts(filtered);
    });
  } else {
    console.warn('[Filter] #filter-options not found!');
  }
}

// Delegated add-to-cart (single evaluation per ESM module load)
document.addEventListener('click', e => {
  const btn = e.target.closest('.add-to-cart');
  if (!btn) return;
  e.preventDefault();

  const i = btn.dataset;
  const item = {
    productId: i.id,
    variantId: i.variantId,
    title: i.title,
    price: parseFloat(i.price),
    image: i.image,
    quantity: 1
  };

  const before = getCartItemCount();
  addCartItem(item, 1);
  updateCartBadgeFromUtils();
  const after = getCartItemCount();
  console.log(after > before ? `[Cart] Added item: ${item.title}.` : `[Cart] Cart unchanged for ${item.title}.`);
});
