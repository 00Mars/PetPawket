// public/pawketNetwork.js
const root = document;
const resultsEl = root.querySelector('[data-network-results]');
const countEl = root.querySelector('[data-network-count]');
const statusEl = root.querySelector('[data-network-status]');
const activeFiltersEl = root.querySelector('[data-network-active-filters]');
const sortSummaryEl = root.querySelector('[data-network-sort-summary]');
const suggestionsEl = root.querySelector('[data-network-suggestions]');

function emptyGeo() {
  return { lat: null, lng: null, label: '', source: '', query: '', lookup: '', city: '', state: '', postal_code: '' };
}

let geo = emptyGeo();
const DEFAULT_RADIUS_MI = '25';
const DEFAULT_SORT = 'relevance';
const US_STATE_NAMES_BY_CODE = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};
const US_STATE_CODES = new Set(Object.keys(US_STATE_NAMES_BY_CODE));
const US_STATE_CODES_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAMES_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);
const PLACE_STOPWORDS_RE = /\b(?:a|an|and|around|care|directory|for|from|in|local|near|network|of|on|pet|pets|provider|providers|search|service|services|the|to|with|dog|dogs|cat|cats|animal|animals)\b/gi;
const CATEGORY_QUERY_ALIASES = [
  ['vet', ['animal hospital', 'animal hospitals', 'animal clinic', 'animal clinics', 'pet hospital', 'pet hospitals', 'veterinary clinic', 'veterinary clinics', 'veterinarian', 'veterinarians', 'veterinary', 'vet clinic', 'vet clinics', 'vets', 'vet']],
  ['groomer', ['pet grooming', 'dog grooming', 'cat grooming', 'dog wash', 'pet salon', 'pet spa', 'groomers', 'groomer', 'grooming', 'salon']],
  ['cleaner', ['pet waste removal', 'dog waste removal', 'litter box cleaning', 'cat litter cleaning', 'aquarium cleaning', 'fish tank cleaning', 'pooper scoopers', 'pooper scooper', 'poop scooping', 'poop cleanup', 'pet cleaning', 'pet cleanup', 'pet cleaners', 'pet cleaner', 'cleaners', 'cleaner', 'pet waste', 'dog waste', 'poop scoop', 'doody']],
  ['shelter', ['animal shelter', 'animal shelters', 'humane society', 'adoption center', 'adoption centers', 'pet adoption', 'shelters', 'shelter', 'spca']],
  ['rescue', ['animal rescue', 'pet rescue', 'rescues', 'rescue']],
  ['trainer', ['dog training', 'animal training', 'obedience training', 'obedience', 'behaviorist', 'trainers', 'trainer', 'training']],
  ['boarding', ['pet boarding', 'dog boarding', 'cat boarding', 'pet hotel', 'dog hotel', 'kennels', 'kennel', 'boarders', 'boarding']],
  ['daycare', ['doggy daycare', 'doggie daycare', 'dog daycare', 'pet daycare', 'day care', 'daycare']],
  ['sitter', ['pet sitting', 'pet sitter', 'pet sitters', 'sitters', 'sitter', 'sitting']],
  ['walker', ['dog walking', 'dog walker', 'dog walkers', 'pet walking', 'walkers', 'walker', 'walking']],
].flatMap(([category, aliases]) => aliases.map((alias) => ({ category, alias }))).sort((a, b) => b.alias.length - a.alias.length);
const geocodeSuggestionCache = new Map();

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

const suggestionTypeLabels = {
  listing: 'Listing',
  place: 'Place',
  area: 'Area',
  state: 'State',
  category: 'Category',
  address: 'Address',
  zip: 'ZIP',
};

let suggestions = [];
let activeSuggestionIndex = -1;
let suggestionTimer = null;
let suggestionSeq = 0;
let selectedSuggestion = null;
const suggestionAppliedFilters = new Set();

