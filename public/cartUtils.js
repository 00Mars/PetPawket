/* /public/cartUtils.js
   Minimal, framework-free cart utilities for Pet Pawket.

   Exports:
   - getCart(): Array
   - saveCart(cart: Array): void
   - addToCart(item: { variantId, price, title, image, variantTitle? }, qty=1): Array
   - removeFromCart(indexOrVariantId): Array
   - setQuantity(indexOrVariantId, qty): Array
   - clearCart(): void
   - updateCartBadge(): void
   - getSubtotal(cart?): number

   Events fired (CustomEvent on document):
   - 'pp:cart:changed' with detail { cart }
   - 'pp:cart:add'     with detail { item, qty, cart }
*/

const CART_KEY = 'cart';

function safeNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function looksLikeVariantId(id) {
  const s = String(id || '').trim();
  if (!s) return false;
  if (/^gid:\/\/shopify\/ProductVariant\//i.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  if (/^ProductVariant\/\d+$/i.test(s)) return true;
  if (/^variant[:_-]/i.test(s)) return true;
  return false;
}

function resolveVariantId(it = {}) {
  const direct = it?.variantId ?? it?.variant_id ?? it?.variant ?? it?.merchandiseId ?? it?.merchandise_id;
  if (direct) return direct;
  return looksLikeVariantId(it?.id) ? it.id : '';
}

function sanitizeCart(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(it => {
      const variantId = resolveVariantId(it);
      return {
        ...it,
        quantity: Math.max(1, safeNumber(it?.quantity ?? it?.qty, 1)),
        price: safeNumber(it?.price, 0),
        productId: it?.productId ?? it?.product_id ?? (looksLikeVariantId(it?.id) ? it?.productId : it?.id),
        variantId,
      };
    })
    .filter(it => !!it.variantId);
}

/* ========== Core ========== */
export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return sanitizeCart(JSON.parse(raw || '[]'));
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  try {
    const clean = sanitizeCart(cart);
    localStorage.setItem(CART_KEY, JSON.stringify(clean));
    try {
      document.dispatchEvent(new CustomEvent('pp:cart:changed', { detail: { cart: clean } }));
    } catch {}
    try { updateCartBadge(); } catch {}
  } catch {
    // no-op
  }
}

/* Add or merge item by variantId */
export function addToCart(item, qty = 1) {
  const addQty = Math.max(1, safeNumber(qty, 1));
  const cart = getCart();
  const variantId = resolveVariantId(item);
  if (!variantId) return cart;

  const ix = cart.findIndex(x => String(x.variantId) === String(variantId));
  if (ix >= 0) {
    cart[ix].quantity = Math.max(1, safeNumber(cart[ix].quantity, 1) + addQty);
  } else {
    cart.push({
      variantId,
      productId: item?.productId ?? item?.product_id ?? item?.id ?? '',
      handle: item?.handle || '',
      title: item?.title || 'Item',
      price: safeNumber(item?.price, 0),
      image: item?.image || '',
      variantTitle: item?.variantTitle || item?.options || '',
      quantity: addQty,
    });
  }
  saveCart(cart);
  try {
    document.dispatchEvent(new CustomEvent('pp:cart:add', { detail: { item, qty: addQty, cart } }));
  } catch {}
  return cart;
}

/* Remove by numeric index or variantId string */
export function removeFromCart(indexOrVariantId) {
  const cart = getCart();
  if (typeof indexOrVariantId === 'number') {
    if (indexOrVariantId >= 0 && indexOrVariantId < cart.length) cart.splice(indexOrVariantId, 1);
  } else {
    const id = String(indexOrVariantId);
    const i = cart.findIndex(x => String(x.variantId) === id);
    if (i >= 0) cart.splice(i, 1);
  }
  saveCart(cart);
  return cart;
}

/* Set quantity by index or variantId; qty<=0 removes item */
export function setQuantity(indexOrVariantId, qty) {
  const q = Math.max(0, safeNumber(qty, 0));
  const cart = getCart();

  if (typeof indexOrVariantId === 'number') {
    const i = indexOrVariantId;
    if (i < 0 || i >= cart.length) return cart;
    if (q <= 0) cart.splice(i, 1);
    else cart[i].quantity = q;
  } else {
    const id = String(indexOrVariantId);
    const i = cart.findIndex(x => String(x.variantId) === id);
    if (i < 0) return cart;
    if (q <= 0) cart.splice(i, 1);
    else cart[i].quantity = q;
  }

  saveCart(cart);
  return cart;
}

export function clearCart() {
  saveCart([]);
}

export function getSubtotal(cart = undefined) {
  const c = cart ?? getCart();
  try {
    return c.reduce((sum, it) => sum + safeNumber(it.price, 0) * Math.max(1, safeNumber(it.quantity, 1)), 0);
  } catch {
    return 0;
  }
}

/* ========== Badge Helpers ========== */
export function updateCartBadge() {
  try {
    const c = getCart();
    const total = c.reduce((s, it) => s + Math.max(1, safeNumber(it.quantity, 1)), 0);

    // ID-based badge (primary)
    const badge = document.querySelector('#cart-count');
    if (badge) badge.textContent = String(total);

    // Class-based badges (compat)
    document.querySelectorAll('.cart-count, .cart-badge').forEach(el => {
      el.textContent = String(total);
    });
  } catch {
    // no-op
  }
}

/* ========== Auto-wire badge refresh across pages ========== */
(function wireBadgeAutoUpdate(){
  if (typeof document === 'undefined') return;
  try { updateCartBadge(); } catch {}
  try {
    document.addEventListener('pp:cart:changed', () => { try { updateCartBadge(); } catch {} });
    document.addEventListener('pp:cart:add', () => { try { updateCartBadge(); } catch {} });
    window.addEventListener('storage', (e) => {
      if (e.key === CART_KEY) { try { updateCartBadge(); } catch {} }
    });
    document.addEventListener('DOMContentLoaded', () => { try { updateCartBadge(); } catch {} }, { once:true });
  } catch {}
})();
