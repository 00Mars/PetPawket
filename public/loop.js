// public/loop.js - Pawket Pass landing page

export function initLoopLanding() {
  const root = document.querySelector('[data-loop-landing]');
  const card = document.getElementById('loopLanding');
  if (!root || !card) return;

  const params = new URLSearchParams(window.location.search);
  const code = (params.get('token') || params.get('code') || '').trim().toUpperCase();
  if (!code) {
    renderLoopHub(card);
    return;
  }

  loadToken(code, card);
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

function normalizePassCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function codeFromInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    const fromParam = url.searchParams.get('token') || url.searchParams.get('code');
    if (fromParam) return normalizePassCode(fromParam);
    const lastPath = url.pathname.split('/').filter(Boolean).pop();
    return normalizePassCode(lastPath || raw);
  } catch {
    return normalizePassCode(raw);
  }
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

async function loadToken(code, card) {
  try {
    const res = await fetch(`/api/loop/token/${encodeURIComponent(code)}`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      renderPassError(card, 'Pass not found', 'This Pawket Pass may have expired, been mistyped, or no longer be active.');
      return;
    }

    renderClaimPage(card, data, code);
    renderImpactActive(card);
    renderImpactReel(card);
    loadLeaderboard();
  } catch (e) {
    console.warn('[loop] landing error', e);
    renderPassError(card, 'We hit a snag', 'Please refresh this page or try the pass link again in a moment.');
  }
}

function renderPassError(card, title, body) {
  card.innerHTML = `
    <div class="loop-error-state">
      <div class="loop-hub-kicker">Pawket Passes</div>
      <h1>${esc(title)}</h1>
      <p class="text-muted">${esc(body)}</p>
      <div class="loop-cta-row">
        <a class="loop-cta" href="/loop.html">Open Pass Hub</a>
        <a class="loop-cta ghost" href="/shop.html">Shop Pet Pawket</a>
      </div>
    </div>
  `;
}

function renderClaimPage(card, data, code) {
  const sender = data.senderName || 'A Pet Pawket friend';
  const chainLength = positiveInt(data.chainLength, 1);
  const next = positiveInt(data.nextPosition, chainLength + 1);
  const suffix = ordinalSuffix(next);
  const saved = getStoredToken() === code;

  card.innerHTML = `
    <div class="loop-claim-layout">
      <div class="loop-claim-copy">
        <div class="loop-hub-kicker">Pawket Pass</div>
        <h1>${esc(sender)} sent you a Pawket Pass.</h1>
        <p class="text-muted">Save it before you shop. When checkout is created, Pet Pawket carries the pass into the secure order so the connection can be recorded after purchase.</p>
        <div class="loop-cta-row">
          <button class="loop-cta" type="button" data-loop-claim>${saved ? 'Pass Saved - Shop Now' : 'Save Pass & Shop'}</button>
          <button class="loop-cta ghost" type="button" data-loop-copy>Copy Pass Link</button>
          <a class="loop-cta ghost" href="/cart.html">Go to Cart</a>
        </div>
        <p class="loop-claim-status" data-loop-status>${saved ? 'This pass is already saved on this browser.' : 'Saving this pass only stores the code locally until checkout.'}</p>
        <div class="loop-claim-assurance" aria-label="Pass privacy and checkout notes">
          <span><i class="bi bi-device-ssd" aria-hidden="true"></i> Saved on this browser</span>
          <span><i class="bi bi-cart-check" aria-hidden="true"></i> Added at cart checkout</span>
          <span><i class="bi bi-shield-lock" aria-hidden="true"></i> No private journal data shared</span>
        </div>
      </div>

      <aside class="loop-pass-card" aria-label="Pawket Pass code">
        <span class="loop-pass-card-kicker">Pass code</span>
        <strong>${esc(code)}</strong>
        <small>You are the ${next}${suffix} connection on this pass.</small>
        <div class="loop-chain-visual">
          ${renderChain(chainLength)}
          <div class="loop-chain-meta">${chainLength} connected so far</div>
        </div>
      </aside>
    </div>

    ${renderConnectorGrid()}

    <div class="loop-path-grid" aria-label="How this Pawket Pass works">
      <article class="loop-path-card">
        <span>1</span>
        <h3>Save the pass</h3>
        <p>The code is kept in this browser and attached when you create checkout from the Pet Pawket cart.</p>
      </article>
      <article class="loop-path-card">
        <span>2</span>
        <h3>Choose what fits</h3>
        <p>Shop normal products now. Pawket Pack and Packet paths can connect as those box systems come online.</p>
      </article>
      <article class="loop-path-card">
        <span>3</span>
        <h3>Checkout securely</h3>
        <p>The order still runs through secure checkout while Pet Pawket keeps the account, story, and impact layer connected.</p>
      </article>
      <article class="loop-path-card">
        <span>4</span>
        <h3>Send yours onward</h3>
        <p>After purchase, your account can receive a new Pawket Pass to share with another pet parent.</p>
      </article>
    </div>

    <div class="loop-grid">
      <div class="loop-card">
        <h3>What a pass can unlock</h3>
        <ul class="loop-rewards">
          <li>CHARM Points for eligible pass activity.</li>
          <li>Badges for meaningful sharing milestones.</li>
          <li>Visible CHARM impact when a pass helps fund an active case.</li>
        </ul>
      </div>
      <div class="loop-card">
        <h3>Privacy and trust</h3>
        <ul class="loop-rewards">
          <li>Only a simple sender name is shown on public pass links.</li>
          <li>Private pet profiles and journals do not travel with a pass.</li>
          <li>Partner and CHARM claims stay reviewable instead of automatic.</li>
        </ul>
      </div>
    </div>

    <div class="loop-impact" data-loop-impact></div>
    <div class="loop-impact-celebrate" data-loop-impact-celebrate hidden></div>
    <div class="loop-impact-reel" data-loop-impact-reel></div>
    <p class="pp-loop-meta">Pawket Passes connect purchases, sharing, and CHARM Foundation impact without turning private pet stories into public content.</p>
  `;

  card.querySelector('[data-loop-claim]')?.addEventListener('click', () => {
    storeToken(code);
    announce(card, 'Pass saved. Opening the shop...');
    window.setTimeout(() => {
      window.location.href = '/shop.html';
    }, 250);
  });
  card.querySelector('[data-loop-copy]')?.addEventListener('click', (event) => {
    copyLink(code, event.currentTarget, card);
  });
}

