// public/pawketNetwork.js
const root = document;
const resultsEl = root.querySelector('[data-network-results]');
const countEl = root.querySelector('[data-network-count]');
const statusEl = root.querySelector('[data-network-status]');
const activeFiltersEl = root.querySelector('[data-network-active-filters]');
const sortSummaryEl = root.querySelector('[data-network-sort-summary]');

let geo = { lat: null, lng: null };
const DEFAULT_RADIUS_MI = '25';
const DEFAULT_SORT = 'relevance';

const filters = {
  q: root.querySelector('[data-network-filter="q"]'),
  category: root.querySelector('[data-network-filter="category"]'),
  city: root.querySelector('[data-network-filter="city"]'),
  state: root.querySelector('[data-network-filter="state"]'),
  postal_code: root.querySelector('[data-network-filter="postal_code"]'),
  claimed: root.querySelector('[data-network-filter="claimed"]'),
  partner: root.querySelector('[data-network-filter="partner"]'),
  supports_charm: root.querySelector('[data-network-filter="supports_charm"]'),
  tier: root.querySelector('[data-network-filter="tier"]'),
  radius_mi: root.querySelector('[data-network-filter="radius_mi"]'),
  sort: root.querySelector('[data-network-filter="sort"]'),
};

const categoryLabels = {
  vet: 'Veterinary',
  groomer: 'Grooming',
  shelter: 'Shelter',
  trainer: 'Training',
  boarding: 'Boarding',
  sitter: 'Sitting',
  walker: 'Walking',
  daycare: 'Daycare',
  rescue: 'Rescue',
  other: 'Other',
};

const tierLabels = {
  partner: 'Partner',
  partner_plus: 'Partner+',
  partner_elite: 'Partner Elite',
};

const sortLabels = {
  relevance: 'Relevance',
  featured: 'Featured',
  distance: 'Distance',
  newest: 'Newest',
};

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

function queryParams() {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([key, el]) => {
    if (!el) return;
    if (el.type === 'checkbox') {
      if (el.checked) p.set(key, '1');
      return;
    }
    const value = String(el.value || '').trim();
    if (!value) return;
    p.set(key, value);
  });
  if (geo.lat != null && geo.lng != null) {
    p.set('lat', String(geo.lat));
    p.set('lng', String(geo.lng));
  }
  return p;
}

function activeFilterTokens() {
  const out = [];
  const q = String(filters.q?.value || '').trim();
  const category = String(filters.category?.value || '').trim();
  const city = String(filters.city?.value || '').trim();
  const state = String(filters.state?.value || '').trim();
  const postal = String(filters.postal_code?.value || '').trim();
  const tier = String(filters.tier?.value || '').trim();
  const radius = String(filters.radius_mi?.value || '').trim();
  const sort = String(filters.sort?.value || '').trim();

  if (q) out.push({ key: 'q', label: 'Search', value: q });
  if (category) out.push({ key: 'category', label: 'Category', value: categoryLabels[category] || category });
  if (city) out.push({ key: 'city', label: 'City', value: city });
  if (state) out.push({ key: 'state', label: 'State', value: state.toUpperCase() });
  if (postal) out.push({ key: 'postal_code', label: 'ZIP', value: postal });
  if (filters.claimed?.checked) out.push({ key: 'claimed', label: 'Status', value: 'Claimed' });
  if (filters.partner?.checked) out.push({ key: 'partner', label: 'Status', value: 'Pawket Partners' });
  if (filters.supports_charm?.checked) out.push({ key: 'supports_charm', label: 'Impact', value: 'Supports CHARM' });
  if (tier) out.push({ key: 'tier', label: 'Tier', value: tierLabels[tier] || tier });
  if (radius && radius !== DEFAULT_RADIUS_MI) out.push({ key: 'radius_mi', label: 'Radius', value: `${radius} mi` });
  if (sort && sort !== DEFAULT_SORT) out.push({ key: 'sort', label: 'Sort', value: sortLabels[sort] || sort });
  if (geo.lat != null && geo.lng != null) out.push({ key: 'geo', label: 'Location', value: 'Near me' });

  return out;
}

function renderActiveFilters() {
  if (!activeFiltersEl) return;
  const tokens = activeFilterTokens();
  if (!tokens.length) {
    activeFiltersEl.innerHTML = '<span class="pp-network-muted">No active filters.</span>';
    return;
  }
  activeFiltersEl.innerHTML = `
    ${tokens.map((token) => `
      <button type="button" class="pp-network-chip pp-network-chip--filter" data-network-remove-filter="${esc(token.key)}">
        ${esc(token.label)}: ${esc(token.value)} <span aria-hidden="true">×</span>
      </button>
    `).join('')}
    <button type="button" class="pp-network-chip pp-network-chip--clear" data-network-action="clear-filters">Clear all</button>
  `;
}

function clearFilter(key) {
  if (key === 'geo') {
    geo = { lat: null, lng: null };
    return;
  }
  const el = filters[key];
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = false;
    return;
  }
  if (key === 'radius_mi') {
    el.value = DEFAULT_RADIUS_MI;
    return;
  }
  if (key === 'sort') {
    el.value = DEFAULT_SORT;
    return;
  }
  if (el.tagName === 'SELECT') {
    el.selectedIndex = 0;
    return;
  }
  el.value = '';
}

