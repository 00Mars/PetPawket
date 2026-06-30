// public/pawketPartnersOps.js
const claimsEl = document.querySelector('[data-ops-claims]');
const nominationsEl = document.querySelector('[data-ops-nominations]');
const candidatesEl = document.querySelector('[data-ops-candidates]');
const listingsEl = document.querySelector('[data-ops-listings]');
const palReviewsEl = document.querySelector('[data-ops-pal-reviews]');
const communityDraftsEl = document.querySelector('[data-ops-community-drafts]');
const statusEl = document.querySelector('[data-ops-status]');
const claimStatusSelect = document.querySelector('[data-ops-claim-status]');
const nominationStatusSelect = document.querySelector('[data-ops-nomination-status]');
const palReviewStatusSelect = document.querySelector('[data-ops-pal-review-status]');
const candidateStatusSelect = document.querySelector('[data-ops-candidate-status]');
const candidateSourceSelect = document.querySelector('[data-ops-candidate-source]');
const candidateReadinessSelect = document.querySelector('[data-ops-candidate-readiness]');
const candidateStateInput = document.querySelector('[data-ops-candidate-state]');
const candidateSearchInput = document.querySelector('[data-ops-candidate-search]');
const candidateBulkStatusSelect = document.querySelector('[data-ops-candidate-bulk-status]');
const candidateBulkNotesInput = document.querySelector('[data-ops-candidate-bulk-notes]');
const claimSummaryEl = document.querySelector('[data-ops-claim-summary]');
const nominationSummaryEl = document.querySelector('[data-ops-nomination-summary]');
const palReviewSummaryEl = document.querySelector('[data-ops-pal-review-summary]');
const candidateSummaryEl = document.querySelector('[data-ops-candidate-summary]');
const candidateBreakdownEl = document.querySelector('[data-ops-candidate-breakdown]');
const launchImportForm = document.querySelector('[data-ops-launch-import-form]');
const launchImportJson = document.querySelector('[data-ops-launch-import-json]');
const candidateImportForm = document.querySelector('[data-ops-candidate-import-form]');
const candidateImportSource = document.querySelector('[data-ops-candidate-import-source]');
const candidateImportJson = document.querySelector('[data-ops-candidate-import-json]');

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function setQueueMessage(el, message) {
  if (el) el.innerHTML = `<p class="pp-network-muted">${esc(message)}</p>`;
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

async function hasSignedInSession() {
  const res = await fetch('/api/session', { credentials: 'include', cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  return !!body?.signedIn;
}

function renderOpsSigninRequired() {
  const message = 'Sign in with a Pawket Partners Ops account to review this queue.';
  setStatus(message);
  setQueueMessage(claimsEl, message);
  setQueueMessage(nominationsEl, message);
  setQueueMessage(palReviewsEl, message);
  setQueueMessage(communityDraftsEl, message);
  setQueueMessage(candidatesEl, message);
  setQueueMessage(listingsEl, message);
  [claimSummaryEl, nominationSummaryEl, palReviewSummaryEl, candidateSummaryEl, candidateBreakdownEl]
    .forEach((el) => { if (el) el.innerHTML = ''; });
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

function categoryLabel(category) {
  return {
    vet: 'Veterinary',
    groomer: 'Grooming',
    cleaner: 'Cleaner',
    shelter: 'Shelter',
    trainer: 'Training',
    boarding: 'Boarding',
    sitter: 'Sitting',
    walker: 'Walking',
    daycare: 'Daycare',
    rescue: 'Rescue',
    other: 'Other',
  }[category] || category || 'Other';
}

function sourceLabel(source) {
  return {
    overture: 'Overture',
    osm: 'OpenStreetMap',
    irs_eo_bmf: 'IRS EO BMF',
    manual: 'Manual',
    paid_provider: 'Paid provider',
    partner_api: 'Partner API',
  }[source] || source || 'Source';
}

function candidateStatusLabel(status) {
  return {
    new: 'New',
    needs_review: 'Needs review',
    approved: 'Approved',
    rejected: 'Rejected',
    promoted: 'Promoted',
  }[status] || status || 'New';
}

function palReviewStatusLabel(status) {
  return {
    review_required: 'Review requested',
    pending: 'Pending',
    granted: 'Granted',
    revoked: 'Revoked',
    all: 'All',
  }[status] || status || 'Review requested';
}

function palReviewRights(item) {
  const rights = [
    item.allowPublicStory ? 'Public story' : '',
    item.allowCommunityPal ? 'Community Pal' : '',
    item.allowCharmConnection ? 'CHARM' : '',
    item.allowCherishConnection ? 'CHERISH' : '',
    item.allowMarketingUse ? 'Marketing' : '',
    item.allowTransfer ? 'Transfer' : '',
  ].filter(Boolean);
  if (!rights.length) return '<span class="pp-network-chip pp-network-chip--context">Private certificate only</span>';
  return rights.map((right) => `<span class="pp-network-chip">${esc(right)}</span>`).join('');
}

function palReviewContext(item) {
  const pieces = [];
  const owner = [item.ownerFirstName, item.ownerLastName].filter(Boolean).join(' ');
  if (item.ownerEmail || owner) pieces.push(`Owner: ${owner || item.ownerEmail}`);
  if (item.petName) pieces.push(`Pet: ${item.petName}${item.petSpecies ? ` (${item.petSpecies})` : ''}`);
  if (item.journalTitle) pieces.push(`Memory: ${item.journalTitle}`);
  if (item.journalHighlighted) pieces.push('Core Memory');
  return pieces.join(' · ') || 'Private account certificate';
}

function palReviewStoryLabel(item) {
  const story = item?.metadata?.storySubmission || {};
  const type = String(story.storyType || item.originType || '').replace(/_/g, ' ');
  const title = story.title || '';
  return [title ? `Story: ${title}` : '', type ? `Type: ${type}` : ''].filter(Boolean).join(' · ');
}

function compactOpsText(value, max = 900) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function palReviewSummaryBlock(label, value) {
  const text = compactOpsText(value);
  if (!text) return '';
  return `<div class="pp-network-muted"><strong>${esc(label)}:</strong> ${esc(text)}</div>`;
}

function palReviewCard(item) {
  const statusOptions = ['review_required', 'pending', 'granted', 'revoked'].map((value) => (
    `<option value="${value}" ${item.status === value ? 'selected' : ''}>${palReviewStatusLabel(value)}</option>`
  )).join('');
  const canCreateDraft = item.status === 'granted' && item.allowCommunityPal;
  return `
    <article class="pp-network-item" data-pal-review-id="${esc(item.id)}">
      <div class="pp-network-item-head">
        <div>
          <strong>${esc(item.palName || 'Untitled Pawket Pal')}</strong>
          <div class="pp-network-muted">${esc(item.heartCode || '')}</div>
        </div>
        <span class="pp-network-badge">${esc(palReviewStatusLabel(item.status))}</span>
      </div>
      <div class="pp-network-muted">${esc(palReviewContext(item))}</div>
      ${palReviewStoryLabel(item) ? `<div class="pp-network-muted">${esc(palReviewStoryLabel(item))}</div>` : ''}
      <div class="pp-network-chip-row">${palReviewRights(item)}</div>
      ${palReviewSummaryBlock('Private origin note', item.originSummary)}
      ${palReviewSummaryBlock('Submitted private story', item.internalStoryNotes)}
      ${palReviewSummaryBlock('Consent-safe public summary', item.publicStorySummary)}
      ${item.consentText ? `<div class="pp-network-muted"><strong>Consent note:</strong> ${esc(item.consentText)}</div>` : ''}
      ${item.reviewedByEmail ? `<div class="pp-network-muted">Last reviewed by ${esc(item.reviewedByEmail)} on ${esc(formatDateTime(item.updatedAt))}</div>` : ''}
      <div class="pp-network-row">
        <select class="pp-network-select" data-pal-review-next-status>${statusOptions}</select>
        <input class="pp-network-input" data-pal-review-notes placeholder="Review notes" value="${esc(item.reviewNotes || '')}" />
      </div>
      <p class="pp-network-inline-note pp-network-muted">Granting consent does not publish a Community Pal or change the certificate from private/draft.</p>
      <div class="pp-network-actions">
        <button class="pp-network-btn ghost" type="button" data-pal-review-save>Save Pal review</button>
        ${canCreateDraft ? '<button class="pp-network-btn" type="button" data-pal-review-create-draft>Create Community Draft</button>' : ''}
      </div>
    </article>
  `;
}

const COMMUNITY_DRAFT_CHECKLIST = [
  ['consentAuditPassed', 'Consent audit passed'],
  ['publicCopyReviewed', 'Public copy reviewed'],
  ['privateStoryProtected', 'Private story protected'],
  ['moderationPassed', 'Moderation passed'],
  ['artDirectionReady', 'Art direction ready'],
  ['charmCherishReviewed', 'CHARM/CHERISH reviewed'],
  ['finalReleaseApproved', 'Final release approval'],
];

function communityDraftMeta(draft) {
  return draft?.metadata?.communityDraft || {};
}

function communityDraftReleaseGateStatus(draft) {
  const meta = communityDraftMeta(draft);
  if (meta?.publicArchive?.status === 'public_preview_archived') return 'Archived public preview';
  if (meta?.publicApproval?.status === 'public_preview_approved') return 'Approved public preview';
  const status = meta?.releaseGate?.status || 'drafting';
  return {
    drafting: 'Drafting',
    release_review_ready: 'Release review ready',
  }[status] || status;
}

function communityDraftTrait(draft, key) {
  return draft?.traits?.[key] || '';
}

function disabledAttr(disabled) {
  return disabled ? 'disabled aria-disabled="true"' : '';
}

function communityDraftChecklistMarkup(draft, disabled = false) {
  const checklist = communityDraftMeta(draft)?.releaseChecklist || {};
  return COMMUNITY_DRAFT_CHECKLIST.map(([key, label]) => `
    <label class="pp-network-check">
      <input type="checkbox" data-community-draft-check="${esc(key)}" ${checklist[key] ? 'checked' : ''} ${disabledAttr(disabled)} />
      <span>${esc(label)}</span>
    </label>
  `).join('');
}

function communityDraftCard(draft) {
  const meta = communityDraftMeta(draft);
  const source = draft.sourceHeartCode ? `Source: ${draft.sourceHeartCode}` : 'Source review linked in metadata';
  const isPublicArchived = meta?.publicArchive?.status === 'public_preview_archived'
    || draft.releaseState === 'archived';
  const isPublicApproved = meta?.publicApproval?.status === 'public_preview_approved'
    || (draft.privacyState === 'public' && draft.releaseState === 'active');
  const releaseGateReady = meta?.releaseGate?.status === 'release_review_ready';
  const canApprovePublicPreview = !isPublicApproved
    && !isPublicArchived
    && draft.releaseState === 'review'
    && draft.privacyState === 'private'
    && releaseGateReady;
  const canArchivePublicPreview = isPublicApproved && !isPublicArchived;
  const canSubmitReleaseGate = !isPublicApproved && !isPublicArchived && draft.releaseState !== 'review';
  const canEdit = !isPublicApproved && !isPublicArchived && draft.releaseState !== 'active';
  const disabled = disabledAttr(!canEdit);
  const badge = isPublicArchived ? 'Archived preview' : isPublicApproved ? 'Public preview' : 'Private draft';
  const actionMarkup = isPublicArchived ? `
        <p class="pp-network-inline-note pp-network-muted">Archived from the public Community preview surface. The record is locked here and remains non-market, non-transferable, and claim-free.</p>
      ` : isPublicApproved ? `
        <p class="pp-network-inline-note pp-network-muted">Approved for the public Community preview surface. Editing is locked here; market, trading, public drop, and CHARM/CHERISH claims remain disabled.</p>
        ${canArchivePublicPreview ? '<button class="pp-network-btn ghost" type="button" data-community-draft-public-archive>Archive public preview</button>' : ''}
      ` : `
        <button class="pp-network-btn ghost" type="button" data-community-draft-save>Save workbench</button>
        ${canSubmitReleaseGate ? '<button class="pp-network-btn" type="button" data-community-draft-release-gate>Submit release gate</button>' : ''}
        ${canApprovePublicPreview ? '<button class="pp-network-btn" type="button" data-community-draft-public-approval>Approve public preview</button>' : ''}
      `;
  return `
    <article class="pp-network-item" data-community-draft-id="${esc(draft.id)}">
      <div class="pp-network-item-head">
        <div>
          <strong>${esc(draft.name || 'Untitled Community Pal Draft')}</strong>
          <div class="pp-network-muted">${esc(draft.heartCode || '')}</div>
        </div>
        <span class="pp-network-badge">${esc(badge)}</span>
      </div>
      <div class="pp-network-chip-row">
        <span class="pp-network-chip">Community Pal</span>
        <span class="pp-network-chip pp-network-chip--context">Release: ${esc(draft.releaseState || 'draft')}</span>
        <span class="pp-network-chip pp-network-chip--context">Privacy: ${esc(draft.privacyState || 'private')}</span>
        <span class="pp-network-chip pp-network-chip--context">Gate: ${esc(communityDraftReleaseGateStatus(draft))}</span>
      </div>
      <div class="pp-network-muted">${esc(source)}</div>
      <div class="pp-network-stack">
        <label>
          <span class="pp-network-field-label">Draft name</span>
          <input class="pp-network-input" data-community-draft-name value="${esc(draft.name || '')}" ${disabled} />
        </label>
        <label>
          <span class="pp-network-field-label">Public-safe character summary</span>
          <textarea class="pp-network-textarea" data-community-draft-summary ${disabled}>${esc(draft.publicStorySummary || '')}</textarea>
        </label>
        <div class="pp-network-row pp-network-row--triple">
          <label>
            <span class="pp-network-field-label">Primary trait</span>
            <input class="pp-network-input" data-community-draft-trait="primaryTrait" value="${esc(communityDraftTrait(draft, 'primaryTrait'))}" placeholder="gentle" ${disabled} />
          </label>
          <label>
            <span class="pp-network-field-label">Kindness affinity</span>
            <input class="pp-network-input" data-community-draft-trait="kindnessAffinity" value="${esc(communityDraftTrait(draft, 'kindnessAffinity'))}" placeholder="comfort" ${disabled} />
          </label>
          <label>
            <span class="pp-network-field-label">Quest ability</span>
            <input class="pp-network-input" data-community-draft-trait="questAbility" value="${esc(communityDraftTrait(draft, 'questAbility'))}" placeholder="calm boost" ${disabled} />
          </label>
        </div>
        <label>
          <span class="pp-network-field-label">Visual and art direction notes</span>
          <textarea class="pp-network-textarea" data-community-draft-art ${disabled}>${esc(meta.artDirectionNotes || '')}</textarea>
        </label>
        <label>
          <span class="pp-network-field-label">Internal moderation notes</span>
          <textarea class="pp-network-textarea" data-community-draft-internal ${disabled}>${esc(draft.internalStoryNotes || '')}</textarea>
        </label>
        <div class="pp-network-check-grid">
          ${communityDraftChecklistMarkup(draft, !canEdit)}
        </div>
        <label>
          <span class="pp-network-field-label">Release gate notes</span>
          <textarea class="pp-network-textarea pp-network-textarea--sm" data-community-draft-gate-notes ${disabled}>${esc(meta.releaseGateNotes || meta.releaseGate?.notes || meta.publicApproval?.notes || '')}</textarea>
        </label>
      </div>
      <p class="pp-network-inline-note pp-network-muted">${canApprovePublicPreview ? 'Public preview approval exposes only the redacted Community card. It does not create a drop, market item, transfer path, or CHARM/CHERISH claim.' : 'Release gate submission moves this draft to internal release review only. It does not create a public Pal page, drop, market item, CHARM claim, or release.'}</p>
      <div class="pp-network-actions">
        ${actionMarkup}
      </div>
    </article>
  `;
}

function communityDraftPayload(card) {
  const traits = {};
  card.querySelectorAll('[data-community-draft-trait]').forEach((input) => {
    const key = input.getAttribute('data-community-draft-trait');
    if (key) traits[key] = input.value || '';
  });
  const releaseChecklist = {};
  card.querySelectorAll('[data-community-draft-check]').forEach((input) => {
    const key = input.getAttribute('data-community-draft-check');
    if (key) releaseChecklist[key] = input.checked;
  });
  return {
    name: card.querySelector('[data-community-draft-name]')?.value || '',
    characterSummary: card.querySelector('[data-community-draft-summary]')?.value || '',
    artDirectionNotes: card.querySelector('[data-community-draft-art]')?.value || '',
    internalStoryNotes: card.querySelector('[data-community-draft-internal]')?.value || '',
    releaseGateNotes: card.querySelector('[data-community-draft-gate-notes]')?.value || '',
    traits,
    releaseChecklist,
  };
}

function bindCommunityDraftWorkbench() {
  communityDraftsEl?.querySelectorAll('[data-community-draft-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-community-draft-id]');
      const id = card?.getAttribute('data-community-draft-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Saving Community Pal draft workbench...');
      const { ok, body } = await api(`/api/pals/ops/community-drafts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(communityDraftPayload(card)),
      });
      setStatus(ok ? 'Community Pal draft workbench saved. No public release was made.' : (body?.error || 'Unable to save Community Pal draft.'));
      btn.disabled = false;
      if (ok) await refreshCommunityDrafts();
    });
  });

  communityDraftsEl?.querySelectorAll('[data-community-draft-release-gate]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-community-draft-id]');
      const id = card?.getAttribute('data-community-draft-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Submitting Community Pal release gate...');
      const payload = communityDraftPayload(card);
      const { ok, body } = await api(`/api/pals/ops/community-drafts/${encodeURIComponent(id)}/release-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPrivateStoryProtected: true,
          releaseGateNotes: payload.releaseGateNotes,
        }),
      });
      if (!ok) {
        const missing = body?.details?.missing?.length ? ` Missing: ${body.details.missing.join(', ')}.` : '';
        setStatus(`${body?.error || 'Unable to submit release gate.'}${missing}`);
      } else {
        setStatus('Release gate submitted for internal review. No public release was made.');
      }
      btn.disabled = false;
      if (ok) await refreshCommunityDrafts();
    });
  });

  communityDraftsEl?.querySelectorAll('[data-community-draft-public-approval]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-community-draft-id]');
      const id = card?.getAttribute('data-community-draft-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Approving redacted Community Pal public preview...');
      const payload = communityDraftPayload(card);
      const { ok, body } = await api(`/api/pals/ops/community-drafts/${encodeURIComponent(id)}/public-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPublicPreviewReady: true,
          confirmPrivateStoryRedacted: true,
          confirmNoMarketOrTrading: true,
          confirmNoCharmCherishClaims: true,
          publicApprovalNotes: payload.releaseGateNotes,
        }),
      });
      if (!ok) {
        const missing = body?.details?.missing?.length ? ` Missing: ${body.details.missing.join(', ')}.` : '';
        setStatus(`${body?.error || 'Unable to approve public preview.'}${missing}`);
      } else {
        setStatus('Community Pal public preview approved. Market, trading, drops, and CHARM/CHERISH claims remain disabled.');
      }
      btn.disabled = false;
      if (ok) await refreshCommunityDrafts();
    });
  });

  communityDraftsEl?.querySelectorAll('[data-community-draft-public-archive]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-community-draft-id]');
      const id = card?.getAttribute('data-community-draft-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Archiving Community Pal public preview...');
      const payload = communityDraftPayload(card);
      const { ok, body } = await api(`/api/pals/ops/community-drafts/${encodeURIComponent(id)}/public-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmRemovePublicPreview: true,
          archiveNotes: payload.releaseGateNotes,
        }),
      });
      if (!ok) {
        const missing = body?.details?.missing?.length ? ` Missing: ${body.details.missing.join(', ')}.` : '';
        setStatus(`${body?.error || 'Unable to archive public preview.'}${missing}`);
      } else {
        setStatus('Community Pal public preview archived. It has been removed from public lookup and preview surfaces.');
      }
      btn.disabled = false;
      if (ok) await refreshCommunityDrafts();
    });
  });
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

