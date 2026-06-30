// /public/pawketFirstPartyApps.js
import {
  escapeAttr,
  escapeHtml,
  safeIconClass
} from './pawketAppRuntime.js';

const CARE_QUICK_CHECKS_KEY = 'pp-widget-reminders';
const CORE_MEMORY_KEY = 'pp-widget-core-memories';

const CARE_QUICK_CHECKS = [
  { id: 'feed', label: 'Feed check-in', icon: 'bi-egg-fried' },
  { id: 'water', label: 'Refresh water', icon: 'bi-droplet' },
  { id: 'walk', label: 'Play or walk break', icon: 'bi-signpost-split' },
  { id: 'med', label: 'Wellness / meds check', icon: 'bi-heart-pulse' }
];

export const pawketConnectorProviders = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Add care reminders to a calendar you already use.',
    category: 'schedule',
    icon: 'bi-calendar3',
    statusLabel: 'Calendar'
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Keep community notices close without exposing private pet notes.',
    category: 'community',
    icon: 'bi-discord',
    statusLabel: 'Community'
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Save approved story outlines or care templates in your workspace.',
    category: 'workspace',
    icon: 'bi-journal-text',
    statusLabel: 'Workspace'
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Prepare simple automations for orders, reminders, and shared links.',
    category: 'automation',
    icon: 'bi-lightning-charge',
    statusLabel: 'Automation'
  }
];

function esc(value) {
  return escapeHtml(value);
}

function attr(value) {
  return escapeAttr(value);
}

function storage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

function readJsonStorage(key, fallback) {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try { storage()?.setItem(key, JSON.stringify(value)); } catch {}
}

function readCareQuickCheckIds() {
  const parsed = readJsonStorage(CARE_QUICK_CHECKS_KEY, []);
  if (!Array.isArray(parsed)) return [];
  const valid = new Set(CARE_QUICK_CHECKS.map((task) => task.id));
  return parsed.map((id) => String(id || '')).filter((id) => valid.has(id));
}

function careQuickCheckStats(ids = readCareQuickCheckIds()) {
  const valid = new Set(CARE_QUICK_CHECKS.map((task) => task.id));
  const doneIds = [...new Set((Array.isArray(ids) ? ids : [])
    .map((id) => String(id || ''))
    .filter((id) => valid.has(id)))];
  writeJsonStorage(CARE_QUICK_CHECKS_KEY, doneIds);
  return {
    doneIds,
    doneSet: new Set(doneIds),
    doneCount: doneIds.length,
    total: CARE_QUICK_CHECKS.length
  };
}

function loadCoreMemories() {
  const parsed = readJsonStorage(CORE_MEMORY_KEY, []);
  return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 12) : [];
}

function readPalsMood() {
  const raw = Number(storage()?.getItem('pp-widget-pals-mood') || 60);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 60;
}

function pct(value, fallback = 50) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return Math.max(0, Math.min(100, fallback));
  return Math.max(0, Math.min(100, raw));
}

function randomFrom(arr = []) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function rootOf(context = {}) {
  return context.root || document;
}

async function fetchJson(context = {}, url) {
  if (typeof context.fetchJson === 'function') return await context.fetchJson(url);
  try {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function contextPets(context = {}, petsRes = null) {
  if (typeof context.helpers?.cachePetsResponse === 'function') {
    return context.helpers.cachePetsResponse(petsRes);
  }
  if (Array.isArray(petsRes?.pets)) return petsRes.pets;
  return [];
}

function emptyCareMetrics() {
  return {
    loaded: false,
    signedIn: false,
    journalCount: 0,
    coreMemoryCount: 0,
    handoffTargets: [],
    entries: [],
    coreEntries: [],
    latest: null,
    latestCore: null
  };
}

function fallbackCareJournalItems(entries = [], emptyText = 'No journal entries yet.') {
  const rows = Array.isArray(entries) ? entries.filter(Boolean).slice(0, 4) : [];
  if (!rows.length) return `<li>${esc(emptyText)}</li>`;
  return rows.map((entry) => `
    <li>
      <strong>${esc(entry.title || entry.entryType || 'Journal entry')}</strong>
      <span>${esc(entry.petName || 'Private journal')}</span>
    </li>
  `).join('');
}

function careJournalTitle(context = {}, entry = {}) {
  if (typeof context.helpers?.careJournalTitle === 'function') return context.helpers.careJournalTitle(entry);
  return entry.title || entry.entryType || 'Journal entry';
}

function renderCareJournalItems(context = {}, entries = [], emptyText = 'No journal entries yet.') {
  if (typeof context.helpers?.renderCareJournalItems === 'function') {
    return context.helpers.renderCareJournalItems(entries, emptyText);
  }
  return fallbackCareJournalItems(entries, emptyText);
}

function formatCareJournalDate(context = {}, value = '') {
  if (typeof context.helpers?.formatCareJournalDate === 'function') return context.helpers.formatCareJournalDate(value);
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return '';
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time));
  } catch {
    return '';
  }
}

