const HOME_PATHS = new Set(['/', '/index.html']);

const SECTION_SELECTORS = [
  '#hero-container',
  '#pp-packs',
  '#pp-expansion',
  '#pp-stories',
  '#mission-container',
  '#pp-featured',
  '#news-container'
];

const SECTION_LABELS = {
  'hero-container': 'Story',
  'pp-packs': 'Packs',
  'pp-expansion': 'Care',
  'pp-stories': 'Stories',
  'mission-container': 'Mission',
  'pp-featured': 'Featured',
  'news-container': 'News'
};

const SECTION_EDGE_TOLERANCE = 4;
const WHEEL_LINE_PX = 34;
const IN_SECTION_FINE_WHEEL_MULTIPLIER = 1.45;
const IN_SECTION_COARSE_WHEEL_MULTIPLIER = 2;
const IN_SECTION_MIN_COARSE_STEP = 260;

let sections = [];
let indexEl = null;
let topButton = null;
let observer = null;
let mutationObserver = null;
let scrollRaf = 0;
let refreshTimer = 0;
let snapWheelTimer = 0;
let snapWheelDelta = 0;
let snapLockedUntil = 0;
let snapReleaseTimer = 0;
let scrollIdleTimer = 0;
let snapInFlight = false;
let snapTargetIndex = -1;
let lastSnapAt = 0;
let lastScrollY = 0;
let lastScrollDirection = 0;
let lastScrollAt = 0;

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
    "'": '&#39;'
  }[char]));
}

function navOffset() {
  const root = getComputedStyle(document.documentElement);
  const raw = root.getPropertyValue('--nav-offset')
    || `calc(${root.getPropertyValue('--pp-header-h')} + ${root.getPropertyValue('--pp-subnav-h')})`;
  const parsed = Number.parseFloat(raw);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  const header = document.querySelector('#navbar-container .pp-header');
  const subnav = document.querySelector('#navbar-container .pp-subnav');
  const headerH = header?.getBoundingClientRect?.().height || 0;
  const subnavH = subnav?.getBoundingClientRect?.().height || 0;
  return Math.max(0, Math.round(headerH + subnavH));
}

function viewportHeight() {
  return window.innerHeight || document.documentElement.clientHeight || 0;
}

function maxScrollY() {
  const doc = document.documentElement;
  const body = document.body;
  const scrollHeight = Math.max(doc?.scrollHeight || 0, body?.scrollHeight || 0);
  return Math.max(0, scrollHeight - viewportHeight());
}

function currentScrollTop() {
  return Math.round(window.scrollY || window.pageYOffset || 0);
}

function sectionTargetTop(section) {
  if (!section) return 0;
  const rawTop = window.scrollY + section.getBoundingClientRect().top - navOffset();
  return Math.min(maxScrollY(), Math.max(0, Math.round(rawTop)));
}

function sectionDocumentTop(section) {
  if (!section) return 0;
  return window.scrollY + section.getBoundingClientRect().top;
}

function sectionScrollRange(section) {
  if (!section) return null;
  const rect = section.getBoundingClientRect();
  const visibleHeight = Math.max(1, viewportHeight() - navOffset());
  const start = sectionTargetTop(section);
  const isScrollable = rect.height > visibleHeight + SECTION_EDGE_TOLERANCE;
  const bottomAlignedTop = sectionDocumentTop(section) + rect.height - viewportHeight();
  const end = isScrollable
    ? Math.max(start, Math.min(maxScrollY(), Math.round(bottomAlignedTop)))
    : start;

  return { section, start, end, isScrollable };
}

