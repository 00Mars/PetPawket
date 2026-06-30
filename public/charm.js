// public/charm.js — CHARM Foundation page enhancements
import { getLoopAvailability } from './loopState.js';
import { loadCharmPlaceholders } from './charmData.js';

const money = (amount = 0, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
};

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

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

function percent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

async function loadActiveCase() {
  const titleEl = document.querySelector('[data-charm-case-title]');
  const bodyEl = document.querySelector('[data-charm-case-body]');
  const metaEl = document.querySelector('[data-charm-case-meta]');
  const barEl = document.querySelector('[data-charm-case-progress]');
  if (!titleEl || !bodyEl || !metaEl || !barEl) return;

  try {
    const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const active = data?.activeCase;
    if (!active) {
      titleEl.textContent = 'CHARM update coming into view';
      bodyEl.textContent = 'Reviewed CHARM updates will appear when the details are ready.';
      metaEl.textContent = 'Check back for the next reviewed CHARM update.';
      barEl.style.width = '0%';
      return;
    }
    const funded = Number(active.fundedAmount || 0);
    const goal = Number(active.goalAmount || 0);
    const pct = percent(active.progressPct);
    titleEl.textContent = active.title || 'CHARM update in motion';
    bodyEl.textContent = active.body || 'Reviewed CHARM care updates appear when the details are ready.';
    metaEl.textContent = goal
      ? `${money(funded, active.currency)} of ${money(goal, active.currency)} funded`
      : 'CHARM update coming into view';
    barEl.style.width = `${pct}%`;
  } catch {
    titleEl.textContent = 'CHARM update loading';
    bodyEl.textContent = 'We are gathering the latest reviewed CHARM update.';
    metaEl.textContent = 'Check back in a moment.';
    barEl.style.width = '0%';
  }
}

function storyCard(story = {}) {
  const imageUrl = safeUrl(story.imageUrl);
  const img = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(story.petName || story.title || 'Rescue story')}" />`
    : `<div class="charm-story-icon"><i class="bi bi-heart-pulse"></i></div>`;
  return `
    <article class="charm-story-card">
      ${img}
      <div class="charm-story-body">
        <strong>${esc(story.title || 'Reviewed CHARM story')}</strong>
        <p>${esc(story.body || 'More reviewed CHARM updates coming soon.')}</p>
        <span>${esc(story.petName ? `Featuring ${story.petName}` : 'CHARM Foundation')}</span>
      </div>
    </article>
  `;
}

async function loadStories() {
  const grid = document.querySelector('[data-charm-story-grid]');
  if (!grid) return;
  try {
    const res = await fetch('/api/loop/impact?limit=6', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const stories = Array.isArray(data?.stories) ? data.stories : [];
    if (!stories.length) {
      grid.innerHTML = `
        <article class="charm-story-card">
          <div class="charm-story-icon"><i class="bi bi-heart-pulse"></i></div>
          <div class="charm-story-body">
            <strong>Reviewed CHARM stories coming soon</strong>
            <p>Public CHARM updates will appear here when the details are ready.</p>
            <span>CHARM Foundation</span>
          </div>
        </article>
      `;
      return;
    }
    grid.innerHTML = stories.map(storyCard).join('');
  } catch {
    grid.innerHTML = `
      <article class="charm-story-card">
        <div class="charm-story-icon"><i class="bi bi-heart-pulse"></i></div>
        <div class="charm-story-body">
          <strong>Reviewed CHARM stories loading</strong>
          <p>We are gathering the latest CHARM updates.</p>
          <span>CHARM Foundation</span>
        </div>
      </article>
    `;
  }
}

async function loadReceipts() {
  const placeholders = await loadCharmPlaceholders();
  if (!placeholders) return;

  const howEl = document.querySelector('[data-charm-how]');
  if (howEl && placeholders.howCharmWorks) {
    howEl.textContent = placeholders.howCharmWorks;
  }

  const labelText = placeholders.isPlaceholder ? 'Example receipt' : 'Receipt';
  document.querySelectorAll('[data-charm-receipt-label]').forEach((el) => {
    el.textContent = labelText;
  });

  const whereList = document.querySelector('[data-charm-where-funds]');
  if (whereList) {
    const rows = Array.isArray(placeholders.whereFundsGo) ? placeholders.whereFundsGo : [];
    whereList.innerHTML = rows.length
      ? rows.map(row => `
          <li><span>${esc(row.label || 'Care')}</span><strong>${percent(row.percent)}%</strong></li>
        `).join('')
      : '<li><span>Updates coming soon</span><strong>0%</strong></li>';
  }

  const funded = placeholders.fundedThisMonth || {};
  const monthEl = document.querySelector('[data-charm-funded-month]');
  if (monthEl) monthEl.textContent = funded.monthLabel || 'This month';

  const fundedList = document.querySelector('[data-charm-funded-list]');
  if (fundedList) {
    const items = Array.isArray(funded.items) ? funded.items : [];
    fundedList.innerHTML = items.length
      ? items.map(item => `
          <li><span>${esc(item.label || 'Care')}</span><strong>${esc(money(item.amount || 0, funded.currency || 'USD'))}</strong></li>
        `).join('')
      : '<li><span>Updates coming soon</span><strong>$0</strong></li>';
  }

  const totalEl = document.querySelector('[data-charm-funded-total]');
  if (totalEl) {
    totalEl.textContent = money(funded.total || 0, funded.currency || 'USD');
  }

  const editionsList = document.querySelector('[data-charm-editions-list]');
  if (editionsList) {
    const lines = Array.isArray(placeholders.charmEditions) ? placeholders.charmEditions : [];
    editionsList.innerHTML = lines.length
      ? lines.map(line => `<li><span>${esc(line)}</span><strong>CHARM</strong></li>`).join('')
      : '<li><span>CHARM Edition updates coming soon</span><strong>CHARM</strong></li>';
  }

  const links = placeholders.supportLinks || {};
  document.querySelectorAll('[data-charm-link]').forEach((el) => {
    const key = el.getAttribute('data-charm-link');
    const href = key ? links[key] : null;
    const safeHref = safeUrl(href);
    if (safeHref) el.setAttribute('href', safeHref);
  });
}

async function wireShareButtons() {
  const buttons = document.querySelectorAll('[data-loop-open]');
  if (!buttons.length) return;
  const state = await getLoopAvailability();
  const show = !!state?.available;
  buttons.forEach(btn => {
    btn.hidden = !show;
    btn.setAttribute('aria-hidden', String(!show));
  });
  document.addEventListener('pp:loop:summary', (e) => {
    const available = !!e.detail?.available;
    buttons.forEach(btn => {
      btn.hidden = !available;
      btn.setAttribute('aria-hidden', String(!available));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadActiveCase();
  loadStories();
  loadReceipts();
  wireShareButtons();
});
