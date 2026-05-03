/* /public/components/productCard.js
   Compact card: clickable card via stretched-link; wishlist-only CTA; responsive images.
*/
export function productCardHTML(p) {
  const title  = escapeHtml(p.title || 'Untitled');
  const rawHandle = String(p.handle || '');
  const handle = encodeURIComponent(rawHandle);
  const handleAttr = escapeHtml(rawHandle);
  const id     = escapeHtml(p.id || '');
  const img    = safeImageUrl(p?.featuredImage?.url || '');
  const firstVariant = getFirstVariant(p);
  const variantId = escapeHtml(firstVariant?.id || '');
  const variantTitle = escapeHtml(firstVariant?.title || '');
  const min    = Number(p?.priceRange?.minVariantPrice?.amount ?? NaN);
  const max    = Number(p?.priceRange?.maxVariantPrice?.amount ?? NaN);
  const cc     = p?.priceRange?.minVariantPrice?.currencyCode
              || p?.priceRange?.maxVariantPrice?.currencyCode || 'USD';
  const price  = formatPriceRange(min, max, cc);
  const badgeLabel = productBadgeLabel(p);
  const category = categoryLabel(p._category || p.productType || '');
  const addPrice = Number.isFinite(firstVariant?.price) ? firstVariant.price : min;
  const addDisabled = !variantId || firstVariant?.available === false;

  const href = `/product.html?handle=${handle}`;

  return `
<li class="pp-card"
    data-id="${id}"
    data-handle="${handleAttr}"
    data-variant-id="${variantId}"
    data-variant-title="${variantTitle}"
    data-price="${Number.isFinite(addPrice) ? String(addPrice) : ''}"
    data-image="${escapeHtml(img)}"
    data-title="${title}">
  <a class="stretched-link view-link" href="${href}" aria-label="View ${title}"></a>

  <div class="pp-card-impact" aria-hidden="true">
    <span class="pp-impact-pill"><i class="bi bi-bag-heart"></i>${escapeHtml(badgeLabel)}</span>
  </div>

  <div class="media" aria-hidden="true">
    ${img ? `<img
      src="${escapeHtml(withWidth(img, 640))}"
      srcset="${escapeHtml(withWidth(img,320))} 320w, ${escapeHtml(withWidth(img,640))} 640w, ${escapeHtml(withWidth(img,960))} 960w"
      sizes="(min-width:1200px) 25vw, (min-width:768px) 33vw, 50vw"
      alt=""
      loading="lazy"
      decoding="async"
    />` : ''}
  </div>

  <div class="body">
    ${category ? `<div class="meta">${escapeHtml(category)}</div>` : ''}
    <h3 class="title" title="${title}">${title}</h3>
    <div class="price">${escapeHtml(price)}</div>
    <div class="cta-row cta-row--wish" role="group" aria-label="Wishlist action">
      <button type="button"
              class="btn btn-sm btn-outline-secondary wish"
              data-handle="${handleAttr}"
              aria-pressed="false"
              aria-label="Add ${title} to wishlist">
        <i class="bi bi-heart" aria-hidden="true"></i>
        <span class="visually-hidden">Wishlist</span>
      </button>
    </div>
    <div class="shop-card-actions" role="group" aria-label="Product actions for ${title}">
      <button type="button"
              class="btn btn-primary btn-sm"
              data-action="shop-add-cart"
              ${addDisabled ? 'disabled aria-disabled="true"' : ''}>
        <i class="bi bi-cart-plus" aria-hidden="true"></i>
        Add
      </button>
      <a class="btn btn-outline-secondary btn-sm" href="${href}" data-action="shop-view-details">
        Details
      </a>
    </div>
  </div>
</li>`;
}

export function productSkeletonHTML() {
  return `
<li class="pp-skel" aria-hidden="true">
  <div class="block"></div>
  <div class="stack">
    <div class="bar"></div>
    <div class="bar w60"></div>
    <div class="bar w40"></div>
  </div>
</li>`;
}

/* Utilities */
export function formatPriceRange(min, max, currency = 'USD') {
  const fmt = safeMoneyFormatter(currency);
  const a = Number.isFinite(min) ? min : NaN;
  const b = Number.isFinite(max) ? max : NaN;
  if (Number.isFinite(a) && Number.isFinite(b)) return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
  if (Number.isFinite(a)) return fmt(a);
  if (Number.isFinite(b)) return fmt(b);
  return '';
}

export function formatMoney(amount = 0, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function safeMoneyFormatter(currency = 'USD') {
  try {
    const fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency });
    return (amount) => fmt.format(amount);
  } catch {
    return (amount) => `$${Number(amount || 0).toFixed(2)}`;
  }
}

function safeImageUrl(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}

function getFirstVariant(p = {}) {
  const list = Array.isArray(p?.variants?.edges)
    ? p.variants.edges.map((edge) => edge?.node || edge)
    : Array.isArray(p?.variants)
      ? p.variants.map((edge) => edge?.node || edge)
      : [];
  const v = list.find((item) => item?.id) || null;
  if (!v) return null;
  return {
    id: v.id,
    title: v.title || 'Default',
    available: v.availableForSale !== false && v.available !== false,
    price: Number(v?.price?.amount ?? v?.price ?? NaN),
  };
}

/** Heuristic helper to request width variants if CDN supports ?width= */
function withWidth(url, w) {
  const safeUrl = safeImageUrl(url);
  if (!safeUrl) return '';
  if (safeUrl.includes('width=')) return safeUrl.replace(/width=\d+/, `width=${w}`);
  const sep = safeUrl.includes('?') ? '&' : '?';
  return `${safeUrl}${sep}width=${w}`;
}

function productBadgeLabel(p = {}) {
  const category = categoryLabel(p._category || p.productType || '');
  const tags = (Array.isArray(p.tags) ? p.tags : [])
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean);
  if (tags.includes('sale')) return category ? `${category} sale` : 'Sale';
  if (tags.includes('new')) return category ? `New ${category}` : 'New';
  return category || 'Care pick';
}

function categoryLabel(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const map = {
    'small-pet': 'Small pet',
    dog: 'Dog',
    cat: 'Cat',
    bird: 'Bird',
    fish: 'Fish',
    reptile: 'Reptile',
    toy: 'Toy',
    treat: 'Treat',
    accessories: 'Accessory',
    pets: 'Care pick'
  };
  const key = raw.toLowerCase();
  return map[key] || raw.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