async function ensureCareJournalMetrics(context = {}, force = false) {
  if (typeof context.helpers?.ensureCareJournalMetrics === 'function') {
    return await context.helpers.ensureCareJournalMetrics(force);
  }
  return emptyCareMetrics();
}

function renderWidgetAppHero({
  id = '',
  icon = 'bi-stars',
  eyebrow = 'Pawket app',
  title = 'App',
  body = '',
  chips = [],
  meter = null
} = {}) {
  const meterPct = pct(meter?.value, 50);
  const chipHtml = Array.isArray(chips) && chips.length
    ? `<div class="pp-widget-app-hero-chips">${chips.slice(0, 4).map((chip) => `<span>${esc(chip)}</span>`).join('')}</div>`
    : '';
  const meterHtml = meter
    ? `
      <div class="pp-widget-app-meter">
        <div class="pp-widget-app-meter-head">
          <span>${esc(meter.label || 'Progress')}</span>
          <strong>${esc(meter.valueLabel || `${Math.round(meterPct)}%`)}</strong>
        </div>
        <div class="pp-widget-app-meter-track"><span style="width:${meterPct}%;"></span></div>
      </div>
    `
    : '';

  return `
    <section class="pp-widget-app-hero" data-widget-app-hero="${attr(id)}">
      <div class="pp-widget-app-hero-main">
        <span class="pp-widget-app-hero-icon"><i class="bi ${safeIconClass(icon)}" aria-hidden="true"></i></span>
        <div>
          <span class="pp-widget-app-eyebrow">${esc(eyebrow)}</span>
          <h4>${esc(title)}</h4>
          ${body ? `<p>${esc(body)}</p>` : ''}
        </div>
      </div>
      ${chipHtml}
      ${meterHtml}
    </section>
  `;
}

function productPriceLabel(item = {}) {
  if (typeof item.priceLabel === 'string' && item.priceLabel) return item.priceLabel;
  const min = item.priceRange?.minVariantPrice;
  const rawAmount = Number(min?.amount);
  return Number.isFinite(rawAmount) ? `$${rawAmount.toFixed(2)}` : 'Open';
}

function productHref(item = {}) {
  if (item.href) return item.href;
  const handle = String(item.handle || '').trim();
  if (handle) return `/product.html?handle=${encodeURIComponent(handle)}`;
  return '/shop.html';
}

function renderShopApp() {
  return `
    ${renderWidgetAppHero({
      id: 'loop',
      icon: 'bi-bag-heart',
      eyebrow: 'Pawket Shop',
      title: 'Shop, save, and share',
      body: 'Build a box, browse useful picks, and keep Pawket Passes close.',
      chips: ['Packs', 'Packets', 'Picks', 'Passes'],
      meter: { label: 'Shop path', value: 72, valueLabel: 'Ready' }
    })}
    <section class="pp-app-experience pp-shop-wallet pp-box-picker pp-pass-wallet" data-widget-app-hero="loop">
      <div class="pp-shop-wallet-grid">
        <div class="pp-box-stage">
          <span class="pp-box-lid" aria-hidden="true"></span>
          <span class="pp-box-badge">Box picker</span>
          <strong data-app-subs-spotlight>Loading featured picks...</strong>
          <em><span data-app-subs-price>--</span> spotlight</em>
        </div>
        <article class="pp-pass-card pp-pass-card--main">
          <span class="pp-pass-card-kicker">Pawket Pass</span>
          <strong data-app-loop-main-code>Ready to send</strong>
          <p data-app-loop-next>Send a gift, save a useful link, or keep a Pet Pawket visit moving.</p>
          <div class="pp-pass-route" aria-label="Pass route">
            <span>Shop</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
            <span>Pass</span>
            <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
            <span>Return</span>
          </div>
        </article>
      </div>
      <div class="pp-box-options pp-box-options--shop" aria-label="Pawket shop paths">
        <a href="/packs.html"><i class="bi bi-box-seam" aria-hidden="true"></i><span>Packs</span></a>
        <a href="/packets.html"><i class="bi bi-bag-heart" aria-hidden="true"></i><span>Packets</span></a>
        <a href="/picks.html"><i class="bi bi-stars" aria-hidden="true"></i><span>Picks</span></a>
        <a href="/loop.html"><i class="bi bi-send" aria-hidden="true"></i><span>Passes</span></a>
      </div>
      <div class="pp-shop-wallet-shelves">
        <div class="pp-box-shelf" data-app-subs-list>
          <article class="pp-box-product-card">Loading featured products...</article>
        </div>
        <div class="pp-pass-wallet-pocket" data-app-loop-list>
          <article class="pp-pass-mini-card">No passes yet. Shop, gift, or save a pass to start.</article>
        </div>
      </div>
      <article class="pp-pass-note">
        <span><i class="bi bi-heart-pulse" aria-hidden="true"></i> CHARM note</span>
        <p data-app-loop-story>CHARM updates will appear when they are ready to share.</p>
      </article>
    </section>
    <div class="pp-widget-app-actions">
      <a class="is-primary" href="/packs.html">Build a Pack</a>
      <button type="button" data-app-loop-share>Send a Pass</button>
      <button type="button" data-app-subs-spin>Shuffle pick</button>
      <a href="/loop.html">Pass hub</a>
    </div>
    <div class="pp-widget-app-note"><span data-app-subs-count>--</span> featured picks loaded. Passes never expose private pet notes.</div>
  `;
}

