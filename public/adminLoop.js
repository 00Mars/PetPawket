// public/adminLoop.js — Pawket Pass admin console

const statusEl = document.getElementById('adminStatus');
const tokensEl = document.getElementById('adminTokens');
const leaderboardEl = document.getElementById('adminLeaderboard');
const refreshBtn = document.getElementById('refreshAdmin');
const awardBtn = document.getElementById('awardMonthly');
const awardInput = document.getElementById('awardMonth');
const impactForm = document.getElementById('impactForm');
const impactTitle = document.getElementById('impactTitle');
const impactBody = document.getElementById('impactBody');
const impactPetName = document.getElementById('impactPetName');
const impactImageUrl = document.getElementById('impactImageUrl');
const impactGoal = document.getElementById('impactGoal');
const impactCurrency = document.getElementById('impactCurrency');
const impactPriority = document.getElementById('impactPriority');
const impactStatus = document.getElementById('impactStatus');
const impactActive = document.getElementById('impactActive');
const impactCasesEl = document.getElementById('impactCases');

if (statusEl) {
  statusEl.classList.add('pp-admin-status');
}

const esc = (value) => String(value || '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[m]));

const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const nonNegativeInt = (value, fallback = 0) => Math.max(0, Math.floor(safeNumber(value, fallback)));

const positiveInt = (value, fallback = 1) => Math.max(1, Math.floor(safeNumber(value, fallback)));

const percent = (value) => Math.max(0, Math.min(100, Math.round(safeNumber(value, 0))));

const request = async (url, options = {}) => {
  try {
    const res = await fetch(url, { credentials: 'include', ...options });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    return { ok: false, status: 0, body: null, error: err };
  }
};

const setStatus = (msg, tone = '') => {
  if (!statusEl) return;
  statusEl.textContent = msg || '';
  statusEl.classList.remove('is-success', 'is-error', 'is-warn');
  if (tone) statusEl.classList.add(`is-${tone}`);
};

const renderUnauthorized = () => {
  setStatus('Admin access required. Please sign in with an approved account.', 'error');
  if (tokensEl) {
    tokensEl.innerHTML = `<p class="pp-admin-empty">You don’t have admin access.</p>`;
  }
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString();
};

const renderTokens = (tokens) => {
  if (!tokensEl) return;
  if (!tokens.length) {
    tokensEl.innerHTML = `<p class="pp-admin-empty">No passes created yet.</p>`;
    return;
  }
  tokensEl.innerHTML = tokens.map((token) => {
    const created = formatDate(token.createdAt);
    const redeemed = formatDate(token.lastRedeemedAt);
    const creator = token.creatorEmail || 'Unknown creator';
    const chainLength = positiveInt(token.chainLength, 1);
    return `
      <div class="pp-admin-token">
        <div>
          <div class="pp-admin-code">${esc(token.code)}</div>
          <div class="pp-admin-meta">Created ${esc(created || '—')} · ${esc(creator)}</div>
        </div>
        <div class="pp-admin-stat">
          <span>Connected</span>
          <strong>${chainLength}</strong>
        </div>
        <div class="pp-admin-stat">
          <span>Last redeemed</span>
          <strong>${esc(redeemed || '—')}</strong>
        </div>
      </div>
    `;
  }).join('');
};

const renderLeaderboard = (data) => {
  if (!leaderboardEl) return;
  const chains = Array.isArray(data?.topChains) ? data.topChains : [];
  const spreaders = Array.isArray(data?.topSpreaders) ? data.topSpreaders : [];

  leaderboardEl.innerHTML = `
    <div class="loop-leaderboard-col">
      <h3>Top Passes</h3>
      ${chains.length ? chains.map(rowChain).join('') : '<p class="pp-admin-empty">No pass activity yet.</p>'}
    </div>
    <div class="loop-leaderboard-col">
      <h3>Top Sharers</h3>
      ${spreaders.length ? spreaders.map(rowSpreader).join('') : '<p class="pp-admin-empty">No sharers yet.</p>'}
    </div>
  `;
};

const formatName = (item) => {
  const first = item?.firstName || '';
  const last = item?.lastName || '';
  const name = `${first} ${last}`.trim();
  return name || 'Pet Pawket Friend';
};

const formatMoney = (amount = 0, currency = 'USD') => {
  const value = safeNumber(amount, 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
};

const rowChain = (item, idx) => `
  <div class="loop-leader-row">
    <span>#${idx + 1}</span>
    <span>${esc(formatName(item))}</span>
    <strong>${positiveInt(item?.chainLength, 1)}</strong>
  </div>
`;

const rowSpreader = (item, idx) => `
  <div class="loop-leader-row">
    <span>#${idx + 1}</span>
    <span>${esc(formatName(item))}</span>
    <strong>${nonNegativeInt(item?.shares, 0)}</strong>
  </div>
`;

const renderImpactCases = (cases = []) => {
  if (!impactCasesEl) return;
  if (!cases.length) {
    impactCasesEl.innerHTML = `<p class="pp-admin-empty">No impact cases yet.</p>`;
    return;
  }
  impactCasesEl.innerHTML = cases.map((item) => {
    const caseId = nonNegativeInt(item.id, 0);
    const funded = safeNumber(item.fundedAmount, 0);
    const goal = safeNumber(item.goalAmount, 0);
    const pct = goal > 0 ? percent((funded / goal) * 100) : 0;
    const status = String(item.status || 'active');
    const statusClass = status === 'funded'
      ? 'is-funded'
      : status === 'paused'
        ? 'is-paused'
        : 'is-active';
    const activeTag = item.active ? '<span class="pp-admin-impact-tag is-active">Live</span>' : '';
    const priorityValue = item.priority == null ? '' : nonNegativeInt(item.priority, 0);
    const priorityLabel = item.priority == null ? '—' : String(priorityValue);
    return `
      <div class="pp-admin-impact-case" data-impact-case="${caseId}">
        <div class="pp-admin-impact-head">
          <div>
            <div class="pp-admin-impact-title">${esc(item.title || 'Rescue story')}</div>
            <div class="pp-admin-meta">${item.petName ? `Pet: ${esc(item.petName)} · ` : ''}${esc(formatDate(item.createdAt) || '—')}</div>
          </div>
          <div class="pp-admin-impact-tags">
            ${activeTag}
            <span class="pp-admin-impact-tag ${statusClass}">${esc(status)}</span>
            <span class="pp-admin-impact-tag">P${priorityLabel}</span>
          </div>
        </div>
        <div class="pp-admin-impact-progress">
          <span style="width:${pct}%"></span>
        </div>
        <div class="pp-admin-impact-meta">
          <span>${formatMoney(funded, item.currency)} funded</span>
          <span>Goal ${formatMoney(goal, item.currency)}</span>
          <span>${pct}% complete</span>
        </div>
        <div class="pp-admin-impact-edit">
          <input type="number" step="0.01" data-impact-goal value="${goal || ''}" placeholder="Goal" />
          <input type="number" data-impact-priority value="${priorityValue}" placeholder="Priority" />
          <select data-impact-status>
            <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
            <option value="paused" ${status === 'paused' ? 'selected' : ''}>Paused</option>
            <option value="funded" ${status === 'funded' ? 'selected' : ''}>Funded</option>
          </select>
        </div>
        <div class="pp-admin-impact-actions">
          <button class="pp-loop-share-btn secondary" type="button" data-impact-save>Save</button>
          <button class="pp-loop-share-btn" type="button" data-impact-activate>Set Active</button>
        </div>
      </div>
    `;
  }).join('');
};

const loadTokens = async () => {
  const res = await request('/api/loop/admin/tokens?limit=120', { cache: 'no-store' });
  if (res.status === 401 || res.status === 403) {
    renderUnauthorized();
    return false;
  }
  if (!res.ok || !res.body?.ok) {
    setStatus('Unable to load passes right now.', 'error');
    if (tokensEl) tokensEl.innerHTML = `<p class="pp-admin-empty">Unable to load passes.</p>`;
    return false;
  }
  renderTokens(Array.isArray(res.body.tokens) ? res.body.tokens : []);
  return true;
};

const loadImpactCases = async () => {
  if (!impactCasesEl) return true;
  const res = await request('/api/loop/admin/impact/cases?limit=120', { cache: 'no-store' });
  if (res.status === 401 || res.status === 403) {
    renderUnauthorized();
    return false;
  }
  if (!res.ok || !res.body?.ok) {
    setStatus('Unable to load impact cases right now.', 'error');
    impactCasesEl.innerHTML = `<p class="pp-admin-empty">Unable to load impact cases.</p>`;
    return false;
  }
  renderImpactCases(Array.isArray(res.body.cases) ? res.body.cases : []);
  return true;
};

const loadLeaderboard = async () => {
  const res = await request('/api/loop/leaderboard', { cache: 'no-store' });
  if (res.ok && res.body?.ok) {
    renderLeaderboard(res.body);
  }
};

const refreshAll = async () => {
  setStatus('Refreshing…');
  const ok = await loadTokens();
  await loadImpactCases();
  await loadLeaderboard();
  if (ok) {
    setStatus('Admin data refreshed.', 'success');
  }
};

if (refreshBtn) {
  refreshBtn.addEventListener('click', refreshAll);
}

if (awardBtn) {
  awardBtn.addEventListener('click', async () => {
    const month = awardInput?.value?.trim();
    setStatus('Awarding monthly rewards…');
    const res = await request('/api/loop/admin/award-monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(month ? { month } : {}),
    });
    if (res.status === 401 || res.status === 403) {
      renderUnauthorized();
      return;
    }
    if (!res.ok || !res.body?.ok) {
      setStatus('Failed to award monthly rewards.', 'error');
      return;
    }
    const count = Array.isArray(res.body.result?.awards) ? res.body.result.awards.length : 0;
    setStatus(`Monthly rewards awarded (${count} new award${count === 1 ? '' : 's'}).`, 'success');
    await refreshAll();
  });
}

if (impactForm) {
  impactForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: impactTitle?.value?.trim(),
      body: impactBody?.value?.trim(),
      petName: impactPetName?.value?.trim() || '',
      imageUrl: impactImageUrl?.value?.trim() || '',
      goalAmount: impactGoal?.value ? Number(impactGoal.value) : undefined,
      currency: impactCurrency?.value?.trim() || undefined,
      status: impactStatus?.value || 'active',
      priority: impactPriority?.value ? Number(impactPriority.value) : undefined,
      active: !!impactActive?.checked,
    };
    if (!payload.title || !payload.body) {
      setStatus('Please provide a title and story body.', 'warn');
      return;
    }
    setStatus('Adding impact story…');
    const res = await request('/api/loop/admin/impact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 401 || res.status === 403) {
      renderUnauthorized();
      return;
    }
    if (!res.ok || !res.body?.ok) {
      setStatus('Failed to add impact story.', 'error');
      return;
    }
    setStatus('Impact story added.', 'success');
    impactForm.reset();
    if (impactActive) impactActive.checked = false;
    await loadImpactCases();
  });
}