function sectionViewportHeight() {
  return Math.max(1, viewportHeight() - navOffset());
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsScrollEnd() {
  return 'onscrollend' in window;
}

function normalizeWheelDelta(event) {
  let deltaY = Number(event.deltaY) || 0;
  if (event.deltaMode === 1) deltaY *= WHEEL_LINE_PX;
  else if (event.deltaMode === 2) deltaY *= Math.max(1, viewportHeight() - navOffset());

  const absDelta = Math.abs(deltaY);
  if (absDelta < 1) return 0;

  const multiplier = absDelta < 50
    ? IN_SECTION_FINE_WHEEL_MULTIPLIER
    : IN_SECTION_COARSE_WHEEL_MULTIPLIER;
  const boosted = deltaY * multiplier;

  if (absDelta >= 50 && Math.abs(boosted) < IN_SECTION_MIN_COARSE_STEP) {
    return Math.sign(boosted) * IN_SECTION_MIN_COARSE_STEP;
  }

  return boosted;
}

function clearPendingSnap() {
  window.clearTimeout(snapWheelTimer);
  window.clearTimeout(scrollIdleTimer);
  snapWheelDelta = 0;
  snapLockedUntil = 0;
  snapInFlight = false;
  snapTargetIndex = -1;
}

function deriveLabel(section) {
  const id = section.id || '';
  if (SECTION_LABELS[id]) return SECTION_LABELS[id];
  const heading = section.querySelector('h1, h2, h3');
  if (heading?.textContent?.trim()) {
    return heading.textContent.trim().replace(/\s+/g, ' ').slice(0, 34);
  }
  return id
    .replace(/^pp-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()) || 'Section';
}

function getSceneNodes() {
  const nodes = SECTION_SELECTORS
    .map((selector) => document.querySelector(selector))
    .filter(Boolean);
  return Array.from(new Set(nodes))
    .filter((node) => node.isConnected);
}

function ensureControls() {
  if (!indexEl) {
    indexEl = document.createElement('nav');
    indexEl.className = 'pp-section-index';
    indexEl.setAttribute('aria-label', 'Page sections');
    document.body.appendChild(indexEl);
  }

  if (!topButton) {
    topButton = document.createElement('button');
    topButton.className = 'pp-return-top';
    topButton.type = 'button';
    topButton.setAttribute('aria-label', 'Return to top');
    topButton.innerHTML = '<i class="bi bi-arrow-up-short" aria-hidden="true"></i><span>Top</span>';
    topButton.addEventListener('click', () => {
      if (sections[0]) scrollToSection(sections[0]);
      else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    document.body.appendChild(topButton);
  }
}

function releaseSnap(delay = 900) {
  window.clearTimeout(snapReleaseTimer);
  snapReleaseTimer = window.setTimeout(() => {
    snapInFlight = false;
    snapTargetIndex = -1;
    scheduleUpdate();
  }, delay);
}

function jumpToScrollTop(top) {
  const html = document.documentElement;
  const body = document.body;
  const previousHtmlBehavior = html?.style?.scrollBehavior || '';
  const previousBodyBehavior = body?.style?.scrollBehavior || '';
  const targetTop = Math.round(top);

  if (html) html.style.scrollBehavior = 'auto';
  if (body) body.style.scrollBehavior = 'auto';
  window.scrollTo(0, targetTop);
  window.setTimeout(() => window.scrollTo(0, targetTop), 0);

  window.setTimeout(() => {
    window.scrollTo(0, targetTop);
    if (html) html.style.scrollBehavior = previousHtmlBehavior;
    if (body) body.style.scrollBehavior = previousBodyBehavior;
  }, 180);
}

function scrollToSection(section, edge = 'start') {
  if (!section) return;
  const range = sectionScrollRange(section);
  const top = edge === 'end' && range?.isScrollable ? range.end : sectionTargetTop(section);
  const targetTop = Math.round(top);
  const index = sections.indexOf(section);

  window.clearTimeout(scrollIdleTimer);
  snapInFlight = true;
  snapTargetIndex = index >= 0 ? index : snapTargetIndex;
  lastSnapAt = Date.now();

  jumpToScrollTop(targetTop);
  releaseSnap(prefersReducedMotion() ? 120 : 180);
}

function getNearestSectionIndex(direction = 0) {
  if (!sections.length) return -1;
  const currentTop = currentScrollTop();
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  let nearestTarget = sectionTargetTop(sections[0]);
  sections.forEach((section, index) => {
    const targetTop = sectionTargetTop(section);
    const distance = Math.abs(targetTop - currentTop);
    const directionalTie = Math.abs(distance - nearestDistance) <= 1
      && direction !== 0
      && ((direction > 0 && targetTop > nearestTarget) || (direction < 0 && targetTop < nearestTarget));
    if (distance < nearestDistance || directionalTie) {
      nearestDistance = distance;
      nearestIndex = index;
      nearestTarget = targetTop;
    }
  });
  return nearestIndex;
}

function getSectionIndexForScroll(direction = 0) {
  if (!sections.length) return -1;
  const currentTop = currentScrollTop();
  let matchedIndex = -1;
  let matchedStart = -Infinity;

  sections.forEach((section, index) => {
    const range = sectionScrollRange(section);
    if (!range?.isScrollable) return;
    const inRange = currentTop >= range.start - SECTION_EDGE_TOLERANCE
      && currentTop <= range.end + SECTION_EDGE_TOLERANCE;
    if (!inRange) return;

    const directionalTie = direction !== 0
      && ((direction > 0 && range.start >= matchedStart) || (direction < 0 && range.start <= matchedStart));

    if (matchedIndex < 0 || directionalTie) {
      matchedIndex = index;
      matchedStart = range.start;
    }
  });

  return matchedIndex >= 0 ? matchedIndex : getNearestSectionIndex(direction);
}

function currentSnapIndex() {
  if (snapInFlight && snapTargetIndex >= 0 && snapTargetIndex < sections.length) {
    return snapTargetIndex;
  }
  return getSectionIndexForScroll(lastScrollDirection);
}

function lastSectionRange() {
  return sections.length ? sectionScrollRange(sections[sections.length - 1]) : null;
}

function isPastLastSection(currentTop = currentScrollTop()) {
  const range = lastSectionRange();
  return !!range && currentTop > range.end + SECTION_EDGE_TOLERANCE;
}

function shouldAllowPageScrollOutsideScenes(direction, currentTop = currentScrollTop()) {
  const range = lastSectionRange();
  if (!range) return false;
  if (currentTop > range.end + SECTION_EDGE_TOLERANCE) return true;
  return direction > 0
    && currentTop >= range.end - SECTION_EDGE_TOLERANCE
    && currentTop < maxScrollY() - SECTION_EDGE_TOLERANCE;
}

function canScrollWithinTarget(target, deltaY) {
  if (!(target instanceof Element)) return false;
  let node = target;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canOverflow = /(auto|scroll|overlay)/.test(overflowY);
    if (canOverflow && node.scrollHeight > node.clientHeight + 1) {
      const maxScroll = node.scrollHeight - node.clientHeight;
      if (deltaY > 0 && node.scrollTop < maxScroll - 1) return true;
      if (deltaY < 0 && node.scrollTop > 1) return true;
    }
    node = node.parentElement;
  }
  return false;
}

function snapToAdjacentSection(direction) {
  if (!sections.length || direction === 0) return;
  const currentIndex = currentSnapIndex();
  if (currentIndex < 0) return;
  const nextIndex = Math.min(sections.length - 1, Math.max(0, currentIndex + direction));
  if (nextIndex === currentIndex) {
    const edge = direction > 0 ? 'end' : 'start';
    scrollToSection(sections[currentIndex], edge);
    return;
  }
  const edge = direction < 0 ? 'end' : 'start';
  scrollToSection(sections[nextIndex], edge);
}

function scrollWithinCurrentSection(direction, deltaY) {
  const currentIndex = getSectionIndexForScroll(direction);
  const section = sections[currentIndex];
  const range = sectionScrollRange(section);
  if (!range?.isScrollable) return false;

  const currentTop = currentScrollTop();
  const canScrollDown = direction > 0 && currentTop < range.end - SECTION_EDGE_TOLERANCE;
  const canScrollUp = direction < 0 && currentTop > range.start + SECTION_EDGE_TOLERANCE;
  if (!canScrollDown && !canScrollUp) return false;

  clearPendingSnap();
  lastScrollDirection = direction;

  const nextTop = Math.min(range.end, Math.max(range.start, currentTop + deltaY));
  window.scrollTo({ top: Math.round(nextTop), behavior: 'auto' });
  scheduleUpdate();
  return true;
}

function handleSectionWheel(event) {
  if (!sections.length) return;
  if (prefersReducedMotion()) return;
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
  if (canScrollWithinTarget(event.target, event.deltaY)) return;

  const deltaY = normalizeWheelDelta(event);
  if (Math.abs(deltaY) < 2) return;
  const direction = deltaY > 0 ? 1 : -1;

  if (shouldAllowPageScrollOutsideScenes(direction)) {
    clearPendingSnap();
    lastScrollDirection = direction;
    return;
  }

  if (scrollWithinCurrentSection(direction, deltaY)) {
    event.preventDefault();
    return;
  }

  event.preventDefault();
  const now = Date.now();
  if (now < snapLockedUntil) return;

  snapWheelDelta += deltaY;
  window.clearTimeout(snapWheelTimer);
  snapWheelTimer = window.setTimeout(() => {
    snapWheelDelta = 0;
  }, 180);

  if (Math.abs(snapWheelDelta) < 44) return;

  const snapDirection = snapWheelDelta > 0 ? 1 : -1;
  snapWheelDelta = 0;
  snapLockedUntil = now + 580;
  snapToAdjacentSection(snapDirection);
}

function renderIndex() {
  ensureControls();
  indexEl.innerHTML = sections.map((section, index) => {
    const number = String(index + 1).padStart(2, '0');
    const label = section.dataset.ppSectionLabel || deriveLabel(section);
    return `
      <button class="pp-section-index-btn" type="button" data-pp-section-target="${escapeHtml(section.id)}" aria-label="Jump to ${escapeHtml(label)}">
        <span class="pp-section-index-num">${number}</span>
        <span class="pp-section-index-label">${escapeHtml(label)}</span>
      </button>
    `;
  }).join('');

  indexEl.querySelectorAll('[data-pp-section-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.ppSectionTarget || '');
      scrollToSection(target);
    });
  });
}

