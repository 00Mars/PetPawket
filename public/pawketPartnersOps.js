// public/pawketPartnersOps.js
const claimsEl = document.querySelector('[data-ops-claims]');
const listingsEl = document.querySelector('[data-ops-listings]');
const statusEl = document.querySelector('[data-ops-status]');
const claimStatusSelect = document.querySelector('[data-ops-claim-status]');
const claimSummaryEl = document.querySelector('[data-ops-claim-summary]');

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function safeUrl(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
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

async function api(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body?.ok, status: res.status, body };
}

function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString();
}

function claimActionError(status, body, actionLabel) {
  const message = String(body?.error || '');
  if (status === 409 || /not in pending/i.test(message)) {
    return `This claim was already reviewed by another ops teammate. ${actionLabel} was not applied.`;
  }
  return message || `Unable to ${actionLabel.toLowerCase()} claim.`;
}

function claimActionsMarkup(claim) {
  if (claim.status !== 'pending') {
    const reviewedBy = claim.reviewedByEmail ? ` by ${esc(claim.reviewedByEmail)}` : '';
    const reviewedAt = claim.reviewedAt ? ` on ${esc(formatDateTime(claim.reviewedAt))}` : '';
    return `<div class="pp-network-muted">Reviewed${reviewedBy}${reviewedAt}</div>`;
  }
  return `
    <textarea class="pp-network-textarea pp-network-textarea--sm" data-claim-review-notes placeholder="Review notes (optional)"></textarea>
    <div class="pp-network-actions">
      <button class="pp-network-btn" type="button" data-claim-approve>Approve</button>
      <button class="pp-network-btn ghost" type="button" data-claim-reject>Reject</button>
    </div>
  `;
}

async function refreshClaimSummary() {
  if (!claimSummaryEl) return;
  const statuses = ['pending', 'approved', 'rejected'];
  const results = await Promise.all(
    statuses.map((status) => api(`/api/network/partners-ops/claims?status=${encodeURIComponent(status)}&limit=250`))
  );

  const counts = { pending: 0, approved: 0, rejected: 0 };
  let hasError = false;
  results.forEach((result, index) => {
    if (!result.ok) {
      hasError = true;
      return;
    }
    const key = statuses[index];
    counts[key] = Array.isArray(result.body?.claims) ? result.body.claims.length : 0;
  });

  if (hasError) {
    claimSummaryEl.innerHTML = '<span class="pp-network-muted">Claim summary unavailable.</span>';
    return;
  }

  claimSummaryEl.innerHTML = `
    <span class="pp-network-chip">Pending: ${counts.pending}</span>
    <span class="pp-network-chip">Approved: ${counts.approved}</span>
    <span class="pp-network-chip">Rejected: ${counts.rejected}</span>
  `;
}

