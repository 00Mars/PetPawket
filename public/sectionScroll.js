const HOME_PATHS = new Set(['/', '/index.html']);

const HOME_SECTIONS = [
  { selector: '#hero-container', label: 'Story' },
  { selector: '#pp-expansion', label: 'Care' },
  { selector: '#pp-packs', label: 'Packs' },
  { selector: '#pp-stories', label: 'Stories' },
  { selector: '#pp-charm-impact', label: 'CHARM' },
  { selector: '#pp-world', label: 'Haven' },
  { selector: '#mission-container', label: 'Mission' },
  { selector: '#pp-featured', label: 'Featured' },
  { selector: '#news-container', label: 'News' },
];

const state = {
  sections: [],
  rail: null,
  track: null,
  topButton: null,
  mutationObserver: null,
  resizeObserver: null,
  updateFrame: 0,
  refreshTimer: 0,
  activeId: '',
  ready: false,
  trackDragBound: false,
  trackDragState: null,
  suppressTrackClickUntil: 0,
};

function isHomePage() {
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  return HOME_PATHS.has(path);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function navOffset() {
  const root = getComputedStyle(document.documentElement);
  const fromVar = Number.parseFloat(root.getPropertyValue('--nav-offset'));
  if (Number.isFinite(fromVar) && fromVar > 0) return Math.round(fromVar);

  const header = document.querySelector('#navbar-container .pp-header');
  const subnav = document.querySelector('#navbar-container .pp-subnav');
  const headerHeight = header?.getBoundingClientRect?.().height || 0;
  const subnavHeight = subnav?.getBoundingClientRect?.().height || 0;
  return Math.round(headerHeight + subnavHeight);
}

function currentScrollTop() {
  return Math.round(window.scrollY || window.pageYOffset || 0);
}

function maxScrollTop() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0);
  const viewportHeight = window.innerHeight || doc?.clientHeight || 0;
  return Math.max(0, scrollHeight - viewportHeight);
}

function clampScrollTop(value) {
  return Math.max(0, Math.min(maxScrollTop(), Math.round(value)));
}

function sectionTargetTop(section) {
  if (!section) return 0;
  const rect = section.getBoundingClientRect();
  const clearance = Math.max(8, Math.min(18, window.innerHeight * 0.018));
  return clampScrollTop(currentScrollTop() + rect.top - navOffset() - clearance);
}

function discoverSections() {
  const found = [];
  HOME_SECTIONS.forEach((entry) => {
    const node = document.querySelector(entry.selector);
    if (!node?.isConnected || found.some((item) => item.node === node)) return;
    found.push({ node, label: entry.label });
  });
  return found;
}

function sectionNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function ensureRail() {
  if (!state.rail) {
    state.rail = document.createElement('nav');
    state.rail.className = 'pp-section-index';
    state.rail.setAttribute('aria-label', 'Home sections');
    state.rail.innerHTML = `
      <span class="pp-section-index-kicker">Sections</span>
      <span class="pp-section-index-line" aria-hidden="true"></span>
      <span class="pp-section-index-track"></span>
    `;
    state.track = state.rail.querySelector('.pp-section-index-track');
  }

  if (state.rail.parentNode !== document.body) {
    document.body.appendChild(state.rail);
  }

  bindTrackScrollInteractions();
}

function isTrackScrollable(track) {
  return !!track && track.scrollWidth > track.clientWidth + 2;
}

function endTrackDrag() {
  const drag = state.trackDragState;
  if (!drag) return;
  drag.track.classList.remove('is-dragging');
  if (drag.moved) {
    state.suppressTrackClickUntil = Date.now() + 260;
  }
  state.trackDragState = null;
}