function badges(item) {
  const out = [];
  if (item.status === 'partner') {
    out.push('<span class="pp-network-badge status-partner">Pawket Partner</span>');
    if (item.partner_tier) {
      out.push(`<span class="pp-network-badge tier">${esc(tierLabels[item.partner_tier] || item.partner_tier)}</span>`);
    }
  } else if (item.status === 'claimed') {
    out.push('<span class="pp-network-badge status-claimed">Claimed</span>');
  } else {
    out.push('<span class="pp-network-badge status-unclaimed">Network Listing</span>');
  }
  if (item.charm_support?.enabled) out.push('<span class="pp-network-badge charm">Supports CHARM</span>');
  return out.join('');
}

function render(items = []) {
  if (!resultsEl) return;
  if (!items.length) {
    resultsEl.innerHTML = '<div class="pp-network-item"><p class="pp-network-muted">No listings found for this filter set.</p></div>';
    return;
  }

  resultsEl.innerHTML = items.map((item) => {
    const city = item.location?.city || '';
    const state = item.location?.state || '';
    const distance = Number(item.distance_mi);
    const dist = Number.isFinite(distance) ? ` · ${distance.toFixed(1)} mi` : '';
    const category = categoryLabels[item.category_primary] || item.category_primary || 'Category pending';
    const slug = String(item.slug || '').trim();
    const detailHref = slug ? `/pawket-network/${encodeURIComponent(slug)}` : '#';
    const managementCta = item.status === 'unclaimed'
      ? '<span class="pp-network-chip">Claim this listing</span>'
      : item.status === 'partner'
        ? '<span class="pp-network-chip">Partner modules enabled</span>'
        : '<span class="pp-network-chip">Managed by owner</span>';
    const discoveryCta = item.status === 'partner'
      ? '<span class="pp-network-chip">Interactive listing</span>'
      : '<span class="pp-network-chip">Directory profile</span>';
    return `
      <article class="pp-network-card">
        <div class="pp-network-item-head">
          <h3>${esc(item.name)}</h3>
          <a class="pp-network-chip pp-network-chip--action" href="${esc(detailHref)}">Open</a>
        </div>
        <p class="pp-network-meta">${esc(city)}${city && state ? ', ' : ''}${esc(state)}${dist}</p>
        <div class="pp-network-chip-row">
          <span class="pp-network-chip pp-network-chip--context">${esc(category)}</span>
        </div>
        <div class="pp-network-badges">${badges(item)}</div>
        <p class="pp-network-muted">${esc(item.short_description || 'No summary available yet.')}</p>
        <div class="pp-network-chip-row">${managementCta}${discoveryCta}</div>
      </article>
    `;
  }).join('');
}

async function loadListings() {
  try {
    setStatus('Loading directory...');
    const query = queryParams();
    const res = await fetch(`/api/network/listings?${query.toString()}`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.error || 'Directory request failed');

    render(data.items || []);
    renderActiveFilters();
    const total = Number(data.total || 0);
    const shown = Array.isArray(data.items) ? data.items.length : 0;
    if (countEl) countEl.textContent = `Showing ${shown} of ${total} listings`;
    const sort = String(filters.sort?.value || DEFAULT_SORT);
    if (sortSummaryEl) {
      const nearby = geo.lat != null ? ' · using nearby coordinates' : '';
      sortSummaryEl.textContent = `Sorted by ${sortLabels[sort] || sort}${nearby}.`;
    }
    setStatus(geo.lat != null ? 'Using nearby location for distance-aware ranking.' : '');
  } catch (err) {
    setStatus(err?.message || 'Failed to load listings.');
    if (sortSummaryEl) sortSummaryEl.textContent = '';
  }
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported in this browser.');
    return;
  }

  setStatus('Requesting your location...');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      geo = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      if (filters.sort) filters.sort.value = 'distance';
      await loadListings();
    },
    async () => {
      const postal = String(filters.postal_code?.value || '').trim();
      const city = String(filters.city?.value || '').trim();
      const state = String(filters.state?.value || '').trim();
      const query = postal || [city, state].filter(Boolean).join(', ');
      if (!query) {
        setStatus('Location blocked. Add ZIP or city/state to use distance search.');
        return;
      }
      try {
        const resp = await fetch('/api/network/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || !body.ok) throw new Error(body?.error || 'Geocode failed');
        geo = { lat: body.location.lat, lng: body.location.lng };
        if (filters.sort) filters.sort.value = 'distance';
        await loadListings();
      } catch (err) {
        setStatus(err?.message || 'Unable to resolve location.');
      }
    },
    { enableHighAccuracy: false, maximumAge: 45_000, timeout: 9_000 }
  );
}

root.querySelector('[data-network-action="search"]')?.addEventListener('click', () => loadListings());
root.querySelector('[data-network-action="near-me"]')?.addEventListener('click', () => useMyLocation());
root.querySelector('[data-network-action="reset"]')?.addEventListener('click', () => {
  Object.values(filters).forEach((el) => {
    if (!el) return;
    if (el.type === 'checkbox') el.checked = false;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  geo = { lat: null, lng: null };
  if (filters.radius_mi) filters.radius_mi.value = DEFAULT_RADIUS_MI;
  if (filters.sort) filters.sort.value = DEFAULT_SORT;
  loadListings();
});

activeFiltersEl?.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('[data-network-remove-filter]');
  if (removeBtn) {
    clearFilter(removeBtn.getAttribute('data-network-remove-filter'));
    loadListings();
    return;
  }
  const clearBtn = event.target.closest('[data-network-action="clear-filters"]');
  if (clearBtn) {
    root.querySelector('[data-network-action="reset"]')?.dispatchEvent(new Event('click'));
  }
});

Object.values(filters).forEach((el) => {
  if (!el || el.type === 'checkbox') return;
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      loadListings();
    }
  });
});

loadListings();
