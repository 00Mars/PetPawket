// public/loopModal.js — Pawket Pass modal + share actions
import { setLoopSummary } from './loopState.js';
import { getSession } from './auth.js';

let modalEl = null;
let lastPending = null;

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[m]));
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function positiveInt(v, fallback = 1) {
  return Math.max(1, Math.floor(safeNumber(v, fallback)));
}

function percent(v) {
  return Math.max(0, Math.min(100, Math.round(safeNumber(v, 0))));
}

function safeUrl(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  if (raw.startsWith('#')) return raw;
  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return '';
  }
}

export function initLoopModal() {
  if (window.__ppLoopModalInit) return;
  window.__ppLoopModalInit = true;

  modalEl = buildModal();
  document.body.appendChild(modalEl);

  modalEl.addEventListener('click', (e) => {
    if (e.target.matches('[data-loop-close]') || e.target === modalEl) {
      closeModal();
    }
  });

  modalEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-loop-share]');
    if (!btn) return;
    const action = btn.getAttribute('data-loop-share');
    handleShareAction(action);
  });
  modalEl.querySelector('[data-loop-actions-toggle]')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const panel = modalEl.querySelector('.pp-loop-share-actions-panel');
    if (!btn || !panel) return;
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isOpen));
    panel.classList.toggle('is-open', !isOpen);
    const icon = btn.querySelector('.pp-loop-share-actions-icon');
    if (icon) icon.textContent = isOpen ? '+' : '–';
  });

  window.PP_openLoopModal = async (tokenOverride = null) => {
    if (tokenOverride?.code) {
      openModal(tokenOverride);
      return;
    }
    if (!lastPending) {
      await fetchPendingToken();
    }
    if (lastPending) openModal(lastPending);
    else openModal({ code: null });
  };

  // Check for pending account passes on general pages. The dedicated pass
  // landing page owns its own claim experience and should not be covered.
  if (!document.querySelector('[data-loop-landing]')) {
    fetchPendingToken().catch(() => {});
  }

  document.addEventListener('auth:login', () => {
    fetchPendingToken().catch(() => {});
  });
}