function bindTrackScrollInteractions() {
  if (!state.track || state.trackDragBound) return;
  state.trackDragBound = true;

  state.track.addEventListener('pointerdown', (event) => {
    if (event.button != null && event.button !== 0) return;
    if (!isTrackScrollable(state.track)) return;
    state.trackDragState = {
      track: state.track,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: state.track.scrollLeft,
      axis: '',
      moved: false,
    };
    state.track.setPointerCapture?.(event.pointerId);
  });

  state.track.addEventListener('pointermove', (event) => {
    const drag = state.trackDragState;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (!drag.axis) {
      if (adx < 4 && ady < 4) return;
      drag.axis = adx >= ady ? 'x' : 'y';
      if (drag.axis !== 'x') {
        state.trackDragState = null;
        return;
      }
      drag.track.classList.add('is-dragging');
    }

    if (drag.axis !== 'x') return;
    drag.moved = drag.moved || adx > 5;
    drag.track.scrollLeft = drag.startLeft - dx;
    event.preventDefault();
  });

  state.track.addEventListener('pointerup', endTrackDrag);
  state.track.addEventListener('pointercancel', endTrackDrag);
  state.track.addEventListener('pointerleave', endTrackDrag);

  state.track.addEventListener('wheel', (event) => {
    if (!isTrackScrollable(state.track)) return;
    const horizontal = Math.abs(event.deltaX) >= Math.abs(event.deltaY);
    const delta = horizontal ? event.deltaX : event.deltaY;
    if (!delta) return;
    state.track.scrollLeft += delta;
    event.preventDefault();
  }, { passive: false });
}

function ensureTopButton() {
  if (!state.topButton) {
    state.topButton = document.createElement('button');
    state.topButton.className = 'pp-return-top';
    state.topButton.type = 'button';
    state.topButton.setAttribute('aria-label', 'Return to top');
    state.topButton.innerHTML = '<i class="bi bi-arrow-up-short" aria-hidden="true"></i><span>Top</span>';
    state.topButton.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
  }

  if (state.topButton.parentNode !== document.body) {
    document.body.appendChild(state.topButton);
  }
}