if (impactCasesEl) {
  impactCasesEl.addEventListener('click', async (event) => {
    const card = event.target.closest('[data-impact-case]');
    if (!card) return;
    const caseId = Number(card.getAttribute('data-impact-case'));
    if (!caseId) return;

    if (event.target.matches('[data-impact-activate]')) {
      setStatus('Activating impact case…');
      const res = await request('/api/loop/admin/impact/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId }),
      });
      if (res.status === 401 || res.status === 403) {
        renderUnauthorized();
        return;
      }
      if (!res.ok || !res.body?.ok) {
        setStatus('Failed to activate impact case.', 'error');
        return;
      }
      setStatus('Impact case activated.', 'success');
      await loadImpactCases();
      return;
    }

    if (event.target.matches('[data-impact-save]')) {
      const goalInput = card.querySelector('[data-impact-goal]');
      const priorityInput = card.querySelector('[data-impact-priority]');
      const statusInput = card.querySelector('[data-impact-status]');
      const payload = {
        id: caseId,
        goalAmount: goalInput?.value ? Number(goalInput.value) : undefined,
        priority: priorityInput?.value ? Number(priorityInput.value) : undefined,
        status: statusInput?.value || undefined,
      };
      setStatus('Saving impact case…');
      const res = await request('/api/loop/admin/impact/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.status === 401 || res.status === 403) {
        renderUnauthorized();
        return;
      }
      if (!res.ok || !res.body?.ok) {
        setStatus('Failed to update impact case.', 'error');
        return;
      }
      setStatus('Impact case updated.', 'success');
      await loadImpactCases();
    }
  });
}

refreshAll();