function renderPalsApp() {
  const mood = readPalsMood();
  return `
    <section class="pp-app-experience pp-pals-studio" data-widget-app-hero="pals">
      <article class="pp-pal-certificate">
        <span class="pp-pal-cert-label">Private keepsake</span>
        <div class="pp-pal-medallion" aria-hidden="true">
          <i class="bi bi-stars"></i>
        </div>
        <h4 data-app-pals-focus>Start with a pet you love.</h4>
        <p data-app-pals-summary>Choose a profile or favorite memory, then make a private Pal when it feels right.</p>
        <div class="pp-heartcode-ribbon">
          <span>HeartCode</span>
          <strong>Created with your Pal</strong>
        </div>
      </article>
      <div class="pp-pal-studio-side">
        <div class="pp-pal-studio-meter">
          <div>
            <span>Pal warmth</span>
            <strong data-app-pals-mood-value>${mood}%</strong>
          </div>
          <input type="range" min="0" max="100" step="5" value="${mood}" data-app-pals-mood />
        </div>
        <div class="pp-pal-shelf" data-app-pals-list>
          <article class="pp-pal-shelf-card">Loading pet profiles...</article>
        </div>
        <div class="pp-pal-studio-count">
          <span><strong data-app-pals-count>--</strong> profiles</span>
          <span data-app-pals-species>Private by default</span>
        </div>
      </div>
    </section>
    <div class="pp-widget-app-actions">
      <a class="is-primary" href="/pals.html">Make a private Pal</a>
      <a href="/account.html#account-pets">Pet profiles</a>
      <button type="button" data-app-pals-random>New Pal idea</button>
    </div>
    <div class="pp-widget-app-note">You choose if a story should ever be shared.</div>
  `;
}