function readinessChips(listing) {
  const missing = [];
  if (!listing.short_description) missing.push('summary');
  if (!listing.location?.city || !listing.location?.state) missing.push('location');
  if (!listing.contact?.phone && !listing.contact?.website_url) missing.push('contact');
  if (listing.status === 'partner') {
    const v = listing.verification || {};
    if (!(v.email_verified && v.phone_verified && v.business_identity_verified && v.manual_review_passed)) {
      missing.push('partner gate');
    }
  }
  if (listing.charm_support?.enabled && !listing.charm_support?.public_blurb) missing.push('CHARM blurb');
  if (!missing.length) return '<span class="pp-network-chip">Launch-ready basics</span>';
  return missing.slice(0, 4).map((item) => `<span class="pp-network-chip pp-network-chip--clear">Needs ${esc(item)}</span>`).join('');
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

async function refreshNominationSummary() {
  if (!nominationSummaryEl) return;
  const statuses = ['pending', 'reviewed', 'dismissed', 'converted'];
  const results = await Promise.all(
    statuses.map((status) => api(`/api/network/partners-ops/nominations?status=${encodeURIComponent(status)}&limit=250`))
  );

  const counts = { pending: 0, reviewed: 0, dismissed: 0, converted: 0 };
  let hasError = false;
  results.forEach((result, index) => {
    if (!result.ok) {
      hasError = true;
      return;
    }
    const key = statuses[index];
    counts[key] = Array.isArray(result.body?.nominations) ? result.body.nominations.length : 0;
  });

  if (hasError) {
    nominationSummaryEl.innerHTML = '<span class="pp-network-muted">Nomination summary unavailable.</span>';
    return;
  }

  nominationSummaryEl.innerHTML = `
    <span class="pp-network-chip">Pending: ${counts.pending}</span>
    <span class="pp-network-chip">Reviewed: ${counts.reviewed}</span>
    <span class="pp-network-chip">Dismissed: ${counts.dismissed}</span>
    <span class="pp-network-chip">Converted: ${counts.converted}</span>
  `;
}

async function refreshPalReviewSummary() {
  if (!palReviewSummaryEl) return;
  const { ok, body } = await api('/api/pals/ops/review-queue/summary');
  if (!ok) {
    palReviewSummaryEl.innerHTML = '<span class="pp-network-muted">Pal review summary unavailable.</span>';
    return;
  }
  const summary = body.summary || {};
  const counts = Object.fromEntries((summary.byStatus || []).map((row) => [row.key, Number(row.count || 0)]));
  const rights = summary.requestedRights || {};
  palReviewSummaryEl.innerHTML = `
    <span class="pp-network-chip">Total: ${Number(summary.total || 0)}</span>
    <span class="pp-network-chip">Review requested: ${counts.review_required || 0}</span>
    <span class="pp-network-chip">Pending: ${counts.pending || 0}</span>
    <span class="pp-network-chip">Granted: ${counts.granted || 0}</span>
    <span class="pp-network-chip">Revoked: ${counts.revoked || 0}</span>
    <span class="pp-network-chip pp-network-chip--context">Community requests: ${Number(rights.communityPal || 0)}</span>
    <span class="pp-network-chip pp-network-chip--context">Public story requests: ${Number(rights.publicStory || 0)}</span>
  `;
}

async function refreshPalReviews() {
  if (!palReviewsEl) return;
  const status = palReviewStatusSelect?.value || 'review_required';
  const { ok, body } = await api(`/api/pals/ops/review-queue?status=${encodeURIComponent(status)}&limit=80`);
  if (!ok) {
    setStatus(body?.error || 'Unable to load Pawket Pal story reviews.');
    return;
  }

  const items = body.items || [];
  palReviewsEl.innerHTML = items.length ? items.map(palReviewCard).join('') : '<p class="pp-network-muted">No Pawket Pal consent rows in this queue.</p>';

  palReviewsEl.querySelectorAll('[data-pal-review-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-pal-review-id]');
      const id = card?.getAttribute('data-pal-review-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Saving Pawket Pal review...');
      const payload = {
        status: card.querySelector('[data-pal-review-next-status]')?.value || 'review_required',
        reviewNotes: card.querySelector('[data-pal-review-notes]')?.value || '',
      };
      const { ok, body } = await api(`/api/pals/ops/review-queue/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Pawket Pal review updated.' : (body?.error || 'Unable to save Pawket Pal review.'));
      btn.disabled = false;
      if (ok) {
        await refreshPalReviews();
        await refreshPalReviewSummary();
      }
    });
  });

  palReviewsEl.querySelectorAll('[data-pal-review-create-draft]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-pal-review-id]');
      const id = card?.getAttribute('data-pal-review-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Creating internal Community Pal draft...');
      const { ok, body } = await api('/api/pals/ops/community-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: id }),
      });
      setStatus(ok ? 'Community Pal draft created. No public release was made.' : (body?.error || 'Unable to create Community Pal draft.'));
      btn.disabled = false;
      if (ok) await refreshCommunityDrafts();
    });
  });
}

async function refreshCommunityDrafts() {
  if (!communityDraftsEl) return;
  const { ok, body } = await api('/api/pals/ops/community-drafts?limit=24');
  if (!ok) {
    communityDraftsEl.innerHTML = '<p class="pp-network-muted">Community Pal drafts unavailable.</p>';
    return;
  }
  const drafts = body.drafts || [];
  communityDraftsEl.innerHTML = drafts.length
    ? drafts.map(communityDraftCard).join('')
    : '<p class="pp-network-muted">No internal Community Pal drafts yet.</p>';
  bindCommunityDraftWorkbench();
}

async function refreshNominations() {
  if (!nominationsEl) return;
  const status = nominationStatusSelect?.value || 'pending';
  const { ok, body } = await api(`/api/network/partners-ops/nominations?status=${encodeURIComponent(status)}`);
  if (!ok) {
    setStatus(body?.error || 'Unable to load nominations.');
    return;
  }

  const nominations = body.nominations || [];
  nominationsEl.innerHTML = nominations.length
    ? nominations.map((n) => {
      const website = safeUrl(n.contact?.website_url);
      const place = [n.city, n.state].filter(Boolean).join(', ');
      return `
        <article class="pp-network-item" data-nomination-id="${esc(n.id)}">
          <div class="pp-network-item-head">
            <strong>${esc(n.provider_name)}</strong>
            <span class="pp-network-badge">${esc(n.status)}</span>
          </div>
          <div class="pp-network-muted">${esc(categoryLabel(n.category_primary))} · ${esc(place)} ${esc(n.postal_code || '')}</div>
          ${website ? `<a class="pp-network-muted" href="${esc(website)}" target="_blank" rel="noopener noreferrer">Provider website</a>` : ''}
          ${n.contact?.phone ? `<div class="pp-network-muted">Phone: ${esc(n.contact.phone)}</div>` : ''}
          ${n.nominator_email ? `<div class="pp-network-muted">Nominator: ${esc(n.nominator_email)}</div>` : ''}
          ${n.note ? `<div class="pp-network-muted">Note: ${esc(n.note)}</div>` : ''}
          <div class="pp-network-row">
            <select class="pp-network-select" data-nomination-next-status>
              ${['pending', 'reviewed', 'dismissed', 'converted'].map((value) => `<option value="${value}" ${n.status === value ? 'selected' : ''}>${value}</option>`).join('')}
            </select>
            <input class="pp-network-input" data-nomination-notes placeholder="Ops notes" value="${esc(n.review_notes || '')}" />
          </div>
          <div class="pp-network-actions">
            <button class="pp-network-btn ghost" type="button" data-nomination-save>Save nomination</button>
          </div>
        </article>
      `;
    }).join('')
    : '<p class="pp-network-muted">No nominations in this queue.</p>';

  nominationsEl.querySelectorAll('[data-nomination-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-nomination-id]');
      const id = card?.getAttribute('data-nomination-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Saving nomination review...');
      const payload = {
        status: card.querySelector('[data-nomination-next-status]')?.value || 'pending',
        review_notes: card.querySelector('[data-nomination-notes]')?.value || '',
      };
      const { ok, body } = await api(`/api/network/partners-ops/nominations/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Nomination updated.' : (body?.error || 'Unable to save nomination.'));
      btn.disabled = false;
      if (ok) {
        await refreshNominations();
        await refreshNominationSummary();
      }
    });
  });
}

