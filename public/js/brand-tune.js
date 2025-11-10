/* Dev-only brand tuner: loads only with ?brand-tune=1
   Lets you adjust --frame, --icon-scale, --logo live and copy final CSS. */

(function(){
  const params = new URLSearchParams(location.search);
  if (!params.has('brand-tune')) return;

  const wrapper = document.querySelector('.charlie-frame-wrapper');
  const logo = document.querySelector('.brand-logo');
  if (!wrapper || !logo) return;

  const ui = document.createElement('div');
  ui.style.cssText = `
    position:fixed; z-index:2147483000; right:12px; bottom:12px;
    background:rgba(0,0,0,.75); color:#fff; padding:12px; border-radius:10px;
    font:14px/1.2 system-ui, -apple-system, Segoe UI, Roboto; width: 280px;
    -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  `;
  ui.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <strong>Brand Tuner</strong>
      <button id="ppClose" style="background:#444;color:#fff;border:0;border-radius:6px;padding:4px 8px;cursor:pointer">×</button>
    </div>
    <label>Frame (px) <input id="ppFrame" type="range" min="80" max="240" step="1" style="width:100%"></label>
    <div id="ppFrameVal" style="text-align:right;opacity:.8">—</div>
    <label style="margin-top:8px;">Icon scale (0–1) <input id="ppScale" type="range" min="0.40" max="0.80" step="0.01" style="width:100%"></label>
    <div id="ppScaleVal" style="text-align:right;opacity:.8">—</div>
    <label style="margin-top:8px;">Logo font (px) <input id="ppLogo" type="range" min="24" max="56" step="1" style="width:100%"></label>
    <div id="ppLogoVal" style="text-align:right;opacity:.8">—</div>
    <button id="ppCopy" style="margin-top:10px;width:100%;background:#0b74ff;color:#fff;border:0;border-radius:8px;padding:8px;cursor:pointer">Copy CSS</button>
    <div id="ppMsg" style="margin-top:6px;opacity:.85"></div>
  `;
  document.body.appendChild(ui);

  const $ = id => ui.querySelector(id);
  const getVar = (el, name, fallback) => {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    return v ? parseFloat(v) : fallback;
  };

  const state = {
    frame: getVar(wrapper, '--frame', 180),
    scale: getVar(wrapper, '--icon-scale', .58),
    logo:  getVar(document.documentElement, '--logo', NaN) || parseFloat(getComputedStyle(logo).fontSize) || 44
  };

  const sync = () => {
    wrapper.style.setProperty('--frame', state.frame);
    wrapper.style.setProperty('--icon-scale', state.scale);
    logo.style.fontSize = state.logo + 'px';
    $('#ppFrameVal').textContent = `${state.frame}px`;
    $('#ppScaleVal').textContent = state.scale.toFixed(2);
    $('#ppLogoVal').textContent = `${state.logo}px`;
  };

  $('#ppFrame').value = state.frame;
  $('#ppScale').value = state.scale;
  $('#ppLogo').value = state.logo;

  $('#ppFrame').addEventListener('input', e => { state.frame = +e.target.value; sync(); });
  $('#ppScale').addEventListener('input', e => { state.scale = +e.target.value; sync(); });
  $('#ppLogo').addEventListener('input', e => { state.logo = +e.target.value; sync(); });
  $('#ppClose').addEventListener('click', () => ui.remove());

  $('#ppCopy').addEventListener('click', async () => {
    const css = `
/* Finalized brand numbers for THIS container width breakpoint */
.charlie-frame-wrapper{
  --frame: ${state.frame};
  --icon-scale: ${state.scale};
}
.brand-logo{ font-size: ${state.logo}px; }
`.trim();
    try {
      await navigator.clipboard.writeText(css);
      $('#ppMsg').textContent = 'Copied CSS to clipboard — paste into your core.css under the correct container query.';
    } catch {
      $('#ppMsg').textContent = 'Copy failed — select text manually.';
    }
  });

  sync();
})();