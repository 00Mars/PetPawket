// /public/shopby.js — enhance shop-by rail without HTML edits
(function () {
  const ROOT = document.getElementById('shop-by');
  if (!ROOT) return;
  const rail = ROOT.querySelector('.sb-rail');
  const container = ROOT.querySelector('.container');
  if (!rail || !container) return;

  // Build arrows if they don't exist
  let prev = ROOT.querySelector('.sb-prev');
  let next = ROOT.querySelector('.sb-next');
  if (!prev) {
    prev = document.createElement('button');
    prev.className = 'sb-nav sb-prev';
    prev.setAttribute('aria-label', 'Scroll left');
    prev.innerHTML = '<i>‹</i>';
    container.appendChild(prev);
  }
  if (!next) {
    next = document.createElement('button');
    next.className = 'sb-nav sb-next';
    next.setAttribute('aria-label', 'Scroll right');
    next.innerHTML = '<i>›</i>';
    container.appendChild(next);
  }

  const STEP = () => Math.max(160, Math.round(rail.clientWidth * 0.6));
  const maxScroll = () => Math.max(0, rail.scrollWidth - rail.clientWidth);

  function updateNav() {
    // Only show arrows if content actually overflows
    const overflows = rail.scrollWidth > rail.clientWidth + 4;
    prev.style.display = next.style.display = overflows ? 'flex' : 'none';
    prev.toggleAttribute('disabled', rail.scrollLeft <= 0);
    next.toggleAttribute('disabled', rail.scrollLeft >= maxScroll() - 2);
  }

  function scrollByStep(dir) {
    rail.scrollBy({ left: dir * STEP(), behavior: 'smooth' });
  }

  prev.addEventListener('click', () => scrollByStep(-1));
  next.addEventListener('click', () => scrollByStep(+1));
  rail.addEventListener('scroll', updateNav, { passive: true });

  // Make mouse wheel scroll horizontally (without breaking page scroll)
  rail.addEventListener('wheel', (e) => {
    // If vertical wheel occurs and overflow exists, convert to horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && rail.scrollWidth > rail.clientWidth) {
      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  // Keyboard nav when rail is focused
  rail.tabIndex = rail.tabIndex || 0;
  rail.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollByStep(+1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByStep(-1); }
    if (e.key === 'Home')       { e.preventDefault(); rail.scrollTo({ left: 0, behavior: 'smooth' }); }
    if (e.key === 'End')        { e.preventDefault(); rail.scrollTo({ left: maxScroll(), behavior: 'smooth' }); }
  });

  // Optional: click-drag to pan (desktop)
  let dragging = false, startX = 0, startLeft = 0, moved = false;
  rail.addEventListener('pointerdown', (e) => {
    dragging = true; moved = false;
    startX = e.clientX; startLeft = rail.scrollLeft;
    rail.classList.add('is-dragging');
    rail.setPointerCapture(e.pointerId);
  });
  rail.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    rail.scrollLeft = startLeft - dx;
  });
  rail.addEventListener('pointerup', (e) => {
    dragging = false;
    rail.classList.remove('is-dragging');
    // prevent accidental click-after-drag
    if (moved) {
      const target = e.target.closest('a,button,summary');
      if (target) target.addEventListener('click', (ev)=>ev.preventDefault(), { once:true });
    }
  });

  // Keep single row (defensive): force nowrap on children
  function normalizeChildren() {
    rail.querySelectorAll('a,button,summary,.sb-chip').forEach(el => {
      el.style.whiteSpace = 'nowrap';
      el.style.flex = '0 0 auto';
    });
  }

  const ro = new ResizeObserver(() => { normalizeChildren(); updateNav(); });
  ro.observe(rail);
  window.addEventListener('load', () => { normalizeChildren(); updateNav(); });
  document.addEventListener('visibilitychange', updateNav);
})();