const categoryLabels = {
  vet: 'Veterinary',
  groomer: 'Grooming',
  cleaner: 'Cleaner',
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

const launchPaths = [
  {
    id: 'care-visit-prep',
    icon: 'bi-journal-heart',
    title: 'Prepare for a care visit',
    eyebrow: 'Pet parent path',
    categories: ['vet', 'groomer', 'cleaner', 'trainer', 'boarding', 'daycare'],
    body: 'Turn private pet details into a useful visit checklist without publishing medical, rescue, adoption, or memorial stories.',
    actions: [
      { label: 'Open saved stories', href: '/account.html#account-story-trail' },
      { label: 'Nominate provider', action: 'nominate' },
    ],
    tags: ['care notes', 'journal', 'visit', 'vet', 'groomer', 'training'],
  },
  {
    id: 'rescue-shelter-intake',
    icon: 'bi-shield-heart',
    title: 'Connect a rescue or shelter',
    eyebrow: 'Rescue path',
    categories: ['shelter', 'rescue'],
    body: 'Help rescues and shelters show up in the Network, connect with CHARM, and share good updates when they are ready.',
    actions: [
      { label: 'Open CHARM', href: '/charm.html' },
      { label: 'Nominate organization', action: 'nominate' },
    ],
    tags: ['rescue', 'shelter', 'adoption', 'foster', 'charm'],
  },
  {
    id: 'partner-claim',
    icon: 'bi-building-check',
    title: 'Claim or prepare a listing',
    eyebrow: 'Provider path',
    categories: ['vet', 'groomer', 'cleaner', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other'],
    body: 'Businesses and organizations can keep profile basics current and show interest in closer Pet Pawket partner tools.',
    actions: [
      { label: 'Partner Portal', href: '/partner-portal.html' },
      { label: 'Nominate listing', action: 'nominate' },
    ],
    tags: ['claim', 'business', 'partner', 'portal', 'provider'],
  },
  {
    id: 'local-care-coverage',
    icon: 'bi-geo-alt',
    title: 'Help open local coverage',
    eyebrow: 'Local coverage',
    categories: ['vet', 'groomer', 'cleaner', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other'],
    body: 'When a city or ZIP has no results yet, nominations tell Pet Pawket where to look next.',
    actions: [
      { label: 'Nominate provider', action: 'nominate' },
      { label: 'Contact Pet Pawket', href: '/contact.html' },
    ],
    tags: ['city', 'zip', 'local', 'coverage', 'nominate'],
  },
  {
    id: 'pass-campaign',
    icon: 'bi-ticket-perforated',
    title: 'Share care with Pawket Passes',
    eyebrow: 'Sharing path',
    categories: ['shelter', 'rescue', 'groomer', 'cleaner', 'vet', 'other'],
    body: 'Partners can eventually use Pawket Passes for care-kit drives, local offers, and simple sharing.',
    actions: [
      { label: 'Open Pawket Passes', href: '/loop.html' },
      { label: 'Partner interest', href: '/contact.html' },
    ],
    tags: ['pass', 'campaign', 'referral', 'care kit', 'partner'],
  },
  {
    id: 'community-review',
    icon: 'bi-chat-heart',
    title: 'Share community stories with care',
    eyebrow: 'Community path',
    categories: ['shelter', 'rescue', 'vet', 'other'],
    body: 'Adoption wins, rescue updates, and partner highlights can point toward Town Square after people choose what to share.',
    actions: [
      { label: 'Open Community', href: '/community.html' },
      { label: 'Review CHARM', href: '/charm.html' },
    ],
    tags: ['community', 'town square', 'story', 'review', 'consent'],
  },
];

function categoryOptions(selected = '') {
  return Object.entries(categoryLabels).map(([value, label]) => (
    `<option value="${esc(value)}" ${selected === value ? 'selected' : ''}>${esc(label)}</option>`
  )).join('');
}

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeForCompare(value) {
  return normalizeSpaces(value).toLowerCase().replace(/\s*,\s*/g, ', ');
}

function normalizeUsState(value) {
  const raw = normalizeSpaces(value);
  if (!raw) return '';
  const code = raw.toUpperCase();
  if (US_STATE_CODES.has(code)) return code;
  return US_STATE_CODES_BY_NAME[raw.toLowerCase()] || '';
}

function stateLabel(value) {
  const code = normalizeUsState(value);
  return code || normalizeSpaces(value);
}

function hasGeo() {
  return geo.lat != null && geo.lng != null;
}

function currentRadiusLabel() {
  const radius = String(filters.radius_mi?.value || DEFAULT_RADIUS_MI).trim() || DEFAULT_RADIUS_MI;
  return `${radius} mi`;
}

function setGeoLocation(location = {}, options = {}) {
  const lat = Number(location.lat ?? location.latitude);
  const lng = Number(location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    geo = emptyGeo();
    return false;
  }
  const city = normalizeSpaces(location.city);
  const state = stateLabel(location.state);
  const postal = normalizeSpaces(location.postal_code || location.postalCode);
  const label = normalizeSpaces(options.label) || [city, state || postal].filter(Boolean).join(', ') || normalizeSpaces(options.query) || 'Selected location';
  geo = {
    lat,
    lng,
    label,
    source: options.source || 'place',
    query: normalizeSpaces(options.query),
    lookup: normalizeSpaces(options.lookup || options.query || label),
    city,
    state,
    postal_code: postal,
  };
  return true;
}

function resolvedPlaceSearchActive() {
  if (!hasGeo() || !['place', 'location_fields'].includes(geo.source)) return false;
  const q = normalizeForCompare(filters.q?.value || '');
  if (!q) return true;
  return q === normalizeForCompare(geo.query) || q === normalizeForCompare(geo.lookup) || q === normalizeForCompare(geo.label);
}

function stripCategoryLanguage(value) {
  let text = normalizeSpaces(value);
  let category = '';
  CATEGORY_QUERY_ALIASES.forEach(({ category: candidate, alias }) => {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(^|\\b)${escaped}(?=\\b|$)`, 'ig');
    if (re.test(text)) {
      if (!category) category = candidate;
      text = text.replace(re, ' ');
    }
  });
  text = normalizeSpaces(text.replace(PLACE_STOPWORDS_RE, ' ').replace(/\s+,/g, ',').replace(/,\s+/g, ', '));
  text = text.replace(/^,+|,+$/g, '').trim();
  return { text, category };
}

function extractPlaceLookup(rawValue) {
  const raw = normalizeSpaces(rawValue);
  if (!raw) return null;
  const { text, category } = stripCategoryLanguage(raw);
  if (!text) return null;
  const zip = text.match(/\b\d{5}(?:-\d{4})?\b/);
  if (zip && normalizeSpaces(text.replace(zip[0], '')).length <= 12) {
    return { lookup: zip[0], category, kind: 'zip' };
  }

  const cleaned = text.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  const commaMatch = cleaned.match(/^(.+?),\s*([A-Za-z]{2}|[A-Za-z][A-Za-z .'-]+)$/);
  if (commaMatch) {
    const place = commaMatch[1].trim();
    const state = normalizeUsState(commaMatch[2]);
    if (place && state) return { lookup: `${place}, ${state}`, category, kind: 'place' };
  }

  const lower = cleaned.toLowerCase();
  const namedState = Object.entries(US_STATE_CODES_BY_NAME)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([name]) => lower.endsWith(` ${name}`));
  if (namedState) {
    const before = cleaned.slice(0, cleaned.length - namedState[0].length).trim().replace(/,+$/g, '').trim();
    if (before) return { lookup: `${before}, ${namedState[1]}`, category, kind: 'place' };
  }

  const tokens = cleaned.split(/\s+/);
  const last = tokens[tokens.length - 1];
  const state = normalizeUsState(last);
  const before = tokens.slice(0, -1).join(' ').replace(/,+$/g, '').trim();
  if (state && before) return { lookup: `${before}, ${state}`, category, kind: 'place' };

  return null;
}

async function geocodeLookup(lookup) {
  const key = normalizeForCompare(lookup);
  if (!key) return null;
  if (!geocodeSuggestionCache.has(key)) {
    geocodeSuggestionCache.set(key, fetch('/api/network/geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ query: lookup }),
    })
      .then(async (resp) => {
        const body = await resp.json().catch(() => ({}));
        if (!resp.ok || !body.ok) throw new Error(body?.error || 'Geocode failed');
        return body.location || null;
      })
      .catch(() => null));
  }
  const location = await geocodeSuggestionCache.get(key);
  if (!location) geocodeSuggestionCache.delete(key);
  return location;
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

function setSuggestionsOpen(open) {
  if (!suggestionsEl || !filters.q) return;
  suggestionsEl.hidden = !open;
  filters.q.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (!open) filters.q.removeAttribute('aria-activedescendant');
}

function clearSuggestions() {
  suggestions = [];
  activeSuggestionIndex = -1;
  if (suggestionsEl) suggestionsEl.innerHTML = '';
  setSuggestionsOpen(false);
}

function setTextFilter(key, value, track = false) {
  const el = filters[key];
  if (!el) return;
  el.value = value || '';
  if (track) suggestionAppliedFilters.add(key);
}

function clearSuggestionAppliedFilters() {
  suggestionAppliedFilters.forEach((key) => setTextFilter(key, ''));
  suggestionAppliedFilters.clear();
  selectedSuggestion = null;
}

function applySuggestionFilters(item = {}) {
  clearSuggestionAppliedFilters();
  const type = String(item.type || '');
  if (!['place', 'area', 'state', 'category', 'zip', 'address', 'listing'].includes(type)) return;

  if (type === 'place') {
    if (item.category && filters.category && !String(filters.category.value || '').trim()) {
      setTextFilter('category', item.category, true);
    }
    setGeoLocation(item, {
      source: 'place',
      query: item.value || item.label || '',
      lookup: item.lookup || item.label || item.value || '',
      label: item.label || item.value || '',
    });
    if (filters.sort) filters.sort.value = 'distance';
    selectedSuggestion = item;
    return;
  }

  if (type === 'zip' && item.lat != null && item.lng != null) {
    if (item.category && filters.category && !String(filters.category.value || '').trim()) {
      setTextFilter('category', item.category, true);
    }
    setGeoLocation({
      lat: item.lat,
      lng: item.lng,
      postal_code: item.postal_code || item.value || item.label || '',
    }, {
      source: 'place',
      query: item.value || item.label || '',
      lookup: item.lookup || item.value || item.label || '',
      label: `ZIP ${item.postal_code || item.value || item.label || ''}`.trim(),
    });
    if (filters.sort) filters.sort.value = 'distance';
    selectedSuggestion = item;
    return;
  }

  if (item.city) setTextFilter('city', item.city, true);
  if (item.state) setTextFilter('state', String(item.state).toUpperCase(), true);
  if (item.category) setTextFilter('category', item.category, true);
  if (item.postal_code) setTextFilter('postal_code', item.postal_code, true);
  selectedSuggestion = item;
}

function suggestionStillMatchesInput() {
  if (!selectedSuggestion || !filters.q) return false;
  return String(filters.q.value || '').trim() === String(selectedSuggestion.value || selectedSuggestion.label || '').trim();
}

function shouldUseStructuredLocationSuggestion() {
  return suggestionStillMatchesInput() && ['place', 'area', 'state', 'category', 'zip'].includes(String(selectedSuggestion?.type || ''));
}

function renderSuggestions(items = []) {
  if (!suggestionsEl || !filters.q) return;
  suggestions = Array.isArray(items) ? items.slice(0, 12) : [];
  activeSuggestionIndex = -1;
  if (!suggestions.length) {
    clearSuggestions();
    return;
  }
  suggestionsEl.innerHTML = suggestions.map((item, index) => {
    const type = suggestionTypeLabels[item.type] || 'Result';
    return `
      <button
        type="button"
        class="pp-network-suggestion"
        id="network-search-suggestion-${index}"
        role="option"
        aria-selected="false"
        data-network-suggestion-index="${index}"
      >
        <span class="pp-network-suggestion-type">${esc(type)}</span>
        <span class="pp-network-suggestion-copy">
          <strong>${esc(item.label || item.value)}</strong>
          ${item.detail ? `<small>${esc(item.detail)}</small>` : ''}
        </span>
      </button>
    `;
  }).join('');
  setSuggestionsOpen(true);
}

function updateActiveSuggestion(nextIndex) {
  if (!suggestionsEl || !filters.q || !suggestions.length) return;
  const max = suggestions.length - 1;
  activeSuggestionIndex = nextIndex < 0 ? max : (nextIndex > max ? 0 : nextIndex);
  suggestionsEl.querySelectorAll('[data-network-suggestion-index]').forEach((btn) => {
    const selected = Number(btn.getAttribute('data-network-suggestion-index')) === activeSuggestionIndex;
    btn.classList.toggle('is-active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  filters.q.setAttribute('aria-activedescendant', `network-search-suggestion-${activeSuggestionIndex}`);
}

async function chooseSuggestion(item) {
  if (!item || !filters.q) return;
  filters.q.value = item.value || item.label || '';
  geo = emptyGeo();
  applySuggestionFilters(item);
  clearSuggestions();
  await loadListings();
}

async function fetchSuggestions() {
  if (!filters.q) return;
  const q = String(filters.q.value || '').trim();
  if (q.length < 2) {
    clearSuggestions();
    return;
  }
  const seq = ++suggestionSeq;
  try {
    const params = new URLSearchParams({ q, limit: '8' });
    const resp = await fetch(`/api/network/listings/suggestions?${params.toString()}`, { credentials: 'include' });
    const body = await resp.json().catch(() => ({}));
    if (seq !== suggestionSeq) return;
    if (!resp.ok || !body.ok) {
      clearSuggestions();
      return;
    }
    renderSuggestions(body.suggestions || []);
  } catch {
    if (seq === suggestionSeq) clearSuggestions();
  }
}

function queueSuggestions() {
  if (suggestionTimer) window.clearTimeout(suggestionTimer);
  suggestionTimer = window.setTimeout(fetchSuggestions, 170);
}

function handleSuggestionKeydown(event) {
  const open = !!(suggestionsEl && !suggestionsEl.hidden && suggestions.length);
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (!open) {
      queueSuggestions();
      return true;
    }
    updateActiveSuggestion(activeSuggestionIndex + 1);
    return true;
  }
  if (event.key === 'ArrowUp') {
    if (!open) return false;
    event.preventDefault();
    updateActiveSuggestion(activeSuggestionIndex - 1);
    return true;
  }
  if (event.key === 'Escape') {
    if (!open) return false;
    event.preventDefault();
    clearSuggestions();
    return true;
  }
  if (event.key === 'Enter' && open && activeSuggestionIndex >= 0) {
    event.preventDefault();
    chooseSuggestion(suggestions[activeSuggestionIndex]);
    return true;
  }
  return false;
}

function queryParams() {
  const p = new URLSearchParams();
  const resolvedPlace = resolvedPlaceSearchActive();
  Object.entries(filters).forEach(([key, el]) => {
    if (!el) return;
    if (el.type === 'checkbox') {
      if (el.checked) p.set(key, '1');
      return;
    }
    if (key === 'q' && (shouldUseStructuredLocationSuggestion() || resolvedPlace)) return;
    if (['city', 'state', 'postal_code'].includes(key) && resolvedPlace) return;
    const value = String(el.value || '').trim();
    if (!value) return;
    p.set(key, value);
  });
  if (hasGeo()) {
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
  const resolvedPlace = resolvedPlaceSearchActive();
  const suppressLooseSearch = shouldUseStructuredLocationSuggestion() || resolvedPlace;

  if (q && !suppressLooseSearch) out.push({ key: 'q', label: 'Search', value: q });
  if (category) out.push({ key: 'category', label: 'Category', value: categoryLabels[category] || category });
  if (!resolvedPlace && city) out.push({ key: 'city', label: 'City', value: city });
  if (!resolvedPlace && state) out.push({ key: 'state', label: 'State', value: state.toUpperCase() });
  if (!resolvedPlace && postal) out.push({ key: 'postal_code', label: 'ZIP', value: postal });
  if (filters.claimed?.checked) out.push({ key: 'claimed', label: 'Status', value: 'Owner Claimed' });
  if (filters.partner?.checked) out.push({ key: 'partner', label: 'Status', value: 'Pawket Verified Partners' });
  if (filters.supports_charm?.checked) out.push({ key: 'supports_charm', label: 'Impact', value: 'Supports CHARM' });
  if (tier) out.push({ key: 'tier', label: 'Tier', value: tierLabels[tier] || tier });
  if (radius && radius !== DEFAULT_RADIUS_MI) out.push({ key: 'radius_mi', label: 'Radius', value: `${radius} mi` });
  if (sort && sort !== DEFAULT_SORT) out.push({ key: 'sort', label: 'Sort', value: sortLabels[sort] || sort });
  if (hasGeo()) out.push({ key: 'geo', label: 'Location', value: geo.label ? `${geo.label} · ${currentRadiusLabel()}` : 'Near me' });

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
    geo = emptyGeo();
    if (selectedSuggestion?.type === 'place') selectedSuggestion = null;
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
    suggestionAppliedFilters.delete(key);
    if (key === 'q') clearSuggestionAppliedFilters();
    return;
  }
  el.value = '';
  suggestionAppliedFilters.delete(key);
  if (key === 'q') {
    geo = emptyGeo();
    clearSuggestionAppliedFilters();
  }
}

function badges(item) {
  const out = [];
  if (item.status === 'partner') {
    out.push('<span class="pp-network-badge status-partner">Pawket Verified Partner</span>');
    if (item.partner_tier) {
      out.push(`<span class="pp-network-badge tier">${esc(tierLabels[item.partner_tier] || item.partner_tier)}</span>`);
    }
  } else if (item.status === 'claimed') {
    out.push('<span class="pp-network-badge status-claimed">Owner Claimed</span>');
  } else {
    out.push('<span class="pp-network-badge status-unclaimed">Network Listing</span>');
  }
  if (item.charm_support?.enabled) out.push('<span class="pp-network-badge charm">Supports CHARM</span>');
  return out.join('');
}

function currentNominationDefaults() {
  return {
    provider_name: String(filters.q?.value || '').trim(),
    category_primary: String(filters.category?.value || '').trim(),
    city: resolvedPlaceSearchActive() ? geo.city : String(filters.city?.value || '').trim(),
    state: resolvedPlaceSearchActive() ? geo.state : String(filters.state?.value || '').trim().toUpperCase(),
    postal_code: resolvedPlaceSearchActive() ? geo.postal_code : String(filters.postal_code?.value || '').trim(),
  };
}

function activeLaunchPaths(defaults) {
  const query = defaults.provider_name.toLowerCase();
  const category = defaults.category_primary;
  const scored = launchPaths.map((path) => {
    let score = 0;
    if (category && path.categories.includes(category)) score += 3;
    if (query) {
      const priorityText = [path.title, path.eyebrow, ...(path.tags || [])].join(' ').toLowerCase();
      if (priorityText.includes(query)) score += 4;
      if (path.body.toLowerCase().includes(query)) score += 1;
    }
    return { ...path, score };
  });
  const filtered = scored.filter((path) => !category || path.categories.includes(category) || path.score > 0);
  return (filtered.length ? filtered : scored)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function launchPathActions(path) {
  return path.actions.map((action) => {
    if (action.action === 'nominate') {
      return `<button class="pp-network-chip pp-network-chip--action" type="button" data-network-focus-nomination>${esc(action.label)}</button>`;
    }
    return `<a class="pp-network-chip pp-network-chip--action" href="${esc(action.href)}">${esc(action.label)}</a>`;
  }).join('');
}

function radiusExpansionOptions() {
  const current = Number(filters.radius_mi?.value || DEFAULT_RADIUS_MI);
  return [50, 100, 250].filter((radius) => Number.isFinite(current) && radius > current).slice(0, 2);
}

function renderRadiusExpansion() {
  if (!hasGeo()) return '';
  const options = radiusExpansionOptions();
  if (!options.length) return '';
  return `
    <div class="pp-network-radius-empty">
      <div>
        <span class="pp-network-panel-kicker">Nearby search</span>
        <strong>No public listing is inside ${esc(currentRadiusLabel())} of ${esc(geo.label || 'this location')} yet.</strong>
        <p>Widen the same radius search before sending a new provider nomination.</p>
      </div>
      <div class="pp-network-chip-row">
        ${options.map((radius) => `
          <button class="pp-network-chip pp-network-chip--action" type="button" data-network-expand-radius="${radius}">Try ${radius} mi</button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderNoResults() {
  const defaults = currentNominationDefaults();
  const place = [defaults.city, defaults.state].filter(Boolean).join(', ');
  const resolvedPlace = hasGeo() ? (geo.label || place) : place;
  const contextLine = resolvedPlace
    ? `No published provider listing is live for ${esc(resolvedPlace)} in this search yet.`
    : place
    ? `No published provider listing is live for ${esc(place)} yet.`
    : 'No published provider listing matches this search yet.';
  const paths = activeLaunchPaths(defaults);
  resultsEl.innerHTML = `
    <article class="pp-network-empty-state">
      <div class="pp-network-empty-copy">
        <span class="pp-network-panel-kicker">Next Steps</span>
        <h3>Use the Network even before a local provider is listed.</h3>
        <p>${contextLine} You can still prepare for care, nominate a provider, tell us about a business, or switch to Pawket Places for parks, trails, beaches, relief areas, and pet-friendly stops.</p>
        <div class="pp-network-chip-row">
          <a class="pp-network-chip pp-network-chip--action" href="/partner-portal.html">Claim a business listing</a>
          <a class="pp-network-chip pp-network-chip--action" href="/contact.html">Become a Pawket Partner</a>
          <a class="pp-network-chip pp-network-chip--action" href="/pawket-places.html">Find pet-safe places</a>
        </div>
      </div>
      ${renderRadiusExpansion()}
      <div class="pp-network-launch-paths" aria-label="Network launch paths">
        ${paths.map((path) => `
          <section class="pp-network-launch-path">
            <div class="pp-network-card-icon" aria-hidden="true"><i class="bi ${esc(path.icon)}"></i></div>
            <div>
              <span class="pp-network-panel-kicker">${esc(path.eyebrow)}</span>
              <h4>${esc(path.title)}</h4>
              <p>${esc(path.body)}</p>
              <div class="pp-network-chip-row">${launchPathActions(path)}</div>
            </div>
          </section>
        `).join('')}
      </div>
      <form class="pp-network-nomination-form" data-network-nomination-form>
        <div class="pp-network-form-head">
          <span class="pp-network-panel-kicker">Provider nomination</span>
          <strong>Send Pet Pawket a real provider to review.</strong>
        </div>
        <label>
          <span class="pp-network-field-label">Provider or organization</span>
          <input class="pp-network-input" name="provider_name" placeholder="Business, rescue, shelter, or care team" value="${esc(defaults.provider_name)}" required />
        </label>
        <div class="pp-network-row">
          <label>
            <span class="pp-network-field-label">Category</span>
            <select class="pp-network-select" name="category_primary" required>
              <option value="">Choose category</option>
              ${categoryOptions(defaults.category_primary)}
            </select>
          </label>
          <label>
            <span class="pp-network-field-label">Website</span>
            <input class="pp-network-input" name="website_url" placeholder="https://..." />
          </label>
        </div>
        <div class="pp-network-row pp-network-row--triple">
          <label>
            <span class="pp-network-field-label">City</span>
            <input class="pp-network-input" name="city" value="${esc(defaults.city)}" required />
          </label>
          <label>
            <span class="pp-network-field-label">State</span>
            <input class="pp-network-input" name="state" maxlength="2" value="${esc(defaults.state)}" required />
          </label>
          <label>
            <span class="pp-network-field-label">ZIP</span>
            <input class="pp-network-input" name="postal_code" value="${esc(defaults.postal_code)}" />
          </label>
        </div>
        <div class="pp-network-row">
          <label>
            <span class="pp-network-field-label">Phone</span>
            <input class="pp-network-input" name="phone" placeholder="Optional" />
          </label>
          <label>
            <span class="pp-network-field-label">Your email</span>
            <input class="pp-network-input" name="nominator_email" type="email" placeholder="Optional" />
          </label>
        </div>
        <label>
          <span class="pp-network-field-label">Review note</span>
          <textarea class="pp-network-textarea pp-network-textarea--sm" name="note" placeholder="Provider details only. Do not include private pet, adoption, rescue, medical, or memorial stories."></textarea>
        </label>
        <div class="pp-network-actions">
          <button class="pp-network-btn" type="submit">Nominate provider</button>
        </div>
        <p class="pp-network-status" data-network-nomination-status></p>
      </form>
    </article>
  `;
}

function render(items = []) {
  if (!resultsEl) return;
  if (!items.length) {
    renderNoResults();
    return;
  }

  resultsEl.innerHTML = items.map((item) => {
    const city = item.location?.city || '';
    const state = item.location?.state || '';
    const hasDistance = item.distance_mi !== null && item.distance_mi !== undefined && item.distance_mi !== '';
    const distance = hasDistance ? Number(item.distance_mi) : NaN;
    const dist = Number.isFinite(distance) ? ` · ${distance.toFixed(1)} mi` : '';
    const category = categoryLabels[item.category_primary] || item.category_primary || 'Category pending';
    const slug = String(item.slug || '').trim();
    const detailHref = slug ? `/pawket-network/${encodeURIComponent(slug)}` : '#';
    const managementCta = item.status === 'unclaimed'
      ? '<span class="pp-network-chip">Claim this listing</span>'
      : item.status === 'partner'
        ? '<span class="pp-network-chip">Verified partner tools</span>'
        : '<span class="pp-network-chip">Managed by owner</span>';
    const discoveryCta = item.status === 'partner'
      ? '<span class="pp-network-chip">Partner profile</span>'
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
    if (countEl) {
      countEl.textContent = total
        ? `Showing ${shown} of ${total} Network Listings`
        : hasGeo()
          ? `No listings inside ${currentRadiusLabel()}`
          : 'Launch Desk active';
    }
    const sort = String(filters.sort?.value || DEFAULT_SORT);
    if (sortSummaryEl) {
      const nearby = hasGeo() ? ` · within ${currentRadiusLabel()} of ${geo.label || 'your location'}` : '';
      sortSummaryEl.textContent = `Sorted by ${sortLabels[sort] || sort}${nearby}.`;
    }
    setStatus(hasGeo() ? `Using ${geo.label || 'nearby location'} for distance-aware ranking.` : '');
  } catch (err) {
    setStatus(err?.message || 'Failed to load listings.');
    if (sortSummaryEl) sortSummaryEl.textContent = '';
  }
}

async function resolveSearchLocation() {
  const q = normalizeSpaces(filters.q?.value || '');
  const placeIntent = extractPlaceLookup(q);
  const city = normalizeSpaces(filters.city?.value || '');
  const state = normalizeUsState(filters.state?.value || '');
  const postal = normalizeSpaces(filters.postal_code?.value || '');
  const fieldLookup = postal || (city && state ? `${city}, ${state}` : '');
  const lookup = placeIntent?.lookup || fieldLookup;
  if (!lookup) return false;

  if (placeIntent?.category && filters.category && !String(filters.category.value || '').trim()) {
    filters.category.value = placeIntent.category;
    suggestionAppliedFilters.add('category');
  }

  if (hasGeo() && normalizeForCompare(geo.lookup) === normalizeForCompare(lookup)) {
    if (filters.sort) filters.sort.value = 'distance';
    return true;
  }

  setStatus(`Resolving ${lookup}...`);
  const location = await geocodeLookup(lookup);
  if (!location) {
    if (placeIntent) setStatus(`I couldn't resolve ${lookup}. Try a city with state, ZIP code, or a nearby address.`);
    return false;
  }

  const source = placeIntent ? 'place' : 'location_fields';
  const query = placeIntent ? q : lookup;
  setGeoLocation(location, { source, query, lookup });
  if (filters.sort) filters.sort.value = 'distance';
  if (placeIntent) {
    selectedSuggestion = {
      type: 'place',
      label: geo.label,
      value: q,
      lookup,
      city: geo.city,
      state: geo.state,
      postal_code: geo.postal_code,
      lat: geo.lat,
      lng: geo.lng,
      category: placeIntent.category || '',
    };
  }
  return true;
}

function hasTypedLocationIntent() {
  const q = normalizeSpaces(filters.q?.value || '');
  const city = normalizeSpaces(filters.city?.value || '');
  const state = normalizeUsState(filters.state?.value || '');
  const postal = normalizeSpaces(filters.postal_code?.value || '');
  return !!(extractPlaceLookup(q)?.lookup || postal || (city && state));
}

async function runSearch() {
  clearSuggestions();
  await resolveSearchLocation();
  await loadListings();
}

async function useMyLocation() {
  if (hasTypedLocationIntent()) {
    clearSuggestions();
    const resolved = await resolveSearchLocation();
    if (resolved) {
      await loadListings();
    }
    return;
  }

  if (!navigator.geolocation) {
    setStatus('Geolocation is not supported in this browser.');
    return;
  }

  setStatus('Requesting your location...');
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      setGeoLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }, { source: 'browser', label: 'Near me' });
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
        setGeoLocation(body.location, { source: 'location_fields', query, lookup: query });
        if (filters.sort) filters.sort.value = 'distance';
        await loadListings();
      } catch (err) {
        setStatus(err?.message || 'Unable to resolve location.');
      }
    },
    { enableHighAccuracy: false, maximumAge: 45_000, timeout: 9_000 }
  );
}

root.querySelectorAll('[data-network-action="search"]').forEach((btn) => {
  btn.addEventListener('click', () => runSearch());
});

filters.q?.addEventListener('input', () => {
  geo = emptyGeo();
  if (selectedSuggestion && !suggestionStillMatchesInput()) clearSuggestionAppliedFilters();
  queueSuggestions();
});
filters.q?.addEventListener('focus', () => {
  if (String(filters.q?.value || '').trim().length >= 2) queueSuggestions();
});
['city', 'state', 'postal_code'].forEach((key) => {
  filters[key]?.addEventListener('input', () => {
    if (geo.source === 'location_fields') geo = emptyGeo();
  });
});
suggestionsEl?.addEventListener('mousedown', (event) => {
  event.preventDefault();
});
suggestionsEl?.addEventListener('mouseover', (event) => {
  const btn = event.target.closest('[data-network-suggestion-index]');
  if (!btn) return;
  updateActiveSuggestion(Number(btn.getAttribute('data-network-suggestion-index')));
});
suggestionsEl?.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-network-suggestion-index]');
  if (!btn) return;
  chooseSuggestion(suggestions[Number(btn.getAttribute('data-network-suggestion-index'))]);
});
root.addEventListener('click', (event) => {
  if (event.target.closest('[data-network-autocomplete]')) return;
  clearSuggestions();
});