async function refreshClaims() {
  const status = claimStatusSelect?.value || 'pending';
  const { ok, body } = await api(`/api/network/partners-ops/claims?status=${encodeURIComponent(status)}`);
  if (!ok) {
    setStatus(body?.error || 'Unable to load claim queue.');
    return;
  }

  const claims = body.claims || [];
  claimsEl.innerHTML = claims.length
    ? claims.map((c) => {
      const proofUrl = safeUrl(c.businessIdentityDocUrl);
      const proofPath = safeUrl(c.businessIdentityDocPath);
      const listingPath = c.listingSlug ? `/pawket-network/${encodeURIComponent(c.listingSlug)}` : '';
      return `
        <article class="pp-network-item" data-claim-id="${esc(c.id)}">
          <div class="pp-network-item-head">
            <strong>${esc(c.listingName)}</strong>
            <span class="pp-network-badge">${esc(c.status)}</span>
          </div>
          <div class="pp-network-muted">Slug: ${esc(c.listingSlug || 'N/A')}</div>
          <div class="pp-network-muted">Listing status: ${esc(c.listingStatus || 'N/A')}</div>
          ${listingPath ? `<a class="pp-network-muted" href="${esc(listingPath)}" target="_blank" rel="noopener noreferrer">Open listing page</a>` : ''}
          <div class="pp-network-muted">Requested: ${esc(formatDateTime(c.createdAt))}</div>
          <div class="pp-network-muted">${esc(c.requestedByEmail || '')}</div>
          <div class="pp-network-muted">Business email: ${esc(c.businessEmail || 'N/A')}</div>
          <div class="pp-network-muted">Phone: ${esc(c.phone || 'N/A')}</div>
          ${proofUrl ? `<a class="pp-network-muted" href="${esc(proofUrl)}" target="_blank" rel="noopener noreferrer">Business proof URL</a>` : ''}
          ${proofPath ? `<a class="pp-network-muted" href="${esc(proofPath)}" target="_blank" rel="noopener noreferrer">Uploaded proof file</a>` : ''}
          ${c.reviewNotes ? `<div class="pp-network-muted">Review notes: ${esc(c.reviewNotes)}</div>` : ''}
          ${claimActionsMarkup(c)}
        </article>
      `;
    }).join('')
    : '<p class="pp-network-muted">No claims in this queue.</p>';

  claimsEl.querySelectorAll('[data-claim-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('[data-claim-id]')?.getAttribute('data-claim-id');
      if (!id) return;
      const card = btn.closest('[data-claim-id]');
      const actionBtns = card?.querySelectorAll('[data-claim-approve], [data-claim-reject]') || [];
      const notes = card?.querySelector('[data-claim-review-notes]')?.value?.trim() || '';
      actionBtns.forEach((node) => { node.disabled = true; });
      setStatus('Approving claim...');
      const { ok, body, status } = await api(`/api/network/partners-ops/claims/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: notes || 'Approved in Pawket Partners Ops.' }),
      });
      if (ok) {
        setStatus('Claim approved.');
        await refreshClaims();
        await refreshClaimSummary();
        await refreshListings();
        return;
      }
      if (status === 409 || /not in pending/i.test(String(body?.error || ''))) {
        setStatus(claimActionError(status, body, 'Approve'));
        await refreshClaims();
        await refreshClaimSummary();
        await refreshListings();
        return;
      }
      setStatus(claimActionError(status, body, 'Approve'));
      actionBtns.forEach((node) => { node.disabled = false; });
    });
  });

  claimsEl.querySelectorAll('[data-claim-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('[data-claim-id]')?.getAttribute('data-claim-id');
      if (!id) return;
      const card = btn.closest('[data-claim-id]');
      const actionBtns = card?.querySelectorAll('[data-claim-approve], [data-claim-reject]') || [];
      const notes = card?.querySelector('[data-claim-review-notes]')?.value?.trim() || '';
      actionBtns.forEach((node) => { node.disabled = true; });
      setStatus('Rejecting claim...');
      const { ok, body, status } = await api(`/api/network/partners-ops/claims/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_notes: notes || 'Rejected in Pawket Partners Ops.' }),
      });
      if (ok) {
        setStatus('Claim rejected.');
        await refreshClaims();
        await refreshClaimSummary();
        await refreshListings();
        return;
      }
      if (status === 409 || /not in pending/i.test(String(body?.error || ''))) {
        setStatus(claimActionError(status, body, 'Reject'));
        await refreshClaims();
        await refreshClaimSummary();
        await refreshListings();
        return;
      }
      setStatus(claimActionError(status, body, 'Reject'));
      actionBtns.forEach((node) => { node.disabled = false; });
    });
  });
}