function renderRail() {
  ensureRail();
  ensureTopButton();

  if (!state.track) return;
  state.track.innerHTML = state.sections.map((section, index) => {
    const number = sectionNumber(index);
    const label = section.label;
    return `
      <button class="pp-section-index-btn" type="button" data-pp-section-target="${escapeHtml(section.node.id)}" aria-label="Go to ${escapeHtml(number)} ${escapeHtml(label)}">
        <span class="pp-section-index-num">${number}</span>
        <span class="pp-section-index-label">${escapeHtml(label)}</span>
      </button>
    `;
  }).join('');

  state.track.querySelectorAll('[data-pp-section-target]').forEach((button) => {
    button.addEventListener('click', () => {
      if (Date.now() < state.suppressTrackClickUntil) return;
      const target = document.getElementById(button.dataset.ppSectionTarget || '');
      if (!target) return;
      window.scrollTo({
        top: sectionTargetTop(target),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    });
  });
}

function applySectionMetadata() {
  const previousNodes = new Set(state.sections.map((section) => section.node));
  const next = discoverSections();
  const nextNodes = new Set(next.map((section) => section.node));

  previousNodes.forEach((node) => {
    if (nextNodes.has(node)) return;
    node.classList.remove('pp-scroll-scene', 'is-active-section');
    node.removeAttribute('data-pp-section-index');
    node.removeAttribute('data-pp-section-label');
    node.style.removeProperty('--pp-section-order');
    node.style.removeProperty('--pp-section-progress');
  });

  next.forEach((section, index) => {
    const number = sectionNumber(index);
    section.node.classList.add('pp-scroll-scene');
    section.node.dataset.ppSectionIndex = number;
    section.node.dataset.ppSectionLabel = section.label;
    section.node.style.setProperty('--pp-section-order', String(index));
    section.node.style.setProperty('--pp-section-progress', '0');
  });

  state.sections = next;
  document.documentElement.dataset.ppSectionScenes = next.length ? '1' : '0';
  document.documentElement.dataset.ppSectionIndexMode = next.length > 1 ? 'rail' : 'hidden';

  if (state.resizeObserver) {
    state.resizeObserver.disconnect();
    state.sections.forEach((section) => state.resizeObserver.observe(section.node));
  }

  renderRail();
  scheduleUpdate();
}

function activeSectionForViewport() {
  if (!state.sections.length) return null;

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const focusY = navOffset() + Math.max(80, (viewportHeight - navOffset()) * 0.42);
  let best = state.sections[0];
  let bestDistance = Infinity;

  state.sections.forEach((section) => {
    const rect = section.node.getBoundingClientRect();
    const containsFocus = rect.top <= focusY && rect.bottom >= focusY;
    const distance = containsFocus
      ? Math.abs(((rect.top + rect.bottom) / 2) - focusY) * 0.05
      : Math.min(Math.abs(rect.top - focusY), Math.abs(rect.bottom - focusY));

    if (distance < bestDistance) {
      bestDistance = distance;
      best = section;
    }
  });

  return best;
}

function updateSectionProgress() {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const readableTop = navOffset();
  const readableHeight = Math.max(1, viewportHeight - readableTop);

  state.sections.forEach((section) => {
    const rect = section.node.getBoundingClientRect();
    const progress = (readableTop - rect.top + readableHeight * 0.38) / Math.max(1, rect.height);
    section.node.style.setProperty('--pp-section-progress', String(Math.max(0, Math.min(1, progress))));
  });
}

function updateActiveState() {
  state.updateFrame = 0;

  const active = activeSectionForViewport();
  const activeId = active?.node?.id || '';
  updateSectionProgress();

  state.sections.forEach((section) => {
    section.node.classList.toggle('is-active-section', section.node.id === activeId);
  });

  state.track?.querySelectorAll('[data-pp-section-target]').forEach((button) => {
    const isActive = button.dataset.ppSectionTarget === activeId;
    button.classList.toggle('is-active', isActive);
    if (isActive) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });

  if (activeId && activeId !== state.activeId) {
    state.activeId = activeId;
    const activeButton = state.track?.querySelector(`[data-pp-section-target="${CSS.escape(activeId)}"]`);
    activeButton?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  const threshold = Math.max(260, (window.innerHeight || 1) * 0.5);
  state.topButton?.classList.toggle('is-visible', currentScrollTop() > threshold);
}

function scheduleUpdate() {
  if (state.updateFrame) return;
  state.updateFrame = window.requestAnimationFrame(updateActiveState);
}

function scheduleRefresh() {
  window.clearTimeout(state.refreshTimer);
  state.refreshTimer = window.setTimeout(applySectionMetadata, 80);
}

function handleResize() {
  scheduleRefresh();
  scheduleUpdate();
}

function bindObservers() {
  if ('ResizeObserver' in window && !state.resizeObserver) {
    state.resizeObserver = new ResizeObserver(scheduleUpdate);
    state.sections.forEach((section) => state.resizeObserver.observe(section.node));
  }

  if (!state.mutationObserver) {
    state.mutationObserver = new MutationObserver((mutations) => {
      const onlyControlMutations = mutations.every((mutation) => {
        const target = mutation.target;
        return target instanceof Node
          && ((state.rail && state.rail.contains(target))
            || (state.topButton && state.topButton.contains(target)));
      });
      if (!onlyControlMutations) scheduleRefresh();
    });
    state.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
}

export function refreshSectionScroll() {
  if (!isHomePage()) return;
  scheduleRefresh();
}

export function initSectionScroll() {
  if (!isHomePage()) return;

  if (!state.ready) {
    state.ready = true;
    document.documentElement.dataset.ppSectionScrollReady = '1';
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('pp:navbar:ready', scheduleRefresh);
    window.addEventListener('pp:sections:refresh', scheduleRefresh);
  }

  bindObservers();
  applySectionMetadata();
}