function buildModal() {
  const wrap = document.createElement('div');
  wrap.className = 'pp-loop-modal';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.hidden = true;
  wrap.innerHTML = `
    <div class="pp-loop-card" role="dialog" aria-modal="true" aria-label="Pawket Pass" aria-hidden="true" data-loop-dialog>
      <button class="pp-loop-close" type="button" data-loop-close aria-label="Close">×</button>
      <span class="pp-loop-kicker">Pawket Pass</span>
      <h2 class="pp-loop-title">Share your Pawket Pass</h2>
      <p>A Pawket Pass can help someone else discover Pet Pawket while keeping private details protected.</p>
      <div class="pp-loop-flow" aria-label="Pawket Pass flow">
        <span>Share Pass</span>
        <span class="pp-loop-flow-arrow">&gt;</span>
        <span>Friend Shops</span>
        <span class="pp-loop-flow-arrow">&gt;</span>
        <span class="pp-loop-flow-final">Care Moves Forward</span>
      </div>
      <div class="pp-loop-empty-modal" data-loop-empty hidden>
        <strong>No shareable pass yet.</strong>
        <span>Passes appear here after purchases, gifts, or saved links. You can still open the Pass Hub to learn how they work.</span>
        <div class="pp-loop-actions-row">
          <a class="pp-loop-mini-btn is-link" href="/shop.html">Shop</a>
          <a class="pp-loop-mini-btn is-link" href="/loop.html">Pass Hub</a>
        </div>
      </div>
      <div class="pp-loop-sharecard" data-loop-sharecard>
        <div class="pp-loop-sharecard-top">
          <div>
            <div class="pp-loop-sharecard-kicker">Pawket Pass</div>
            <div class="pp-loop-sharecard-title">Pet Pawket</div>
            <div class="pp-loop-sharecard-meta">Scan to save this pass</div>
          </div>
          <div class="pp-loop-sharecard-qr">
            <img data-loop-qr alt="Pawket Pass QR code" />
          </div>
        </div>
        <div class="pp-loop-sharecard-token">
          <div class="pp-loop-sharecard-code" data-loop-code>—</div>
          <div class="pp-loop-sharecard-track">
            <span data-loop-chain-progress></span>
          </div>
          <div class="pp-loop-sharecard-chain-meta" data-loop-chain-meta>1 person connected • You’re next</div>
        </div>
        <div class="pp-loop-sharecard-hint">Private pet profiles and journals are not shared by this card.</div>
      </div>
      <div class="pp-loop-impact" data-loop-impact hidden>
        <div class="pp-loop-impact-head">
          <span class="pp-loop-impact-kicker">Rescue funding</span>
          <span class="pp-loop-impact-amount" data-loop-impact-amount></span>
        </div>
        <div class="pp-loop-impact-title" data-loop-impact-title></div>
        <div class="pp-loop-impact-body" data-loop-impact-body></div>
        <div class="pp-loop-impact-bar"><span data-loop-impact-bar></span></div>
        <div class="pp-loop-impact-meta" data-loop-impact-meta></div>
        <div class="pp-loop-impact-timeline" data-loop-impact-timeline></div>
      </div>
      <div class="pp-loop-impact-celebrate" data-loop-impact-celebrate hidden></div>
      <div class="pp-loop-impact-reel" data-loop-impact-reel hidden></div>
      <div class="pp-loop-meta">Pawket Passes connect purchase sharing to CHARM Foundation impact without exposing private pet stories.</div>
      <div class="pp-loop-share-actions is-dropup" data-loop-actions>
        <button class="pp-loop-share-actions-toggle" type="button" data-loop-actions-toggle aria-expanded="false">
          Share options
          <span class="pp-loop-share-actions-icon">+</span>
        </button>
        <div class="pp-loop-share-actions-panel">
          <div class="pp-loop-share-actions-link">
            <label for="ppLoopLink">Share link</label>
            <div class="pp-loop-link-row">
              <input id="ppLoopLink" type="text" data-loop-link readonly />
              <button class="pp-loop-share-btn" type="button" data-loop-share="copy">Copy</button>
            </div>
          </div>
          <div class="pp-loop-share-actions-row pp-loop-share-actions-primary">
            <button class="pp-loop-share-chip is-copy" type="button" data-loop-share="copy">
              <i class="bi bi-link-45deg"></i><span>Copy</span>
            </button>
            <button class="pp-loop-share-chip is-native" type="button" data-loop-share="native" hidden>
              <i class="bi bi-share-fill"></i><span>Share</span>
            </button>
            <button class="pp-loop-share-chip is-download" type="button" data-loop-share="download">
              <i class="bi bi-download"></i><span>Download</span>
            </button>
          </div>
          <div class="pp-loop-share-actions-row pp-loop-share-actions-platforms">
            <button class="pp-loop-share-chip is-email" type="button" data-loop-share="email">
              <i class="bi bi-envelope-heart"></i><span>Email</span>
            </button>
            <button class="pp-loop-share-chip is-facebook" type="button" data-loop-share="facebook">
              <i class="bi bi-facebook"></i><span>Facebook</span>
            </button>
            <button class="pp-loop-share-chip is-discord" type="button" data-loop-share="discord">
              <i class="bi bi-discord"></i><span>Discord</span>
            </button>
            <button class="pp-loop-share-chip is-teams" type="button" data-loop-share="teams">
              <i class="bi bi-microsoft-teams"></i><span>Teams</span>
            </button>
            <button class="pp-loop-share-chip is-sms" type="button" data-loop-share="sms">
              <i class="bi bi-chat-dots"></i><span>SMS</span>
            </button>
          </div>
          <div class="pp-loop-share-status" data-loop-share-status></div>
        </div>
      </div>
    </div>
  `;
  return wrap;
}

