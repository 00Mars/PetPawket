// Search Overlay Handlers

const OVERLAY_SEL = '#searchOverlay, #search-overlay, .searchOverlay, .search-overlay';
const OPEN_TRIGGER_SEL =
  '#search-icon, [data-action="open-search"], .nav-search-btn, [aria-controls="searchOverlay"], [aria-controls="search-overlay"]';
const CLOSE_TRIGGER_SEL = '#searchCloseBtn, .search-close, .close-btn';

function getOverlay() {
  return document.querySelector(OVERLAY_SEL);
}

function getSearchInput(overlay) {
  return overlay?.querySelector('#searchInput,[data-search-input]');
}

function openOverlay() {
  const overlay = getOverlay();
  if (!overlay) return;

  // Rely on core.css for layout; hidden class controls visibility
  overlay.classList.remove('hidden');
  overlay.removeAttribute('aria-hidden');

  // Focus the input if present
  const input = getSearchInput(overlay);
  if (input) {
    try {
      input.focus();
      input.select?.();
    } catch {}
  }

  // Notify listeners (optional)
  document.dispatchEvent(new CustomEvent('pp:search-overlay:open'));
}

function closeOverlay() {
  const overlay = getOverlay();
  if (!overlay) return;

  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');

  document.dispatchEvent(new CustomEvent('pp:search-overlay:close'));
}

export function setupNavbarOverlayHandlers() {
  const container = document.getElementById('navbar-container');
  if (!container) return;

  // Prevent double-binding if this function is called more than once
  if (container.dataset.ppOverlayBound === '1') return;
  container.dataset.ppOverlayBound = '1';

  // Open/close via navbar clicks (delegated)
  container.addEventListener('click', (e) => {
    const openTrigger = e.target.closest(OPEN_TRIGGER_SEL);
    const closeTrigger = e.target.closest(CLOSE_TRIGGER_SEL);

    if (openTrigger) {
      e.preventDefault();
      openOverlay();
      // If trigger manages expanded state, reflect it
      openTrigger.setAttribute?.('aria-expanded', 'true');
      return;
    }
    if (closeTrigger) {
      e.preventDefault();
      closeOverlay();
      // If trigger manages expanded state, reflect it
      closeTrigger.setAttribute?.('aria-expanded', 'false');
      return;
    }
  });

  // Backdrop close: click outside the .search-card but inside the overlay
  const onBackdropClick = (e) => {
    const overlay = getOverlay();
    if (!overlay) return;
    if (!overlay.classList.contains('hidden') && overlay.contains(e.target)) {
      const card = overlay.querySelector('.search-card');
      if (!card || !card.contains(e.target)) {
        closeOverlay();
      }
    }
  };
  document.addEventListener('click', onBackdropClick);

  // Keyboard shortcuts
  const onKey = (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'CONTENT-EDITABLE';
    const isMac = navigator.platform?.toUpperCase?.().includes('MAC');

    // Cmd/Ctrl+K
    if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openOverlay();
      return;
    }

    // "/" to open when not typing
    if (e.key === '/' && !typing) {
      e.preventDefault();
      openOverlay();
      return;
    }

    // Escape to close
    if (e.key === 'Escape') {
      if (!getOverlay()?.classList.contains('hidden')) {
        e.preventDefault();
        closeOverlay();
      }
    }
  };
  document.addEventListener('keydown', onKey);
}

// Optional named helpers if other modules want to control the overlay.
export const openSearchOverlay = openOverlay;
export const closeSearchOverlay = closeOverlay;