function applySectionMetadata() {
  sections = getSceneNodes();
  sections.forEach((section, index) => {
    const number = String(index + 1).padStart(2, '0');
    const label = deriveLabel(section);
    section.classList.add('pp-scroll-scene');
    section.dataset.ppSectionIndex = number;
    section.dataset.ppSectionLabel = label;
    section.style.setProperty('--pp-section-order', String(index));
  });
  if (observer) {
    observer.disconnect();
    sections.forEach((section) => observer.observe(section));
  }
  document.documentElement.dataset.ppSectionScenes = sections.length ? '1' : '0';
  renderIndex();
}

function setActiveSection(active) {
  sections.forEach((section) => {
    section.classList.toggle('is-active-section', section === active);
  });
  if (!indexEl) return;
  indexEl.querySelectorAll('[data-pp-section-target]').forEach((button) => {
    const isActive = active && button.dataset.ppSectionTarget === active.id;
    button.classList.toggle('is-active', !!isActive);
    if (isActive) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
}

function updateParallax() {
  scrollRaf = 0;
  if (!sections.length) return;

  const vh = window.innerHeight || document.documentElement.clientHeight || 1;
  const active = sections[getSectionIndexForScroll(lastScrollDirection)] || sections[0];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  sections.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (reduceMotion) {
      section.style.setProperty('--pp-parallax-y', '0px');
      section.style.setProperty('--pp-section-progress', '0.5');
      return;
    }

    const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + Math.max(rect.height, 1))));
    const travel = Math.round((0.5 - progress) * 58);
    section.style.setProperty('--pp-parallax-y', `${travel}px`);
    section.style.setProperty('--pp-section-progress', progress.toFixed(3));
  });

  setActiveSection(active);
  if (topButton) topButton.classList.toggle('is-visible', window.scrollY > Math.max(240, vh * 0.45));
}