function renderLoopHub(card) {
  const savedToken = getStoredToken();
  card.innerHTML = `
    <div class="loop-hub-layout">
      <div class="loop-hub-copy">
        <div class="loop-hub-kicker">Pawket Passes</div>
        <h1>A warmer way to share Pet Pawket.</h1>
        <p class="text-muted">Pawket Passes are shareable links connected to purchases, gifts, CHARM Points, and visible rescue impact. They bridge the shop with Pet Pawket's native account, story, and impact systems.</p>
        <div class="loop-cta-row">
          <a class="loop-cta" href="/shop.html">Shop to Start a Pass</a>
          <a class="loop-cta ghost" href="/account.html#loopTokensSection">Open My Passes</a>
          ${savedToken ? '<button class="loop-cta ghost" type="button" data-loop-resume>Resume Saved Pass</button>' : ''}
        </div>
      </div>
      <aside class="loop-hub-panel">
        <span class="loop-pass-card-kicker">Ready now</span>
        <strong>Claim, save, share, and track.</strong>
        <p>Passes are created after eligible purchases and can be claimed through the normal cart and checkout path.</p>
        <div class="loop-hub-mini">
          <span>Secure checkout</span>
          <span>Account history</span>
          <span>CHARM impact</span>
        </div>
      </aside>
    </div>

    ${renderPassTool(savedToken)}
    ${renderConnectorGrid()}

    <div class="loop-path-grid" aria-label="Pawket Pass path">
      <article class="loop-path-card">
        <span>1</span>
        <h3>Order or gift</h3>
        <p>Eligible purchases can create a new pass for your account after checkout.</p>
      </article>
      <article class="loop-path-card">
        <span>2</span>
        <h3>Share with care</h3>
        <p>Send the pass link to someone who would enjoy Pet Pawket products, Pawket Packs, or Pawket Packets.</p>
      </article>
      <article class="loop-path-card">
        <span>3</span>
        <h3>They claim it</h3>
        <p>The pass is saved locally, then carried into checkout through the Pet Pawket cart path.</p>
      </article>
      <article class="loop-path-card">
        <span>4</span>
        <h3>Impact grows</h3>
        <p>Eligible activity can add CHARM Points, badges, and rescue funding updates.</p>
      </article>
    </div>

    <div class="loop-grid">
      <div class="loop-card">
        <h3>For customers</h3>
        <ol class="loop-steps">
          <li>Claim a pass link before you shop.</li>
          <li>Use the Pet Pawket cart to open secure checkout.</li>
          <li>Return to Account to see new passes and activity.</li>
        </ol>
      </div>
      <div class="loop-card">
        <h3>What stays connected</h3>
        <ul class="loop-rewards">
          <li>Uses the standard Pet Pawket cart-to-checkout path.</li>
          <li>Keeps public pass links separate from private pet data.</li>
          <li>Leaves room for Pawket Packs, Pals, and CHARM expansion.</li>
        </ul>
      </div>
    </div>

    <div class="loop-impact" data-loop-impact></div>
    <div class="loop-impact-celebrate" data-loop-impact-celebrate hidden></div>
    <div class="loop-impact-reel" data-loop-impact-reel></div>
    <p class="pp-loop-meta">Have a pass link? Open it directly and Pet Pawket will guide you through saving it before checkout.</p>
  `;

  card.querySelector('[data-loop-resume]')?.addEventListener('click', () => {
    window.location.href = `/loop.html?token=${encodeURIComponent(savedToken)}`;
  });
  wirePassTool(card);

  renderImpactActive(card);
  renderImpactReel(card);
  loadLeaderboard();
}

