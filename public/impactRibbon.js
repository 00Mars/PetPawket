// public/impactRibbon.js — Impact ribbon + Loop CTA across pages
import { getLoopAvailability } from './loopState.js';

let initialized = false;
let lastPayload = null;
let inFlight = null;
let loopAvailable = false;

function formatMoney(amount = 0, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function percent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function renderRibbon(el, payload) {
  const compact = el.classList.contains('pp-impact-ribbon--compact');
  const inlineSteps = el.dataset.impactSteps === '1';
  const orbShare = el.dataset.impactOrbShare === '1';
  const rich = el.dataset.impactRich === '1';
  const active = payload?.activeCase || null;
  const recent = payload?.recentlyFunded || null;
  const title = active?.title || 'CHARM update coming into view';
  const body = active?.body || 'Reviewed CHARM care updates appear when the details are ready.';
  const funded = Number(active?.fundedAmount || 0);
  const goal = Number(active?.goalAmount || 0);
  const pct = percent(active?.progressPct);
  const meta = goal
    ? `${formatMoney(funded, active?.currency)} of ${formatMoney(goal, active?.currency)} funded`
    : 'CHARM update coming into view';
  const celebration = recent?.title
    ? `<span class="pp-impact-ribbon-tag">Rescue completed: ${esc(recent.title)}</span>`
    : '';

  const steps = inlineSteps
    ? `
      <div class="pp-impact-how">How it works</div>
      <div class="pp-impact-steps-inline">
        <span><strong>1</strong> Shop or start a Pawket Pack</span>
        <span><strong>2</strong> Share kindness forward</span>
        <span><strong>3</strong> See care updates when ready</span>
      </div>
    `
    : '';

  const formula = rich
    ? `
      <div class="pp-impact-formula">
        <span>Mission care</span>
        <strong>Shared when ready</strong>
        <small>Details stay careful and clear.</small>
      </div>
    `
    : '';

  const liveTag = rich ? `<span class="pp-impact-live"><i class="bi bi-activity"></i> Care update</span>` : '';

  const shareBtn = !orbShare && loopAvailable
    ? `<button class="pp-impact-btn" type="button" data-loop-open>Share Pawket Pass</button>`
    : '';

  const orb = orbShare && loopAvailable
    ? `
      <button class="pp-impact-ribbon-orb pp-impact-orb-btn" type="button" data-loop-open aria-label="Share Pawket Pass">
        <i class="bi bi-heart-pulse"></i>
        <span class="pp-impact-orb-label">Share Pass</span>
      </button>
    `
    : `
      <div class="pp-impact-ribbon-orb" aria-hidden="true">
        <i class="bi bi-heart-pulse"></i>
      </div>
    `;

  el.innerHTML = `
    <div class="pp-impact-ribbon-inner ${compact ? 'is-compact' : ''}">
      ${orb}
      <div class="pp-impact-ribbon-content">
        <div class="pp-impact-ribbon-kicker">CHARM Foundation Impact</div>
        <div class="pp-impact-row">
          <div>
            <div class="pp-impact-ribbon-title">${esc(title)}</div>
            ${compact ? '' : `<div class="pp-impact-ribbon-body">${esc(body)}</div>`}
          </div>
          <div class="pp-impact-actions">
            ${liveTag}
            <a class="pp-impact-link" href="/charm.html">Open CHARM</a>
          </div>
        </div>
        ${steps}
        ${formula}
        <div class="pp-impact-ribbon-progress"><span style="width:${pct}%"></span></div>
        <div class="pp-impact-ribbon-meta">${esc(meta)}</div>
        ${celebration}
      </div>
      <div class="pp-impact-ribbon-actions">
        ${shareBtn}
      </div>
    </div>
  `;
}

function renderAll() {
  const ribbons = document.querySelectorAll('[data-impact-ribbon]');
  if (!ribbons.length) return;
  ribbons.forEach((el) => renderRibbon(el, lastPayload || {}));
}

async function refreshLoopAvailability(force = false) {
  const state = await getLoopAvailability({ force });
  loopAvailable = !!state?.available;
  renderAll();
}

async function fetchImpact() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      lastPayload = data?.ok ? data : { activeCase: null, recentlyFunded: null };
    } catch {
      lastPayload = { activeCase: null, recentlyFunded: null };
    } finally {
      inFlight = null;
      renderAll();
    }
  })();
  return inFlight;
}

function handleLoopOpen(e) {
  const btn = e.target.closest('[data-loop-open]');
  if (!btn) return;
  e.preventDefault();
  if (typeof window.PP_openLoopModal === 'function') {
    window.PP_openLoopModal();
    return;
  }
  window.location.href = '/loop.html';
}

export function initImpactRibbon() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', handleLoopOpen);

  fetchImpact();
  refreshLoopAvailability();

  document.addEventListener('pp:loop:summary', (e) => {
    loopAvailable = !!e.detail?.available;
    renderAll();
  });
  document.addEventListener('auth:login', () => refreshLoopAvailability(true));
  document.addEventListener('auth:logout', () => { loopAvailable = false; renderAll(); });

  document.addEventListener('pp:footer:ready', () => {
    renderAll();
    fetchImpact();
  });
  document.addEventListener('pp:widgetDock:ready', () => {
    renderAll();
  });
}
