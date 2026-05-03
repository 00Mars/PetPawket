// /public/widgetAppSdk.js
const DEFAULT_MIN_WIDTH = 290;
const DEFAULT_MIN_HEIGHT = 220;
const DEFAULT_MAX_WIDTH = 560;
const DEFAULT_MAX_HEIGHT = 780;
const DEFAULT_MARGIN = 10;

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function escapeAttrSelector(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function safeClassList(value, fallback = '') {
  const tokens = String(value || '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => /^[a-zA-Z0-9_-]+$/.test(token));
  return tokens.join(' ') || fallback;
}

function safeIconClass(value, fallback = 'bi-grid') {
  return safeClassList(value, fallback);
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function createWidgetAppSdk(options = {}) {
  const layer = options.layer;
  if (!layer) throw new Error('[widgetAppSdk] layer element is required');

  const storageKey = options.storageKey || 'pp-widget-apps-v2';
  const providerStorageKey = options.providerStorageKey || `${storageKey}-providers`;
  const mobileBreakpoint = Number(options.mobileBreakpoint || 600);
  const minWidth = Number(options.minWidth || DEFAULT_MIN_WIDTH);
  const minHeight = Number(options.minHeight || DEFAULT_MIN_HEIGHT);
  const maxWidth = Number(options.maxWidth || DEFAULT_MAX_WIDTH);
  const maxHeight = Number(options.maxHeight || DEFAULT_MAX_HEIGHT);
  const onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;

  const state = readJson(storageKey, {});
  const providerState = readJson(providerStorageKey, {});
  const providers = new Map();

  let zCursor = Object.values(state).reduce((max, item) => {
    const z = Number(item?.z) || 0;
    return Math.max(max, z);
  }, Number(options.startZ || 930));

  let saveTimer = 0;
  let saveProviderTimer = 0;
  let drag = null;

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver((entries) => {
        for (const row of entries) {
          const el = row.target;
          const id = el.getAttribute('data-widget-app-id');
          if (!id) continue;
          if (drag?.id === id) continue;
          if (isMobile()) continue;
          const entry = ensureEntry(id);
          if (entry.min) continue;
          const rect = el.getBoundingClientRect();
          const w = Math.round(rect.width);
          const h = Math.round(rect.height);
          if (w <= 0 || h <= 0) continue;
          entry.w = w;
          entry.h = h;
          clampEntry(entry);
          scheduleSave();
        }
      })
    : { observe() {}, unobserve() {} };

  function isMobile() {
    return window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches;
  }

  function navOffset() {
    const raw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-offset'));
    return Number.isFinite(raw) ? raw : 118;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }, 120);
  }

  function scheduleProviderSave() {
    clearTimeout(saveProviderTimer);
    saveProviderTimer = setTimeout(() => {
      try { localStorage.setItem(providerStorageKey, JSON.stringify(providerState)); } catch {}
    }, 120);
  }

  function emitStateChange(id) {
    if (!onStateChange) return;
    try { onStateChange(id, getEntrySnapshot(id)); } catch {}
  }

  function ensureEntry(id, defaults = {}) {
    if (!state[id]) {
      state[id] = {
        open: false,
        min: false,
        x: isFiniteNumber(defaults.x) ? Number(defaults.x) : 120,
        y: isFiniteNumber(defaults.y) ? Number(defaults.y) : 160,
        w: isFiniteNumber(defaults.w) ? Number(defaults.w) : 360,
        h: isFiniteNumber(defaults.h) ? Number(defaults.h) : 320,
        z: ++zCursor
      };
    }
    const entry = state[id];
    if (isFiniteNumber(defaults.x) && !isFiniteNumber(entry.x)) entry.x = Number(defaults.x);
    if (isFiniteNumber(defaults.y) && !isFiniteNumber(entry.y)) entry.y = Number(defaults.y);
    if (isFiniteNumber(defaults.w) && !isFiniteNumber(entry.w)) entry.w = Number(defaults.w);
    if (isFiniteNumber(defaults.h) && !isFiniteNumber(entry.h)) entry.h = Number(defaults.h);
    if (!isFiniteNumber(entry.x)) entry.x = 120;
    if (!isFiniteNumber(entry.y)) entry.y = 160;
    if (!isFiniteNumber(entry.w)) entry.w = 360;
    if (!isFiniteNumber(entry.h)) entry.h = 320;
    if (!isFiniteNumber(entry.z)) entry.z = ++zCursor;
    clampEntry(entry);
    return entry;
  }

  function getWindow(id) {
    return layer.querySelector(`[data-widget-app-id="${escapeAttrSelector(id)}"]`);
  }

  function getBody(id) {
    return layer.querySelector(`[data-sdk-app-body="${escapeAttrSelector(id)}"]`);
  }

  function clampEntry(entry) {
    const margin = DEFAULT_MARGIN;
    const topMin = Math.max(72, navOffset() + 6);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    entry.w = Math.max(minWidth, Math.min(Number(entry.w) || 360, Math.min(maxWidth, vw - margin * 2)));
    entry.h = Math.max(minHeight, Math.min(Number(entry.h) || 320, Math.min(maxHeight, vh - topMin - margin)));
    const maxX = Math.max(margin, vw - entry.w - margin);
    const maxY = Math.max(topMin, vh - (entry.min ? 62 : entry.h) - margin);
    entry.x = Math.max(margin, Math.min(Number(entry.x) || margin, maxX));
    entry.y = Math.max(topMin, Math.min(Number(entry.y) || topMin, maxY));
  }

  function applyStyle(id) {
    const entry = ensureEntry(id);
    const win = getWindow(id);
    if (!win) return;
    win.classList.toggle('is-min', !!entry.min);
    win.style.zIndex = String(entry.z || 930);
    if (isMobile()) {
      win.style.left = '50%';
      win.style.top = 'auto';
      win.style.width = '';
      win.style.height = entry.min ? 'auto' : `${Math.round(entry.h)}px`;
      return;
    }
    win.style.left = `${Math.round(entry.x)}px`;
    win.style.top = `${Math.round(entry.y)}px`;
    win.style.width = `${Math.round(entry.w)}px`;
    win.style.height = entry.min ? 'auto' : `${Math.round(entry.h)}px`;
  }

  function applyAll() {
    Object.keys(state).forEach((id) => {
      if (!state[id]?.open) return;
      applyStyle(id);
    });
  }

  function bringToFront(id, silent = false) {
    const entry = ensureEntry(id);
    entry.z = ++zCursor;
    const win = getWindow(id);
    if (win) win.style.zIndex = String(entry.z);
    if (!silent) {
      scheduleSave();
      emitStateChange(id);
    }
  }

  function buildWindowMarkup(config, entry) {
    const minIcon = entry.min ? 'bi-arrows-angle-expand' : 'bi-dash-lg';
    const minLabel = entry.min ? 'Restore window' : 'Minimize window';
    const id = String(config.id || '').trim();
    const themeClass = safeClassList(config.themeClass, safeClassList(`is-${id}`, 'is-widget'));
    const title = config.title || id;
    const subtitle = config.subtitle || '';
    const icon = safeIconClass(config.icon);
    const safeId = escapeAttr(id);
    const titleId = escapeAttr(`pp-widget-app-title-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`);
    const z = Number.isFinite(Number(entry.z)) ? Number(entry.z) : 930;
    return `
      <section class="pp-widget-app ${themeClass}${entry.min ? ' is-min' : ''}" data-widget-app-id="${safeId}" role="dialog" aria-modal="false" aria-labelledby="${titleId}" style="z-index:${z};">
        <header class="pp-widget-app-header" data-app-drag-handle>
          <span class="pp-widget-app-handle"><i class="bi ${icon}" aria-hidden="true"></i></span>
          <div class="pp-widget-app-title">
            <strong id="${titleId}">${escapeHtml(title)}</strong>
            <span>${escapeHtml(subtitle)}</span>
          </div>
          <div class="pp-widget-app-controls">
            <button class="pp-widget-app-btn" type="button" data-sdk-app-min="${safeId}" aria-label="${escapeAttr(minLabel)}">
              <i class="bi ${minIcon}" aria-hidden="true"></i>
            </button>
            <button class="pp-widget-app-btn" type="button" data-sdk-app-close="${safeId}" aria-label="Close window">
              <i class="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
        </header>
        <div class="pp-widget-app-body" data-sdk-app-body="${safeId}">${config.bodyHtml || ''}</div>
      </section>
    `;
  }

  function setBody(id, html) {
    const body = getBody(id);
    if (!body) return;
    body.innerHTML = html || '';
  }

  function openApp(config = {}) {
    const id = String(config.id || '').trim();
    if (!id) return null;
    const entry = ensureEntry(id, config.defaults || {});
    entry.open = true;
    if (config.resetMin !== false) entry.min = false;
    bringToFront(id, true);
    let win = getWindow(id);
    const isNew = !win;
    if (!win) {
      layer.insertAdjacentHTML('beforeend', buildWindowMarkup(config, entry));
      win = getWindow(id);
      try { resizeObserver.observe(win); } catch {}
    } else {
      if (typeof config.title === 'string') {
        const titleEl = win.querySelector('.pp-widget-app-title strong');
        if (titleEl) titleEl.textContent = config.title;
      }
      if (typeof config.subtitle === 'string') {
        const subtitleEl = win.querySelector('.pp-widget-app-title span');
        if (subtitleEl) subtitleEl.textContent = config.subtitle;
      }
      if (typeof config.icon === 'string') {
        const iconEl = win.querySelector('.pp-widget-app-handle i');
        if (iconEl) iconEl.className = `bi ${safeIconClass(config.icon)}`;
      }
      if (typeof config.themeClass === 'string') {
        win.className = `pp-widget-app ${safeClassList(config.themeClass, safeClassList(`is-${id}`, 'is-widget'))}${entry.min ? ' is-min' : ''}`;
      }
      if (typeof config.bodyHtml === 'string') setBody(id, config.bodyHtml);
    }
    applyStyle(id);
    scheduleSave();
    emitStateChange(id);
    if (isNew && typeof config.onMount === 'function') {
      try { config.onMount({ id, windowEl: win, bodyEl: getBody(id), state: { ...entry } }); } catch {}
    }
    if (!isNew && typeof config.onOpen === 'function') {
      try { config.onOpen({ id, windowEl: win, bodyEl: getBody(id), state: { ...entry } }); } catch {}
    }
    return win;
  }

  function closeApp(id) {
    const key = String(id || '').trim();
    if (!key) return;
    const entry = ensureEntry(key);
    entry.open = false;
    entry.min = false;
    const win = getWindow(key);
    if (win) {
      try { resizeObserver.unobserve(win); } catch {}
      win.remove();
    }
    scheduleSave();
    emitStateChange(key);
  }

  function toggleApp(config = {}) {
    if (isOpen(config.id)) closeApp(config.id);
    else openApp(config);
  }

  function setMinimized(id, force) {
    const entry = ensureEntry(id);
    entry.min = typeof force === 'boolean' ? force : !entry.min;
    const win = getWindow(id);
    if (win) {
      const icon = win.querySelector(`[data-sdk-app-min="${escapeAttrSelector(id)}"] i`);
      if (icon) icon.className = `bi ${entry.min ? 'bi-arrows-angle-expand' : 'bi-dash-lg'}`;
      const btn = win.querySelector(`[data-sdk-app-min="${escapeAttrSelector(id)}"]`);
      if (btn) btn.setAttribute('aria-label', entry.min ? 'Restore window' : 'Minimize window');
    }
    applyStyle(id);
    scheduleSave();
    emitStateChange(id);
  }

  function isOpen(id) {
    const key = String(id || '').trim();
    return !!(key && state[key]?.open === true);
  }

  function getEntrySnapshot(id) {
    const entry = ensureEntry(id);
    return { ...entry };
  }

  function forEachOpen(callback) {
    Object.keys(state).forEach((id) => {
      if (!state[id]?.open) return;
      callback(id, { ...state[id] });
    });
  }

  function syncAllowed(validIds = []) {
    const allow = new Set(validIds.map((id) => String(id)));
    Object.keys(state).forEach((id) => {
      if (allow.has(id)) return;
      if (state[id]?.open) closeApp(id);
    });
  }

  function hydrateOpen(configResolver) {
    Object.keys(state).forEach((id) => {
      if (!state[id]?.open) return;
      const config = typeof configResolver === 'function' ? configResolver(id) : null;
      if (!config) {
        state[id].open = false;
        return;
      }
      openApp(config);
    });
    scheduleSave();
  }

  function registerProviders(list = []) {
    list.forEach((provider) => {
      if (!provider?.id) return;
      const id = String(provider.id);
      providers.set(id, {
        id,
        name: provider.name || id,
        description: provider.description || '',
        category: provider.category || 'general',
        icon: provider.icon || 'bi-box-arrow-up-right',
        statusLabel: provider.statusLabel || 'Ready'
      });
      if (!providerState[id]) {
        providerState[id] = {
          connected: false,
          enabled: true,
          lastConnectedAt: null
        };
      }
    });
    scheduleProviderSave();
  }

  function listProviders() {
    return Array.from(providers.values()).map((provider) => {
      const statePart = providerState[provider.id] || { connected: false, enabled: true, lastConnectedAt: null };
      return { ...provider, ...statePart };
    });
  }

  function setProviderState(id, patch = {}) {
    const key = String(id || '').trim();
    if (!key) return;
    if (!providerState[key]) providerState[key] = { connected: false, enabled: true, lastConnectedAt: null };
    providerState[key] = { ...providerState[key], ...patch };
    scheduleProviderSave();
  }

  function toggleProviderConnection(id) {
    const key = String(id || '').trim();
    if (!key) return false;
    if (!providerState[key]) providerState[key] = { connected: false, enabled: true, lastConnectedAt: null };
    const next = !providerState[key].connected;
    providerState[key].connected = next;
    providerState[key].lastConnectedAt = next ? new Date().toISOString() : providerState[key].lastConnectedAt;
    scheduleProviderSave();
    return next;
  }

  function handleLayerClick(event) {
    const closeBtn = event.target.closest('[data-sdk-app-close]');
    if (closeBtn) {
      closeApp(closeBtn.getAttribute('data-sdk-app-close'));
      return;
    }
    const minBtn = event.target.closest('[data-sdk-app-min]');
    if (minBtn) {
      setMinimized(minBtn.getAttribute('data-sdk-app-min'));
    }
  }

  function beginDrag(event) {
    const win = event.target.closest('.pp-widget-app');
    if (!win) return;
    const id = win.getAttribute('data-widget-app-id');
    if (!id) return;
    bringToFront(id);
    if (isMobile()) return;
    const handle = event.target.closest('[data-app-drag-handle]');
    if (!handle || event.target.closest('[data-sdk-app-min], [data-sdk-app-close], .pp-widget-app-btn')) return;

    const entry = ensureEntry(id);
    drag = {
      id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: entry.x,
      originY: entry.y,
      win
    };
    win.classList.add('is-dragging');
    win.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!drag) return;
    if (event.pointerId !== drag.pointerId) return;
    const entry = ensureEntry(drag.id);
    entry.x = drag.originX + (event.clientX - drag.startX);
    entry.y = drag.originY + (event.clientY - drag.startY);
    applyStyle(drag.id);
  }

  function endDrag() {
    if (!drag) return;
    const id = drag.id;
    const win = drag.win;
    drag = null;
    if (win) win.classList.remove('is-dragging');
    applyStyle(id);
    scheduleSave();
  }

  layer.addEventListener('click', handleLayerClick);
  layer.addEventListener('pointerdown', beginDrag, true);
  layer.addEventListener('pointermove', moveDrag);
  layer.addEventListener('pointerup', endDrag);
  layer.addEventListener('pointercancel', endDrag);
  window.addEventListener('resize', applyAll, { passive: true });

  return {
    ensureEntry,
    isOpen,
    openApp,
    closeApp,
    toggleApp,
    setBody,
    getBody,
    getWindow,
    bringToFront,
    setMinimized,
    applyStyle,
    applyAll,
    forEachOpen,
    syncAllowed,
    hydrateOpen,
    getEntrySnapshot,
    registerProviders,
    listProviders,
    setProviderState,
    toggleProviderConnection
  };
}
