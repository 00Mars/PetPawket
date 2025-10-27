// petpawket/public/mobileToggle.js
// Toggle the mobile menu drawer open or closed and relocate elements accordingly.
const NAV_COLLAPSE = 1280; // keep in sync with mobileRelocation.js

export function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const mobileContent = menu?.querySelector('.mobile-content');
  const navLinks = document.querySelector('.nav-links');
  const iconArea = document.querySelector('.icon-area');
  const navLeft = document.querySelector('.nav-left');
  const navRight = document.querySelector('.nav-right');

  if (!menu || !mobileContent || !navLinks || !iconArea || !navLeft || !navRight) return;

  const isActive = menu.classList.toggle('active');
  document.body.style.overflow = isActive ? 'hidden' : '';

  if (isActive) {
    if (!mobileContent.contains(navLinks)) mobileContent.appendChild(navLinks);
    if (!mobileContent.contains(iconArea)) mobileContent.appendChild(iconArea);
    navLinks.classList.add('nav-links-mobile');
    iconArea.classList.add('icon-area-mobile');
  } else if (!isActive && window.innerWidth > NAV_COLLAPSE) {
    // Restore to desktop when closing on wide viewports
    navLeft.appendChild(navLinks);
    navRight.appendChild(iconArea);
    navLinks.classList.remove('nav-links-mobile');
    iconArea.classList.remove('icon-area-mobile');
    navLinks.removeAttribute('style');
    iconArea.removeAttribute('style');
  }
}