root.querySelector('[data-network-action="near-me"]')?.addEventListener('click', () => useMyLocation());
root.querySelector('[data-network-action="reset"]')?.addEventListener('click', () => {
  Object.values(filters).forEach((el) => {
    if (!el) return;
    if (el.type === 'checkbox') el.checked = false;
    else if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  geo = emptyGeo();
  if (filters.radius_mi) filters.radius_mi.value = DEFAULT_RADIUS_MI;
  if (filters.sort) filters.sort.value = DEFAULT_SORT;
  selectedSuggestion = null;
  suggestionAppliedFilters.clear();
  clearSuggestions();
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

resultsEl?.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-network-nomination-form]');
  if (!form) return;
  event.preventDefault();
  const status = form.querySelector('[data-network-nomination-status]');
  const submit = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const payload = {
    provider_name: formData.get('provider_name'),
    category_primary: formData.get('category_primary'),
    city: formData.get('city'),
    state: formData.get('state'),
    postal_code: formData.get('postal_code'),
    website_url: formData.get('website_url'),
    phone: formData.get('phone'),
    nominator_email: formData.get('nominator_email'),
    note: formData.get('note'),
    source_path: location.pathname,
  };
  if (status) status.textContent = 'Submitting nomination...';
  if (submit) submit.disabled = true;
  try {
    const resp = await fetch('/api/network/nominations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) throw new Error(body?.error || 'Unable to submit nomination.');
    if (status) status.textContent = 'Nomination saved for Pawket Network review.';
    form.reset();
  } catch (err) {
    if (status) status.textContent = err?.message || 'Unable to submit nomination.';
  } finally {
    if (submit) submit.disabled = false;
  }
});

resultsEl?.addEventListener('click', (event) => {
  const radiusBtn = event.target.closest('[data-network-expand-radius]');
  if (radiusBtn) {
    const radius = Number(radiusBtn.getAttribute('data-network-expand-radius'));
    if (Number.isFinite(radius) && filters.radius_mi) {
      filters.radius_mi.value = String(radius);
      if (filters.sort) filters.sort.value = 'distance';
      loadListings();
    }
    return;
  }
  const focusBtn = event.target.closest('[data-network-focus-nomination]');
  if (!focusBtn) return;
  const firstField = resultsEl.querySelector('[data-network-nomination-form] input[name="provider_name"]');
  firstField?.focus();
});

Object.values(filters).forEach((el) => {
  if (!el || el.type === 'checkbox') return;
  el.addEventListener('keydown', (event) => {
    if (el === filters.q && handleSuggestionKeydown(event)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      clearSuggestions();
      runSearch();
    }
  });
});

loadListings();