async function refreshCandidateSummary() {
  if (!candidateSummaryEl) return;
  const params = candidateQuery();
  params.set('status', 'all');
  params.set('limit', '1');
  const { ok, body } = await api(`/api/network/partners-ops/import-candidates/summary?${params.toString()}`);
  if (!ok) {
    candidateSummaryEl.innerHTML = '<span class="pp-network-muted">Candidate summary unavailable.</span>';
    if (candidateBreakdownEl) candidateBreakdownEl.innerHTML = '';
    return;
  }
  const summary = body.summary || {};
  const counts = Object.fromEntries((summary.by_status || []).map((row) => [row.key, Number(row.count || 0)]));
  const readiness = summary.readiness || {};
  candidateSummaryEl.innerHTML = `
    <span class="pp-network-chip">Total: ${Number(summary.total || 0)}</span>
    <span class="pp-network-chip">New: ${counts.new || 0}</span>
    <span class="pp-network-chip">Needs review: ${counts.needs_review || 0}</span>
    <span class="pp-network-chip">Approved: ${counts.approved || 0}</span>
    <span class="pp-network-chip">Promoted: ${counts.promoted || 0}</span>
    <span class="pp-network-chip">Contact ready: ${Number(readiness.with_contact || 0)}</span>
    <span class="pp-network-chip">Promotable basics: ${Number(readiness.promotable || 0)}</span>
  `;
  if (candidateBreakdownEl) {
    const top = (rows, formatter = (v) => v) => (rows || [])
      .slice(0, 4)
      .map((row) => `<span class="pp-network-chip pp-network-chip--clear">${esc(formatter(row.key))}: ${Number(row.count || 0)}</span>`)
      .join('');
    candidateBreakdownEl.innerHTML = [
      top(summary.by_source, sourceLabel),
      top(summary.by_state),
      top(summary.by_category, categoryLabel),
    ].filter(Boolean).join('');
  }
}

