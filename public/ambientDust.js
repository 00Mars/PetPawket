/* CC0-1.0 • Ambient Dust Particles (Canvas)
   Subtle drifting dots with soft edges and fade in/out. No collisions = no jank.
   - Staggered spawn (starts with 0–1, ramps toward max)
   - Individual fade-in/out (no synchronized popping)
   - Stable timestep loop
   - DPR-aware rendering
   - Honors prefers-reduced-motion (no-op)
*/
export function startAmbientDust(opts = {}) {
  const cfg = {
    mount: '#shapes-container',
    maxDots: 28,
    spawnEveryMs: [600, 1200],           // try to add one if under cap
    sizeRange: [2, 4],                   // radius in CSS px (before DPR)
    speedRange: [4, 12],                 // px/s
    alphaRange: [0.08, 0.16],
    fadeMs: [800, 1400],                 // fade in/out duration
    lifeMs: [12000, 22000],              // visible lifetime before fade-out
    edgePad: 12,
    bgBlend: 'lighter',                  // compositing mode for glow-like effect
    color: 'rgba(255,255,255,1)',        // white dust; sits over your bg wash
    ...opts
  };

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return () => {}; // no-op
  }

  const mount = typeof cfg.mount === 'string' ? document.querySelector(cfg.mount) : cfg.mount;
  if (!mount) return () => {};

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;';
  mount.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  let W = 0, H = 0, DPR = Math.max(1, window.devicePixelRatio || 1);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const dots = [];
  let last = performance.now();
  let nextSpawnAt = last + randBetween(...cfg.spawnEveryMs);

  function spawnOne() {
    if (dots.length >= cfg.maxDots) return;
    const r = randBetween(...cfg.sizeRange);
    const x = randBetween(cfg.edgePad + r, W - cfg.edgePad - r);
    const y = randBetween(cfg.edgePad + r, H - cfg.edgePad - r);
    const sp = randBetween(...cfg.speedRange);
    const ang = randFloat(0, Math.PI * 2);
    const vx = Math.cos(ang) * sp;
    const vy = Math.sin(ang) * sp;
    const alpha = randFloat(...cfg.alphaRange);
    const fadeIn = randBetween(...cfg.fadeMs);
    const fadeOut = randBetween(...cfg.fadeMs);
    const life = randBetween(...cfg.lifeMs);

    dots.push({
      x, y, r, vx, vy,
      alphaTarget: alpha,
      alphaNow: 0,
      phase: 'fade-in',
      phaseStart: performance.now(),
      fadeIn, fadeOut,
      born: performance.now(),
      life,
    });
  }

  function update(dt, now) {
    // Spawn cadence (staggered)
    if (now >= nextSpawnAt && dots.length < cfg.maxDots) {
      spawnOne();
      nextSpawnAt = now + randBetween(...cfg.spawnEveryMs);
    }

    // Motion + phases
    for (let i = dots.length - 1; i >= 0; i--) {
      const d = dots[i];

      // Lifetime and phase transitions
      if (d.phase === 'fade-in') {
        const t = (now - d.phaseStart) / d.fadeIn;
        d.alphaNow = lerp(0, d.alphaTarget, clamp01(t));
        if (t >= 1) { d.phase = 'hold'; d.phaseStart = now; }
      } else if (d.phase === 'hold') {
        d.alphaNow = d.alphaTarget;
        if (now - d.born >= d.life) {
          d.phase = 'fade-out';
          d.phaseStart = now;
        }
      } else if (d.phase === 'fade-out') {
        const t = (now - d.phaseStart) / d.fadeOut;
        d.alphaNow = lerp(d.alphaTarget, 0, clamp01(t));
        if (t >= 1) { dots.splice(i, 1); continue; }
      }

      // Drift
      d.x += d.vx * dt;
      d.y += d.vy * dt;

      // Soft edge bounces
      if (d.x - d.r < 0)      { d.x = d.r;                 d.vx *= -1; }
      if (d.x + d.r > W)      { d.x = W - d.r;             d.vx *= -1; }
      if (d.y - d.r < 0)      { d.y = d.r;                 d.vy *= -1; }
      if (d.y + d.r > H)      { d.y = H - d.r;             d.vy *= -1; }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = cfg.bgBlend;
    for (const d of dots) {
      if (d.alphaNow <= 0) continue;
      ctx.globalAlpha = d.alphaNow;
      // Soft circle (drawn once; tiny, fast)
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = cfg.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function tick(now = performance.now()) {
    const dt = Math.min((now - last) / 1000, 0.033); // ~30–60fps stable step
    last = now;
    update(dt, now);
    render();
    raf = requestAnimationFrame(tick);
  }

  let raf = requestAnimationFrame(tick);

  // Cleanup
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    dots.length = 0;
  };
}

// Utils (CC0)
function randBetween(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function randFloat(min, max) { return min + Math.random() * (max - min); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }