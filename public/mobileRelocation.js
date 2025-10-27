// petpawket/public/mobileRelocation.js
import { throttleLog } from './throttleLog.js';

const NAV_COLLAPSE = 1280; // single source of truth for collapse width

export function setupResponsiveMobileMenu() {
  const logLayoutState = throttleLog("LayoutState", () => {
    const navLinks = document.querySelector('.nav-links');
    const iconArea = document.querySelector('.icon-area');
    if (!navLinks || !iconArea) return;
    console.table({
      'navLinks parent': navLinks.parentElement?.className || navLinks.parentElement?.id,
      'iconArea parent': iconArea.parentElement?.className || iconArea.parentElement?.id
    });
  });

  const relocateToMobile = () => {
    const navLinks = document.querySelector('.nav-links');
    const iconArea = document.querySelector('.icon-area');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileContent = mobileMenu?.querySelector('.mobile-content');
    const navLeft = document.querySelector('.nav-left');
    const navRight = document.querySelector('.nav-right');
    if (!navLinks || !iconArea || !mobileContent || !navLeft || !navRight) return;

    const isCollapsed = window.innerWidth <= NAV_COLLAPSE;

    const safeAppend = (parent, child) => {
      if (child && parent && parent !== child.parentElement && !child.contains(parent)) {
        parent.appendChild(child);
      }
    };

    // Move both links and icon row into the drawer at/below collapse width
    if (isCollapsed) {
      if (!navLinks.classList.contains('nav-links-mobile')) {
        safeAppend(mobileContent, navLinks);
        navLinks.classList.add('nav-links-mobile');
      }
      if (!iconArea.classList.contains('icon-area-mobile')) {
        safeAppend(mobileContent, iconArea);
        iconArea.classList.add('icon-area-mobile');
      }
    } else {
      // Restore to desktop positions when wider
      if (navLinks.classList.contains('nav-links-mobile')) {
        safeAppend(navLeft, navLinks);
        navLinks.classList.remove('nav-links-mobile');
        navLinks.removeAttribute('style');
      }
      if (iconArea.classList.contains('icon-area-mobile')) {
        safeAppend(navRight, iconArea);
        iconArea.classList.remove('icon-area-mobile');
        iconArea.removeAttribute('style');
      }
    }

    logLayoutState();
  };

  let lastIsCollapsed = null;
  let resizeTimer;

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const isCollapsedNow = window.innerWidth <= NAV_COLLAPSE;
      const mobileMenu = document.getElementById('mobile-menu');

      // If returning to desktop while drawer is open, close + restore positions
      if (!isCollapsedNow && mobileMenu?.classList.contains('active')) {
        mobileMenu.classList.remove('active');
        mobileMenu.classList.add('closing');
        document.body.style.overflow = '';
        const navLinks = document.querySelector('.nav-links');
        const iconArea = document.querySelector('.icon-area');
        const navLeft = document.querySelector('.nav-left');
        const navRight = document.querySelector('.nav-right');
        navLeft?.appendChild(navLinks);
        navRight?.appendChild(iconArea);
        iconArea?.classList.remove('icon-area-mobile');
        setTimeout(() => mobileMenu.classList.remove('closing'), 400);
      }

      if (isCollapsedNow !== lastIsCollapsed) {
        lastIsCollapsed = isCollapsedNow;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => relocateToMobile());
        });
      }
    }, 120);
  });

  // Initial placement
  relocateToMobile();
}