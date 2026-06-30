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
        <p class="text-muted">Save it before you shop. A Pass carries the shared link into secure checkout while private pet profiles, journals, memorial notes, and medical details stay private.</p>
        <div class="loop-cta-row">
          <button class="loop-cta" type="button" data-loop-claim>${saved ? 'Pass Saved - Shop Now' : 'Save Pass & Shop'}</button>
          <button class="loop-cta ghost" type="button" data-loop-copy>Copy Pass Link</button>
          <a class="loop-cta ghost" href="/cart.html">Go to Cart</a>
        </div>
        <p class="loop-claim-status" data-loop-status>${saved ? 'This pass is already saved on this browser.' : 'Saving this pass only stores the code locally until checkout.'}</p>
        <div class="loop-claim-assurance" aria-label="Pass privacy and checkout notes">
          <span><i class="bi bi-device-ssd" aria-hidden="true"></i> Saved on this browser</span>
          <span><i class="bi bi-cart-check" aria-hidden="true"></i> Added at cart checkout</span>
          <span><i class="bi bi-shield-lock" aria-hidden="true"></i> No private journals shared</span>
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
    ${renderPassBoundary('claim')}
    ${renderContinuityReview('claim')}
    ${renderNextStepRail('claim')}

    <div class="loop-path-grid" aria-label="How this Pawket Pass works">
      <article class="loop-path-card">
        <span>1</span>
        <h3>Save the pass</h3>
        <p>The code is kept in this browser and attached when you create checkout from the Pet Pawket cart.</p>
      </article>
      <article class="loop-path-card">
        <span>2</span>
        <h3>Choose what fits</h3>
        <p>Shop normal products now. Pawket Packs and Packets can connect as those boxes come online.</p>
      </article>
      <article class="loop-path-card">
        <span>3</span>
        <h3>Checkout securely</h3>
        <p>The order still runs through secure checkout while Pet Pawket keeps your account, story, and CHARM updates connected.</p>
      </article>
      <article class="loop-path-card">
        <span>4</span>
        <h3>Send yours onward</h3>
        <p>After purchase, your account can receive a new Pawket Pass to share with another pet parent.</p>
      </article>
    </div>

    <div class="loop-grid">
      <div class="loop-card">
        <h3>What a pass can support</h3>
        <ul class="loop-rewards">
          <li>Future Pawket rewards where program terms allow.</li>
          <li>Badges for meaningful sharing milestones.</li>
          <li>CHARM updates when pass activity connects to a public moment that is ready to share.</li>
        </ul>
      </div>
      <div class="loop-card">
        <h3>Privacy and trust</h3>
        <ul class="loop-rewards">
          <li>Only a simple sender name is shown on public pass links.</li>
          <li>Private pet profiles and journals do not travel with a pass.</li>
          <li>Partner and CHARM uses are checked instead of automatic.</li>
        </ul>
      </div>
    </div>

    <div class="loop-impact" data-loop-impact></div>
    <div class="loop-impact-celebrate" data-loop-impact-celebrate hidden></div>
    <div class="loop-impact-reel" data-loop-impact-reel></div>
    <p class="pp-loop-meta">Pawket Passes connect purchases, sharing, and CHARM without turning private pet stories into public content.</p>
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
        <h1>Share care without sharing private stories.</h1>
        <p class="text-muted">Pawket Passes are shareable links for gifts, saved care, and Pet Pawket invites. They connect the shop with accounts, Pawket Pals, CHARM, and Community while keeping private pet stories protected.</p>
        <div class="loop-cta-row">
          <a class="loop-cta" href="#pawket-pass-entry">Open or Paste a Pass</a>
          <a class="loop-cta ghost" href="/shop.html">Shop to Start a Pass</a>
          <a class="loop-cta ghost" href="/account.html#loopTokensSection">Open My Passes</a>
          ${savedToken ? '<button class="loop-cta ghost" type="button" data-loop-resume>Resume Saved Pass</button>' : ''}
        </div>
      </div>
      <aside class="loop-hub-panel">
        <span class="loop-pass-card-kicker">Ready now</span>
        <strong>Save, share, and come back.</strong>
        <p>Passes can appear after purchases and gifts, then travel through the normal cart and checkout.</p>
        <div class="loop-hub-mini">
          <span>Secure checkout</span>
          <span>Account history</span>
          <span>Private-safe</span>
        </div>
      </aside>
    </div>

    ${renderPassTool(savedToken)}
    ${renderConnectorGrid()}
    ${renderPassBoundary('hub')}
    ${renderContinuityReview('hub')}
    ${renderNextStepRail('hub')}

    <div class="loop-path-grid" aria-label="Pawket Pass path">
      <article class="loop-path-card">
        <span>1</span>
        <h3>Order or gift</h3>
        <p>Qualifying purchases can create a new pass for your account after checkout.</p>
      </article>
      <article class="loop-path-card">
        <span>2</span>
        <h3>Share with care</h3>
        <p>Send the pass link to someone who would enjoy Pet Pawket products, Pawket Packs, or Pawket Packets.</p>
      </article>
      <article class="loop-path-card">
        <span>3</span>
          <h3>They save it</h3>
        <p>The pass is saved locally, then carried into checkout through the Pet Pawket cart.</p>
      </article>
      <article class="loop-path-card">
        <span>4</span>
        <h3>The trail returns</h3>
        <p>Pass activity can return to account history, future rewards, badges, and CHARM updates.</p>
      </article>
    </div>

    <div class="loop-grid">
      <div class="loop-card">
        <h3>For customers</h3>
        <ol class="loop-steps">
          <li>Save a pass link before you shop.</li>
          <li>Use the Pet Pawket cart to open secure checkout.</li>
          <li>Return to Account to see new passes and activity.</li>
        </ol>
      </div>
      <div class="loop-card">
        <h3>What stays connected</h3>
        <ul class="loop-rewards">
          <li>Uses the standard Pet Pawket cart and checkout.</li>
          <li>Keeps public pass links separate from private pet details.</li>
          <li>Connects to Pawket Packs, Pals, and CHARM as those areas grow.</li>
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
    <section class="loop-pass-tool ${savedToken ? 'has-saved-pass' : ''}" id="pawket-pass-entry" aria-label="Open a Pawket Pass">
      <div class="loop-pass-tool-copy">
        <span class="loop-pass-card-kicker">Already have a pass?</span>
        <h2>Paste a pass link or code.</h2>
        <p>Use this if someone sent you a Pawket Pass outside the site. Pet Pawket will help you save it before you shop.</p>
      </div>
      <form class="loop-code-form" data-loop-code-form>
        <label for="loopPassCode">Pass link or code</label>
        <div class="loop-code-entry">
          <input id="loopPassCode" name="loopPassCode" type="text" inputmode="text" autocomplete="off" placeholder="Link or code" data-loop-code-input />
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
        <p>Normal inventory stays in the secure shop while the pass follows checkout.</p>
      </article>
      <article>
        <i class="bi bi-person-heart" aria-hidden="true"></i>
        <span>Account</span>
        <strong>History and sharing</strong>
        <p>Your account can show available, saved, and shared passes.</p>
      </article>
      <article>
        <i class="bi bi-heart-pulse" aria-hidden="true"></i>
        <span>CHARM</span>
        <strong>CHARM updates</strong>
        <p>CHARM updates can connect to pass activity without exposing private pet stories.</p>
      </article>
      <article>
        <i class="bi bi-stars" aria-hidden="true"></i>
        <span>Pawket Pals</span>
        <strong>Pal moments</strong>
        <p>Pass activity can later support Pals, Share Studio, or Town Square when a story is ready to share.</p>
      </article>
    </section>
  `;
}

function renderPassBoundary(mode = 'hub') {
  const claimMode = mode === 'claim';
  return `
    <section class="loop-boundary-panel" aria-label="Pawket Pass privacy boundary">
      <div class="loop-boundary-copy">
        <span class="loop-hub-kicker">Privacy</span>
        <h2>${claimMode ? 'This pass carries the share, not the private story.' : 'A Pass is for sharing, not private records.'}</h2>
        <p>${claimMode
          ? 'Saving a Pass helps Pet Pawket remember the shared link at checkout. It does not publish who owns a pet, what is in a journal, or why a memorial, medical, rescue, or assistance story matters.'
          : 'Passes are useful because they can move between people. They should carry simple share details and point back to private areas when a deeper story is needed.'}</p>
      </div>
      <div class="loop-boundary-columns">
        <article>
          <i class="bi bi-link-45deg" aria-hidden="true"></i>
          <span>Can travel</span>
          <strong>Code, sender name, checkout, and simple next steps.</strong>
        </article>
        <article>
          <i class="bi bi-lock" aria-hidden="true"></i>
          <span>Stays private</span>
          <strong>Pet profiles, journals, favorite memories, medical notes, and full stories.</strong>
        </article>
        <article>
          <i class="bi bi-shield-check" aria-hidden="true"></i>
          <span>Needs care</span>
          <strong>Public Pal, CHARM, Community, Share Studio, or impact use.</strong>
        </article>
      </div>
    </section>
  `;
}

function renderContinuityReview(mode = 'hub') {
  const claimMode = mode === 'claim';
  return `
    <section class="loop-continuity" aria-label="Pawket Pass continuity">
      <div class="loop-continuity-head">
        <div>
          <span class="loop-hub-kicker">Next Step</span>
          <h2>${claimMode ? 'Where this saved pass goes next.' : 'How passes fit the Pet Pawket world.'}</h2>
        </div>
        <p>${claimMode
          ? 'A saved pass is useful because it stays connected to checkout, account history, CHARM, and future story features without carrying private pet details.'
          : 'Pawket Passes help the shop, accounts, CHARM, and future Pal features connect without replacing pet profiles, journals, or permission.'}</p>
      </div>
      <div class="loop-continuity-grid">
        <a class="loop-continuity-card" href="/cart.html">
          <i class="bi bi-cart-check" aria-hidden="true"></i>
          <span>Cart checkout</span>
          <strong>${claimMode ? 'Saved before checkout' : 'Used at checkout'}</strong>
          <p>The browser-saved pass is attached only when the Pet Pawket cart creates secure checkout.</p>
        </a>
        <a class="loop-continuity-card" href="/account.html#account-story-trail">
          <i class="bi bi-map" aria-hidden="true"></i>
          <span>Saved stories</span>
          <strong>Account progress</strong>
          <p>Account can connect passes with pet profiles, journals, favorite memories, and helpful next steps.</p>
        </a>
        <a class="loop-continuity-card" href="/pals.html">
          <i class="bi bi-stars" aria-hidden="true"></i>
          <span>Pawket Pals</span>
          <strong>Future Pal moments</strong>
          <p>Pals should grow from stories people choose to share, not from private journals or pass links alone.</p>
        </a>
        <a class="loop-continuity-card" href="/charm.html#charm-glance">
          <i class="bi bi-heart-pulse" aria-hidden="true"></i>
          <span>CHARM Foundation</span>
          <strong>Shared with care</strong>
          <p>Pass pages can show rescue, medical, adoption, or memorial updates only when they are ready.</p>
        </a>
      </div>
    </section>
  `;
}

function renderNextStepRail(mode = 'hub') {
  const claimMode = mode === 'claim';
  return `
    <section class="loop-next-rail" aria-label="Continue the Pet Pawket loop">
      <div>
        <span class="loop-hub-kicker">Continue the loop</span>
        <h2>${claimMode ? 'After saving, choose the next useful stop.' : 'Choose what you want to do next.'}</h2>
      </div>
      <div class="loop-next-actions">
        <a href="/shop.html">
          <i class="bi bi-bag-heart" aria-hidden="true"></i>
          <span>Shop</span>
          <strong>Use the pass through cart checkout.</strong>
        </a>
        <a href="/pals.html#private-pal-certificate-form">
          <i class="bi bi-stars" aria-hidden="true"></i>
          <span>Pawket Pals</span>
          <strong>Create a private Pal keepsake.</strong>
        </a>
        <a href="/account.html#account-story-trail">
          <i class="bi bi-person-heart" aria-hidden="true"></i>
          <span>Account</span>
          <strong>Return to pets, journals, and saved stories.</strong>
        </a>
        <a href="/charm.html#charm-glance">
          <i class="bi bi-heart-pulse" aria-hidden="true"></i>
          <span>CHARM</span>
          <strong>Learn how CHARM carries care forward.</strong>
        </a>
      </div>
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
          <div class="loop-impact-reel-head">CHARM updates</div>
          <strong>Approved impact updates will appear here.</strong>
          <p>Rescue, medical, adoption, and memorial stories are shown only when they are ready to share.</p>
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
          <p>Once passes are saved and shared by real customers, this space can show community momentum without exposing private pet records.</p>
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
        ${sharers.length ? sharers.map(rowSharer).join('') : '<p class="text-muted">Shared-pass activity is waiting for the first live saves.</p>'}
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
      <strong>${shares} saves</strong>
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
