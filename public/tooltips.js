// /public/tooltips.js
const TOOLTIP_SELECTOR = '[data-tooltip]';
const SHOW_DELAY = 120;
const HIDE_DELAY = 90;
const VIEWPORT_MARGIN = 10;
const OFFSET = 10;

let tooltipEl = null;
let activeEl = null;
let hideTimer = 0;
let showTimer = 0;

function isTouchLike() {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'pp-tooltip';
  tooltipEl.id = 'pp-global-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function getTooltipText(el) {
  const raw = String(el?.getAttribute('data-tooltip') || '');
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 240 ? `${normalized.slice(0, 237)}...` : normalized;
}

function placeTooltip(el) {
  if (!tooltipEl || !el) return;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  tooltipEl.classList.add('is-measuring');
  tooltipEl.dataset.placement = 'top';
  const tipRect = tooltipEl.getBoundingClientRect();
  tooltipEl.classList.remove('is-measuring');

  if (tipRect.width <= 0 || tipRect.height <= 0) return false;

  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
  left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(left, window.innerWidth - tipRect.width - VIEWPORT_MARGIN)
  );

  let top = rect.top - tipRect.height - OFFSET;
  let placement = 'top';
  if (top < VIEWPORT_MARGIN) {
    top = rect.bottom + OFFSET;
    placement = 'bottom';
  }

  tooltipEl.style.left = `${Math.round(left)}px`;
  tooltipEl.style.top = `${Math.round(top)}px`;
  tooltipEl.dataset.placement = placement;
  return true;
}

function showTooltip(el) {
  const text = getTooltipText(el);
  if (!text) return;

  clearTimeout(hideTimer);
  clearTimeout(showTimer);

  const tip = ensureTooltip();
  if (tip.textContent !== text) tip.textContent = text;
  tip.setAttribute('aria-hidden', 'false');
  activeEl = el;
  el.setAttribute('aria-describedby', tip.id);

  requestAnimationFrame(() => {
    const placed = placeTooltip(el);
    if (!placed) {
      hideTooltip();
      return;
    }
    tip.classList.add('is-visible');
  });
}

function hideTooltip() {
  clearTimeout(hideTimer);
  clearTimeout(showTimer);
  if (!tooltipEl) return;
  tooltipEl.classList.remove('is-visible');
  tooltipEl.setAttribute('aria-hidden', 'true');
  if (activeEl) activeEl.removeAttribute('aria-describedby');
  activeEl = null;
}

function scheduleShow(el, delay = SHOW_DELAY) {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  showTimer = window.setTimeout(() => showTooltip(el), delay);
}

function scheduleHide(delay = HIDE_DELAY) {
  clearTimeout(showTimer);
  hideTimer = window.setTimeout(() => hideTooltip(), delay);
}

