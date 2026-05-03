/* /public/api.js — tiny adapter for Pets, Search, Products, Wishlist, Prefs, Subs
   All requests use credentials:'include'. Shapes normalized for stable UI.
   Safe to import from any page; no side effects on load.

   Change:
   - Add capability detection + caching for optional endpoints so we don’t keep re-hitting
     routes that aren’t implemented (avoids repeated 404s after the first probe).
   - Robust get/send wrappers (never throw; always return { ok, status, body }).
*/

import { getSession } from './auth.js';

export const api = (() => {
  // ---------- Internal helpers ----------
  const caps = {
    prefs: null,   // null=unknown, true=supported, false=not supported
    subs:  null,
  };

  // Minimal JSON unwrap with status passthrough
const j = async (res) => {
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, body };
};

// Central request wrapper — never throws; always returns { ok, status, body }
async function request(url, opts = {}) {
  try {
    const { authRequired = false, ...fetchOpts } = opts || {};
    if (authRequired) {
      const session = await getSession();
      if (!session?.signedIn) return { ok: false, status: 401, body: null, authSkipped: true };
    }
    const res = await fetch(url, { credentials: 'include', ...fetchOpts });
    return j(res);
  } catch {
    return { ok: false, status: 0, body: null };
  }
}
const get  = (url) => request(url);
const send = (url, method, data) =>
  request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: data != null ? JSON.stringify(data) : undefined,
  });

  // ---------- Pets CRUD ----------
  async function petsList() {
    const r = await request('/api/pets', { authRequired: true });
    const arr = Array.isArray(r.body) ? r.body : (r.body?.pets || []);
    return { ok: r.ok, pets: arr, status: r.status };
  }
  async function petsCreate({ name, species, birthday }) {
    return request('/api/pets', {
      authRequired: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, species, birthday }),
    });
  }
  async function petsUpdate(id, patch) {
    return request(`/api/pets/${encodeURIComponent(id)}`, {
      authRequired: true,
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  }
  async function petsDelete(id) {
    return request(`/api/pets/${encodeURIComponent(id)}`, {
      authRequired: true,
      method: 'DELETE',
    });
  }

  // ---------- Products (search/list/detail) ----------
  async function searchProducts(q, limit = 24) {
    const r = await get(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    const products = Array.isArray(r.body?.items) ? r.body.items : [];
    return { ok: r.ok, products, status: r.status };
  }
  async function featuredProducts(limit = 8) {
    const r = await get(`/api/products/featured?limit=${limit}`);
    const products = Array.isArray(r.body?.items) ? r.body.items : [];
    return { ok: r.ok, products, status: r.status };
  }
  async function allProducts(limit = 250) {
    const r = await get(`/api/products/all?limit=${limit}`);
    const products =
      Array.isArray(r.body?.items) ? r.body.items
      : Array.isArray(r.body?.products) ? r.body.products
      : [];
    return { ok: r.ok, products, status: r.status };
  }
  // Used by wishlist UIs and nav menus
  async function productByHandle(handle) {
    const h = String(handle || '').trim();
    if (!h) return { ok: false, product: null, status: 400 };
    const r = await get(`/api/products/handle/${encodeURIComponent(h)}`);
    return { ok: r.ok, product: r.body?.product || r.body || null, status: r.status };
  }

  // ---------- Wishlist ----------
  // List handles (shape tolerant: returns both "items" and "wishlist")
  async function wishlistList() {
    const r = await request('/api/wishlist', { authRequired: true });
    const list =
      Array.isArray(r.body?.wishlist) ? r.body.wishlist
      : Array.isArray(r.body?.items)  ? r.body.items
      : Array.isArray(r.body)         ? r.body
      : [];
    return { ok: r.ok, items: list, wishlist: list, status: r.status };
  }
  async function wishlistAdd(handle) {
    const r = await request('/api/wishlist', {
      authRequired: true,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle }),
    });
    return { ok: r.ok, wishlist: r.body?.wishlist || [], status: r.status };
  }
  async function wishlistRemove(handle) {
    const r = await request(`/api/wishlist/${encodeURIComponent(handle)}`, {
      authRequired: true,
      method: 'DELETE',
    });
    return { ok: r.ok, wishlist: r.body?.wishlist || [], status: r.status };
  }

  // ---------- Pane Prefs (server if present; else localStorage) ----------
  const LS_PANE = 'pp.myPetsPane.on';

  // If the server route 404s once, cache caps.prefs=false to avoid future calls.
  async function prefsGetForMyPets() {
    const session = await getSession();
    if (!session?.signedIn) {
      const raw = localStorage.getItem(LS_PANE);
      return { ok: true, on: raw === null ? false : raw === '1' };
    }
    if (caps.prefs === false) {
      const raw = localStorage.getItem(LS_PANE);
      return { ok: true, on: raw === null ? false : raw === '1' };
    }
    const r = await get('/api/prefs/forMyPets'); // may 404 → fallback
    if (r.ok) { caps.prefs = true; return { ok: true, on: !!r.body?.on }; }
    if (r.status === 404) caps.prefs = false;
    const raw = localStorage.getItem(LS_PANE);
    return { ok: true, on: raw === null ? false : raw === '1' };
  }

  async function prefsSetForMyPets(on) {
    const session = await getSession();
    if (!session?.signedIn) {
      localStorage.setItem(LS_PANE, on ? '1' : '0');
      return { ok: true };
    }
    if (caps.prefs === false) {
      localStorage.setItem(LS_PANE, on ? '1' : '0');
      return { ok: true };
    }
    const r = await send('/api/prefs/forMyPets', 'POST', { on });
    if (r.ok) { caps.prefs = true; return { ok: true }; }
    if (r.status === 404) caps.prefs = false;
    localStorage.setItem(LS_PANE, on ? '1' : '0');
    return { ok: true };
  }

  // ---------- Subscriptions (optional) ----------
  // Try the two known endpoints; on first double-404, cache caps.subs=false.
  async function subsSuggest(petId) {
    if (caps.subs === false) return { ok: false, suggestions: [] };
    const urls = [
      `/api/subscriptions/suggest?pet=${encodeURIComponent(petId || '')}`,
      `/api/subs/suggest?pet=${encodeURIComponent(petId || '')}`, // compat
    ];
    let anyOk = false;
    for (const u of urls) {
      const r = await get(u);
      if (r.ok) {
        anyOk = true;
        const suggestions = r.body?.suggestions || r.body?.items || [];
        caps.subs = true;
        return { ok: true, suggestions };
      }
      if (r.status !== 404 && r.status !== 0) {
        // Endpoint exists but returned an error; don’t mark as unsupported.
        return { ok: false, suggestions: [] };
      }
    }
    if (!anyOk) caps.subs = false; // both ~404/0 → mark unsupported
    return { ok: false, suggestions: [] };
  }

  return {
    // Pets
    petsList, petsCreate, petsUpdate, petsDelete,
    // Products
    searchProducts, featuredProducts, allProducts, productByHandle,
    // Wishlist
    wishlistList, wishlistAdd, wishlistRemove,
    // Prefs
    prefsGetForMyPets, prefsSetForMyPets,
    // Subs
    subsSuggest,
  };
})();
