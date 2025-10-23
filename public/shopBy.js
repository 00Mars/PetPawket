// /public/shopBy.js
// Redesigned "Shop by" ribbon. Mounts to #shop-by (no legacy classes).
// Anchors have real hrefs so it works even without JS.

export async function injectShopBy() {
  const mount = document.getElementById('shop-by');
  if (!mount) return;

  const SHOP_PATH = mount.dataset.shopPath || window.__SHOP_PAGE_PATH || '/shop';

  const TYPES = [
    { key: 'all',   label: 'All',        icon: 'bi-stars' },
    { key: 'dog',   label: 'Dogs',       icon: 'bi-bone' },
    { key: 'cat',   label: 'Cats',       icon: 'bi-emoji-smile' },
    { key: 'bird',  label: 'Birds',      icon: 'bi-feather' },
    { key: 'fish',  label: 'Fish',       icon: 'bi-droplet' },
    { key: 'rept',  label: 'Reptiles',   icon: 'bi-eye' },
    { key: 'small', label: 'Small Pets', icon: 'bi-heart' },
    { key: 'acc',   label: 'Accessories',icon: 'bi-bag' },
    { key: 'treat', label: 'Treats',     icon: 'bi-cookie' },
    { key: 'toy',   label: 'Toys',       icon: 'bi-emoji-laughing' },
  ];

  const urlPet = (new URL(location.href)).searchParams.get('pet') || 'all';
  let activeKey = TYPES.some(t => t.key === urlPet) ? urlPet : 'all';

  const makeHref = (key) => {
    const u = new URL(SHOP_PATH, location.origin);
    if (key && key !== 'all') u.searchParams.set('pet', key);
    u.searchParams.set('via', 'shopby');
    return u.pathname + (u.search || '');
  };

  mount.innerHTML = `
    <div class="sb-ribbon" role="region" aria-label="Shop by">
      <div class="container sb-wrap">
        <div class="sb-head" aria-hidden="true">
          <span class="sb-title">Shop by</span>
          <span class="sb-sub">Pick a pet or category</span>
        </div>
        <div class="sb-rail" id="sb-rail" role="tablist" aria-label="Shop by chips">
          ${TYPES.map(t => `
            <a class="sb-chip" role="tab"
               data-key="${t.key}"
               href="${makeHref(t.key)}"
               aria-current="${t.key === activeKey ? 'true' : 'false'}">
              <i class="bi ${t.icon}" aria-hidden="true"></i>
              <span>${t.label}</span>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  const rail = mount.querySelector('#sb-rail');
  function setActive(nextKey) {
    activeKey = nextKey;
    rail.querySelectorAll('.sb-chip').forEach(chip => {
      const on = chip.getAttribute('data-key') === activeKey;
      if (on) chip.setAttribute('aria-current', 'true');
      else chip.removeAttribute('aria-current');
    });
  }

  // Keyboard enhancement only (click uses native navigation)
  rail.addEventListener('keydown', (e) => {
    const chips = Array.from(rail.querySelectorAll('.sb-chip'));
    const i = Math.max(0, chips.findIndex(c => c.getAttribute('aria-current') === 'true'));
    const go = (idx) => { chips[idx]?.focus(); setActive(chips[idx].dataset.key); };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const key = chips[i]?.dataset.key || activeKey;
      location.assign(makeHref(key));
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); go(Math.min(chips.length - 1, i + 1)); }
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   { e.preventDefault(); go(Math.max(0, i - 1)); }
  });
}