function renderPassTool(savedToken = '') {
  return `
    <section class="loop-pass-tool" aria-label="Open a Pawket Pass">
      <div class="loop-pass-tool-copy">
        <span class="loop-pass-card-kicker">Already have a pass?</span>
        <h2>Paste a pass link or code.</h2>
        <p>Use this if someone sent you a Pawket Pass outside the site. Pet Pawket will open the claim page before you shop.</p>
      </div>
      <form class="loop-code-form" data-loop-code-form>
        <label for="loopPassCode">Pass link or code</label>
        <div class="loop-code-entry">
          <input id="loopPassCode" name="loopPassCode" type="text" inputmode="text" autocomplete="off" placeholder="Paste pass link or code" data-loop-code-input />
          <button type="submit">Open Pass</button>
        </div>
        <p data-loop-code-status>${savedToken ? `Saved pass ${esc(savedToken)} is ready on this browser.` : 'Passes are saved locally until checkout.'}</p>
      </form>
      ${savedToken ? `
        <div class="loop-saved-pass">
          <span>Saved pass</span>
          <strong>${esc(savedToken)}</strong>
          <div>
            <button type="button" data-loop-resume-saved>Open</button>
            <button type="button" data-loop-clear-saved>Clear</button>
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function renderConnectorGrid() {
  return `
    <section class="loop-connector-grid" aria-label="What Pawket Passes connect">
      <article>
        <i class="bi bi-bag-heart" aria-hidden="true"></i>
        <span>Shop</span>
        <strong>Products and gifts</strong>
        <p>Normal inventory stays on the secure shop path while the pass is carried by Pet Pawket checkout creation.</p>
      </article>
      <article>
        <i class="bi bi-person-heart" aria-hidden="true"></i>
        <span>Account</span>
        <strong>History and sharing</strong>
        <p>Your account can show available, claimed, and moving passes after eligible activity.</p>
      </article>
      <article>
        <i class="bi bi-heart-pulse" aria-hidden="true"></i>
        <span>CHARM</span>
        <strong>Reviewed impact</strong>
        <p>Approved CHARM updates can connect to pass activity without exposing private pet stories.</p>
      </article>
      <article>
        <i class="bi bi-stars" aria-hidden="true"></i>
        <span>Future world</span>
        <strong>Pals and quests</strong>
        <p>Pass activity can later become a Pawket Pal, quest, Share Studio, or Town Square signal.</p>
      </article>
    </section>
  `;
}

function wirePassTool(card) {
  const form = card.querySelector('[data-loop-code-form]');
  const input = card.querySelector('[data-loop-code-input]');
  const status = card.querySelector('[data-loop-code-status]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const code = codeFromInput(input?.value);
    if (!code || code.length < 6) {
      if (status) status.textContent = 'Enter a valid pass link or code.';
      input?.focus();
      return;
    }
    if (status) status.textContent = 'Opening pass...';
    window.location.href = `/loop.html?token=${encodeURIComponent(code)}`;
  });

  card.querySelector('[data-loop-resume-saved]')?.addEventListener('click', () => {
    const code = getStoredToken();
    if (code) window.location.href = `/loop.html?token=${encodeURIComponent(code)}`;
  });

  card.querySelector('[data-loop-clear-saved]')?.addEventListener('click', () => {
    clearStoredToken();
    if (status) status.textContent = 'Saved pass cleared on this browser.';
    const saved = card.querySelector('.loop-saved-pass');
    if (saved) saved.remove();
    const resume = card.querySelector('[data-loop-resume]');
    if (resume) resume.remove();
  });
}

