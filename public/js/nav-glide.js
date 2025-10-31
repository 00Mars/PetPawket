// /public/js/nav-glide.js — drag/scroll, edge-aware arrows, and robust dropdown portal
export function initNavGlide() {
  const root = document.querySelector('#shop-by');
  const rail = root?.querySelector('.sb-rail');
  if (!rail) return;

  // Ensure frame + track exist without reordering chips
  let frame = rail.querySelector('.sb-frame');
  let track = rail.querySelector('.sb-track');

  if (!frame) {
    frame = document.createElement('div');
    frame.className = 'sb-frame';
    if (track) {
      rail.insertBefore(frame, track);
      frame.appendChild(track);
    } else {
      rail.appendChild(frame);
      track = document.createElement('nav');
      track.className = 'sb-track';
      track.setAttribute('aria-label','Secondary navigation');
      const kids = Array.from(rail.childNodes);
      for (const n of kids) {
        if (n === frame) continue;
        if (n.nodeType === 1 && !n.classList.contains('sb-nav')) track.appendChild(n);
      }
      frame.appendChild(track);
    }
  } else if (!track) {
    track = document.createElement('nav');
    track.className = 'sb-track';
    track.setAttribute('aria-label','Secondary navigation');
    const fk = Array.from(frame.childNodes);
    for (const n of fk) if (n.nodeType === 1) track.appendChild(n);
    frame.appendChild(track);
  }

  if (track.dataset.gliderWired === '1') return;
  track.dataset.gliderWired = '1';

  // Arrows
  const ensureArrow = (side) => {
    const cls = side === 'prev' ? 'sb-prev' : 'sb-next';
    let btn = rail.querySelector(`.${cls}`);
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `sb-nav ${cls}`;
      btn.setAttribute('aria-label', side === 'prev' ? 'Scroll left' : 'Scroll right');
      const i = document.createElement('i'); i.setAttribute('aria-hidden','true'); i.textContent = '‹';
      btn.appendChild(i);
      rail.appendChild(btn);
    }
    return btn;
  };
  const prevBtn = ensureArrow('prev');
  const nextBtn = ensureArrow('next');

  // Geometry (slightly padded hit-zone + extraPad so last chip isn’t clipped)
  function syncGeometry(){
    const padDelta = 4;
    const l = Math.round((prevBtn.getBoundingClientRect().width || 36) + padDelta);
    const r = Math.round((nextBtn.getBoundingClientRect().width || l || 36) + padDelta);
    rail.style.setProperty('--sb-arrow-left',  `${l}px`);
    rail.style.setProperty('--sb-arrow-right', `${r}px`);
    rail.style.setProperty('--sb-arrow-w', `${Math.max(l,r)}px`);
    const cs = getComputedStyle(rail);
    const edgeL = parseInt(cs.getPropertyValue('--edge-left'))  || 6;
    const edgeR = parseInt(cs.getPropertyValue('--edge-right')) || 8;
    /*
      A small extra buffer is added to the scroll padding to ensure that
      the final chip fully scrolls into view. Without this buffer the last
      subnav chip can be partially obscured by the rounded edge or fade.
    */
    const extraPad = 10;
    track.style.scrollPaddingLeft  = `calc(${l}px + ${edgeL}px + ${extraPad}px)`;
    track.style.scrollPaddingRight = `calc(${r}px + ${edgeR}px + ${extraPad}px)`;
  }

  // Scroll helpers
  const EPS = 1;
  const DRAG_ACTIVATE = 6;
  const PAGE = () => Math.max(240, Math.round(track.clientWidth * 0.85));
  const maxLeft = () => Math.max(0, track.scrollWidth - track.clientWidth);
  const canScrollX = () => (Math.ceil(track.scrollWidth) - Math.floor(track.clientWidth)) > EPS;
  const atStart = () => track.scrollLeft <= EPS;
  const atEnd   = () => Math.ceil(track.scrollLeft) >= Math.ceil(maxLeft()) - EPS;

  function setArrows(){
    const over = canScrollX();
    prevBtn.style.display = nextBtn.style.display = over ? 'block' : 'none';
    if (!over) return;
    prevBtn.disabled = atStart();
    nextBtn.disabled = atEnd();
  }
  let raf = 0; const rafArrows = () => { if (!raf) raf = requestAnimationFrame(()=>{ raf=0; setArrows(); }); };

  // Drag / click discrimination (menu-safe)
  const SURFACES = [frame, track].filter(Boolean);
  const BLOCK_DRAG = (el) => !!el.closest?.('.sb-menu');

  let dragging = false, dragArmed = false, pressX = 0, startLeft = 0, startedOnSummary = false;

  function onPointerDown(e){
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (BLOCK_DRAG(e.target)) return;
    dragging = true; dragArmed = false;
    pressX = e.clientX; startLeft = track.scrollLeft;
    startedOnSummary = !!e.target.closest?.('summary');
    if (!startedOnSummary) {
      try { (e.currentTarget || track).setPointerCapture?.(e.pointerId); } catch {}
    }
  }
  function onPointerMove(e){
    if (!dragging) return;
    const dx = e.clientX - pressX;
    if (!dragArmed && Math.abs(dx) >= DRAG_ACTIVATE){
      dragArmed = true;
      track.classList.add('is-dragging');
    }
    if (dragArmed){
      track.scrollLeft = Math.min(maxLeft(), Math.max(0, startLeft - dx));
      rafArrows();
    }
  }
  function endDrag(e){
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    try { (e.currentTarget || track).releasePointerCapture?.(e.pointerId); } catch {}
    setTimeout(() => { dragArmed = false; startedOnSummary = false; }, 0);
    rafArrows();
  }
  for (const el of SURFACES){
    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: true });
    el.addEventListener('pointerup',     endDrag,    { passive: true });
    el.addEventListener('pointercancel', endDrag,    { passive: true });
    el.addEventListener('lostpointercapture', endDrag, { passive: true });
  }
  track.addEventListener('click', (e) => { if (dragArmed) { e.preventDefault(); e.stopPropagation(); } }, true);

  // Arrows
  prevBtn.addEventListener('click', ()=>{ track.scrollBy({ left:-PAGE(), behavior:'smooth' }); rafArrows(); });
  nextBtn.addEventListener('click', ()=>{ track.scrollBy({ left: PAGE(), behavior:'smooth' }); rafArrows(); });

  // Wheel → horizontal
  track.addEventListener('wheel', (e)=>{
    if (Math.abs(e.deltaY)>Math.abs(e.deltaX)){
      e.preventDefault();
      track.scrollLeft = Math.min(maxLeft(), Math.max(0, track.scrollLeft + e.deltaY));
      rafArrows();
    }
  }, {passive:false});

  // Keyboard
  if (!track.hasAttribute('tabindex')) track.setAttribute('tabindex','0');
  track.setAttribute('role', track.getAttribute('role') || 'region');
  track.setAttribute('aria-label', track.getAttribute('aria-label') || 'Secondary navigation');
  track.addEventListener('keydown',(e)=>{
    if (e.key==='ArrowRight'){ e.preventDefault(); track.scrollBy({ left: PAGE(), behavior:'smooth' }); }
    else if (e.key==='ArrowLeft'){ e.preventDefault(); track.scrollBy({ left:-PAGE(), behavior:'smooth' }); }
    else if (e.key==='Home'){ e.preventDefault(); track.scrollTo({ left: 0, behavior:'smooth' }); }
    else if (e.key==='End'){ e.preventDefault(); track.scrollTo({ left: track.scrollWidth, behavior:'smooth' }); }
    rafArrows();
  });

  /* ---------------------- DROPDOWN PORTAL (robust) ------------------------ */
  // Fixed portal root
  const portalRoot = (() => {
    let p = document.getElementById('sb-portal-root');
    if (!p) {
      p = document.createElement('div');
      p.id = 'sb-portal-root';
      Object.assign(p.style, { position:'fixed', inset:'0', zIndex:'9999', pointerEvents:'none' });
      document.body.appendChild(p);
    }
    return p;
  })();

  // Keep an anchor in details so we can put the menu back on close
  function getOrCreateAnchor(detailsEl){
    let a = detailsEl.querySelector(':scope > .sb-menu-anchor');
    if (!a) {
      a = document.createElement('span');
      a.className = 'sb-menu-anchor';
      a.hidden = true;
      // place anchor right after the summary
      const summary = detailsEl.querySelector('summary');
      if (summary && summary.nextSibling) {
        detailsEl.insertBefore(a, summary.nextSibling);
      } else {
        detailsEl.appendChild(a);
      }
    }
    return a;
  }

  function positionMenuUnderSummary(menu, summary){
    const r = summary.getBoundingClientRect();
    Object.assign(menu.style, {
      position: 'fixed',
      left: `${Math.round(r.left)}px`,
      top:  `${Math.round(r.bottom + 8)}px`,
      pointerEvents: 'auto'
    });
  }

  function closeOthers(exceptDetails){
    track.querySelectorAll('details.sb-phase[open]').forEach(d => {
      if (d !== exceptDetails) d.removeAttribute('open');
    });
  }

  function onDetailsToggle(e){
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    if (!d.classList.contains('sb-phase')) return;

    // Important: fetch menu whether it's inside details or already portaled
    let menu = d.querySelector(':scope > .sb-menu') || portalRoot.querySelector(`.sb-menu[data-owner="${d.dataset.menuOwner}"]`);
    const summary = d.querySelector('summary');
    if (!summary) return;

    // Stable owner id
    if (!d.dataset.menuOwner) d.dataset.menuOwner = `sb_${Math.random().toString(36).slice(2,9)}`;

    if (d.open) {
      closeOthers(d);

      // (re)locate menu: if it's still in details, use it; else create fallback
      if (!menu) menu = d.querySelector('.sb-menu');
      if (!menu) return;

      // mark owner and portal
      menu.dataset.owner = d.dataset.menuOwner;
      menu.setAttribute('data-ported','1');

      // create anchor and move menu to portal
      const anchor = getOrCreateAnchor(d);
      anchor.dataset.forOwner = d.dataset.menuOwner;
      portalRoot.appendChild(menu);
      positionMenuUnderSummary(menu, summary);

      const onDocClick = (ev) => {
        const inside = menu.contains(ev.target) || summary.contains(ev.target);
        if (!inside && d.open) d.removeAttribute('open');
      };
      const onReflow = () => { if (d.open) positionMenuUnderSummary(menu, summary); };
      d._sbCleanup = () => {
        document.removeEventListener('click', onDocClick, true);
        window.removeEventListener('scroll', onReflow, true);
        window.removeEventListener('resize', onReflow, true);
      };
      document.addEventListener('click', onDocClick, true);
      window.addEventListener('scroll', onReflow, true);
      window.addEventListener('resize', onReflow, true);
    } else {
      // put menu back to its anchor inside details, if present
      const anchor = d.querySelector(':scope > .sb-menu-anchor');
      const owned = portalRoot.querySelector(`.sb-menu[data-owner="${d.dataset.menuOwner}"]`);
      if (anchor && owned) {
        owned.removeAttribute('data-ported');
        owned.style.pointerEvents = '';
        owned.style.left = owned.style.top = owned.style.position = '';
        anchor.after(owned);
      }
      if (typeof d._sbCleanup === 'function') { d._sbCleanup(); delete d._sbCleanup; }
    }
  }
  track.addEventListener('toggle', onDetailsToggle, true);

  // Observe & settle
  track.addEventListener('scroll', rafArrows, {passive:true});
  window.addEventListener('resize', ()=>{ syncGeometry(); rafArrows(); }, {passive:true});

  function settle(){ syncGeometry(); track.scrollLeft = Math.min(maxLeft(), Math.max(0, track.scrollLeft)); setArrows(); }
  requestAnimationFrame(()=> requestAnimationFrame(settle));
  if (document.fonts?.ready){ document.fonts.ready.then(()=> requestAnimationFrame(settle)).catch(()=>{}); }
}
