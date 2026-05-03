// /public/dropdownToggles.js
// Single source of truth for dropdown handling
// Supports BOTH new .pp-dropdown and legacy .nav-item.dropdown / .icon-dropdown

let globalClickListenerAdded = false;
let globalEscListenerAdded = false;

export function setupDropdownToggles(root = document) {
  // Find all dropdown containers (new pp-* and legacy)
  const dropdownEls = root.querySelectorAll(
    '.pp-dropdown, .nav-item.dropdown, .icon-dropdown'
  );

  if (!dropdownEls.length) return;

  function getTrigger(dropdown) {
    // For new .pp-dropdown: find button or element with aria-controls
    const btn = dropdown.querySelector('button, .pp-icon-btn, [aria-controls]');
    if (btn) return btn;
    // For legacy: find toggle element
    return (
      dropdown.querySelector('[data-toggle="dropdown"]') ||
      dropdown.querySelector('a')
    );
  }

  function getMenu(dropdown) {
    // Look for both standard dropdown-menu and icon-dropdown-menu
    return dropdown.querySelector('.dropdown-menu, .icon-dropdown-menu');
  }

  function closeDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove('active', 'open');
    const menu = getMenu(dropdown);
    const trigger = getTrigger(dropdown);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (menu) {
      menu.style.transform = '';
      // Use setAttribute for proper hidden attribute handling
      menu.setAttribute('hidden', '');
    }
  }

  function clampMenuToViewport(menu) {
    if (!menu) return;
    menu.style.transform = '';
    const pad = 8;
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    if (!vw) return;
    const rect = menu.getBoundingClientRect();
    let shift = 0;
    if (rect.left < pad) shift = pad - rect.left;
    else if (rect.right > vw - pad) shift = (vw - pad) - rect.right;
    if (shift) menu.style.transform = `translateX(${shift}px)`;
  }

  function openDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.add('active', 'open');
    const menu = getMenu(dropdown);
    const trigger = getTrigger(dropdown);
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    if (menu) {
      // Use removeAttribute for proper hidden attribute handling
      menu.removeAttribute('hidden');
      clampMenuToViewport(menu);
    }
  }

  function closeAll(except = null) {
    document.body.classList.remove('dropdown-active');
    dropdownEls.forEach((dd) => {
      if (dd !== except) closeDropdown(dd);
    });
  }

  // Wire up each dropdown
  dropdownEls.forEach((dropdown) => {
    const trigger = getTrigger(dropdown);
    const menu = getMenu(dropdown);
    if (!trigger || !menu) return;

    // Skip if already wired to prevent duplicate listeners
    if (trigger.dataset.dropdownWired === '1') return;
    trigger.dataset.dropdownWired = '1';

    // Ensure menu starts hidden + ARIA baseline
    if (!menu.hasAttribute('hidden')) {
      menu.setAttribute('hidden', '');
    }
    trigger.setAttribute('aria-expanded', 'false');

    // Prevent clicks inside the menu from bubbling to the document (which would close it)
    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains('active') && !menu.hasAttribute('hidden');

      if (isOpen) {
        closeDropdown(dropdown);
        document.body.classList.remove('dropdown-active');
      } else {
        closeAll(dropdown);
        openDropdown(dropdown);
        document.body.classList.add('dropdown-active');
      }
    });
  });

  // Add global click listener only once — close only when clicking OUTSIDE any dropdown
  if (!globalClickListenerAdded) {
    globalClickListenerAdded = true;
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.pp-dropdown, .nav-item.dropdown, .icon-dropdown')) {
        closeAll();
      }
    });
  }

  // Add global Escape listener only once
  if (!globalEscListenerAdded) {
    globalEscListenerAdded = true;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAll();
      }
    });
  }
}
