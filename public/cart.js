// /public/cart.js
// LocalStorage cart + canonical Pet Pawket checkout, plus
// dynamic navbar offset so content never hides behind fixed bars.

import { getCart, saveCart, updateCartBadge } from './cartUtils.js';

const T = {
  container: () => document.getElementById('cart-items'),
  total: () => document.getElementById('cart-total'),
  status: () => document.getElementById('cart-status'),
  checkoutBtn: () => document.getElementById('checkout-button'),
  navWrap: () => document.getElementById('navbar-container'),
};

/* ---------- NAV OFFSET (fixes top clipping) ---------- */
function throttle(fn, ms=150){ let t=null, lastArgs=null; return (...a)=>{ lastArgs=a; if(t) return; t=setTimeout(()=>{ t=null; fn(...lastArgs); }, ms); }; }

function measureNavOffset(){
  const root = T.navWrap();
  if (!root) return 0;
  const ppHeader = root.querySelector('.pp-header');
  const ppSubnav = root.querySelector('.pp-subnav');
  if (ppHeader || ppSubnav) {
    const headerH = ppHeader?.getBoundingClientRect?.().height || ppHeader?.offsetHeight || 0;
    const subnavH = ppSubnav?.getBoundingClientRect?.().height || ppSubnav?.offsetHeight || 0;
    const total = Math.round(headerH + subnavH);
    if (total > 0) return total;
  }
  // Try common parts in your navbar stack
  const bar = root.querySelector('.announcement-bar');
  const nav = root.querySelector('.custom-navbar') || root.querySelector('.navbar') || root.firstElementChild;
  let h = 0;
  if (bar) h += bar.offsetHeight || 0;
  if (nav) h += nav.offsetHeight || 0;
  // Fallback to 120px if nothing found (matches your visual stack)
  return h || 120;
}

function applyNavOffset(){
  const px = measureNavOffset();
  document.documentElement.style.setProperty('--nav-offset', px + 'px');
}

function initNavOffsetWatcher(){
  // Apply once after injection
  applyNavOffset();
  // Re-apply on resize
  window.addEventListener('resize', throttle(applyNavOffset, 150));
  // Watch injected navbar for size/structure changes
  const nav = T.navWrap();
  if (!nav) return;
  const mo = new MutationObserver(throttle(applyNavOffset, 50));
  mo.observe(nav, { childList:true, subtree:true, attributes:true });
}

/* ---------- Status helper ---------- */
function setStatus(msg=''){ const el = T.status(); if (el) el.textContent = msg; }
let checkoutInFlight = false;

function setCheckoutAvailability(hasItems) {
  const btn = T.checkoutBtn();
  if (!btn) return;
  btn.hidden = !hasItems;
  btn.disabled = !hasItems;
  btn.setAttribute('aria-disabled', String(!hasItems));
}