async function fetchPendingToken() {
  try {
    const session = await getSession();
    if (!session?.signedIn) return;
    const res = await fetch('/api/loop/me', { credentials: 'include', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
  if (res.ok && data?.ok) {
    setLoopSummary(data);
    if (data?.pendingToken?.code) {
      lastPending = data.pendingToken;
      openModal(lastPending);
      clearStoredToken();
    }
  }
  } catch {}
}

function openModal(token) {
  if (!modalEl) return;
  const codeEl = modalEl.querySelector('[data-loop-code]');
  const linkEl = modalEl.querySelector('[data-loop-link]');
  const chainProgress = modalEl.querySelector('[data-loop-chain-progress]');
  const chainMeta = modalEl.querySelector('[data-loop-chain-meta]');
  const shareCard = modalEl.querySelector('[data-loop-sharecard]');
  const emptyEl = modalEl.querySelector('[data-loop-empty]');
  const qrImg = modalEl.querySelector('[data-loop-qr]');
  const nativeBtn = modalEl.querySelector('[data-loop-share="native"]');
  const toggleBtn = modalEl.querySelector('[data-loop-actions-toggle]');
  const hasToken = !!token?.code;
  const code = hasToken ? String(token.code).toUpperCase() : 'Complete a purchase to receive a Pawket Pass';
  if (codeEl) codeEl.textContent = code;
  const chainLength = positiveInt(token?.chainLength, 1);
  modalEl.dataset.loopCode = hasToken ? String(token.code) : '';
  modalEl.dataset.loopChainLength = hasToken ? String(chainLength) : '';
  if (linkEl) linkEl.value = hasToken ? getShareLink() : '';
  const chainTarget = 10;
  const pct = hasToken ? percent((chainLength / chainTarget) * 100) : 0;
  if (chainProgress) chainProgress.style.width = `${pct}%`;
  if (chainMeta) {
    chainMeta.textContent = hasToken
      ? `${chainLength} people connected • You’re next`
      : 'Complete a purchase to start a Pawket Pass';
  }
  if (shareCard) shareCard.hidden = !hasToken;
  if (emptyEl) emptyEl.hidden = hasToken;
  modalEl.classList.toggle('is-empty', !hasToken);
  const statusEl = modalEl.querySelector('[data-loop-share-status]');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.remove('is-visible');
  }
  if (qrImg) {
    const link = hasToken ? getShareLink() : '';
    if (link) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(link)}`;
      qrImg.crossOrigin = 'anonymous';
      qrImg.src = qrUrl;
      qrImg.loading = 'lazy';
    } else {
      qrImg.removeAttribute('src');
    }
  }
  if (nativeBtn) nativeBtn.hidden = !canShareNative();
  if (toggleBtn) {
    toggleBtn.disabled = !hasToken;
    toggleBtn.classList.toggle('is-disabled', !hasToken);
  }
  modalEl.querySelectorAll('[data-loop-share]').forEach((btn) => {
    btn.disabled = !hasToken;
    btn.classList.toggle('is-disabled', !hasToken);
  });
  const actionsPanel = modalEl.querySelector('.pp-loop-share-actions-panel');
  if (actionsPanel) {
    actionsPanel.classList.remove('is-open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    const icon = toggleBtn?.querySelector('.pp-loop-share-actions-icon');
    if (icon) icon.textContent = '+';
  }
  modalEl.hidden = false;
  modalEl.classList.add('is-open');
  modalEl.setAttribute('aria-hidden', 'false');
  modalEl.querySelector('[data-loop-dialog]')?.setAttribute('aria-hidden', 'false');
  hydrateImpactActive();
}

async function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('is-open');
  modalEl.setAttribute('aria-hidden', 'true');
  modalEl.querySelector('[data-loop-dialog]')?.setAttribute('aria-hidden', 'true');
  modalEl.hidden = true;
  const code = modalEl.dataset.loopCode || '';
  if (code) {
    try {
      await fetch('/api/loop/seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
    } catch {}
  }
}

function clearStoredToken() {
  try { localStorage.removeItem('pp_loop_token'); } catch {}
  try {
    document.cookie = 'pp_loop_token=; Path=/; Max-Age=0; SameSite=Lax';
  } catch {}
}

function getShareLink() {
  const code = modalEl?.dataset?.loopCode;
  if (!code) return '';
  return `${window.location.origin}/loop.html?token=${encodeURIComponent(code)}`;
}

async function copyLink() {
  const link = getShareLink();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    setShareStatus('Link copied to clipboard.');
  } catch {
    const temp = document.createElement('input');
    temp.value = link;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    setShareStatus('Link copied to clipboard.');
  }
}

function shareEmail() {
  const link = getShareLink();
  if (!link) return;
  const subject = encodeURIComponent('I have a Pawket Pass for you');
  const body = encodeURIComponent(`I saved a Pawket Pass on Pet Pawket. You can claim it here: ${link}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function shareMessage() {
  const link = getShareLink();
  if (!link) return;
  const body = encodeURIComponent(`I saved a Pawket Pass on Pet Pawket. You can claim it here: ${link}`);
  window.location.href = `sms:?&body=${body}`;
}

function canShareNative() {
  return !!(navigator?.share);
}

async function shareNative() {
  const link = getShareLink();
  if (!link || !canShareNative()) return;
  try {
    await navigator.share({
      title: 'Pawket Pass',
      text: 'I saved a Pawket Pass on Pet Pawket. You can claim it here.',
      url: link,
    });
  } catch {}
}

function shareFacebook() {
  const link = getShareLink();
  if (!link) return;
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
  openShare(url);
}

async function shareDiscord() {
  const link = getShareLink();
  if (!link) return;
  await copyLink();
  openShare('https://discord.com/channels/@me');
  setShareStatus('Link copied — paste it into Discord.');
}

function shareTeams() {
  const link = getShareLink();
  if (!link) return;
  const msg = encodeURIComponent(`I saved a Pawket Pass on Pet Pawket. You can claim it here: ${link}`);
  const url = `https://teams.microsoft.com/share?href=${encodeURIComponent(link)}&msgText=${msg}`;
  openShare(url);
}

function openShare(url) {
  try {
    window.open(url, '_blank', 'noopener');
  } catch {}
}

function setShareStatus(msg) {
  const el = modalEl?.querySelector('[data-loop-share-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
  clearTimeout(el.__ppTimer);
  el.__ppTimer = setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2600);
}

function handleShareAction(action) {
  switch (action) {
    case 'copy':
      copyLink();
      break;
    case 'native':
      shareNative();
      break;
    case 'download':
      downloadShareCard();
      break;
    case 'email':
      shareEmail();
      break;
    case 'facebook':
      shareFacebook();
      break;
    case 'discord':
      shareDiscord();
      break;
    case 'teams':
      shareTeams();
      break;
    case 'sms':
      shareMessage();
      break;
    default:
      break;
  }
}

async function downloadShareCard() {
  const code = modalEl?.dataset?.loopCode;
  if (!code) return;
  const chainLength = positiveInt(modalEl?.dataset?.loopChainLength, 1);
  const link = getShareLink();
  try {
    const canvas = await buildShareCardCanvas({ code: String(code).toUpperCase(), link, chainLength });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pet-pawket-pass-${code}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  } catch (e) {
    console.warn('[loop] share card download failed', e);
  }
}

async function buildShareCardCanvas({ code, link, chainLength }) {
  const width = 900;
  const height = 520;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.6, '#e7fbff');
  grad.addColorStop(1, '#cfeffc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(12,128,150,0.12)';
  ctx.fillRect(0, 0, width, 90);

  ctx.fillStyle = '#0c8096';
  ctx.font = '700 22px Fredoka, sans-serif';
  ctx.fillText('Pawket Pass', 50, 52);

  ctx.fillStyle = '#1f2a33';
  ctx.font = '700 40px Fredoka, sans-serif';
  ctx.fillText('Pet Pawket', 50, 120);

  ctx.fillStyle = '#51646f';
  ctx.font = '500 20px sans-serif';
  ctx.fillText('Share Pet Pawket. Keep CHARM impact visible.', 50, 155);

  ctx.fillStyle = '#0b8aa1';
  ctx.font = '700 18px sans-serif';
  ctx.fillText(`${chainLength} people connected`, 50, 190);

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  roundRect(ctx, 50, 220, 520, 70, 18, true, true);
  ctx.fillStyle = '#1b2b35';
  ctx.font = '700 26px Fredoka, sans-serif';
  drawTextCentered(ctx, code, 310, 266);

  ctx.fillStyle = '#5a6b75';
  ctx.font = '500 16px sans-serif';
  ctx.fillText(link, 50, 320);

  const qr = await fetchQrImage(link);
  if (qr) {
    ctx.save();
    roundRect(ctx, 650, 130, 170, 170, 22, true, false);
    ctx.drawImage(qr, 660, 140, 150, 150);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    roundRect(ctx, 650, 130, 170, 170, 22, true, true);
    ctx.fillStyle = '#0c8096';
    ctx.font = '700 18px sans-serif';
    drawTextCentered(ctx, 'Scan Me', 735, 220);
  }

  ctx.fillStyle = 'rgba(12,128,150,0.8)';
  ctx.font = '600 14px sans-serif';
  ctx.fillText('petpawket.com', 50, 360);

  return canvas;
}

async function fetchQrImage(link) {
  if (!link) return null;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
  try {
    const res = await fetch(qrUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToImage(blob);
  } catch {
    return null;
  }
}

function blobToImage(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function drawTextCentered(ctx, text, cx, cy) {
  const metrics = ctx.measureText(text);
  const x = cx - metrics.width / 2;
  const y = cy;
  ctx.fillText(text, x, y);
}

async function hydrateImpactActive() {
  if (!modalEl) return;
  const holder = modalEl.querySelector('[data-loop-impact]');
  const titleEl = modalEl.querySelector('[data-loop-impact-title]');
  const bodyEl = modalEl.querySelector('[data-loop-impact-body]');
  const amountEl = modalEl.querySelector('[data-loop-impact-amount]');
  const barEl = modalEl.querySelector('[data-loop-impact-bar]');
  const metaEl = modalEl.querySelector('[data-loop-impact-meta]');
  const timelineEl = modalEl.querySelector('[data-loop-impact-timeline]');
  const celebrateEl = modalEl.querySelector('[data-loop-impact-celebrate]');
  const reelEl = modalEl.querySelector('[data-loop-impact-reel]');
  if (!holder || !titleEl || !bodyEl || !amountEl || !barEl || !metaEl) return;
  try {
    const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const active = data?.activeCase;
    const recent = data?.recentlyFunded;
    if (active?.title) {
      const funded = safeNumber(active.fundedAmount, 0);
      const goal = safeNumber(active.goalAmount, 0);
      const pct = percent(active.progressPct);
      titleEl.textContent = active.title;
      bodyEl.textContent = active.body || '';
      amountEl.textContent = `${formatMoney(funded, active.currency)} funded`;
      barEl.style.width = `${pct}%`;
      metaEl.textContent = goal
        ? `${formatMoney(funded, active.currency)} of ${formatMoney(goal, active.currency)}`
        : 'Rescue funding in progress';
      if (timelineEl) {
        timelineEl.innerHTML = renderImpactTimeline(pct);
      }
      holder.hidden = false;
    } else {
      holder.hidden = true;
    }

    if (celebrateEl) {
      if (recent?.title) {
        celebrateEl.innerHTML = `
          <div class="pp-loop-impact-celebrate-kicker">Rescue completed</div>
          <strong>${esc(recent.title)}</strong>
          <span>${recent.petName ? `${esc(recent.petName)}’s story is complete.` : 'A rescue just reached its goal.'}</span>
        `;
        celebrateEl.hidden = false;
      } else {
        celebrateEl.hidden = true;
      }
    }

    if (reelEl) {
      await hydrateImpactReel(reelEl);
    }
  } catch {
    holder.hidden = true;
  }
}

function renderImpactTimeline(pct = 0) {
  const safePct = percent(pct);
  const steps = [25, 50, 75, 100];
  return `
    <div class="pp-impact-timeline">
      ${steps.map((step) => {
        const state = safePct >= step ? 'is-complete' : safePct >= step - 15 ? 'is-active' : '';
        return `
          <div class="pp-impact-step ${state}">
            <span></span>
            <small>${step}%</small>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function hydrateImpactReel(reelEl) {
  try {
    const res = await fetch('/api/loop/impact?limit=6', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const stories = Array.isArray(data?.stories) ? data.stories : [];
    if (!stories.length) {
      reelEl.hidden = true;
      return;
    }
    reelEl.innerHTML = `
      <div class="pp-loop-impact-reel-head">Impact highlights</div>
      <div class="pp-loop-impact-reel-track">
        ${stories.map(renderImpactCard).join('')}
      </div>
    `;
    reelEl.hidden = false;
  } catch {
    reelEl.hidden = true;
  }
}

function renderImpactCard(story) {
  const imageUrl = safeUrl(story?.imageUrl);
  const alt = story?.petName || story?.title || 'Rescue story';
  const img = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(alt)}">`
    : `<div class="pp-loop-impact-reel-icon"><i class="bi bi-heart-pulse"></i></div>`;
  return `
    <article class="pp-loop-impact-reel-card">
      ${img}
      <div>
        <strong>${esc(story?.title || 'Rescue story')}</strong>
        <span>${esc(story?.body || '')}</span>
      </div>
    </article>
  `;
}

function formatMoney(amount = 0, currency = 'USD') {
  const value = safeNumber(amount, 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}
