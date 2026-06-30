// /public/pawketAppStandalone.js
import {
  createPawketAppHost,
  createPawketAppRegistry,
  createScopedAppDataBridge,
  escapeAttr,
  escapeHtml,
  safeIconClass
} from './pawketAppRuntime.js';
import {
  firstPartyPawketApps,
  pawketConnectorProviders
} from './pawketFirstPartyApps.js';
import { getSession } from './auth.js';

const PROVIDER_STORAGE_KEY = 'pp-widget-apps-v2-providers';
const CARE_QUICK_CHECKS_KEY = 'pp-widget-reminders';
const LEGACY_APP_ALIASES = {
  reminders: 'pet-workspace',
  traits: 'pet-workspace',
  subs: 'loop',
  integrations: 'pet-workspace'
};

const appData = {
  stories: [],
  featured: [],
  pets: [],
  journalMetrics: {
    signedIn: false,
    journalCount: 0,
    coreMemoryCount: 0,
    handoffTargets: [],
    entries: [],
    coreEntries: []
  }
};

function esc(value) {
  return escapeHtml(value);
}

function attr(value) {
  return escapeAttr(value);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function providerState() {
  return readJson(PROVIDER_STORAGE_KEY, {});
}

function listProviders() {
  const state = providerState();
  return pawketConnectorProviders.map((provider) => {
    const saved = state[provider.id] || {};
    return {
      ...provider,
      connected: saved.connected === true,
      enabled: saved.enabled !== false,
      lastConnectedAt: saved.lastConnectedAt || null
    };
  });
}

function setProviderState(id, patch = {}) {
  const key = String(id || '').trim();
  if (!key) return;
  const state = providerState();
  state[key] = {
    connected: state[key]?.connected === true,
    enabled: state[key]?.enabled !== false,
    lastConnectedAt: state[key]?.lastConnectedAt || null,
    ...patch
  };
  writeJson(PROVIDER_STORAGE_KEY, state);
}

function toggleProviderConnection(id) {
  const key = String(id || '').trim();
  if (!key) return false;
  const state = providerState();
  const current = state[key] || { connected: false, enabled: true, lastConnectedAt: null };
  const next = current.connected !== true;
  state[key] = {
    ...current,
    connected: next,
    enabled: current.enabled !== false,
    lastConnectedAt: next ? new Date().toISOString() : current.lastConnectedAt || null
  };
  writeJson(PROVIDER_STORAGE_KEY, state);
  return next;
}

async function fetchJson(url) {
  try {
    const apiPath = new URL(url, window.location.origin).pathname;
    if (apiPath === '/api/pets' || apiPath === '/api/loop/me') {
      const session = await getSession();
      if (!session?.signedIn) return null;
    }
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function cachePetsResponse(petsRes) {
  appData.pets = Array.isArray(petsRes?.pets) ? petsRes.pets : [];
  return appData.pets;
}

function renderCareHandoffChips(targets = [], emptyLabel = 'Private by default') {
  const chips = Array.isArray(targets) && targets.length ? targets : [emptyLabel];
  return chips.slice(0, 5).map((label) => `<span class="pp-care-handoff-chip">${esc(label)}</span>`).join('');
}

function renderCareJournalItems(entries = [], emptyText = 'No journal entries yet.') {
  const rows = Array.isArray(entries) ? entries.filter(Boolean).slice(0, 4) : [];
  if (!rows.length) return `<li>${esc(emptyText)}</li>`;
  return rows.map((entry) => `
    <li class="pp-care-entry-row">
      <span class="pp-care-entry-icon"><i class="bi bi-journal-heart" aria-hidden="true"></i></span>
      <span class="pp-care-entry-copy">
        <strong>${esc(entry.title || entry.entryType || 'Journal entry')}</strong>
        <small>${esc(entry.petName || 'Private journal')}</small>
      </span>
    </li>
  `).join('');
}

function appIdFromUrl(registry) {
  const params = new URLSearchParams(window.location.search);
  const requested = String(params.get('app') || '').trim();
  const canonical = LEGACY_APP_ALIASES[requested] || requested;
  if (canonical && registry.has(canonical)) return canonical;
  return registry.has('pet-workspace') ? 'pet-workspace' : registry.manifests({ surface: 'standalone' })[0]?.id || '';
}

function setTitlebar(manifest) {
  const titlebar = document.querySelector('[data-pawket-app-titlebar]');
  if (!titlebar || !manifest) return;
  const icon = titlebar.querySelector('.pp-standalone-app-icon i');
  const eyebrow = titlebar.querySelector('span:not(.pp-standalone-app-icon)');
  const title = titlebar.querySelector('h1');
  const body = titlebar.querySelector('p');
  if (icon) icon.className = `bi ${safeIconClass(manifest.icon)}`;
  if (eyebrow) eyebrow.textContent = manifest.shortName || 'Pawket App';
  if (title) title.textContent = manifest.name || 'Pawket App';
  if (body) body.textContent = manifest.description || manifest.privacyLabel || '';
  document.title = `${manifest.name || 'Pawket App'} | Pet Pawket`;
}

function renderTabs(registry, activeId) {
  const tabs = document.querySelector('[data-pawket-app-tabs]');
  if (!tabs) return;
  const apps = registry.manifests({ surface: 'standalone' });
  tabs.innerHTML = apps.map((app) => `
    <a class="${app.id === activeId ? 'is-active' : ''}" href="/pawket-app.html?app=${encodeURIComponent(app.id)}" data-standalone-app-tab="${attr(app.id)}">
      <i class="bi ${safeIconClass(app.icon)}" aria-hidden="true"></i>
      <span>${esc(app.shortName || app.name)}</span>
    </a>
  `).join('');
}

function syncCareTaskCounts(root) {
  const checked = Array.from(root.querySelectorAll('[data-app-reminder-task]:checked'))
    .map((el) => el.getAttribute('data-app-reminder-task'))
    .filter(Boolean);
  writeJson(CARE_QUICK_CHECKS_KEY, checked);
  const doneEl = root.querySelector('[data-app-reminders-done]');
  const todoEl = root.querySelector('[data-app-reminders-togo]');
  if (doneEl) doneEl.textContent = String(checked.length);
  if (todoEl) todoEl.textContent = String(Math.max(0, 4 - checked.length));
}

function initStandaloneApp() {
  const root = document.querySelector('[data-pawket-app-root]');
  if (!root) return;

  const registry = createPawketAppRegistry({ apps: firstPartyPawketApps });
  let activeAppId = appIdFromUrl(registry);
  let integrationsFocus = null;
  const dataBridge = createScopedAppDataBridge({
    getSourceData: () => ({
      pets: appData.pets,
      journalMetrics: appData.journalMetrics,
      featured: appData.featured,
      stories: appData.stories,
      activeCase: appData.activeCase || null,
      loopSummary: appData.loopSummary || null,
      dockSettings: { side: 'left', size: 'md', collapsed: false, providerWidgets: true }
    })
  });

  function makeContext(appId) {
    return {
      root,
      data: appData,
      providers: listProviders(),
      integrationFocus: integrationsFocus,
      settings: {
        dockSettings: { side: 'left', size: 'md', collapsed: false, providerWidgets: true },
        integrationsFocus
      },
      setBody(id, html) {
        if (id === activeAppId) root.innerHTML = html;
      },
      fetchJson,
      actions: {
        setProviderState,
        toggleProviderConnection,
        setIntegrationsFocus(id) { integrationsFocus = id; }
      },
      helpers: {
        cachePetsResponse,
        renderCareJournalItems,
        renderCareHandoffChips,
        updateDockStatusStrip() {},
        hydrateCarePanel() {},
        careJournalTitle(entry = {}) {
          return entry.title || entry.entryType || 'Journal entry';
        },
        formatCareJournalDate(value = '') {
          const time = new Date(value || 0).getTime();
          if (!Number.isFinite(time) || time <= 0) return '';
          try {
            return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(time));
          } catch {
            return '';
          }
        },
        async ensureCareJournalMetrics() {
          appData.journalMetrics = {
            signedIn: appData.pets.length > 0,
            journalCount: 0,
            coreMemoryCount: 0,
            handoffTargets: [],
            entries: [],
            coreEntries: []
          };
          return appData.journalMetrics;
        }
      }
    };
  }

  const host = createPawketAppHost({
    registry,
    surface: 'standalone',
    dataBridge,
    makeContext,
    executeIntent(manifest, intent = {}) {
      if (intent.type === 'navigate' && intent.href) {
        window.location.href = intent.href;
        return { ok: true, type: intent.type };
      }
      if (intent.type === 'send_pass') {
        window.location.href = '/loop.html';
        return { ok: true, type: intent.type };
      }
      return { ok: true, type: intent.type || '', appId: manifest.id };
    }
  });

  function renderActiveApp() {
    const definition = registry.get(activeAppId);
    if (!definition) return;
    root.innerHTML = host.render(activeAppId);
    setTitlebar(definition.manifest);
    renderTabs(registry, activeAppId);
    Promise.resolve(host.hydrate(activeAppId)).catch((err) => {
      console.warn('[pawketAppStandalone] hydrate failed:', err);
    });
  }

  root.addEventListener('click', (event) => {
    if (event.target.closest('[data-app-loop-share]')) {
      window.location.href = '/loop.html';
      return;
    }
    if (event.target.closest('[data-app-story-refresh]')) {
      host.runAction('stories', 'refreshSpark');
      return;
    }
    if (event.target.closest('[data-app-subs-spin]')) {
      const result = host.runAction(activeAppId, 'shufflePick');
      if (result === null) host.runAction('loop', 'shufflePick');
      return;
    }
    if (event.target.closest('[data-app-traits-random]')) {
      const result = host.runAction(activeAppId, 'randomFocus');
      if (result === null) host.runAction('pet-workspace', 'randomFocus');
      return;
    }
    if (event.target.closest('[data-app-pals-random]')) {
      host.runAction('pals', 'randomProfile');
      return;
    }
    if (event.target.closest('[data-app-memory-lock]')) {
      const list = root.querySelector('[data-app-traits-list]');
      if (list) {
        const row = document.createElement('li');
        row.textContent = 'Draft prompt: open a pet journal and mark a meaningful memory.';
        list.prepend(row);
        const rows = list.querySelectorAll('li');
        if (rows.length > 6) rows[rows.length - 1].remove();
      }
      return;
    }
    if (event.target.closest('[data-app-reminders-celebrate]')) {
      const done = root.querySelectorAll('[data-app-reminder-task]:checked').length;
      const list = root.querySelector('[data-app-reminders-list]');
      if (list) {
        const row = document.createElement('li');
        row.textContent = `Quick check-in saved here: ${done} care checks complete.`;
        list.prepend(row);
        const rows = list.querySelectorAll('li');
        if (rows.length > 6) rows[rows.length - 1].remove();
      }
      return;
    }
    if (event.target.closest('[data-app-int-reload]')) {
      renderActiveApp();
      return;
    }
    const toggle = event.target.closest('[data-app-int-toggle]');
    if (toggle) {
      toggleProviderConnection(toggle.getAttribute('data-app-int-toggle'));
      renderActiveApp();
      return;
    }
    const focus = event.target.closest('[data-app-int-focus]');
    if (focus) {
      integrationsFocus = focus.getAttribute('data-app-int-focus');
      renderActiveApp();
    }
  });

  root.addEventListener('input', (event) => {
    const slider = event.target.closest('[data-app-pals-mood]');
    if (slider) {
      const value = Number(slider.value || 0);
      localStorage.setItem('pp-widget-pals-mood', String(value));
      const moodValue = root.querySelector('[data-app-pals-mood-value]');
      if (moodValue) moodValue.textContent = `${value}%`;
      return;
    }
    if (event.target.closest('[data-app-reminder-task]')) syncCareTaskCounts(root);
  });

  renderActiveApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStandaloneApp, { once: true });
} else {
  initStandaloneApp();
}