/* ---------- Render ---------- */
function renderCart() {
  const cartItems = getCart();
  const container = T.container();
  const totalEl = T.total();
  if (!container || !totalEl) return;

  container.innerHTML = '';
  let total = 0;

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    container.innerHTML = `
      <tr class="cart-empty-row">
        <td colspan="6" class="text-center py-4">
          <div class="cart-empty-state">
            <strong>Your cart is empty.</strong>
            <span>Start with everyday care goods, a Pawket Pack, or a quick Packet trial.</span>
            <div class="cart-empty-actions">
              <a class="btn btn-primary btn-sm" href="/shop.html">Shop products</a>
              <a class="btn btn-outline-secondary btn-sm" href="/packs.html">Explore Packs</a>
            </div>
          </div>
        </td>
      </tr>`;
    totalEl.textContent = '$0.00';
    setCheckoutAvailability(false);
    updateCartBadge();
    return;
  }

  setCheckoutAvailability(true);

  cartItems.forEach((item, index) => {
    const price = Number(item?.price) || 0;
    const qty   = Math.max(1, Number(item?.quantity) || 1);
    total += price * qty;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${escape(safeImageUrl(item?.image || ''))}" alt="" class="cart-thumb" loading="lazy" decoding="async"></td>
      <td>
        <p class="cart-title mb-1">${escape(item?.title||'Item')}</p>
        ${item?.variantTitle ? `<div class="cart-meta">${escape(item.variantTitle)}</div>` : ''}
      </td>
      <td class="text-end">$${price.toFixed(2)}</td>
      <td class="text-center">
        <div class="qty-wrap">
          <input type="number" class="form-control quantity-input" name="quantity-${index}"
                 data-index="${index}" value="${qty}" min="1" inputmode="numeric">
        </div>
      </td>
      <td class="text-end">$${(price * qty).toFixed(2)}</td>
      <td class="text-end">
        <button class="btn btn-remove remove-item" data-index="${index}" aria-label="Remove item">×</button>
      </td>
    `;
    container.appendChild(row);
  });

  totalEl.textContent = `$${total.toFixed(2)}`;
  updateCartBadge();
}

/* ---------- Listeners ---------- */
function setupCartListeners() {
  const table = T.container();
  if (!table) return;

  table.addEventListener('change', (e) => {
    const input = e.target.closest('.quantity-input');
    if (!input) return;
    const index = Number(input.dataset.index);
    const cart = getCart();
    if (!Array.isArray(cart) || !cart[index]) return;
    const next = Math.max(1, Number(input.value || 1));
    cart[index].quantity = next;
    saveCart(cart);
    renderCart();
  });

  table.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-item');
    if (!btn) return;
    const index = Number(btn.dataset.index);
    const cart = getCart();
    if (!Array.isArray(cart)) return;
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  });

  // Keep multiple tabs in sync
  window.addEventListener('storage', (ev) => {
    if (ev.key === 'cart') renderCart();
  });
}

/* ---------- Checkout (server-created Shopify cart) ---------- */
async function redirectToCheckout() {
  if (checkoutInFlight) return;
  checkoutInFlight = true;
  const btn = T.checkoutBtn();
  try {
    setStatus('Preparing checkout…');
    if (btn) {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    }

    const cartItems = getCart();
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      alert('Your cart is empty.');
      return;
    }

    const lines = cartItems
      .map(item => {
        const merchandiseId = String(item?.variantId || '').trim();
        const qty = Math.max(1, Number(item?.quantity) || 1);
        return merchandiseId ? { merchandiseId, quantity: qty } : null;
      })
      .filter(Boolean);

    if (!lines.length) {
      console.error('[checkout] No valid variant ids in cart:', cartItems);
      alert('Checkout failed: your cart items are missing variant IDs.');
      return;
    }

    const loopToken = getLoopToken();
    const res = await fetch('/api/cart/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines,
        loopToken,
        source: 'petpawket_cart_page',
        attributes: loopToken ? [{ key: 'loop_token', value: loopToken }] : []
      })
    });

    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok || !data?.checkoutUrl) {
      console.error('[checkout] create failed:', data);
      const details = Array.isArray(data?.details) && data.details.length
        ? ` ${data.details.map(d => d.message).filter(Boolean).join(' ')}`
        : '';
      alert(`Could not start checkout.${details}`.trim());
      return;
    }

    setStatus('Opening secure checkout…');
    window.location.assign(data.checkoutUrl);
  } catch (e) {
    console.error('[checkout] error', e);
    alert('Could not start checkout. Please try again.');
  } finally {
    setStatus('');
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
    }
    checkoutInFlight = false;
  }
}

/* ---------- Utils ---------- */
function escape(s=''){ return String(s).replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function safeImageUrl(value, fallback = '/assets/images/placeholder.png') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}
function getLoopToken() {
  try {
    const ls = localStorage.getItem('pp_loop_token');
    if (ls) return String(ls).trim();
  } catch {}
  try {
    const raw = document.cookie || '';
    const m = raw.match(/(?:^|;\s*)pp_loop_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1] || '').trim();
  } catch {}
  return '';
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Wait a tick so navbar/footer injectors can run, then measure
  setTimeout(() => {
    try { initNavOffsetWatcher(); } catch(e){ console.warn('[cart] nav offset init failed', e); }
    try { renderCart(); } catch(e){ console.error('[cart] render failed', e); }
    try { setupCartListeners(); } catch(e){ console.error('[cart] listeners failed', e); }
    try { updateCartBadge(); } catch(e){}

    const btn = T.checkoutBtn();
    if (btn && btn.dataset.checkoutWired !== '1') {
      btn.dataset.checkoutWired = '1';
      btn.addEventListener('click', (e) => { e.preventDefault(); redirectToCheckout(); });
    }

    // Fallback delegation in case the button id/class changes
    document.addEventListener('click', (e) => {
      const b = e.target.closest('#checkout-button, .btn-checkout');
      if (b === btn) return;
      if (b) { e.preventDefault(); redirectToCheckout(); }
    }, { capture: true });
  }, 0);
});

// Optional: expose for debugging from the console
window.PP_redirectCheckout = redirectToCheckout;
