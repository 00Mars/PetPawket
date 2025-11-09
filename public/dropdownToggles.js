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
    if (menu) {
      // Use setAttribute for proper hidden attribute handling
      menu.setAttribute('hidden', '');
    }
  }

  function openDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.add('active', 'open');
    const menu = getMenu(dropdown);
    if (menu) {
      // Use removeAttribute for proper hidden attribute handling
      menu.removeAttribute('hidden');
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

    // Ensure menu starts hidden
    if (!menu.hasAttribute('hidden')) {
      menu.setAttribute('hidden', '');
    }

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

  // Add global click listener only once
  if (!globalClickListenerAdded) {
    globalClickListenerAdded = true;
    document.addEventListener('click', () => {
      closeAll();
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