function renderChain(chainLength = 1) {
  const safeLength = positiveInt(chainLength, 1);
  const dots = Math.max(4, Math.min(10, safeLength + 2));
  return `
    <div class="loop-chain">
      ${Array.from({ length: dots }).map((_, i) => {
        const active = i < Math.min(safeLength, dots);
        const nextDot = i === Math.min(safeLength, dots - 1);
        const cls = active ? 'active' : nextDot ? 'next' : '';
        return `<span class="loop-chain-dot ${cls}"></span>`;
      }).join('')}
    </div>
  `;
}

function ordinalSuffix(n) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

function storeToken(code) {
  const clean = String(code || '').trim().toUpperCase();
  if (!clean) return;
  try { localStorage.setItem('pp_loop_token', clean); } catch {}
  try {
    const days = 7;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `pp_loop_token=${encodeURIComponent(clean)}; Path=/; Expires=${expires}; SameSite=Lax`;
  } catch {}
}

function getStoredToken() {
  try {
    const ls = localStorage.getItem('pp_loop_token');
    if (ls) return String(ls).trim().toUpperCase();
  } catch {}
  try {
    const raw = document.cookie || '';
    const m = raw.match(/(?:^|;\s*)pp_loop_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1] || '').trim().toUpperCase();
  } catch {}
  return '';
}

function clearStoredToken() {
  try { localStorage.removeItem('pp_loop_token'); } catch {}
  try {
    document.cookie = 'pp_loop_token=; Path=/; Max-Age=0; SameSite=Lax';
  } catch {}
}