function renderPetWorkspaceApp() {
  const stats = careQuickCheckStats();
  const memories = loadCoreMemories();
  return `
    ${renderWidgetAppHero({
      id: 'pet-workspace',
      icon: 'bi-house-heart',
      eyebrow: 'Pet Workspace',
      title: 'Your private pet home',
      body: 'Care checks, journals, favorite memories, and Pal starting points in one place.',
      chips: ['Pets', 'Care', 'Memories', 'Pals'],
      meter: { label: 'Today', value: (stats.doneCount / stats.total) * 100, valueLabel: `${stats.doneCount}/${stats.total}` }
    })}
    <section class="pp-app-experience pp-pet-workspace" data-widget-app-hero="pet-workspace">
      <div class="pp-workspace-grid pp-workspace-grid--top">
        <article class="pp-workspace-card pp-workspace-card--primary">
          <span class="pp-workspace-kicker">Private account</span>
          <strong data-app-workspace-summary>Loading pet workspace...</strong>
          <p data-app-care-latest>Loading private journal summary...</p>
          <div class="pp-widget-care-chip-row" data-app-care-handoffs></div>
        </article>
        <article class="pp-workspace-card">
          <span class="pp-workspace-kicker">Today</span>
          <div class="pp-workspace-stat">
            <strong data-app-reminders-done>${stats.doneCount}</strong>
            <span>of ${stats.total} checks</span>
          </div>
          <ul class="pp-widget-app-list pp-workspace-checks" data-app-reminders-list>
            ${CARE_QUICK_CHECKS.map((task) => `
              <li>
                <label>
                  <input type="checkbox" data-app-reminder-task="${attr(task.id)}" ${stats.doneSet.has(task.id) ? 'checked' : ''} />
                  <span><i class="bi ${safeIconClass(task.icon)}" aria-hidden="true"></i>${esc(task.label)}</span>
                </label>
              </li>
            `).join('')}
          </ul>
        </article>
      </div>
      <div class="pp-widget-app-kpis pp-widget-app-kpis--compact">
        <div class="pp-widget-app-kpi"><strong data-app-workspace-pet-count>--</strong><span>Pet profiles</span></div>
        <div class="pp-widget-app-kpi"><strong data-app-workspace-journals>--</strong><span>Journal entries</span></div>
        <div class="pp-widget-app-kpi"><strong data-app-workspace-memories>${memories.length}</strong><span>Favorite memories</span></div>
      </div>
      <div class="pp-workspace-grid">
        <article class="pp-workspace-card">
          <div class="pp-workspace-card-head">
            <span class="pp-workspace-kicker">Care journal</span>
            <a href="/account.html#account-pets">Open</a>
          </div>
          <ul class="pp-widget-app-list pp-widget-care-journal-list" data-app-care-journal-list>
            <li>Loading recent pet journal entries...</li>
          </ul>
        </article>
        <article class="pp-workspace-card">
          <div class="pp-workspace-card-head">
            <span class="pp-workspace-kicker">Favorite memory</span>
            <button type="button" data-app-traits-random>New prompt</button>
          </div>
          <p class="pp-workspace-focus" data-app-traits-focus>Loading a memory prompt...</p>
          <ul class="pp-widget-app-list" data-app-traits-list>
            <li>Loading pet memories...</li>
          </ul>
        </article>
      </div>
    </section>
    <div class="pp-widget-app-actions">
      <a class="is-primary" href="/account.html#account-pets">Open journals</a>
      <a href="/pals.html">Make a private Pal</a>
      <button type="button" data-app-reminders-celebrate>Save quick check-in</button>
      <button type="button" data-app-memory-lock>Draft prompt</button>
    </div>
    <div class="pp-widget-app-note">Pet Workspace keeps private care notes, favorite memories, and Pal ideas together.</div>
  `;
}

function renderStoriesApp() {
  return `
    <section class="pp-app-experience pp-storybook" data-widget-app-hero="stories">
      <article class="pp-storybook-page pp-storybook-page--spark">
        <span class="pp-storybook-kicker">Story spark</span>
        <h4>Something worth sharing starts gently.</h4>
        <p data-app-story-spark>Reviewed story sparks will appear after approved public updates.</p>
      </article>
      <div class="pp-storybook-tabs" aria-label="Story spaces">
        <a href="/community.html"><i class="bi bi-chat-heart" aria-hidden="true"></i> Pawprints</a>
        <a href="/charm.html"><i class="bi bi-heart-pulse" aria-hidden="true"></i> CHARM</a>
        <a href="/pals.html"><i class="bi bi-stars" aria-hidden="true"></i> Pals</a>
      </div>
      <div class="pp-storybook-feed" data-app-stories-list>
        <article class="pp-storybook-note">No public updates yet.</article>
      </div>
      <aside class="pp-storybook-privacy">
        <i class="bi bi-lock" aria-hidden="true"></i>
        <span>Private notes stay private. Public moments are shared by choice.</span>
      </aside>
    </section>
    <div class="pp-widget-app-actions">
      <button type="button" data-app-story-refresh>New spark</button>
      <a class="is-primary" href="/charm.html">Open CHARM</a>
      <a href="/community.html">Town Square</a>
    </div>
    <div class="pp-widget-app-note"><span data-app-stories-count>0</span> public updates loaded. <span data-app-stories-active>Shared when ready</span></div>
  `;
}

function renderSparkFromStories(context = {}) {
  const root = rootOf(context);
  const sparkEl = root.querySelector('[data-app-story-spark]');
  const story = randomFrom(context.data?.stories || []);
  if (!sparkEl) return;
  if (!story) {
    sparkEl.textContent = 'No public story is ready yet. Start with your private story or open CHARM.';
    return;
  }
  const title = story.title || story.name || 'Rescue story';
  const detail = story.summary || story.snippet || story.description || 'Community impact update.';
  sparkEl.textContent = `${title}: ${detail}`;
}

function renderRandomSubSpotlight(context = {}) {
  const root = rootOf(context);
  const spotEl = root.querySelector('[data-app-subs-spotlight]');
  const priceEl = root.querySelector('[data-app-subs-price]');
  const item = randomFrom(context.data?.featured || []);
  if (!spotEl || !priceEl) return;
  if (!item) {
    spotEl.textContent = 'No pack spotlight loaded yet.';
    priceEl.textContent = '--';
    return;
  }
  spotEl.textContent = item.title || 'Featured pick';
  priceEl.textContent = productPriceLabel(item);
}