function addAutoHints(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const rules = [
    ['.hero-button', 'Open this featured destination.'],
    ['.arrow.prev', 'View previous hero slide.'],
    ['.arrow.next', 'View next hero slide.'],
    ['.pause-btn', 'Pause or resume hero autoplay.'],
    ['.hero-indicator', 'Jump to a specific hero slide.'],
    ['.pp-impact-btn', 'Primary action for this section.'],
    ['.pp-ghost-btn', 'Secondary action for this section.'],
    ['#pp-search', 'Type to filter products by keyword.'],
    ['#pp-category', 'Filter products by pet type or category.'],
    ['#pp-sort', 'Sort products by relevance, price, or title.'],
    ['#pp-subscribe-toggle', 'Toggle subscription box products.'],
    ['#pp-my-pets-toggle', 'Show picks matched to your pet profiles.'],
    ['#pp-page-size', 'Control how many products appear per page.'],
    ['.pp-help-toggle', 'Open support tools and quick help actions.'],
    ['.pp-help-tip-btn', 'Show another quick care tip.'],
    ['.pp-panel-close', 'Close this panel.'],
    ['.pp-panel-reset', 'Restore default widget setup.'],
    ['.pp-panel-remove', 'Hide this widget from the dock.'],
    ['.pp-help-chip', 'Open this support shortcut.'],
    ['.pp-help-card', 'Open this help topic.'],
    ['[data-app-int-toggle]', 'Connect or disconnect this provider.'],
    ['[data-app-int-reload]', 'Refresh provider states.'],
    ['.pp-subnav-drop > summary', 'Open this submenu.']
  ];

  const skipHint = (el) => {
    if (!el) return true;
    if (el.closest('.pp-widget-dock') && el.closest('.pp-widget-bubble')) return true;
    if (el.closest('.pp-widget-app-header')) return true;
    return false;
  };

  rules.forEach(([selector, hint]) => {
    root.querySelectorAll(selector).forEach((el) => {
      if (skipHint(el)) return;
      if (!el.hasAttribute('data-tooltip')) {
        el.setAttribute('data-tooltip', hint);
      }
    });
  });

  root.querySelectorAll('[data-subnav-toggle]').forEach((btn) => {
    if (btn.hasAttribute('data-tooltip')) return;
    const label = (btn.textContent || '').trim().toLowerCase();
    btn.setAttribute('data-tooltip', `Open ${label} links.`);
  });
}

function onPointerEnter(e) {
  const el = e.target.closest(TOOLTIP_SELECTOR);
  if (!el) return;
  if (isTouchLike()) return;
  if (el.closest('.pp-widget-dock') && el.closest('.pp-widget-bubble')) return;
  if (e.relatedTarget && el.contains(e.relatedTarget)) return;
  scheduleShow(el, SHOW_DELAY);
}

function onPointerLeave(e) {
  const el = e.target.closest(TOOLTIP_SELECTOR);
  if (!el) return;
  if (isTouchLike()) return;
  if (e.relatedTarget && el.contains(e.relatedTarget)) return;
  scheduleHide(HIDE_DELAY);
}

function onFocusIn(e) {
  const el = e.target.closest(TOOLTIP_SELECTOR);
  if (!el) return;
  if (el.closest('.pp-widget-dock') && el.closest('.pp-widget-bubble')) return;
  scheduleShow(el, 80);
}

function onFocusOut(e) {
  const el = e.target.closest(TOOLTIP_SELECTOR);
  if (!el) return;
  scheduleHide(60);
}

function onTouchClick(e) {
  if (!isTouchLike()) return;

  const el = e.target.closest(TOOLTIP_SELECTOR);
  if (!el) return;

  const now = Date.now();
  const lastTap = Number(el.dataset.tooltipTapTs || 0);
  const blockFirstTap = el.getAttribute('data-tooltip-tap-hold') === 'true';

  if (!lastTap || (now - lastTap) > 1600) {
    el.dataset.tooltipTapTs = String(now);
    showTooltip(el);

    if (blockFirstTap) {
      e.preventDefault();
      e.stopPropagation();
    }

    window.setTimeout(() => {
      if (activeEl === el) hideTooltip();
      el.dataset.tooltipTapTs = '0';
    }, 1600);
  } else {
    el.dataset.tooltipTapTs = '0';
    hideTooltip();
  }
}

let wired = false;

export function initTooltips(root = document) {
  addAutoHints(root);

  if (wired) return;
  wired = true;

  ensureTooltip();

  document.addEventListener('pointerover', onPointerEnter, true);
  document.addEventListener('pointerout', onPointerLeave, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('click', onTouchClick, true);
  document.addEventListener('pointerdown', (e) => {
    if (!activeEl) return;
    const hit = e.target?.closest?.(TOOLTIP_SELECTOR);
    if (!hit || hit !== activeEl) hideTooltip();
  }, true);

  window.addEventListener('scroll', () => {
    if (activeEl) placeTooltip(activeEl);
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (activeEl) placeTooltip(activeEl);
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideTooltip();
  });

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        addAutoHints(node);
      });
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });
}
