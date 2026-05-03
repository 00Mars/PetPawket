// public/widgetDock.js
console.debug('[widgetDock] module loaded');

async function fetchWithFallback(paths) {
  for (const p of paths) {
    try {
      const res = await fetch(p, { credentials: 'same-origin' });
      if (res.ok) return await res.text();
      console.warn(`[widgetDock] fetch ${p} -> ${res.status}`);
    } catch (e) {
      console.warn(`[widgetDock] fetch ${p} failed:`, e);
    }
  }
  throw new Error(`[widgetDock] template not found at any of: ${paths.join(', ')}`);
}

function extractShellHtml(html) {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const shell = doc.querySelector('.pp-widget-shell');
    if (shell) return shell.outerHTML;
    if (doc.body && doc.body.innerHTML.trim()) return doc.body.innerHTML;
  } catch {}
  return html;
}

async function fetchWidgetDockHtml() {
  const pref = window.__PP_PREFETCH?.widgetDock;
  if (pref) {
    try { return await pref; } catch (e) { console.debug('[widgetDock] prefetch failed:', e); }
  }
  return await fetchWithFallback(['/widgetDock.html', '/partials/widgetDock.html', 'widgetDock.html']);
}

function ensureContainer() {
  let container = document.getElementById('widget-dock-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'widget-dock-container';
    document.body.appendChild(container);
  }
  return container;
}

async function initBand() {
  function currentBubbleCount() {
    const dock = document.querySelector('.pp-widget-dock');
    return dock ? dock.querySelectorAll('.pp-widget-bubble').length : 0;
  }

  function resetInitLatch() {
    const dock = document.querySelector('.pp-widget-dock');
    if (!dock) return;
    try {
      delete dock.dataset.ppWidgetInit;
    } catch {
      dock.dataset.ppWidgetInit = '';
    }
  }

  try {
    const heroMod = await import('./hero.js');
    if (typeof heroMod?.initWidgetBand === 'function') {
      window.__PP_WIDGET_BAND_LAST_INIT_AT = Date.now();
      window.__PP_WIDGET_BAND_LAST_ERROR = null;
      heroMod.initWidgetBand();
      let bubbleCount = currentBubbleCount();

      // Rare race/failure mode: shell exists but band render is empty.
      if (bubbleCount === 0) {
        if (DOCK_DEBUG_ON) publishDockDebug('band:retry-empty-first-pass', { bubbleCount });
        resetInitLatch();
        heroMod.initWidgetBand();
        bubbleCount = currentBubbleCount();
      }

      if (bubbleCount === 0) {
        setTimeout(() => {
          try {
            resetInitLatch();
            heroMod.initWidgetBand();
            const delayedCount = currentBubbleCount();
            window.__PP_WIDGET_BAND_BUBBLES = delayedCount;
            if (DOCK_DEBUG_ON) {
              publishDockDebug('band:retry-empty-delayed', { bubbleCount: delayedCount });
            }
          } catch (retryErr) {
            window.__PP_WIDGET_BAND_LAST_ERROR = String(retryErr?.message || retryErr || 'unknown');
            if (DOCK_DEBUG_ON) {
              publishDockDebug('band:retry-error', {
                error: String(retryErr?.message || retryErr || 'unknown')
              });
            }
          }
        }, 120);
      }

      window.__PP_WIDGET_BAND_BUBBLES = bubbleCount;
      if (DOCK_DEBUG_ON) {
        publishDockDebug('band:init', { bubbleCount });
      }
    }
  } catch (e) {
    window.__PP_WIDGET_BAND_LAST_ERROR = String(e?.message || e || 'unknown');
    console.warn('[widgetDock] init warning:', e);
    if (DOCK_DEBUG_ON) {
      publishDockDebug('band:error', {
        error: String(e?.message || e || 'unknown')
      });
    }
  }
}

function getNavOffset() {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--nav-offset');
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 170;
  } catch {
    return 170;
  }
}

function getHeaderBottom(fallback = 170) {
  const subnav = document.querySelector('#navbar-container .pp-subnav');
  const header = document.querySelector('#navbar-container .pp-header');
  let bottom = Number.isFinite(fallback) ? fallback : 170;
  if (header) bottom = Math.max(bottom, Math.round(header.getBoundingClientRect().bottom || 0));
  if (subnav) bottom = Math.max(bottom, Math.round(subnav.getBoundingClientRect().bottom || 0));
  return Math.max(0, bottom);
}

