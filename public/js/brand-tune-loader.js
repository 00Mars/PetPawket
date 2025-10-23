(function(){
  try {
    if (!new URLSearchParams(location.search).has('brand-tune')) return;
    const s = document.createElement('script');
    s.src = '/js/brand-tune.js';
    s.type = 'module';
    document.head.appendChild(s);
  } catch {}
})();