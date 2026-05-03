// public/loopTracker.js — Account dashboard Pawket Passes
import { getSession } from './auth.js';
import { setLoopSummary } from './loopState.js';

export function initLoopTracker() {
  const root = document.querySelector('[data-loop-tracker]');
  if (!root) return;
  renderLoading(root);
  loadSummary(root);
}

function renderLoading(root) {
  setLoopStagePill('Loading');
  root.innerHTML = `<p class="text-muted mb-0">Loading Pawket Passes…</p>`;
}

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

function nonNegativeInt(v, fallback = 0) {
  return Math.max(0, Math.floor(safeNumber(v, fallback)));
}

function tokenCode(item) {
  return String(item?.code || item || '').trim().toUpperCase();
}

function countExtraPendingToken(pendingToken, sentTokens = []) {
  const pendingCode = tokenCode(pendingToken);
  if (!pendingCode) return 0;
  return sentTokens.some((token) => tokenCode(token) === pendingCode) ? 0 : 1;
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

async function loadSummary(root) {
  try {
    const session = await getSession();
    if (!session?.signedIn) {
      setLoopStagePill('Sign in');
      root.innerHTML = renderSignedOutState();
      return;
    }
    const res = await fetch('/api/loop/me', { credentials: 'include', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      if (res.status === 401 || res.status === 403) {
        setLoopStagePill('Sign in');
        root.innerHTML = renderSignedOutState();
      } else {
        setLoopStagePill('Unavailable');
        root.innerHTML = `<p class="text-muted mb-0">Unable to load Pawket Passes right now.</p>`;
        try { window.PP_accountAlert?.('Pawket Passes are temporarily unavailable.', 'warning'); } catch {}
      }
      return;
    }
    setLoopSummary(data);
    renderSummary(root, data);
  } catch (e) {
    console.warn('[loop] tracker error', e);
    setLoopStagePill('Unavailable');
    root.innerHTML = `<p class="text-muted mb-0">Unable to load Pawket Passes right now.</p>`;
    try { window.PP_accountAlert?.('Pawket Passes are temporarily unavailable.', 'warning'); } catch {}
  }
}

function renderSignedOutState() {
  return `
    <section class="pp-loop-signed-out" aria-label="Pawket Pass preview">
      <div>
        <span class="pp-loop-launch-kicker">Pawket Passes</span>
        <h3>Sign in to save and track passes.</h3>
        <p>Pawket Passes appear here after eligible purchases, gifts, or claims. Your account keeps shareable passes, CHARM Points, badges, and impact updates together.</p>
      </div>
      <div class="pp-loop-actions-row">
        <a class="pp-loop-mini-btn is-link" href="/login.html">Sign in</a>
        <a class="pp-loop-mini-btn is-link" href="/loop.html">Open Pass Hub</a>
      </div>
    </section>
  `;
}

function renderSummary(root, data) {
  const sent = Array.isArray(data.sentTokens) ? data.sentTokens : [];
  const received = Array.isArray(data.receivedTokens) ? data.receivedTokens : [];
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const rewards = Array.isArray(data.recentRewards) ? data.recentRewards : [];
  const impact = data.impact || {};
  const pending = countExtraPendingToken(data.pendingToken, sent);
  const isDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const showDevTools = isDev && new URLSearchParams(window.location.search).has('passTools');
  const points = nonNegativeInt(data.points, 0);
  const shareCount = nonNegativeInt(data.sharesCount, 0);
  const chainLength = positiveInt(data.maxChainLength, 1);
  const sharesRecent = nonNegativeInt(data.sharesRecent, 0);
  const nextReward = getNextReward({ shareCount, chainLength, sharesRecent });
  setLoopStagePill('Passes');

  root.innerHTML = `
    ${renderLaunchPreview({ points, sent, received, badges, pending, shareCount, chainLength, impact })}
    ${renderNextReward(nextReward)}
    ${renderPassGuidance({ sent, received, pending, impact })}
    <div class="pp-loop-summary">
      <div class="pp-loop-chip">CHARM Points ${points}</div>
      <div class="pp-loop-chip">Available ${sent.length + pending}</div>
      <div class="pp-loop-chip">Claimed ${received.length}</div>
      <div class="pp-loop-chip">Shared ${shareCount}</div>
    </div>
    ${badges.length ? `<div class="pp-loop-badges" aria-label="Pawket Pass badges">${badges.map(renderBadge).join('')}</div>` : ''}
    <div class="pp-loop-highlights">
      <div class="pp-loop-spotlight" data-loop-spotlight>
        <h4>Spotlight Pass</h4>
        <div class="pp-loop-reward-empty">Checking community pass activity...</div>
      </div>
      <div class="pp-loop-impact-feed" data-loop-impact-feed>
        <h4>Impact Highlights</h4>
        <div class="pp-loop-reward-empty">Checking CHARM updates...</div>
      </div>
    </div>
    ${renderImpactSummary(impact)}
    <div class="pp-loop-rewards">
      <h4>Recent activity</h4>
      ${rewards.length ? rewards.map(renderRewardRow).join('') : '<div class="pp-loop-reward-empty">No pass activity yet. Pawket Passes will appear here after purchases, gifts, or claims.</div>'}
    </div>
    <div class="pp-loop-tabs" role="tablist">
      <button class="pp-loop-tab is-active" type="button" data-loop-tab="sent">Shareable</button>
      <button class="pp-loop-tab" type="button" data-loop-tab="received">Claimed</button>
      <button class="pp-loop-tab" type="button" data-loop-tab="active">In motion</button>
    </div>
    <div class="pp-loop-list" data-loop-list></div>
    ${showDevTools ? renderTestTools() : ''}
  `;

  const listEl = root.querySelector('[data-loop-list]');
  const tabs = root.querySelectorAll('[data-loop-tab]');
  const render = (tab) => {
    tabs.forEach(t => t.classList.toggle('is-active', t.dataset.loopTab === tab));
    if (!listEl) return;
    if (tab === 'received') {
      listEl.innerHTML = received.length ? received.map(itemRowReceived).join('') : emptyRow('No received passes yet. Claimed passes will appear here.');
    } else if (tab === 'active') {
      const active = sent.filter(s => safeNumber(s?.chainLength, 0) > 1);
      listEl.innerHTML = active.length ? active.map(itemRowSent).join('') : emptyRow('No passes are moving yet. Share a pass when one is available.');
    } else {
      listEl.innerHTML = sent.length ? sent.map(itemRowSent).join('') : emptyRow('No shareable passes yet. Passes appear here after a purchase, gift, or claim.');
    }
  };

  tabs.forEach(btn => btn.addEventListener('click', () => render(btn.dataset.loopTab)));
  render('sent');

  listEl?.addEventListener('click', (event) => {
    const copyBtn = event.target.closest('[data-loop-copy]');
    if (copyBtn) {
      copyLink(copyBtn.dataset.loopCopy || '');
      copyBtn.textContent = 'Copied';
      window.setTimeout(() => { copyBtn.textContent = 'Copy link'; }, 1600);
      return;
    }

    const openBtn = event.target.closest('[data-loop-open]');
    if (openBtn) {
      const code = tokenCode(openBtn.dataset.loopOpen);
      if (code) window.location.href = `/loop.html?token=${encodeURIComponent(code)}`;
      return;
    }

    const shareBtn = event.target.closest('[data-loop-sharecard]');
    if (shareBtn) {
      const code = tokenCode(shareBtn.dataset.loopSharecard);
      if (!code) return;
      const token = sent.find((item) => tokenCode(item) === code) || { code };
      if (typeof window.PP_openLoopModal === 'function') {
        window.PP_openLoopModal(token);
      } else {
        window.location.href = `/loop.html?token=${encodeURIComponent(code)}`;
      }
      return;
    }

    const saveBtn = event.target.closest('[data-loop-save-pass]');
    if (saveBtn) {
      const code = tokenCode(saveBtn.dataset.loopSavePass);
      if (!code) return;
      storeToken(code);
      window.location.href = '/shop.html';
    }
  });

  hydrateSpotlight(root);
  hydrateImpactFeed(root);

  const seedBtn = root.querySelector('[data-loop-seed]');
  if (seedBtn) {
    const statusEl = root.querySelector('[data-loop-seed-status]');
    seedBtn.addEventListener('click', async () => {
      if (statusEl) statusEl.textContent = 'Generating…';
      seedBtn.disabled = true;
      try {
        const res = await fetch('/api/loop/debug/seed', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.ok) {
          if (statusEl) statusEl.textContent = payload?.error || 'Unable to generate pass.';
          seedBtn.disabled = false;
          return;
        }
        if (statusEl) statusEl.textContent = 'Pass created.';
        if (typeof window.PP_openLoopModal === 'function') {
          window.PP_openLoopModal();
        }
        loadSummary(root);
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Network error.';
        seedBtn.disabled = false;
      }
    });
  }

  const clearBtn = root.querySelector('[data-loop-clear]');
  if (clearBtn) {
    const statusEl = root.querySelector('[data-loop-seed-status]');
    clearBtn.addEventListener('click', async () => {
      if (statusEl) statusEl.textContent = 'Clearing…';
      clearBtn.disabled = true;
      try {
        const res = await fetch('/api/loop/debug/clear', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.ok) {
          if (statusEl) statusEl.textContent = payload?.error || 'Unable to clear passes.';
          clearBtn.disabled = false;
          return;
        }
        if (statusEl) statusEl.textContent = `Cleared ${payload?.deleted ?? 0} passes.`;
        loadSummary(root);
        clearBtn.disabled = false;
      } catch (err) {
        if (statusEl) statusEl.textContent = 'Network error.';
        clearBtn.disabled = false;
      }
    });
  }
}

function setLoopStagePill(label) {
  const el = document.querySelector('[data-loop-stage-pill]');
  if (!el) return;
  el.textContent = label;
}

function renderLaunchPreview({ points = 0, sent = [], received = [], badges = [], pending = 0, shareCount = 0, chainLength = 1, impact = {} }) {
  const totalPasses = sent.length + pending;
  const totalImpact = safeNumber(impact?.total, 0);
  return `
    <section class="pp-loop-launch-card" aria-label="Pawket Pass summary">
      <div class="pp-loop-launch-copy">
        <span class="pp-loop-launch-kicker">Share, claim, and track</span>
        <h3>Pawket Passes connect purchases to people and impact.</h3>
        <p>When a pass is available, you can share it, open its claim page, copy the link, and watch for connected CHARM activity without exposing private pet profile or journal data.</p>
      </div>
      <div class="pp-loop-launch-status">
        <span><i class="bi bi-ticket-perforated" aria-hidden="true"></i> Pass links</span>
        <span><i class="bi bi-cart-check" aria-hidden="true"></i> Cart checkout</span>
        <span><i class="bi bi-heart-pulse-fill" aria-hidden="true"></i> CHARM impact</span>
      </div>
      <div class="pp-loop-launch-grid" aria-label="Pawket Pass metrics">
        <div><strong>${totalPasses}</strong><span>Available</span></div>
        <div><strong>${received.length}</strong><span>Claimed</span></div>
        <div><strong>${points}</strong><span>CHARM points</span></div>
        <div><strong>${shareCount}</strong><span>Shared</span></div>
        <div><strong>${badges.length}</strong><span>Badges</span></div>
        <div><strong>${formatMoney(totalImpact)}</strong><span>Impact tracked</span></div>
      </div>
    </section>
  `;
}

function renderPassGuidance({ sent = [], received = [], pending = 0, impact = {} }) {
  const hasShareable = sent.length + pending > 0;
  const active = sent.filter((item) => safeNumber(item?.chainLength, 1) > 1).length;
  const impactTotal = safeNumber(impact?.total, 0);
  return `
    <section class="pp-loop-pass-guide" aria-label="Pawket Pass actions">
      <div class="pp-loop-pass-guide-copy">
        <span class="pp-loop-launch-kicker">${hasShareable ? 'Ready to use' : 'How to start'}</span>
        <h4>${hasShareable ? 'You have a pass ready to share.' : 'Your first pass appears after an eligible order or claim.'}</h4>
        <p>${hasShareable
          ? 'Use the Shareable tab to open the pass page, copy the link, or generate the share card.'
          : 'Shop through the Pet Pawket cart, claim a pass link, or send a gift. New pass activity will collect here.'}</p>
      </div>
      <div class="pp-loop-pass-guide-stats">
        <span><strong>${sent.length + pending}</strong><small>shareable</small></span>
        <span><strong>${received.length}</strong><small>claimed</small></span>
        <span><strong>${active}</strong><small>moving</small></span>
        <span><strong>${formatMoney(impactTotal)}</strong><small>impact</small></span>
      </div>
      <div class="pp-loop-pass-guide-actions">
        <a class="pp-loop-mini-btn is-link" href="/loop.html">Pass Hub</a>
        <a class="pp-loop-mini-btn is-link" href="/shop.html">Shop</a>
      </div>
    </section>
  `;
}

function renderTestTools() {
  return `
    <details class="pp-loop-test-tools">
      <summary>Local testing tools</summary>
      <div class="pp-loop-test-copy">
        <span>Local only</span>
        <strong>Generate or clear Pawket Passes</strong>
        <small>These controls are visible on localhost only.</small>
      </div>
      <div class="pp-loop-actions-row">
        <button class="pp-loop-mini-btn" type="button" data-loop-seed>Generate Test Pass</button>
        <button class="pp-loop-mini-btn" type="button" data-loop-clear>Clear Test Passes</button>
        <span class="pp-loop-meta" data-loop-seed-status></span>
      </div>
    </details>
  `;
}

function renderImpactSummary(impact = {}) {
  const total = safeNumber(impact.total, 0);
  const thisMonth = safeNumber(impact.thisMonth, 0);
  const rescues = nonNegativeInt(impact.rescuesHelped, 0);
  const active = impact.activeCase;
  const recent = impact.recentlyFunded;
  const funded = safeNumber(active?.fundedAmount, 0);
  const goal = safeNumber(active?.goalAmount, 0);
  const pct = percent(active?.progressPct);

  return `
    <div class="pp-loop-impact-summary">
      <div class="pp-loop-impact-head">
        <div>
          <div class="pp-loop-impact-kicker">Impact Summary</div>
          <div class="pp-loop-impact-title">Rescue funding in motion</div>
        </div>
        <div class="pp-loop-impact-pill">${formatMoney(total)} total</div>
      </div>
      <div class="pp-loop-impact-stats">
        <div><strong>${formatMoney(thisMonth)}</strong><span>This month</span></div>
        <div><strong>${rescues}</strong><span>Rescues helped</span></div>
      </div>
      ${active ? `
        <div class="pp-loop-impact-active">
          <div class="pp-loop-impact-active-title">${esc(active.title || 'Rescue story')}</div>
          <div class="pp-loop-impact-active-meta">${esc(active.body || '')}</div>
          <div class="pp-loop-impact-progress"><span style="width:${pct}%"></span></div>
          <div class="pp-loop-impact-active-count">${formatMoney(funded, active.currency)} of ${formatMoney(goal, active.currency)}</div>
          ${renderImpactTimeline(pct)}
        </div>
      ` : `<div class="pp-loop-impact-empty">No active rescue case yet.</div>`}
      ${recent?.title ? `
        <div class="pp-loop-impact-celebrate">
          <div class="pp-loop-impact-celebrate-kicker">Rescue completed</div>
          <strong>${esc(recent.title)}</strong>
          <span>${recent.petName ? `${esc(recent.petName)}’s story is complete.` : 'A rescue just reached its goal.'}</span>
        </div>
      ` : ''}
    </div>
  `;
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

function itemRowSent(t) {
  const code = String(t?.code || '').toUpperCase();
  const chainLength = positiveInt(t?.chainLength, 1);
  const chainDots = renderChainDots(chainLength);
  const last = formatDate(t?.lastRedeemedAt);
  const state = chainLength > 1 ? `${chainLength} people connected` : 'Ready to share';
  return `
    <article class="pp-loop-item pp-loop-pass-item">
      <div class="pp-loop-pass-main">
        <span class="pp-loop-pass-kicker">${esc(state)}</span>
        <strong class="pp-loop-code">${esc(code)}</strong>
        <div><small>${last ? `Last claimed ${esc(last)}` : `Created ${esc(formatDate(t?.createdAt) || 'recently')}`}</small></div>
        ${chainDots}
      </div>
      <div class="pp-loop-actions">
        <button class="pp-loop-mini-btn" type="button" data-loop-open="${esc(code)}">Open</button>
        <button class="pp-loop-mini-btn" type="button" data-loop-copy data-loop-copy="${esc(code)}">Copy link</button>
        <button class="pp-loop-mini-btn" type="button" data-loop-sharecard="${esc(code)}">Share card</button>
      </div>
    </article>
  `;
}

function itemRowReceived(t) {
  const code = String(t?.code || '').toUpperCase();
  const position = t?.position ? nonNegativeInt(t.position, 0) : '';
  return `
    <article class="pp-loop-item pp-loop-pass-item is-received">
      <div class="pp-loop-pass-main">
        <span class="pp-loop-pass-kicker">${position ? `Connection ${position}` : 'Claimed pass'}</span>
        <strong class="pp-loop-code">${esc(code)}</strong>
        <div><small>${esc(formatDate(t?.redeemedAt) || 'Claimed recently')}</small></div>
        ${renderChainDots(positiveInt(t?.chainLength, position || 1))}
      </div>
      <div class="pp-loop-actions">
        <button class="pp-loop-mini-btn" type="button" data-loop-open="${esc(code)}">Open pass</button>
        <button class="pp-loop-mini-btn" type="button" data-loop-copy data-loop-copy="${esc(code)}">Copy link</button>
      </div>
    </article>
  `;
}

function emptyRow(msg) {
  return `
    <div class="pp-loop-empty">
      <strong>${esc(msg)}</strong>
      <span>Passes are tied to purchases, gifts, and claims. They will become more useful as Pawket Packs, Pals, and CHARM impact deepen.</span>
      <div class="pp-loop-actions-row">
        <a class="pp-loop-mini-btn is-link" href="/shop.html">Shop</a>
        <a class="pp-loop-mini-btn is-link" href="/loop.html">Pass Hub</a>
      </div>
    </div>
  `;
}

function formatDate(v) {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
}

function renderChainDots(len) {
  const safeLen = positiveInt(len, 1);
  const total = Math.max(3, Math.min(10, safeLen));
  const active = Math.min(safeLen, total);
  const dots = Array.from({ length: total }).map((_, i) =>
    `<span class="pp-loop-dot ${i < active ? 'is-on' : ''}"></span>`
  ).join('');
  return `<div class="pp-loop-chain-mini" aria-hidden="true">${dots}</div>`;
}

function renderRewardRow(entry) {
  const points = Math.floor(safeNumber(entry?.points, 0));
  const reason = formatReason(entry?.reason);
  const when = formatDate(entry?.createdAt);
  const sign = points > 0 ? '+' : '';
  return `
    <div class="pp-loop-reward-row">
      <div>
        <strong>${esc(reason)}</strong>
        <div class="pp-loop-reward-meta">${esc(when || 'Just now')}</div>
      </div>
      <div class="pp-loop-reward-points">${sign}${points} CHARM Points</div>
    </div>
  `;
}

function formatReason(reason) {
  const map = {
    first_token_shared: 'First pass shared',
    token_redeemed_sender: 'Friend claimed your pass',
    token_redeemed_receiver: 'You claimed a pass',
    chain_founder_bonus: 'Connection bonus',
    kindness_spreader: 'Kindness Spreader badge',
    monthly_top_chain: 'Top pass award',
    monthly_top_spreader: 'Top sharer award',
    shares_3_in_3_days_pending: 'Momentum challenge',
  };
  if (!reason) return 'Pass activity';
  const key = String(reason);
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : key.replace(/_/g, ' ');
}

function getNextReward({ shareCount = 0, chainLength = 1, sharesRecent = 0 }) {
  if (shareCount < 1) {
    return {
      title: 'First Pass Share',
      meta: 'Share one available pass to start your account trail.',
      current: shareCount,
      target: 1,
    };
  }
  if (shareCount < 5) {
    return {
      title: 'Kindness Spreader Badge',
      meta: `${5 - shareCount} more successful claims to reach this badge.`,
      current: shareCount,
      target: 5,
    };
  }
  if (chainLength < 10) {
    return {
      title: 'Connection Bonus',
      meta: `${10 - chainLength} more pass connections to reach this milestone.`,
      current: chainLength,
      target: 10,
    };
  }
  if (sharesRecent < 3) {
    return {
      title: 'Three-Day Momentum',
      meta: `${3 - sharesRecent} more claims in 3 days to keep momentum going.`,
      current: sharesRecent,
      target: 3,
    };
  }
  return {
    title: 'Pass rhythm active',
    meta: 'Keep sharing thoughtfully to build more pass activity and impact updates.',
    current: 1,
    target: 1,
    celebrate: true,
  };
}

function renderNextReward(next) {
  const current = nonNegativeInt(next.current, 0);
  const target = positiveInt(next.target, 1);
  const pct = next.target ? percent((current / target) * 100) : 100;
  return `
    <div class="pp-loop-next ${next.celebrate ? 'is-celebrate' : ''}">
      <div>
        <div class="pp-loop-next-kicker">Next</div>
        <div class="pp-loop-next-title">${esc(next.title)}</div>
        <div class="pp-loop-next-meta">${esc(next.meta)}</div>
      </div>
      <div class="pp-loop-next-progress">
        <div class="pp-loop-next-bar"><span style="width:${pct}%"></span></div>
        <div class="pp-loop-next-count">${current}/${target}</div>
      </div>
    </div>
  `;
}

async function hydrateSpotlight(root) {
  const holder = root.querySelector('[data-loop-spotlight]');
  if (!holder) return;
  try {
    const res = await fetch('/api/loop/leaderboard', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return;
    const top = Array.isArray(data.topChains) ? data.topChains[0] : null;
    if (!top) {
      holder.innerHTML = `<h4>Spotlight Pass</h4><div class="pp-loop-reward-empty">No pass activity yet.</div>`;
      return;
    }
    const name = formatName(top);
    const chainLength = positiveInt(top.chainLength, 1);
    holder.innerHTML = `
      <h4>Spotlight Pass</h4>
      <div class="pp-loop-spotlight-card">
        <div>
          <strong>${esc(name)}</strong>
          <div class="pp-loop-reward-meta">${chainLength} people connected</div>
        </div>
        <div class="pp-loop-spotlight-pill">Top Pass</div>
      </div>
    `;
  } catch {}
}

async function hydrateImpactFeed(root) {
  const holder = root.querySelector('[data-loop-impact-feed]');
  if (!holder) return;
  try {
    const res = await fetch('/api/loop/impact?limit=6', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const stories = Array.isArray(data?.stories) ? data.stories : [];
    if (!stories.length) {
      holder.innerHTML = `<h4>Live Impact Feed</h4><div class="pp-loop-reward-empty">No impact stories yet.</div>`;
      return;
    }
    holder.innerHTML = `
      <h4>Impact Highlights</h4>
      <div class="pp-loop-impact-carousel">
        ${stories.map(renderImpactRow).join('')}
      </div>
    `;
  } catch {}
}

function renderImpactRow(story) {
  const imageUrl = safeUrl(story?.imageUrl);
  const alt = story?.petName || story?.title || 'Rescue story';
  const img = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(alt)}">`
    : `<div class="pp-loop-impact-icon" aria-hidden="true"><i class="bi bi-heart-pulse"></i></div>`;
  return `
    <div class="pp-loop-impact-item is-carousel">
      ${img}
      <div>
        <strong>${esc(story?.title || 'Rescue story')}</strong>
        <div class="pp-loop-reward-meta">${esc(story?.body || '')}</div>
      </div>
    </div>
  `;
}

function formatName(item) {
  const first = item?.firstName || '';
  const last = item?.lastName || '';
  const name = `${first} ${last}`.trim();
  return name || 'Pet Pawket Friend';
}

function copyLink(code) {
  if (!code) return;
  const link = `${window.location.origin}/loop.html?token=${encodeURIComponent(code)}`;
  const fallback = () => {
    const temp = document.createElement('input');
    temp.value = link;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(link).catch(fallback);
  } else {
    fallback();
  }
}

function storeToken(code) {
  const clean = tokenCode(code);
  if (!clean) return;
  try { localStorage.setItem('pp_loop_token', clean); } catch {}
  try {
    const expires = new Date(Date.now() + 7 * 864e5).toUTCString();
    document.cookie = `pp_loop_token=${encodeURIComponent(clean)}; Path=/; Expires=${expires}; SameSite=Lax`;
  } catch {}
}

function formatMoney(amount = 0, currency = 'USD') {
  const value = safeNumber(amount, 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function renderBadge(key) {
  const labelMap = {
    kindness_spreader: 'Kindness Spreader',
    chain_founder: 'Connection Builder',
    monthly_top_chain: 'Monthly Top Pass',
    monthly_top_spreader: 'Monthly Top Spreader',
  };
  return `<span class="pp-loop-badge">${esc(labelMap[key] || key)}</span>`;
}
