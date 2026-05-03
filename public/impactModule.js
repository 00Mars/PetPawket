// public/impactModule.js — homepage CHARM micro + receipt highlight
import { loadCharmPlaceholders } from './charmData.js';

const money = (amount = 0, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

function safeUrl(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  if (raw.startsWith('#')) return raw;
  try {
    const url = new URL(raw, location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.origin === location.origin ? `${url.pathname}${url.search}${url.hash}` : url.href;
  } catch {
    return '';
  }
}

async function loadImpactHighlight() {
  const placeholders = await loadCharmPlaceholders();
  const howText = placeholders?.howCharmWorks;
  if (howText) {
    document.querySelectorAll('[data-charm-how]').forEach((el) => {
      el.textContent = howText;
    });
  }

  const links = placeholders?.supportLinks || {};
  document.querySelectorAll('[data-charm-link]').forEach((el) => {
    const key = el.getAttribute('data-charm-link');
    const href = key ? links[key] : null;
    const safeHref = safeUrl(href);
    if (safeHref) el.setAttribute('href', safeHref);
  });

  const tile = document.querySelector('[data-charm-receipt-highlight]');
  if (!tile) return;

  const titleEl = tile.querySelector('[data-charm-receipt-title]');
  const amountEl = tile.querySelector('[data-charm-receipt-amount]');
  const metaEl = tile.querySelector('[data-charm-receipt-meta]');
  const noteEl = tile.querySelector('[data-charm-receipt-note]');

  let active = null;
  try {
    const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.activeCase) active = data.activeCase;
  } catch {
    active = null;
  }

  if (active) {
    const funded = Number(active.fundedAmount || 0);
    const goal = Number(active.goalAmount || 0);
    const pct = Number(active.progressPct || 0);
    if (titleEl) titleEl.textContent = active.title || 'Rescue funding in motion';
    if (amountEl) amountEl.textContent = money(funded, active.currency || 'USD');
    if (metaEl) {
      metaEl.textContent = goal
        ? `Goal ${money(goal, active.currency || 'USD')} • ${pct}% funded`
        : 'Active rescue case';
    }
    if (noteEl) noteEl.textContent = 'Active rescue case receipt highlight.';
    return;
  }

  const highlight = placeholders?.receiptHighlight || {};
  if (titleEl) titleEl.textContent = highlight.title || 'CHARM care fund';
  if (amountEl) amountEl.textContent = money(highlight.amount || 0, placeholders?.fundedThisMonth?.currency || 'USD');
  if (metaEl) metaEl.textContent = highlight.label || 'Spring rescue care';
  if (noteEl) noteEl.textContent = highlight.note || 'Receipt details coming into view.';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadImpactHighlight(), { once: true });
} else {
  loadImpactHighlight();
}