function renderRandomTraitFocus(context = {}) {
  const root = rootOf(context);
  const focusEl = root.querySelector('[data-app-traits-focus]');
  const pet = randomFrom(context.data?.pets || []);
  const memories = loadCoreMemories();
  const metrics = context.data?.journalMetrics || emptyCareMetrics();
  if (!focusEl) return;
  if (metrics.latestCore) {
    const title = careJournalTitle(context, metrics.latestCore);
    const petName = metrics.latestCore.petName || 'your pet';
    focusEl.textContent = `Latest favorite memory: ${petName} - ${title}.`;
    return;
  }
  if (metrics.latest) {
    const title = careJournalTitle(context, metrics.latest);
    const petName = metrics.latest.petName || 'your pet';
    focusEl.textContent = `Latest journal moment: ${petName} - ${title}. Mark it as a favorite memory if it feels meaningful.`;
    return;
  }
  if (!pet) {
    focusEl.textContent = memories.length
      ? `Latest saved memory: ${memories[0].petName || 'Your pet'} - ${memories[0].label || 'Story moment'}`
      : 'Add pet profiles to unlock memory prompts.';
    return;
  }
  const species = String(pet.species || '').toLowerCase();
  const prompt = species.includes('cat')
    ? 'save a cozy observation, favorite perch, or trust-building routine.'
    : 'save a brave moment, scent-game win, or care breakthrough.';
  focusEl.textContent = `${pet.name || 'Pet profile'} memory prompt: ${prompt}`;
}

function renderRandomPalProfile(context = {}) {
  const root = rootOf(context);
  const listEl = root.querySelector('[data-app-pals-list]');
  const pets = context.data?.pets || [];
  if (!listEl) return;
  if (!pets.length) {
    listEl.innerHTML = '<article class="pp-pal-shelf-card">Create a pet profile to start your first Pal idea.</article>';
    return;
  }
  const pet = randomFrom(pets);
  const item = document.createElement('article');
  item.className = 'pp-pal-shelf-card is-new';
  item.innerHTML = `
    <span>${esc(pet.species || 'Pet profile')}</span>
    <strong>${esc(pet.name || 'Pet')} Pal idea</strong>
    <em>Choose one gentle trait, memory, or care ritual.</em>
  `;
  listEl.prepend(item);
  const items = listEl.querySelectorAll('.pp-pal-shelf-card');
  if (items.length > 5) items[items.length - 1].remove();
}

async function hydrateLoopApp(context = {}) {
  const root = rootOf(context);
  const [summary, story] = await Promise.all([
    fetchJson(context, '/api/loop/me'),
    fetchJson(context, '/api/loop/impact/random')
  ]);

  const storyEl = root.querySelector('[data-app-loop-story]');
  const nextEl = root.querySelector('[data-app-loop-next]');
  const listEl = root.querySelector('[data-app-loop-list]');
  const mainCodeEl = root.querySelector('[data-app-loop-main-code]');
  if (summary?.ok) {
    const sent = Array.isArray(summary.sentTokens) ? summary.sentTokens : [];
    if (context.runtimeState?.dockStatusCache) {
      context.runtimeState.dockStatusCache.loopLoaded = true;
      context.runtimeState.dockStatusCache.loopSummary = summary;
    }
    if (nextEl) {
      const recent = sent[0];
      nextEl.textContent = recent?.code
        ? `Latest pass ${recent.code} is active. Share it with someone next.`
        : 'Shop, gift, or save a pass to start.';
    }
    if (mainCodeEl) mainCodeEl.textContent = sent[0]?.code || 'Ready to send';
    if (listEl) {
      listEl.innerHTML = sent.length
        ? sent.slice(0, 4).map((token) => {
          const chainLength = Math.max(1, Math.floor(Number(token.chainLength) || 1));
          return `
            <article class="pp-pass-mini-card">
              <span>${esc(token.code || 'PASS')}</span>
              <strong>${chainLength} connected</strong>
            </article>
          `;
        }).join('')
        : '<article class="pp-pass-mini-card">No passes yet. Shop, gift, or save a pass to start.</article>';
    }
  } else {
    if (nextEl) nextEl.textContent = 'Sign in to load your live pass summary.';
    if (mainCodeEl) mainCodeEl.textContent = 'Sign in for wallet';
    if (listEl) listEl.innerHTML = '<article class="pp-pass-mini-card">Pass wallet is available after sign-in.</article>';
  }

  if (storyEl) {
    const s = story?.story;
    storyEl.textContent = s
      ? `${s.title || 'Impact update'} - ${s.body || s.summary || s.description || 'Rescue progress in motion.'}`
      : 'Rescue story coming into view.';
  }
}