function clamp(value, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

const MOBILE_DOCK_MAX_WIDTH = 980;

function shouldUseMobileDockByWidth() {
  return window.matchMedia(`(max-width: ${MOBILE_DOCK_MAX_WIDTH}px)`).matches;
}

function getMobileDockReason() {
  if (shouldUseMobileDockByWidth()) return 'width';
  return 'none';
}

function isMobileDockLayout() {
  return getMobileDockReason() !== 'none';
}

const DEBUG_STORAGE_KEY = 'pp-widget-debug';

function isWidgetDebugEnabled() {
  try {
    const search = new URLSearchParams(window.location.search).get('ppWidgetDebug');
    if (search === '1') return true;
    if (search === '0') return false;
  } catch {}
  try {
    if (window.__PP_WIDGET_DEBUG === true) return true;
    return localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
  } catch {
    return window.__PP_WIDGET_DEBUG === true;
  }
}

const DOCK_DEBUG_ON = isWidgetDebugEnabled();

function readCssNumberPx(computed, propName) {
  if (!computed) return null;
  const raw = String(computed.getPropertyValue(propName) || '').trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundRect(rect) {
  if (!rect) return null;
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
}

function getElementDebugState(node) {
  if (!node) return { present: false, childCount: 0, bubbleCount: 0 };
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  const opacity = Number.parseFloat(style.opacity || '1');
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  const offscreen = {
    top: rect.bottom <= 0,
    bottom: rect.top >= viewport.height,
    left: rect.right <= 0,
    right: rect.left >= viewport.width
  };
  return {
    present: true,
    childCount: node.children?.length || 0,
    bubbleCount: node.querySelectorAll?.('.pp-widget-bubble')?.length || 0,
    rect: roundRect(rect),
    display: style.display,
    visibility: style.visibility,
    opacity: Number.isFinite(opacity) ? Number(opacity.toFixed(3)) : null,
    pointerEvents: style.pointerEvents,
    position: style.position,
    zIndex: style.zIndex,
    transform: style.transform,
    offscreen,
    intersectsViewport: !(offscreen.top || offscreen.bottom || offscreen.left || offscreen.right)
  };
}

function getDockDebugSnapshot(extra = {}) {
  const viewportState = window.PP_viewportState || null;
  const container = document.getElementById('widget-dock-container');
  const shell = document.querySelector('.pp-widget-shell');
  const dock = shell?.querySelector?.('.pp-widget-dock') || null;
  const helpPill = shell?.querySelector?.('.pp-help-pill') || null;
  const rootStyle = getComputedStyle(document.documentElement);
  const shellStyle = shell ? getComputedStyle(shell) : null;

  const snapshot = {
    ts: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      mobileLayout: isMobileDockLayout(),
      mobileReason: getMobileDockReason(),
      widthTier: viewportState?.widthTier || null,
      heightTier: viewportState?.heightTier || null,
      short: viewportState?.short ?? null,
      xshort: viewportState?.xshort ?? null
    },
    visualViewport: window.visualViewport
      ? {
          width: Math.round(window.visualViewport.width),
          height: Math.round(window.visualViewport.height),
          offsetTop: Math.round(window.visualViewport.offsetTop),
          offsetLeft: Math.round(window.visualViewport.offsetLeft),
          scale: Number((window.visualViewport.scale || 1).toFixed(3))
        }
      : null,
    container: {
      present: !!container,
      injectedFlag: container?.dataset?.ppWidgetDockInjected || '0',
      childCount: container?.children?.length || 0
    },
    shell: {
      ...getElementDebugState(shell),
      dataset: shell
        ? {
            aligning: shell.dataset.aligning || '0',
            mobileDock: shell.dataset.mobileDock || '0',
            mobileReason: shell.dataset.mobileReason || 'none',
            mobileDense: shell.dataset.mobileDense || '0',
            mobileShort: shell.dataset.mobileShort || '0',
            mobileInput: shell.dataset.mobileInput || '0',
            keyboardOpen: shell.dataset.keyboardOpen || '0',
            dockMode: shell.dataset.dockMode || '',
            widgetSide: shell.dataset.widgetSide || 'left',
            widgetCollapsed: shell.dataset.widgetCollapsed || '0'
          }
        : null,
      cssVars: shell
        ? {
            mobileBottom: readCssNumberPx(shellStyle, '--pp-widget-mobile-bottom'),
            helpMobileBottom: readCssNumberPx(shellStyle, '--pp-help-pill-mobile-bottom'),
            helpMobileRight: readCssNumberPx(shellStyle, '--pp-help-pill-mobile-right'),
            dockTop: readCssNumberPx(shellStyle, '--pp-widget-dock-top'),
            dockScale: readCssNumberPx(shellStyle, '--pp-widget-scale')
          }
        : null
    },
    dock: getElementDebugState(dock),
    helpPill: getElementDebugState(helpPill),
    rootVars: {
      mobileReserve: readCssNumberPx(rootStyle, '--pp-widget-mobile-reserve'),
      dockGutter: readCssNumberPx(rootStyle, '--pp-widget-dock-gutter'),
      dockGutterRight: readCssNumberPx(rootStyle, '--pp-widget-dock-gutter-right'),
      contentGutterLeft: readCssNumberPx(rootStyle, '--pp-widget-content-gutter-left'),
      contentGutterRight: readCssNumberPx(rootStyle, '--pp-widget-content-gutter-right')
    },
    body: {
      classes: document.body?.className || '',
      mobileActive: document.body?.classList?.contains('pp-widget-mobile-active') || false
    },
    band: {
      lastInitAt: window.__PP_WIDGET_BAND_LAST_INIT_AT || null,
      lastError: window.__PP_WIDGET_BAND_LAST_ERROR || null,
      lastBubbleCount: window.__PP_WIDGET_BAND_BUBBLES ?? null,
      ready: window.__PP_WIDGET_BAND_READY === true
    },
    recovery: {
      attempts: recoverDockAttempts,
      maxAttempts: EMPTY_DOCK_RECOVERY_MAX,
      windowMs: EMPTY_DOCK_RECOVERY_WINDOW_MS,
      inFlight: recoverDockInFlight
    },
    ...extra
  };

  const issues = [];
  if (!snapshot.container.present) issues.push('container-missing');
  if (!snapshot.shell.present) issues.push('shell-missing');
  if (!snapshot.dock.present) issues.push('dock-missing');
  if (snapshot.shell.present && snapshot.shell.display === 'none') issues.push('shell-display-none');
  if (snapshot.dock.present && snapshot.dock.display === 'none') issues.push('dock-display-none');
  if (snapshot.dock.present && snapshot.dock.visibility === 'hidden') issues.push('dock-hidden');
  if (snapshot.dock.present && snapshot.dock.opacity != null && snapshot.dock.opacity <= 0.12) {
    issues.push('dock-low-opacity');
  }
  if (snapshot.dock.present && snapshot.dock.bubbleCount <= 0) issues.push('dock-empty');
  if (
    snapshot.dock.present &&
    snapshot.dock.rect &&
    (snapshot.dock.rect.width < 36 || snapshot.dock.rect.height < 28)
  ) {
    issues.push('dock-zero-size');
  }
  if (snapshot.dock.present && snapshot.dock.offscreen.bottom) issues.push('dock-offscreen-bottom');
  if (snapshot.dock.present && snapshot.dock.offscreen.top) issues.push('dock-offscreen-top');
  if (snapshot.shell?.dataset?.mobileInput === '1') issues.push('mobile-input-mode-active');
  if (snapshot.shell?.dataset?.keyboardOpen === '1') issues.push('keyboard-open');
  if (
    snapshot.recovery &&
    snapshot.recovery.attempts >= snapshot.recovery.maxAttempts &&
    snapshot.dock.present &&
    snapshot.dock.bubbleCount <= 0
  ) {
    issues.push('dock-recovery-limit');
  }
  snapshot.issues = issues;
  return snapshot;
}

let recoverDockInFlight = false;
let recoverDockLastAt = 0;
let recoverDockAttempts = 0;
let recoverDockWindowStart = 0;
const EMPTY_DOCK_RECOVERY_MAX = 4;
const EMPTY_DOCK_RECOVERY_WINDOW_MS = 12000;

function scheduleEmptyDockRecovery(reason = 'unknown') {
  const now = Date.now();
  if (recoverDockInFlight) return;
  if (now - recoverDockLastAt < 1200) return;
  if (recoverDockWindowStart === 0 || (now - recoverDockWindowStart) > EMPTY_DOCK_RECOVERY_WINDOW_MS) {
    recoverDockWindowStart = now;
    recoverDockAttempts = 0;
  }
  if (recoverDockAttempts >= EMPTY_DOCK_RECOVERY_MAX) {
    window.__PP_WIDGET_BAND_LAST_ERROR = 'dock-empty-after-retry-limit';
    if (DOCK_DEBUG_ON) {
      publishDockDebug('recover:limit-reached', {
        reason,
        attempts: recoverDockAttempts,
        max: EMPTY_DOCK_RECOVERY_MAX
      });
    }
    return;
  }
  const dock = document.querySelector('.pp-widget-dock');
  if (!dock) return;
  const bubbleCount = dock.querySelectorAll('.pp-widget-bubble').length;
  if (bubbleCount > 0) return;

  recoverDockInFlight = true;
  recoverDockLastAt = now;
  recoverDockAttempts += 1;
  try {
    delete dock.dataset.ppWidgetInit;
  } catch {
    dock.dataset.ppWidgetInit = '';
  }

  Promise.resolve()
    .then(() => initBand())
    .then(() => {
      const bubbleCount = document.querySelectorAll('.pp-widget-dock .pp-widget-bubble').length;
      if (bubbleCount > 0) {
        recoverDockAttempts = 0;
        recoverDockWindowStart = 0;
      } else if (recoverDockAttempts >= EMPTY_DOCK_RECOVERY_MAX) {
        window.__PP_WIDGET_BAND_LAST_ERROR = 'dock-empty-after-retry-limit';
      }
      if (DOCK_DEBUG_ON) {
        publishDockDebug('recover:empty-dock', {
          reason,
          bubbleCount,
          attempts: recoverDockAttempts,
          max: EMPTY_DOCK_RECOVERY_MAX
        });
      }
    })
    .finally(() => {
      recoverDockInFlight = false;
    });
}

function publishDockDebug(label, extra = {}) {
  const snapshot = getDockDebugSnapshot({ label, ...extra });
  window.__PP_WIDGET_DOCK_DEBUG_STATE = snapshot;
  if (DOCK_DEBUG_ON) {
    console.debug(`[widgetDock:debug] ${label}`, snapshot);
  }
  const shouldMirrorToHud =
    snapshot.issues.length > 0
    || /^inject:/.test(label)
    || /^recover:/.test(label)
    || /^band:error$/.test(label)
    || /^align:error$/.test(label);
  if (shouldMirrorToHud) {
    try {
      window.PP_widgetDebug?.log?.(`dock:${label}`, {
        issues: snapshot.issues,
        viewport: snapshot.viewport,
        dockRect: snapshot.dock?.rect || null,
        shellDataset: snapshot.shell?.dataset || null
      });
    } catch {}
  }
  return snapshot;
}

window.PP_widgetDockDebug = {
  enabled: DOCK_DEBUG_ON,
  snapshot(options = {}) {
    const silent = options && options.silent === true;
    const snap = getDockDebugSnapshot({ label: silent ? 'manual:snapshot-silent' : 'manual:snapshot' });
    window.__PP_WIDGET_DOCK_DEBUG_STATE = snap;
    if (!silent && DOCK_DEBUG_ON) {
      console.debug('[PP_widgetDockDebug] snapshot', snap);
    }
    return snap;
  },
  print() {
    const snap = this.snapshot();
    console.log('[PP_widgetDockDebug] snapshot', snap);
    return snap;
  },
  forceAlign() {
    safeUpdateHeroAlignment();
    return this.snapshot();
  },
  async forceBandInit() {
    await initBand();
    const snap = this.snapshot({ silent: true });
    if (DOCK_DEBUG_ON) {
      console.debug('[PP_widgetDockDebug] forceBandInit', {
        bubbleCount: snap?.dock?.bubbleCount || 0,
        issues: snap?.issues || []
      });
    }
    return snap;
  }
};

function clearAligningFlag() {
  const shell = document.querySelector('.pp-widget-shell');
  if (shell?.dataset?.aligning === '1') {
    delete shell.dataset.aligning;
  }
}

function placeHelpPillForDockMode(shell, mobileMode) {
  if (!shell) return;
  shell.dataset.helpInline = mobileMode ? '1' : '0';
}

function updateHeroAlignment() {
  const shell = document.querySelector('.pp-widget-shell');
  if (!shell) {
    if (DOCK_DEBUG_ON) publishDockDebug('align:no-shell');
    return;
  }

  const viewportState = window.PP_viewportState || null;
  const isMobile = isMobileDockLayout();
  const mobileReason = getMobileDockReason();
  const isNarrow = window.matchMedia('(max-width: 980px)').matches;
  const isShort = viewportState ? viewportState.short : window.matchMedia('(max-height: 760px)').matches;
  const isXShort = viewportState ? viewportState.xshort : window.matchMedia('(max-height: 620px)').matches;
  const root = document.documentElement;
  const side = shell.dataset.widgetSide === 'right' ? 'right' : 'left';
  const viewport = window.visualViewport;
  const viewportHeight = Number.isFinite(viewport?.height) ? viewport.height : window.innerHeight;
  const viewportOffsetTop = Number.isFinite(viewport?.offsetTop) ? viewport.offsetTop : 0;
  const keyboardInset = Math.max(0, Math.round(window.innerHeight - (viewportOffsetTop + viewportHeight)));
  const mobileDense = isMobile && (window.innerWidth <= 380 || viewportHeight <= 700 || isXShort);

  function clearMobileDockState() {
    shell.dataset.mobileDock = '0';
    shell.dataset.mobileReason = 'none';
    shell.dataset.mobileDense = '0';
    shell.dataset.mobileShort = '0';
    shell.dataset.keyboardOpen = '0';
    if (!shell.dataset.mobileInput) shell.dataset.mobileInput = '0';
    shell.style.removeProperty('--pp-widget-mobile-bottom');
    shell.style.removeProperty('--pp-help-pill-mobile-bottom');
    shell.style.removeProperty('--pp-help-pill-mobile-right');
    shell.style.removeProperty('--pp-mobile-visible-widgets');
    shell.style.removeProperty('--pp-mobile-bubble-size');
    shell.style.removeProperty('--pp-mobile-dock-gap');
    root.style.removeProperty('--pp-widget-mobile-reserve');
    root.style.removeProperty('--pp-widget-content-gutter-left');
    root.style.removeProperty('--pp-widget-content-gutter-right');
    document.body.classList.remove('pp-widget-mobile-active');
  }

  if (isMobile) {
    placeHelpPillForDockMode(shell, true);
    shell.style.removeProperty('--pp-widget-dock-top');
    shell.style.removeProperty('--pp-help-pill-bottom');
    shell.style.removeProperty('--pp-widget-scale');
    root.style.removeProperty('--pp-widget-panel-top');
    root.style.removeProperty('--pp-widget-panel-max');
    const mobileShort = isXShort || viewportHeight <= 700;
    const keyboardOpen = keyboardInset >= 120;
    const mobileWidth = window.innerWidth;
    const mobileVisibleWidgets = mobileWidth <= 360 ? 5 : (mobileWidth <= 430 ? 6 : 7);
    const mobileBubbleSize = mobileWidth <= 360 ? 42 : (mobileShort ? 44 : 46);
    const mobileDockGap = mobileWidth <= 360 ? 6 : (mobileShort ? 7 : 8);
    shell.dataset.dockMode = 'bottom';
    shell.dataset.mobileDock = '1';
    shell.dataset.mobileReason = mobileReason;
    shell.dataset.mobileDense = mobileDense ? '1' : '0';
    shell.dataset.mobileShort = mobileShort ? '1' : '0';
    shell.dataset.keyboardOpen = keyboardOpen ? '1' : '0';
    root.style.setProperty('--pp-widget-dock-gutter', '0px');
    root.style.setProperty('--pp-widget-dock-gutter-right', '0px');
    root.style.setProperty('--pp-widget-content-gutter-left', '0px');
    root.style.setProperty('--pp-widget-content-gutter-right', '0px');
    root.style.setProperty('--pp-hero-rail-shift', '0px');
    document.body.classList.add('pp-widget-mobile-active');
    shell.style.setProperty('--pp-mobile-visible-widgets', String(mobileVisibleWidgets));
    shell.style.setProperty('--pp-mobile-bubble-size', `${mobileBubbleSize}px`);
    shell.style.setProperty('--pp-mobile-dock-gap', `${mobileDockGap}px`);

    const bottomBase = isXShort ? 24 : (mobileShort ? 20 : (isShort ? 16 : 14));
    const mobileBottom = Math.max(10, bottomBase + keyboardInset);
    shell.style.setProperty('--pp-widget-mobile-bottom', `${mobileBottom}px`);
    shell.style.removeProperty('--pp-help-pill-mobile-bottom');
    shell.style.removeProperty('--pp-help-pill-mobile-right');

    const dock = shell.querySelector('.pp-widget-dock');
    let reserve = Math.max(88, 102 + keyboardInset);
    if (dock) {
      const dockRect = dock.getBoundingClientRect();
      reserve = Math.max(reserve, Math.round(window.innerHeight - dockRect.top + 14));
    }
    root.style.setProperty('--pp-widget-mobile-reserve', `${reserve}px`);

    if (shell.dataset.aligning === '1') delete shell.dataset.aligning;
    scheduleEmptyDockRecovery('align-mobile');
    if (DOCK_DEBUG_ON) {
      publishDockDebug('align:mobile', {
        mobileReason,
        keyboardInset,
        keyboardOpen,
        mobileShort,
        mobileDense,
        mobileVisibleWidgets,
        mobileBottom,
        reserve
      });
    }
    return;
  }

  clearMobileDockState();
  placeHelpPillForDockMode(shell, false);
  shell.dataset.mobileReason = 'none';

  const navOffset = getNavOffset();
  const headerBottom = getHeaderBottom(navOffset);
  const dock = shell.querySelector('.pp-widget-dock');
  const dockRect = dock?.getBoundingClientRect?.() || null;
  const dockRawHeight = Math.max(180, Math.round(dockRect?.height || 340));
  const widthScale = clamp(window.innerWidth / 1440, 0.9, 1.08);
  const heightScale = clamp(window.innerHeight / 920, 0.9, 1.05);
  const continuousScale = clamp(Math.min(widthScale, heightScale), 0.9, 1.06);
  const verticalRoom = Math.max(120, window.innerHeight - headerBottom - 14);
  const fitScale = clamp(verticalRoom / dockRawHeight, 0.78, 1.06);
  const appliedScale = clamp(Math.min(continuousScale, fitScale), 0.78, 1.06);
  shell.style.setProperty('--pp-widget-scale', String(Math.round(appliedScale * 1000) / 1000));

  const offset = 16; // gently lower to align with hero center
  const dockHalf = Math.round((dockRawHeight * appliedScale) / 2);
  const available = Math.max(220, window.innerHeight - headerBottom);
  const minTopByHeader = headerBottom + dockHalf + 10;
  const maxTopByViewport = Math.max(minTopByHeader + 30, window.innerHeight - dockHalf - 10);
  const minTop = Math.max(
    minTopByHeader,
    navOffset + (isShort ? 120 : Math.min(180, available * 0.25))
  );
  const maxTop = Math.max(minTop + 30, maxTopByViewport);

  let targetCenter = headerBottom + (available / 2) + offset;
  const hero = document.querySelector('.hero-slider-container') || document.querySelector('.hero-backdrop');
  const heroRect = hero?.getBoundingClientRect?.() || null;
  const heroVisible = !!(heroRect && heroRect.height > 0 && heroRect.bottom > (headerBottom + 40) && heroRect.top < (window.innerHeight - 80));
  const visibleHeight = heroRect
    ? Math.max(0, Math.min(heroRect.bottom, window.innerHeight) - Math.max(heroRect.top, headerBottom + 8))
    : 0;
  const visibleRatio = heroRect && heroRect.height > 0 ? (visibleHeight / heroRect.height) : 0;
  const heroAnchorActive = !!(heroVisible && heroRect && heroRect.bottom > (window.innerHeight * 0.45) && visibleRatio > 0.34);

  if (heroAnchorActive) {
    const visibleTop = Math.max(heroRect.top, headerBottom + 8);
    const visibleBottom = Math.min(heroRect.bottom, window.innerHeight - 80);
    if (visibleBottom > visibleTop) {
      const anchor = isShort ? 0.62 : 0.5;
      targetCenter = visibleTop + (visibleBottom - visibleTop) * anchor;
    }
  } else {
    const standardAnchor = isShort ? 0.55 : 0.49;
    targetCenter = Math.max(minTop, Math.min(maxTop, headerBottom + (available * standardAnchor)));
  }

  const clampedCenter = Math.max(minTop, Math.min(maxTop, targetCenter));
  let finalCenter = clampedCenter;
  shell.style.setProperty('--pp-widget-dock-top', `${Math.round(finalCenter)}px`);
  if (dock) {
    const positionedRect = dock.getBoundingClientRect();
    const topGuard = headerBottom + 8;
    if (positionedRect.top < topGuard) {
      const nudge = Math.round(topGuard - positionedRect.top);
      finalCenter = Math.min(window.innerHeight - 60, finalCenter + nudge);
      shell.style.setProperty('--pp-widget-dock-top', `${Math.round(finalCenter)}px`);
    }
  }
  shell.dataset.compact = (isNarrow || isShort) ? '1' : '0';
  shell.dataset.dockMode = 'side';

  const availablePanel = Math.max(260, window.innerHeight - navOffset - 80);
  const panelTop = navOffset + (availablePanel / 2);
  root.style.setProperty('--pp-widget-panel-top', `${Math.round(panelTop)}px`);
  root.style.setProperty('--pp-widget-panel-max', `${Math.round(availablePanel)}px`);

  const rail = document.querySelector('.hero-rail');
  if (dock && rail) {
    const rootStyle = getComputedStyle(root);
    const currentRailShift = readCssNumberPx(rootStyle, '--pp-hero-rail-shift') || 0;
    const railRect = rail.getBoundingClientRect();
    const railLeft = railRect.left - currentRailShift;
    const railRight = railRect.right - currentRailShift;
    const overlap = side === 'right'
      ? Math.max(0, Math.round(railRight - dockRect.left + 20))
      : Math.max(0, Math.round(dockRect.right + 20 - railLeft));
    const dockReserve = shell.dataset.widgetCollapsed === '1' ? 34 : 48;
    const gutterCap = shell.dataset.widgetCollapsed === '1' ? 150 : 220;
    const overlapCap = shell.dataset.widgetCollapsed === '1' ? 150 : 220;
    const gutter = Math.min(gutterCap, Math.max(Math.min(overlap, overlapCap), dockReserve));
    const centerShift = window.innerWidth >= 1800
      ? Math.min(18, Math.round(gutter * 0.1))
      : (window.innerWidth >= 1500
        ? Math.min(10, Math.round(gutter * 0.06))
        : 0);
    const signedShift = side === 'right' ? centerShift : -centerShift;
    root.style.setProperty('--pp-hero-rail-shift', `${signedShift}px`);
    if (side === 'right') {
      root.style.setProperty('--pp-widget-dock-gutter', '0px');
      root.style.setProperty('--pp-widget-dock-gutter-right', `${gutter}px`);
    } else {
      root.style.setProperty('--pp-widget-dock-gutter', `${gutter}px`);
      root.style.setProperty('--pp-widget-dock-gutter-right', '0px');
    }
  } else {
    root.style.setProperty('--pp-widget-dock-gutter', '0px');
    root.style.setProperty('--pp-widget-dock-gutter-right', '0px');
    root.style.setProperty('--pp-hero-rail-shift', '0px');
  }

  if (dock) {
    const wantsContentGutter = window.innerWidth >= 981 && window.innerWidth <= 1440;
    const contentGutter = wantsContentGutter
      ? Math.round(clamp(dockRect.width + 16, 38, 92))
      : 0;
    if (side === 'right') {
      root.style.setProperty('--pp-widget-content-gutter-left', '0px');
      root.style.setProperty('--pp-widget-content-gutter-right', `${contentGutter}px`);
    } else {
      root.style.setProperty('--pp-widget-content-gutter-left', `${contentGutter}px`);
      root.style.setProperty('--pp-widget-content-gutter-right', '0px');
    }
  } else {
    root.style.setProperty('--pp-widget-content-gutter-left', '0px');
    root.style.setProperty('--pp-widget-content-gutter-right', '0px');
  }

  const helpPill = shell.querySelector('.pp-help-pill');
  if (helpPill && heroAnchorActive && heroRect) {
    const helpRect = helpPill.getBoundingClientRect();
    const pillHeight = Math.max(40, Math.round(helpRect.height || 56));
    const targetTop = heroRect.bottom - (pillHeight / 2);
    const minTop = headerBottom + Math.max(24, Math.round(window.innerHeight * 0.14));
    const maxTop = Math.max(minTop, window.innerHeight - pillHeight - 6);
    const clampedTop = Math.max(minTop, Math.min(maxTop, targetTop));
    const bottom = Math.max(6, Math.round(window.innerHeight - clampedTop - pillHeight));
    shell.style.setProperty('--pp-help-pill-bottom', `${bottom}px`);
  } else {
    shell.style.removeProperty('--pp-help-pill-bottom');
  }
  if (shell.dataset.aligning === '1') delete shell.dataset.aligning;
  scheduleEmptyDockRecovery('align-desktop');
  if (DOCK_DEBUG_ON) {
    publishDockDebug('align:desktop', {
      heroAnchorActive,
      headerBottom,
      navOffset,
      finalCenter: Math.round(finalCenter)
    });
  }
}

function safeUpdateHeroAlignment() {
  try {
    updateHeroAlignment();
  } catch (e) {
    console.warn('[widgetDock] alignment failed:', e);
    if (DOCK_DEBUG_ON) {
      publishDockDebug('align:error', {
        error: String(e?.message || e || 'unknown')
      });
    }
  } finally {
    clearAligningFlag();
    maybeRefreshWidgetBarForViewport('alignment');
  }
}

function scheduleHeroAlignment() {
  safeUpdateHeroAlignment();
  requestAnimationFrame(safeUpdateHeroAlignment);
  setTimeout(safeUpdateHeroAlignment, 200);
  setTimeout(safeUpdateHeroAlignment, 800);
  setTimeout(safeUpdateHeroAlignment, 1600);
}

let alignRaf = 0;
let lastAlignAt = 0;
function requestAlignment() {
  if (alignRaf) return;
  alignRaf = requestAnimationFrame(() => {
    alignRaf = 0;
    const now = performance.now();
    if (now - lastAlignAt < 84) return;
    lastAlignAt = now;
    safeUpdateHeroAlignment();
  });
}

const VIEWPORT_REFRESH_MIN_WIDTH_DELTA = 12;
const VIEWPORT_REFRESH_DEBOUNCE_MS = 140;
let viewportRefreshTimer = 0;
let lastRefreshWidth = getViewportWidth();
let lastRefreshMobileDock = isMobileDockLayout();
let viewportRefreshActive = false;

function getViewportWidth() {
  const viewport = window.visualViewport;
  const width = Number.isFinite(viewport?.width)
    ? viewport.width
    : (window.innerWidth || document.documentElement.clientWidth || 0);
  return Math.max(0, Math.round(width));
}

function clearViewportSizingState(shell) {
  const root = document.documentElement;
  shell?.style?.removeProperty('--pp-widget-dock-top');
  shell?.style?.removeProperty('--pp-widget-scale');
  shell?.style?.removeProperty('--pp-help-pill-bottom');
  shell?.style?.removeProperty('--pp-widget-mobile-bottom');
  shell?.style?.removeProperty('--pp-help-pill-mobile-bottom');
  shell?.style?.removeProperty('--pp-help-pill-mobile-right');
  shell?.style?.removeProperty('--pp-mobile-visible-widgets');
  shell?.style?.removeProperty('--pp-mobile-bubble-size');
  shell?.style?.removeProperty('--pp-mobile-dock-gap');
  root.style.setProperty('--pp-widget-dock-gutter', '0px');
  root.style.setProperty('--pp-widget-dock-gutter-right', '0px');
  root.style.setProperty('--pp-widget-content-gutter-left', '0px');
  root.style.setProperty('--pp-widget-content-gutter-right', '0px');
  root.style.setProperty('--pp-hero-rail-shift', '0px');
  root.style.removeProperty('--pp-widget-mobile-reserve');
  root.style.removeProperty('--pp-widget-panel-top');
  root.style.removeProperty('--pp-widget-panel-max');
  document.body.classList.remove('pp-widget-mobile-active');
}

function refreshWidgetBarForViewport(detail = {}) {
  if (viewportRefreshActive) return;
  viewportRefreshActive = true;
  const shell = document.querySelector('.pp-widget-shell');
  const dock = shell?.querySelector?.('.pp-widget-dock') || null;
  if (shell) {
    shell.dataset.aligning = '1';
    shell.dataset.viewportRefreshAt = String(Date.now());
    clearViewportSizingState(shell);
  }
  try {
    document.dispatchEvent(new CustomEvent('pp:widgetDock:viewport-refresh', {
      detail: {
        reason: detail.reason || 'resize',
        width: detail.width,
        previousWidth: detail.previousWidth,
        widthDelta: detail.widthDelta,
        mobileDock: detail.mobileDock,
        mobileChanged: detail.mobileChanged
      }
    }));
  } catch {}
  scheduleHeroAlignment();
  setTimeout(() => {
    viewportRefreshActive = false;
    clearAligningFlag();
  }, 420);
  scheduleEmptyDockRecovery('viewport-refresh');
  if (DOCK_DEBUG_ON) {
    publishDockDebug('viewport:refresh', {
      ...detail,
      dockBubbles: dock?.querySelectorAll?.('.pp-widget-bubble')?.length || 0
    });
  }
}

function maybeRefreshWidgetBarForViewport(reason = 'alignment') {
  if (viewportRefreshActive) return;
  const width = getViewportWidth();
  const mobileDock = isMobileDockLayout();
  const widthDelta = Math.abs(width - lastRefreshWidth);
  const mobileChanged = mobileDock !== lastRefreshMobileDock;
  if (widthDelta < VIEWPORT_REFRESH_MIN_WIDTH_DELTA && !mobileChanged) return;

  const previousWidth = lastRefreshWidth;
  lastRefreshWidth = width;
  lastRefreshMobileDock = mobileDock;
  refreshWidgetBarForViewport({
    reason,
    width,
    previousWidth,
    widthDelta,
    mobileDock,
    mobileChanged
  });
}

function scheduleViewportRefresh(reason = 'resize') {
  if (viewportRefreshActive) return;
  const width = getViewportWidth();
  const mobileDock = isMobileDockLayout();
  const widthDelta = Math.abs(width - lastRefreshWidth);
  const mobileChanged = mobileDock !== lastRefreshMobileDock;
  if (widthDelta < VIEWPORT_REFRESH_MIN_WIDTH_DELTA && !mobileChanged) return;

  if (viewportRefreshTimer) clearTimeout(viewportRefreshTimer);
  viewportRefreshTimer = setTimeout(() => {
    viewportRefreshTimer = 0;
    const finalWidth = getViewportWidth();
    const finalMobileDock = isMobileDockLayout();
    const finalDelta = Math.abs(finalWidth - lastRefreshWidth);
    const finalMobileChanged = finalMobileDock !== lastRefreshMobileDock;
    if (finalDelta < VIEWPORT_REFRESH_MIN_WIDTH_DELTA && !finalMobileChanged) return;

    const previousWidth = lastRefreshWidth;
    lastRefreshWidth = finalWidth;
    lastRefreshMobileDock = finalMobileDock;
    refreshWidgetBarForViewport({
      reason,
      width: finalWidth,
      previousWidth,
      widthDelta: finalDelta,
      mobileDock: finalMobileDock,
      mobileChanged: finalMobileChanged
    });
  }, VIEWPORT_REFRESH_DEBOUNCE_MS);
}

function isEditableInput(node) {
  if (!(node instanceof Element)) return false;
  if (node.closest('.pp-widget-shell')) return false;
  if (node.isContentEditable) return true;
  return !!node.closest('input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
}

function hasCoarsePointer() {
  try {
    return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
  } catch {
    return (navigator.maxTouchPoints || 0) > 0;
  }
}

function updateMobileInputState() {
  const shell = document.querySelector('.pp-widget-shell');
  if (!shell) return;
  if (!isMobileDockLayout()) {
    shell.dataset.mobileInput = '0';
    return;
  }
  // Avoid hiding dock on desktop/laptop short-height windows while typing.
  if (!hasCoarsePointer()) {
    shell.dataset.mobileInput = '0';
    return;
  }
  const active = document.activeElement;
  const viewport = window.visualViewport;
  const viewportHeight = Number.isFinite(viewport?.height) ? viewport.height : window.innerHeight;
  const viewportOffsetTop = Number.isFinite(viewport?.offsetTop) ? viewport.offsetTop : 0;
  const keyboardInset = Math.max(0, Math.round(window.innerHeight - (viewportOffsetTop + viewportHeight)));
  const keyboardOpen = keyboardInset >= 120;
  shell.dataset.keyboardOpen = keyboardOpen ? '1' : '0';
  shell.dataset.mobileInput = isEditableInput(active) && keyboardOpen ? '1' : '0';
}

export async function injectWidgetDock() {
  if (document.body == null) {
    window.addEventListener('DOMContentLoaded', () => injectWidgetDock(), { once: true });
    return;
  }

  if (DOCK_DEBUG_ON) publishDockDebug('inject:start');
  const container = ensureContainer();
  if (container.dataset.ppWidgetDockInjected === '1' || container.querySelector('[data-widget-dock]')) {
    await initBand();
    if (DOCK_DEBUG_ON) publishDockDebug('inject:already-present');
    return;
  }

  try {
    const html = await fetchWidgetDockHtml();
    container.innerHTML = extractShellHtml(html);
    const shell = container.querySelector('.pp-widget-shell');
    if (shell) shell.dataset.aligning = '1';
    container.dataset.ppWidgetDockInjected = '1';
    try { document.dispatchEvent(new CustomEvent('pp:widgetDock:ready')); } catch {}
    console.log('[widgetDock] injected');
    if (DOCK_DEBUG_ON) publishDockDebug('inject:success');
  } catch (e) {
    console.error('[widgetDock] injection failed:', e);
    if (DOCK_DEBUG_ON) {
      publishDockDebug('inject:error', {
        error: String(e?.message || e || 'unknown')
      });
    }
  } finally {
    await initBand();
    scheduleHeroAlignment();
    setTimeout(() => clearAligningFlag(), 1200);
    setTimeout(() => scheduleEmptyDockRecovery('inject-post-align'), 160);
    if (DOCK_DEBUG_ON) setTimeout(() => publishDockDebug('inject:post-align'), 250);
  }
}

document.addEventListener('pp:hero:ready', () => scheduleHeroAlignment());
document.addEventListener('pp:navbar:ready', () => scheduleHeroAlignment());
document.addEventListener('pp:widgetDock:settings', () => scheduleHeroAlignment());
window.addEventListener('load', () => scheduleHeroAlignment(), { once: true });
window.addEventListener('resize', () => {
  requestAlignment();
  scheduleViewportRefresh('resize');
}, { passive: true });
window.addEventListener('scroll', () => requestAlignment(), { passive: true });
window.addEventListener('orientationchange', () => {
  requestAlignment();
  scheduleViewportRefresh('orientationchange');
}, { passive: true });
document.addEventListener('focusin', () => {
  updateMobileInputState();
  requestAlignment();
}, true);
document.addEventListener('focusout', () => {
  setTimeout(() => {
    updateMobileInputState();
    requestAlignment();
  }, 50);
}, true);
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    requestAlignment();
    scheduleViewportRefresh('visualViewport.resize');
  }, { passive: true });
  window.visualViewport.addEventListener('scroll', () => requestAlignment(), { passive: true });
}