function scheduleUpdate() {
  if (scrollRaf) return;
  scrollRaf = window.requestAnimationFrame(updateParallax);
}

function handleSectionScroll() {
  lastScrollAt = Date.now();
  const currentY = currentScrollTop();
  const deltaY = currentY - lastScrollY;
  if (Math.abs(deltaY) > 1) lastScrollDirection = deltaY > 0 ? 1 : -1;
  lastScrollY = currentY;

  scheduleUpdate();
  if (!sections.length || snapInFlight || prefersReducedMotion()) return;

  if (isPastLastSection(currentY)) {
    window.clearTimeout(scrollIdleTimer);
    return;
  }

  const currentIndex = getSectionIndexForScroll(lastScrollDirection);
  const currentRange = sectionScrollRange(sections[currentIndex]);
  const currentTop = currentScrollTop();
  if (currentRange?.isScrollable
    && currentTop >= currentRange.start - SECTION_EDGE_TOLERANCE
    && currentTop <= currentRange.end + SECTION_EDGE_TOLERANCE) {
    window.clearTimeout(scrollIdleTimer);
    return;
  }

  window.clearTimeout(scrollIdleTimer);
  if (supportsScrollEnd()) return;
  scrollIdleTimer = window.setTimeout(() => {
    if (!sections.length || snapInFlight || prefersReducedMotion()) return;
    if (Date.now() - lastSnapAt < 420) return;

    const nearestIndex = getNearestSectionIndex(lastScrollDirection);
    const nearest = sections[nearestIndex];
    if (!nearest) return;

    const targetTop = sectionTargetTop(nearest);
    if (Math.abs(currentScrollTop() - targetTop) > 2) {
      scrollToSection(nearest);
    }
  }, 280);
}