async function hydratePalsApp(context = {}) {
  const root = rootOf(context);
  const petsRes = await fetchJson(context, '/api/pets');
  const pets = contextPets(context, petsRes);
  if (context.data) context.data.pets = pets;

  const countEl = root.querySelector('[data-app-pals-count]');
  const speciesEl = root.querySelector('[data-app-pals-species]');
  const listEl = root.querySelector('[data-app-pals-list]');
  const focusEl = root.querySelector('[data-app-pals-focus]');
  const summaryEl = root.querySelector('[data-app-pals-summary]');
  if (countEl) countEl.textContent = String(pets.length);
  const dogs = pets.filter((p) => String(p.species || '').toLowerCase().includes('dog')).length;
  const cats = pets.filter((p) => String(p.species || '').toLowerCase().includes('cat')).length;
  if (speciesEl) speciesEl.textContent = pets.length ? `${dogs} dog / ${cats} cat` : 'Private by default';
  const first = pets[0];
  if (focusEl) focusEl.textContent = first ? `${first.name || 'Your pet'} could become a Pal.` : 'Start with a pet you love.';
  if (summaryEl) {
    summaryEl.textContent = first
      ? 'Pick one favorite trait, memory, or care ritual. The Pal stays private unless you choose otherwise.'
      : 'Add a pet profile or favorite memory, then make a private Pal when it feels right.';
  }
  if (listEl) {
    listEl.innerHTML = pets.length
      ? pets.slice(0, 4).map((pet) => `
        <article class="pp-pal-shelf-card">
          <span>${esc(pet.species || 'Pet profile')}</span>
          <strong>${esc(pet.name || 'Pet')}</strong>
          <em>Ready for a keepsake idea</em>
        </article>
      `).join('')
      : '<article class="pp-pal-shelf-card">No pet profiles yet. Add one in Account to start your first Pal idea.</article>';
  }
}

async function hydratePetWorkspaceApp(context = {}) {
  const root = rootOf(context);
  const petsRes = await fetchJson(context, '/api/pets');
  const pets = contextPets(context, petsRes);
  if (context.data) context.data.pets = pets;
  const metrics = await ensureCareJournalMetrics(context, true);
  const memories = loadCoreMemories();
  const signedIn = context.runtimeState?.dockStatusCache?.petsSignedIn ?? metrics.signedIn;
  const petCountEl = root.querySelector('[data-app-workspace-pet-count]');
  const journalCountEl = root.querySelector('[data-app-workspace-journals]');
  const memoryCountEl = root.querySelector('[data-app-workspace-memories]');
  const summaryEl = root.querySelector('[data-app-workspace-summary]');
  const latestEl = root.querySelector('[data-app-care-latest]');
  const handoffsEl = root.querySelector('[data-app-care-handoffs]');
  const journalListEl = root.querySelector('[data-app-care-journal-list]');
  const traitsListEl = root.querySelector('[data-app-traits-list]');

  if (petCountEl) petCountEl.textContent = String(pets.length);
  if (journalCountEl) journalCountEl.textContent = metrics.signedIn ? String(metrics.journalCount) : '--';
  if (memoryCountEl) memoryCountEl.textContent = metrics.signedIn ? String(metrics.coreMemoryCount) : String(memories.length);
  if (summaryEl) {
    if (!signedIn) summaryEl.textContent = 'Sign in to load pet journals.';
    else if (!pets.length) summaryEl.textContent = 'Add a pet profile to begin.';
    else summaryEl.textContent = `${pets.length} pet ${pets.length === 1 ? 'profile' : 'profiles'} in your workspace.`;
  }
  if (latestEl) {
    if (!signedIn) {
      latestEl.textContent = 'Sign in to load private pet journals and favorite memories.';
    } else if (!pets.length) {
      latestEl.textContent = 'Add a pet profile to start a care journal.';
    } else if (!metrics.journalCount) {
      latestEl.textContent = 'No journal entries yet.';
    } else {
      const latest = metrics.latest;
      const title = careJournalTitle(context, latest);
      const date = formatCareJournalDate(context, latest.occurredAt || latest.createdAt);
      latestEl.textContent = `Latest: ${title}${latest.petName ? ` for ${latest.petName}` : ''}${date ? ` (${date})` : ''}.`;
    }
  }
  if (handoffsEl) {
    if (typeof context.helpers?.renderCareHandoffChips === 'function') {
      handoffsEl.innerHTML = context.helpers.renderCareHandoffChips(metrics.handoffTargets, signedIn ? 'Private by default' : 'Sign in');
    } else {
      handoffsEl.innerHTML = '<span class="pp-care-handoff-chip">Private by default</span>';
    }
  }
  if (journalListEl) {
    let emptyText = 'No journal entries yet.';
    if (!signedIn) emptyText = 'Journal summary is available after sign-in.';
    else if (!pets.length) emptyText = 'Add a pet profile before saving journal entries.';
    journalListEl.innerHTML = renderCareJournalItems(context, metrics.entries, emptyText);
  }
  if (traitsListEl) {
    if (!signedIn) {
      traitsListEl.innerHTML = memories.length
        ? memories.slice(0, 4).map((memory) => `<li>${esc(memory.petName || 'Your pet')} - ${esc(memory.label || 'Local memory draft')}</li>`).join('')
        : '<li>Sign in to load favorite memories.</li>';
    } else if (metrics.coreEntries.length) {
      traitsListEl.innerHTML = renderCareJournalItems(context, metrics.coreEntries, 'No favorite memories marked yet.');
    } else if (memories.length) {
      traitsListEl.innerHTML = memories.slice(0, 4).map((memory) => `<li>${esc(memory.petName || 'Your pet')} - ${esc(memory.label || 'Local memory draft')}</li>`).join('');
    } else if (pets.length) {
      traitsListEl.innerHTML = pets.slice(0, 4).map((pet) => `<li>${esc(pet.name || 'Pet')} - mark a favorite journal memory when ready</li>`).join('');
    } else {
      traitsListEl.innerHTML = '<li>No pet profiles yet.</li>';
    }
  }
  renderRandomTraitFocus(context);
  context.helpers?.updateDockStatusStrip?.('care');
  context.helpers?.hydrateCarePanel?.();
}

