// public/products.js
// Products data + UI helpers with idempotent loaders
// - Exports singletons: featuredProducts, allProducts
// - Safe to import from multiple places (overlay, pages). Fetch is single-flight.
// - fetchAllProducts(): loads once (memoized). Subsequent calls reuse the same data.
// - fetchFeaturedProducts(): ensures all products are loaded, then derives a featured slice.
// - Includes existing render, filters, cart badge helpers, and delegated "add-to-cart" click.

export let featuredProducts = [];
export let allProducts = [];

// ---- Config (inline Storefront API) ----
const SHOP_DOMAIN = 'yx0ksi-xv.myshopify.com';
const SF_VERSION = '2024-04';
const SF_ENDPOINT = `https://${SHOP_DOMAIN}/api/${SF_VERSION}/graphql.json`;

// If this ever moves server-side, replace with a server proxy.
// Keeping as provided in current code:
const STOREFRONT_TOKEN = '409b760bb918367d377eb3a598c1298d';

// ---- Memoization / single-flight guards ----
let _loadedAll = false;
let _loadingAll = null;
let _lastAllAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // optional TTL in case you want to refresh periodically

// ---- Mapping helpers ----
function mapEdgesToProducts(edges = []) {
  return edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    image: node.images?.edges?.[0]?.node?.url || 'assets/fallback.jpg',
    price: parseFloat(node.variants?.edges?.[0]?.node?.price?.amount || '0'),
    variantId: node.variants?.edges?.[0]?.node?.id || '',
    type: node.productType || 'Uncategorized',
  }));
}

async function gql(query, variables) {
  const res = await fetch(SF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json;
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

  const QUERY = `
    query AllProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            productType
            images(first: 1) { edges { node { url } } }
            variants(first: 1) {
              edges {
                node {
                  id
                  price { amount currencyCode }
                }
              }
            }
          }
        }
      }
    }
  `;

  _loadingAll = (async () => {
    try {
      const result = await gql(QUERY, { first: limit });
      const edges = result?.data?.products?.edges || [];
      allProducts = mapEdgesToProducts(edges);
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
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <img src="${product.image}" alt="${product.title}" class="card-img-top">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${product.title}</h5>
          <p class="card-text text-muted">$${Number(product.price).toFixed(2)}</p>
          <a href="#" class="btn btn-primary mt-auto add-to-cart"
            aria-label="Add ${product.title} to cart"
            data-id="${product.id}"
            data-variant-id="${product.variantId}"
            data-title="${product.title}"
            data-price="${product.price}"
            data-image="${product.image}">
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
  try {
    const raw =
      localStorage.getItem('cart') || localStorage.getItem('cartItems') || '[]';
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      arr.push(item);
      localStorage.setItem('cart', JSON.stringify(arr));
    }
  } catch { /* ignore */ }
  updateCartBadge();
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
    id: i.id,
    variantId: i.variantId,
    title: i.title,
    price: parseFloat(i.price),
    image: i.image,
    quantity: 1
  };

  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  const existing = Array.isArray(cart) ? cart.find(p => p.id === item.id) : null;

  if (existing) {
    existing.quantity = Number(existing.quantity || 1) + 1;
    console.log(`[Cart] Increased quantity for ${item.title}.`);
  } else if (Array.isArray(cart)) {
    cart.push(item);
    console.log(`[Cart] Added new item: ${item.title}.`);
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
});