function candidateQuery() {
  const params = new URLSearchParams();
  params.set('status', candidateStatusSelect?.value || 'new');
  const source = candidateSourceSelect?.value || '';
  const readiness = candidateReadinessSelect?.value || '';
  const state = candidateStateInput?.value?.trim() || '';
  const q = candidateSearchInput?.value?.trim() || '';
  if (source) params.set('source', source);
  if (readiness) params.set('readiness', readiness);
  if (state) params.set('state', state.toUpperCase());
  if (q) params.set('q', q);
  params.set('limit', '80');
  return params;
}

function selectedCandidateIds() {
  return [...document.querySelectorAll('[data-candidate-select]:checked')]
    .map((input) => input.value)
    .filter(Boolean);
}

function setVisibleCandidateSelection(checked) {
  document.querySelectorAll('[data-candidate-select]').forEach((input) => {
    if (!input.disabled) input.checked = checked;
  });
}

function candidateCard(candidate) {
  const website = safeUrl(candidate.contact?.website_url);
  const sourceUrl = safeUrl(candidate.source_url);
  const place = [candidate.location?.city, candidate.location?.state].filter(Boolean).join(', ');
  const contactText = [
    candidate.contact?.phone ? `Phone: ${candidate.contact.phone}` : '',
    website ? 'Website ready' : '',
  ].filter(Boolean).join(' · ') || 'Contact needs enrichment before promotion';
  const statusOptions = ['new', 'needs_review', 'approved', 'rejected'].map((value) => (
    `<option value="${value}" ${candidate.status === value ? 'selected' : ''}>${candidateStatusLabel(value)}</option>`
  )).join('');
  const promoted = candidate.status === 'promoted';
  return `
    <article class="pp-network-item" data-candidate-id="${esc(candidate.id)}">
      <div class="pp-network-item-head">
        <div>
          <strong>${esc(candidate.name)}</strong>
          ${promoted ? '' : `<label class="pp-network-inline-check"><input type="checkbox" data-candidate-select value="${esc(candidate.id)}" /> Select</label>`}
        </div>
        <span class="pp-network-badge">${esc(candidateStatusLabel(candidate.status))}</span>
      </div>
      <div class="pp-network-muted">${esc(sourceLabel(candidate.source))} · ${esc(categoryLabel(candidate.category_primary))} · ${esc(place || 'Location needed')}</div>
      <div class="pp-network-muted">Confidence: ${Math.round(Number(candidate.confidence_score || 0))}% · ${esc((candidate.confidence_reasons || []).slice(0, 4).join(', ') || 'Needs review')}</div>
      <div class="pp-network-muted">${esc(contactText)}</div>
      ${website ? `<a class="pp-network-muted" href="${esc(website)}" target="_blank" rel="noopener noreferrer">Candidate website</a>` : ''}
      ${sourceUrl ? `<a class="pp-network-muted" href="${esc(sourceUrl)}" target="_blank" rel="noopener noreferrer">Source reference</a>` : ''}
      ${candidate.promoted_listing_id ? `<div class="pp-network-muted">Promoted listing: ${esc(candidate.promoted_listing_id)}</div>` : ''}
      ${promoted ? '<p class="pp-network-muted">This candidate has already been promoted into public listing readiness.</p>' : `
        <div class="pp-network-row">
          <select class="pp-network-select" data-candidate-next-status>${statusOptions}</select>
          <input class="pp-network-input" data-candidate-phone placeholder="Phone" value="${esc(candidate.contact?.phone || '')}" />
        </div>
        <input class="pp-network-input" data-candidate-website placeholder="https://provider.org" value="${esc(candidate.contact?.website_url || '')}" />
        <textarea class="pp-network-textarea pp-network-textarea--sm" data-candidate-summary placeholder="Public listing summary">${esc(candidate.short_description || '')}</textarea>
        <input class="pp-network-input" data-candidate-notes placeholder="Ops notes" value="${esc(candidate.review_notes || '')}" />
        <div class="pp-network-actions">
          <button class="pp-network-btn ghost" type="button" data-candidate-save>Save candidate</button>
          <button class="pp-network-btn" type="button" data-candidate-promote>Promote to listing</button>
        </div>
      `}
    </article>
  `;
}