async function hydrateStoriesApp(context = {}) {
  const root = rootOf(context);
  const [storiesRes, activeRes] = await Promise.all([
    fetchJson(context, '/api/loop/impact?limit=5'),
    fetchJson(context, '/api/loop/impact/active')
  ]);

  const stories = Array.isArray(storiesRes?.stories) ? storiesRes.stories : [];
  if (context.data) context.data.stories = stories;
  if (context.runtimeState?.dockStatusCache) {
    context.runtimeState.dockStatusCache.impactLoaded = true;
    context.runtimeState.dockStatusCache.impactStories = stories;
    context.runtimeState.dockStatusCache.activeCase = activeRes?.activeCase || null;
  }
  const countEl = root.querySelector('[data-app-stories-count]');
  const activeEl = root.querySelector('[data-app-stories-active]');
  const listEl = root.querySelector('[data-app-stories-list]');
  if (countEl) countEl.textContent = String(stories.length || 0);
  if (activeEl) activeEl.textContent = activeRes?.activeCase ? 'CHARM has an active update.' : 'Shared when ready';
  if (listEl) {
    listEl.innerHTML = stories.length
      ? stories.slice(0, 4).map((story) => `
        <article class="pp-storybook-note">
          <span>Shared update</span>
          <strong>${esc(story.title || 'Impact update')}</strong>
        </article>
      `).join('')
      : '<article class="pp-storybook-note">No public updates yet.</article>';
  }
  renderSparkFromStories(context);
}

async function hydrateSubsApp(context = {}) {
  const root = rootOf(context);
  const featuredRes = await fetchJson(context, '/api/products/featured?limit=8');
  const featured = Array.isArray(featuredRes?.items) ? featuredRes.items : [];
  if (context.data) context.data.featured = featured;
  if (context.runtimeState?.dockStatusCache) {
    context.runtimeState.dockStatusCache.productsLoaded = true;
    context.runtimeState.dockStatusCache.featured = featured;
  }
  const countEl = root.querySelector('[data-app-subs-count]');
  const listEl = root.querySelector('[data-app-subs-list]');
  if (countEl) countEl.textContent = String(featured.length || 0);
  if (listEl) {
    listEl.innerHTML = featured.length
      ? featured.slice(0, 4).map((item) => {
        const amount = productPriceLabel(item);
        const href = productHref(item);
        return `
          <a class="pp-box-product-card" href="${attr(href)}">
            <span>${esc(amount)}</span>
            <strong>${esc(item.title || 'Featured pick')}</strong>
          </a>
        `;
      }).join('')
      : '<article class="pp-box-product-card">No featured products loaded yet.</article>';
  }
  renderRandomSubSpotlight(context);
}

async function hydrateShopApp(context = {}) {
  await Promise.allSettled([
    hydrateLoopApp(context),
    hydrateSubsApp(context)
  ]);
}