async function renderImpactActive(card) {
  const holder = card.querySelector('[data-loop-impact]');
  const celebrateEl = card.querySelector('[data-loop-impact-celebrate]');
  if (!holder) return;
  try {
    const res = await fetch('/api/loop/impact/active', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const active = data?.activeCase;
    const recent = data?.recentlyFunded;
    if (active?.title) {
      const funded = safeNumber(active.fundedAmount, 0);
      const goal = safeNumber(active.goalAmount, 0);
      const pct = percent(active.progressPct);
      const imageUrl = safeUrl(active.imageUrl);
      const alt = active.petName || active.title || 'Rescue story';
      const img = imageUrl
        ? `<img src="${esc(imageUrl)}" alt="${esc(alt)}" />`
        : `<div class="loop-impact-icon"><i class="bi bi-heart-pulse"></i></div>`;
      holder.innerHTML = `
        <div class="loop-impact-card">
          ${img}
          <div class="loop-impact-content">
            <div class="loop-impact-kicker">CHARM impact</div>
            <strong>${esc(active.title)}</strong>
            <p class="text-muted">${esc(active.body || '')}</p>
            <div class="loop-impact-progress"><span style="width:${pct}%"></span></div>
            <div class="loop-impact-meta">${formatMoney(funded, active.currency)} funded of ${formatMoney(goal, active.currency)}</div>
            ${renderImpactTimeline(pct)}
          </div>
        </div>
      `;
    } else {
      holder.innerHTML = '';
    }
    if (celebrateEl) {
      if (recent?.title) {
        celebrateEl.innerHTML = `
          <div class="loop-impact-celebrate-kicker">Impact completed</div>
          <strong>${esc(recent.title)}</strong>
          <span>${recent.petName ? `${esc(recent.petName)}'s story reached its goal.` : 'A CHARM case just reached its goal.'}</span>
        `;
        celebrateEl.hidden = false;
      } else {
        celebrateEl.hidden = true;
      }
    }
  } catch {}
}

function renderImpactTimeline(pct = 0) {
  const safePct = percent(pct);
  const steps = [25, 50, 75, 100];
  return `
    <div class="loop-impact-timeline">
      ${steps.map((step) => {
        const state = safePct >= step ? 'is-complete' : safePct >= step - 15 ? 'is-active' : '';
        return `
          <div class="loop-impact-step ${state}">
            <span></span>
            <small>${step}%</small>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function renderImpactReel(card) {
  const holder = card.querySelector('[data-loop-impact-reel]');
  if (!holder) return;
  try {
    const res = await fetch('/api/loop/impact?limit=6', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    const stories = Array.isArray(data?.stories) ? data.stories : [];
    if (!stories.length) {
      holder.innerHTML = `
        <div class="loop-impact-waiting">
          <div class="loop-impact-reel-head">CHARM impact path</div>
          <strong>Approved impact updates will appear here.</strong>
          <p>Public rescue, medical, adoption, and memorial stories need consent and review before they are shown on a pass page.</p>
          <a href="/charm.html">Open CHARM</a>
        </div>
      `;
      return;
    }
    holder.innerHTML = `
      <div class="loop-impact-reel-head">Impact highlights</div>
      <div class="loop-impact-reel-track">
        ${stories.map(renderImpactCard).join('')}
      </div>
    `;
  } catch {}
}

function renderImpactCard(story) {
  const imageUrl = safeUrl(story?.imageUrl);
  const alt = story?.petName || story?.title || 'Rescue story';
  const img = imageUrl
    ? `<img src="${esc(imageUrl)}" alt="${esc(alt)}" />`
    : `<div class="loop-impact-reel-icon"><i class="bi bi-heart-pulse"></i></div>`;
  return `
    <article class="loop-impact-reel-card">
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

async function loadLeaderboard() {
  const board = document.querySelector('[data-loop-leaderboard]');
  const wrap = document.getElementById('loopLeaderboard');
  if (!board || !wrap) return;
  try {
    const res = await fetch('/api/loop/leaderboard', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) return;
    const chains = (Array.isArray(data.topChains) ? data.topChains : [])
      .filter((item) => positiveInt(item?.chainLength, 1) > 1);
    const sharers = (Array.isArray(data.topSpreaders) ? data.topSpreaders : [])
      .filter((item) => safeNumber(item?.shares, 0) > 0);
    if (!chains.length && !sharers.length) {
      board.innerHTML = `
        <div class="loop-community-empty">
          <strong>The first public pass connections are still forming.</strong>
          <p>Once passes are claimed by real customers, this space can show community momentum without exposing private pet records.</p>
        </div>
      `;
      wrap.hidden = false;
      return;
    }
    board.innerHTML = `
      <div class="loop-leaderboard-col">
        <h3>Passes in motion</h3>
        ${chains.length ? chains.map(rowChain).join('') : '<p class="text-muted">Pass activity will appear here as the community uses Pawket Passes.</p>'}
      </div>
      <div class="loop-leaderboard-col">
        <h3>Helpful sharers</h3>
        ${sharers.length ? sharers.map(rowSharer).join('') : '<p class="text-muted">Shared-pass activity is waiting for the first live claims.</p>'}
      </div>
    `;
    wrap.hidden = false;
  } catch {}
}

function rowChain(item, idx) {
  const chainLength = positiveInt(item?.chainLength, 1);
  return `
    <div class="loop-leader-row">
      <span>#${idx + 1}</span>
      <span>Community pass</span>
      <strong>${chainLength} connected</strong>
    </div>
  `;
}

function rowSharer(item, idx) {
  const shares = Math.max(0, Math.floor(safeNumber(item?.shares, 0)));
  return `
    <div class="loop-leader-row">
      <span>#${idx + 1}</span>
      <span>Helpful sharer</span>
      <strong>${shares} claims</strong>
    </div>
  `;
}

async function copyLink(code, trigger, card) {
  const link = `${window.location.origin}/loop.html?token=${encodeURIComponent(code)}`;
  try {
    await navigator.clipboard?.writeText?.(link);
  } catch {
    const temp = document.createElement('input');
    temp.value = link;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
  }
  const oldText = trigger?.textContent;
  if (trigger) {
    trigger.textContent = 'Copied';
    window.setTimeout(() => { trigger.textContent = oldText || 'Copy Pass Link'; }, 1800);
  }
  announce(card, 'Pass link copied.');
}

function announce(card, message) {
  const status = card?.querySelector('[data-loop-status]');
  if (!status) return;
  status.textContent = message;
}