async function refreshCandidates() {
  if (!candidatesEl) return;
  const { ok, body } = await api(`/api/network/partners-ops/import-candidates?${candidateQuery().toString()}`);
  if (!ok) {
    setStatus(body?.error || 'Unable to load import candidates.');
    return;
  }
  const candidates = body.items || [];
  candidatesEl.innerHTML = candidates.length ? candidates.map(candidateCard).join('') : '<p class="pp-network-muted">No source candidates in this queue.</p>';

  candidatesEl.querySelectorAll('[data-candidate-save]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-candidate-id]');
      const id = card?.getAttribute('data-candidate-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Saving source candidate...');
      const payload = {
        status: card.querySelector('[data-candidate-next-status]')?.value || 'new',
        phone: card.querySelector('[data-candidate-phone]')?.value || '',
        website_url: card.querySelector('[data-candidate-website]')?.value || '',
        short_description: card.querySelector('[data-candidate-summary]')?.value || '',
        review_notes: card.querySelector('[data-candidate-notes]')?.value || '',
      };
      const { ok, body } = await api(`/api/network/partners-ops/import-candidates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Source candidate updated.' : (body?.error || 'Unable to save source candidate.'));
      btn.disabled = false;
      if (ok) {
        await refreshCandidates();
        await refreshCandidateSummary();
      }
    });
  });

  candidatesEl.querySelectorAll('[data-candidate-promote]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('[data-candidate-id]');
      const id = card?.getAttribute('data-candidate-id');
      if (!id) return;
      btn.disabled = true;
      setStatus('Promoting source candidate into listing readiness...');
      const payload = {
        phone: card.querySelector('[data-candidate-phone]')?.value || '',
        website_url: card.querySelector('[data-candidate-website]')?.value || '',
        short_description: card.querySelector('[data-candidate-summary]')?.value || '',
      };
      const { ok, body } = await api(`/api/network/partners-ops/import-candidates/${encodeURIComponent(id)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setStatus(ok ? 'Candidate promoted to an unclaimed Network Listing.' : (body?.error || 'Unable to promote candidate.'));
      btn.disabled = false;
      if (ok) {
        await refreshCandidates();
        await refreshCandidateSummary();
        await refreshListings();
      }
    });
  });
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
      const proofDownloadUrl = safeUrl(c.businessIdentityDocDownloadUrl);
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
          ${proofDownloadUrl ? `<a class="pp-network-muted" href="${esc(proofDownloadUrl)}" target="_blank" rel="noopener noreferrer">Uploaded proof file</a>` : ''}
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
  const publicStatus = listing.status === 'partner'
    ? 'Pawket Verified Partner'
    : listing.status === 'claimed'
      ? 'Owner Claimed'
      : 'Network Listing';
  return `
    <article class="pp-network-item" data-listing-id="${esc(listing.id)}">
      <div class="pp-network-item-head">
        <strong>${esc(listing.name)}</strong>
        <span class="pp-network-badge">${esc(publicStatus)}</span>
      </div>
      <div class="pp-network-muted">${esc(listing.slug)}</div>
      <div class="pp-network-chip-row">${readinessChips(listing)}</div>
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
  await refreshNominations();
  await refreshNominationSummary();
  await refreshPalReviews();
  await refreshPalReviewSummary();
  await refreshCommunityDrafts();
  await refreshCandidates();
  await refreshCandidateSummary();
  await refreshListings();
  setStatus('Pawket Partners Ops data refreshed.');
});

claimStatusSelect?.addEventListener('change', async () => {
  await refreshClaims();
  await refreshClaimSummary();
});

nominationStatusSelect?.addEventListener('change', async () => {
  await refreshNominations();
  await refreshNominationSummary();
});

palReviewStatusSelect?.addEventListener('change', async () => {
  await refreshPalReviews();
  await refreshPalReviewSummary();
});

candidateStatusSelect?.addEventListener('change', async () => {
  await refreshCandidates();
  await refreshCandidateSummary();
});

candidateSourceSelect?.addEventListener('change', async () => {
  await refreshCandidates();
  await refreshCandidateSummary();
});

candidateReadinessSelect?.addEventListener('change', async () => {
  await refreshCandidates();
  await refreshCandidateSummary();
});

document.querySelector('[data-ops-action="candidate-search"]')?.addEventListener('click', async () => {
  await refreshCandidates();
  await refreshCandidateSummary();
});

candidateSearchInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    refreshCandidates();
    refreshCandidateSummary();
  }
});

candidateStateInput?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    refreshCandidates();
    refreshCandidateSummary();
  }
});

document.querySelector('[data-ops-action="candidate-select-visible"]')?.addEventListener('click', () => {
  setVisibleCandidateSelection(true);
});

document.querySelector('[data-ops-action="candidate-clear-selected"]')?.addEventListener('click', () => {
  setVisibleCandidateSelection(false);
});

document.querySelector('[data-ops-action="candidate-bulk-apply"]')?.addEventListener('click', async (event) => {
  const btn = event.currentTarget;
  const ids = selectedCandidateIds();
  if (!ids.length) {
    setStatus('Select at least one source candidate first.');
    return;
  }
  const status = candidateBulkStatusSelect?.value || '';
  const reviewNotes = candidateBulkNotesInput?.value || '';
  const payload = { ids };
  if (status) payload.status = status;
  if (reviewNotes) payload.review_notes = reviewNotes;
  if (!payload.status && !payload.review_notes) {
    setStatus('Choose a bulk status or add a bulk review note.');
    return;
  }
  btn.disabled = true;
  setStatus(`Updating ${ids.length} selected source candidates...`);
  const { ok, body } = await api('/api/network/partners-ops/import-candidates/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  btn.disabled = false;
  if (!ok) {
    setStatus(body?.error || 'Unable to bulk update source candidates.');
    return;
  }
  const missing = Array.isArray(body.missing) && body.missing.length ? ` ${body.missing.length} were no longer available.` : '';
  setStatus(`Updated ${body.updated || 0} selected source candidates.${missing}`);
  if (candidateBulkNotesInput) candidateBulkNotesInput.value = '';
  await refreshCandidates();
  await refreshCandidateSummary();
});

launchImportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  let items;
  try {
    items = JSON.parse(launchImportJson?.value || '[]');
  } catch {
    setStatus('Launch import JSON is invalid.');
    return;
  }
  if (!Array.isArray(items) || !items.length) {
    setStatus('Paste a JSON array with at least one approved listing.');
    return;
  }
  setStatus('Importing approved launch listings...');
  const { ok, body } = await api('/api/network/partners-ops/import-launch-listings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!ok) {
    setStatus(body?.error || 'Unable to import launch listings.');
    return;
  }
  setStatus(`Imported ${body.imported || 0} launch-approved listings.`);
  if (launchImportJson) launchImportJson.value = '';
  await refreshListings();
});

candidateImportForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  let items;
  try {
    items = JSON.parse(candidateImportJson?.value || '[]');
  } catch {
    setStatus('Candidate import JSON is invalid.');
    return;
  }
  if (!Array.isArray(items) || !items.length) {
    setStatus('Paste a JSON array with at least one source candidate.');
    return;
  }
  setStatus('Importing source candidates...');
  const { ok, body } = await api('/api/network/partners-ops/import-candidates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source: candidateImportSource?.value || 'manual', items }),
  });
  if (!ok) {
    setStatus(body?.error || 'Unable to import source candidates.');
    return;
  }
  setStatus(`Imported ${body.imported || 0} source candidates.`);
  if (candidateImportJson) candidateImportJson.value = '';
  await refreshCandidates();
  await refreshCandidateSummary();
});

(async function init() {
  setStatus('Loading Pawket Partners Ops data...');
  const signedIn = await hasSignedInSession().catch(() => false);
  if (!signedIn) {
    renderOpsSigninRequired();
    return;
  }
  await refreshClaims();
  await refreshClaimSummary();
  await refreshNominations();
  await refreshNominationSummary();
  await refreshPalReviews();
  await refreshPalReviewSummary();
  await refreshCommunityDrafts();
  await refreshCandidates();
  await refreshCandidateSummary();
  await refreshListings();
  setStatus('');
})();