function listingCard(listing) {
  const tierOptions = ['','partner','partner_plus','partner_elite'].map((tier) => `<option value="${tier}" ${listing.partner_tier === tier ? 'selected' : ''}>${tier || 'none'}</option>`).join('');
  return `
    <article class="pp-network-item" data-listing-id="${esc(listing.id)}">
      <div class="pp-network-item-head">
        <strong>${esc(listing.name)}</strong>
        <span class="pp-network-badge">${esc(listing.status)}</span>
      </div>
      <div class="pp-network-muted">${esc(listing.slug)}</div>
      <label><input type="checkbox" data-verify-email ${listing.verification?.email_verified ? 'checked' : ''} /> Email verified</label>
      <label><input type="checkbox" data-verify-phone ${listing.verification?.phone_verified ? 'checked' : ''} /> Phone verified</label>
      <label><input type="checkbox" data-verify-business ${listing.verification?.business_identity_verified ? 'checked' : ''} /> Business identity verified</label>
      <label><input type="checkbox" data-verify-manual ${listing.verification?.manual_review_passed ? 'checked' : ''} /> Manual review passed</label>
      <div class="pp-network-row">
        <select class="pp-network-select" data-tier>${tierOptions}</select>
        <input class="pp-network-input" data-featured-rank type="number" value="${listing.featured_rank ?? ''}" placeholder="Featured rank" />
      </div>
      <label><input type="checkbox" data-feature-lead ${listing.features?.enable_lead_form ? 'checked' : ''} /> Lead form</label>
      <label><input type="checkbox" data-feature-offers ${listing.features?.enable_offers ? 'checked' : ''} /> Offers</label>
      <label><input type="checkbox" data-feature-priority ${listing.features?.enable_priority_rank ? 'checked' : ''} /> Priority rank</label>
      <label><input type="checkbox" data-feature-slot ${listing.features?.enable_featured_slots ? 'checked' : ''} /> Featured slots</label>
      <div class="pp-network-actions">
        <button class="pp-network-btn ghost" type="button" data-save-verification>Save verification</button>
        <button class="pp-network-btn ghost" type="button" data-save-tier>Save tier</button>
        <button class="pp-network-btn ghost" type="button" data-save-features>Save features</button>
      </div>
    </article>
  `;
}

async function refreshListings() {
  const { ok, body } = await api('/api/network/partners-ops/listings?limit=120');
  if (!ok) {
    setStatus(body?.error || 'Unable to load listings.');
    return;
  }
  const listings = body.listings || [];
  listingsEl.innerHTML = listings.length ? listings.map(listingCard).join('') : '<p class="pp-network-muted">No listings found.</p>';

  listingsEl.querySelectorAll('[data-listing-id]').forEach((card) => {
    const id = card.getAttribute('data-listing-id');

    card.querySelector('[data-save-verification]')?.addEventListener('click', async () => {
      setStatus('Saving verification...');
      const payload = {
        email_verified: card.querySelector('[data-verify-email]')?.checked,
        phone_verified: card.querySelector('[data-verify-phone]')?.checked,
        business_identity_verified: card.querySelector('[data-verify-business]')?.checked,
        manual_review_passed: card.querySelector('[data-verify-manual]')?.checked,
      };
      const { ok, body } = await api(`/api/network/partners-ops/listings/${encodeURIComponent(id)}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Verification updated.' : (body?.error || 'Unable to save verification.'));
      if (ok) await refreshListings();
    });

    card.querySelector('[data-save-tier]')?.addEventListener('click', async () => {
      setStatus('Saving tier...');
      const payload = { partner_tier: card.querySelector('[data-tier]')?.value || null };
      const { ok, body } = await api(`/api/network/partners-ops/listings/${encodeURIComponent(id)}/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Tier updated.' : (body?.error || 'Unable to save tier.'));
      if (ok) await refreshListings();
    });

    card.querySelector('[data-save-features]')?.addEventListener('click', async () => {
      setStatus('Saving features...');
      const payload = {
        enable_lead_form: card.querySelector('[data-feature-lead]')?.checked,
        enable_offers: card.querySelector('[data-feature-offers]')?.checked,
        enable_priority_rank: card.querySelector('[data-feature-priority]')?.checked,
        enable_featured_slots: card.querySelector('[data-feature-slot]')?.checked,
        featured_rank: card.querySelector('[data-featured-rank]')?.value,
      };
      const { ok, body } = await api(`/api/network/partners-ops/listings/${encodeURIComponent(id)}/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Features updated.' : (body?.error || 'Unable to save features.'));
      if (ok) await refreshListings();
    });
  });
}

document.querySelector('[data-ops-action="refresh"]')?.addEventListener('click', async () => {
  setStatus('Refreshing...');
  await refreshClaims();
  await refreshClaimSummary();
  await refreshListings();
  setStatus('Pawket Partners Ops data refreshed.');
});

claimStatusSelect?.addEventListener('change', async () => {
  await refreshClaims();
  await refreshClaimSummary();
});

(async function init() {
  setStatus('Loading Pawket Partners Ops data...');
  await refreshClaims();
  await refreshClaimSummary();
  await refreshListings();
  setStatus('');
})();