function handleSectionScrollEnd() {
  if (!sections.length || snapInFlight || prefersReducedMotion()) return;
  if (Date.now() - lastScrollAt < 70) return;
  if (isPastLastSection()) return;

  const currentIndex = getSectionIndexForScroll(lastScrollDirection);
  const currentRange = sectionScrollRange(sections[currentIndex]);
  const currentTop = currentScrollTop();
  if (currentRange?.isScrollable
    && currentTop >= currentRange.start - SECTION_EDGE_TOLERANCE
    && currentTop <= currentRange.end + SECTION_EDGE_TOLERANCE) {
    return;
  }

  const nearestIndex = getNearestSectionIndex(lastScrollDirection);
  const nearest = sections[nearestIndex];
  if (!nearest) return;

  const targetTop = sectionTargetTop(nearest);
  if (Math.abs(currentTop - targetTop) > Math.max(3, sectionViewportHeight() * 0.04)) {
    scrollToSection(nearest);
  }
}

function resetSnapState() {
  window.clearTimeout(snapReleaseTimer);
  clearPendingSnap();
  lastScrollY = currentScrollTop();
  lastScrollDirection = 0;
  lastScrollAt = Date.now();
}

function scheduleRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    resetSnapState();
    applySectionMetadata();
    scheduleUpdate();
  }, 80);
}

export function refreshSectionScroll() {
  scheduleRefresh();
}

export function initSectionScroll() {
  if (!isHomePage()) return;
  if (document.documentElement.dataset.ppSectionScrollReady === '1') {
    refreshSectionScroll();
    return;
  }

  document.documentElement.dataset.ppSectionScrollReady = '1';
  lastScrollY = currentScrollTop();
  applySectionMetadata();
  scheduleUpdate();

  if ('ResizeObserver' in window) {
    observer = new ResizeObserver(scheduleUpdate);
    sections.forEach((section) => observer.observe(section));
  }

  mutationObserver = new MutationObserver(scheduleRefresh);
  ['#hero-container', '#mission-container', '#pp-featured', '#news-container']
    .map((selector) => document.querySelector(selector))
    .filter(Boolean)
    .forEach((target) => mutationObserver.observe(target, { childList: true, subtree: true }));

  window.addEventListener('scroll', handleSectionScroll, { passive: true });
  if (supportsScrollEnd()) {
    window.addEventListener('scrollend', handleSectionScrollEnd, { passive: true });
  }
  window.addEventListener('wheel', handleSectionWheel, { passive: false });
  window.addEventListener('resize', scheduleRefresh, { passive: true });
  window.addEventListener('pp:navbar:ready', scheduleRefresh);
  window.addEventListener('pp:sections:refresh', scheduleRefresh);
}
