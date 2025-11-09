// /public/dropdownToggles.js
export function setupDropdownToggles(root = document) {
  // support BOTH the new pp-* dropdowns and the old ones
  const dropdownEls = root.querySelectorAll(
    '.pp-dropdown, .nav-item.dropdown, .icon-dropdown'
  );

  if (!dropdownEls.length) return;

  function getTrigger(dropdown) {
    // prefer an explicit button/icon in the new markup
    return (
      dropdown.querySelector('.pp-icon-btn') ||
      dropdown.querySelector('[data-toggle="dropdown"]') ||
      dropdown.querySelector('button') ||
      dropdown.querySelector('a')
    );
  }

  function getMenu(dropdown) {
    return dropdown.querySelector('.dropdown-menu, .icon-dropdown-menu');
  }

  function closeDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.remove('active');
    const menu = getMenu(dropdown);
    if (menu) {
      // new markup: they start with `hidden`
      menu.hidden = true;
    }
  }

  function openDropdown(dropdown) {
    if (!dropdown) return;
    dropdown.classList.add('active');
    const menu = getMenu(dropdown);
    if (menu) {
      menu.hidden = false;
    }
  }

  function closeAll(except = null) {
    document.body.classList.remove('dropdown-active');
    dropdownEls.forEach((dd) => {
      if (dd !== except) closeDropdown(dd);
    });
  }

  dropdownEls.forEach((dropdown) => {
    const trigger = getTrigger(dropdown);
    const menu = getMenu(dropdown);
    if (!trigger || !menu) return;

    // start hidden if not already
    if (menu.hidden !== false) {
      menu.hidden = true;
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdown.classList.contains('active') && menu.hidden === false;

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

  // click outside closes everything
  document.addEventListener('click', () => {
    closeAll();
  });

  // ESC closes everything
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAll();
    }
  });
}