export const firstPartyPawketApps = [
  {
    manifest: {
      id: 'loop',
      name: 'Pawket Shop',
      shortName: 'Shop',
      description: 'Build boxes, browse picks, and manage Pawket Passes.',
      icon: 'bi-bag-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock', 'standalone'],
      dataScopes: ['products:featured', 'passes:summary', 'charm:public_updates'],
      actionScopes: ['navigate', 'open_product', 'send_pass'],
      privacyLabel: 'Product discovery is public; pass summaries do not expose private pet notes.',
      entry: 'firstPartyPawketApps.loop'
    },
    render: renderShopApp,
    hydrate: hydrateShopApp,
    actions: { shufflePick: renderRandomSubSpotlight }
  },
  {
    manifest: {
      id: 'pals',
      name: 'Pawket Pals',
      shortName: 'Pals',
      description: 'Create private Pal keepsakes from pets and memories.',
      icon: 'bi-stars',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock', 'standalone'],
      dataScopes: ['pets:summary', 'pals:private_summary'],
      actionScopes: ['open_pal_creator', 'navigate'],
      privacyLabel: 'Private Pal source details stay private unless shared by choice.',
      entry: 'firstPartyPawketApps.pals'
    },
    render: renderPalsApp,
    hydrate: hydratePalsApp,
    actions: { randomProfile: renderRandomPalProfile }
  },
  {
    manifest: {
      id: 'pet-workspace',
      name: 'Pet Workspace',
      shortName: 'Home',
      description: 'Private pets, care, favorite memories, and Pal starting points.',
      icon: 'bi-house-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock', 'standalone'],
      dataScopes: ['pets:summary', 'pals:private_summary', 'dock:preferences'],
      actionScopes: ['navigate', 'open_pal_creator', 'open_story_composer'],
      privacyLabel: 'Private pet and journal details stay in account surfaces.',
      entry: 'firstPartyPawketApps.petWorkspace'
    },
    render: renderPetWorkspaceApp,
    hydrate: hydratePetWorkspaceApp,
    actions: { randomFocus: renderRandomTraitFocus }
  },
  {
    manifest: {
      id: 'reminders',
      name: 'Pet Workspace',
      shortName: 'Home',
      description: 'Legacy care route for Pet Workspace.',
      icon: 'bi-house-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock'],
      dataScopes: ['pets:summary', 'pals:private_summary', 'dock:preferences'],
      actionScopes: ['navigate', 'open_pal_creator', 'open_story_composer'],
      privacyLabel: 'Private pet and journal details stay in account surfaces.',
      entry: 'firstPartyPawketApps.petWorkspace',
      legacyAliasFor: 'pet-workspace'
    },
    render: renderPetWorkspaceApp,
    hydrate: hydratePetWorkspaceApp,
    actions: { randomFocus: renderRandomTraitFocus }
  },
  {
    manifest: {
      id: 'stories',
      name: 'Stories',
      shortName: 'Stories',
      description: 'Reviewed public moments and CHARM updates.',
      icon: 'bi-chat-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock', 'standalone'],
      dataScopes: ['stories:public', 'charm:public_updates'],
      actionScopes: ['navigate', 'open_story_composer'],
      privacyLabel: 'Only reviewed public story summaries appear here.',
      entry: 'firstPartyPawketApps.stories'
    },
    render: renderStoriesApp,
    hydrate: hydrateStoriesApp,
    actions: { refreshSpark: renderSparkFromStories }
  },
  {
    manifest: {
      id: 'subs',
      name: 'Pawket Shop',
      shortName: 'Shop',
      description: 'Legacy Packs + Picks route for Pawket Shop.',
      icon: 'bi-bag-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock'],
      dataScopes: ['products:featured', 'passes:summary', 'charm:public_updates'],
      actionScopes: ['navigate', 'open_product', 'send_pass'],
      privacyLabel: 'Legacy alias for Pawket Shop. Product discovery is public; pass summaries do not expose private pet notes.',
      entry: 'firstPartyPawketApps.loop',
      legacyAliasFor: 'loop'
    },
    render: renderShopApp,
    hydrate: hydrateShopApp,
    actions: { shufflePick: renderRandomSubSpotlight }
  },
  {
    manifest: {
      id: 'traits',
      name: 'Pet Workspace',
      shortName: 'Home',
      description: 'Legacy memory route for Pet Workspace.',
      icon: 'bi-house-heart',
      version: '1.0.0',
      providerType: 'first_party',
      surfaces: ['dock'],
      dataScopes: ['pets:summary', 'pals:private_summary', 'dock:preferences'],
      actionScopes: ['navigate', 'open_pal_creator', 'open_story_composer'],
      privacyLabel: 'Private pet and journal details stay in account surfaces.',
      entry: 'firstPartyPawketApps.petWorkspace',
      legacyAliasFor: 'pet-workspace'
    },
    render: renderPetWorkspaceApp,
    hydrate: hydratePetWorkspaceApp,
    actions: { randomFocus: renderRandomTraitFocus }
  }
];
