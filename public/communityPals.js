const panel = document.querySelector('[data-community-pal-preview-panel]');
const grid = document.querySelector('[data-community-pal-previews]');
const detailModal = document.querySelector('[data-community-pal-detail-modal]');
const detailContent = document.querySelector('[data-community-pal-detail-content]');
const detailClose = document.querySelector('[data-community-pal-detail-close]');
let detailPreviousFocus = null;

if (detailModal && detailModal.parentElement !== document.body) {
  document.body.appendChild(detailModal);
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function compact(value, fallback = '') {
  return String(value || fallback || '').trim().replace(/\s+/g, ' ');
}

function traitChips(preview) {
  const traits = preview?.traits || {};
  return [
    traits.primaryTrait ? `Trait: ${traits.primaryTrait}` : '',
    traits.kindnessAffinity ? `Kindness: ${traits.kindnessAffinity}` : '',
    traits.questAbility ? `Talent: ${traits.questAbility}` : '',
  ].filter(Boolean);
}

function previewStateLabel(preview) {
  return preview?.previewState === 'public_preview_approved'
    ? 'Ready to share'
    : 'Private preview';
}

function isPublicPreviewApproved(preview) {
  return preview?.previewState === 'public_preview_approved'
    || preview?.boundaries?.publicPreviewApproved === true;
}

function detailButton(preview) {
  if (!isPublicPreviewApproved(preview) || !preview.heartCode) {
    return '<span class="pp-community-pal-preview-note">More details open when this Pal is ready to share.</span>';
  }
  return `
    <button class="pp-community-pal-preview-open" type="button" data-community-pal-open="${esc(preview.heartCode)}">
      Open preview
    </button>
  `;
}

function previewCard(preview) {
  const chips = traitChips(preview);
  const summary = compact(preview.publicStorySummary, 'A Community Pal preview is ready when the shared story details are clear.');
  return `
    <article class="pp-community-pal-preview-card">
      <div class="pp-community-pal-preview-art" aria-hidden="true">
        <i class="bi bi-stars"></i>
        </div>
        <div class="pp-community-pal-preview-body">
          <div class="pp-community-pal-preview-topline">
          <span>${esc(preview.inspiredBy || 'Shared story')}</span>
          <code>${esc(preview.heartCode ? 'Pal preview' : '')}</code>
        </div>
        <strong>${esc(preview.name || 'Community Pawket Pal')}</strong>
        <p>${esc(summary)}</p>
        <div class="pp-community-slot-tags">
          <span>${esc(previewStateLabel(preview))}</span>
          ${chips.map((chip) => `<span>${esc(chip)}</span>`).join('')}
          <span>Private details hidden</span>
          <span>Not for sale</span>
        </div>
        ${detailButton(preview)}
      </div>
    </article>
  `;
}

function detailTraitMarkup(items = []) {
  return items.filter((item) => item?.value).map((item) => `
    <div class="pp-community-pal-detail-stat">
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value)}</strong>
    </div>
  `).join('');
}

function detailListMarkup(items = []) {
  return items.map((item) => `
    <li>
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value)}</strong>
    </li>
  `).join('');
}

function detailHookMarkup(items = []) {
  return items.map((item) => `
    <article>
      <span>${esc(item.status || 'Planned')}</span>
      <strong>${esc(item.label)}</strong>
      <p>${esc(item.body)}</p>
    </article>
  `).join('');
}

function renderDetail(preview) {
  const sections = preview?.detailSections || {};
  const identity = sections.identity || {};
  const story = sections.story || {};
  const traits = Array.isArray(sections.traits) ? sections.traits : [];
  const safeguards = Array.isArray(sections.safeguards) ? sections.safeguards : [];
  const hooks = Array.isArray(sections.futureHooks) ? sections.futureHooks : [];
  const summary = compact(story.summary || preview?.publicStorySummary, 'This Community Pal is ready to share with private details kept out.');
  return `
    <div class="pp-community-pal-detail-hero">
      <div class="pp-community-pal-detail-mark" aria-hidden="true"><i class="bi bi-stars"></i></div>
      <div>
        <span class="pp-kicker">${esc(identity.publicStatus || previewStateLabel(preview))}</span>
        <h3 id="community-pal-detail-title">${esc(preview?.name || 'Community Pawket Pal')}</h3>
        <code>${esc(identity.heartCode || preview?.heartCode ? 'Pal preview' : '')}</code>
      </div>
    </div>
    <div class="pp-community-pal-detail-summary">
      <span>${esc(story.inspiredBy || preview?.inspiredBy || 'Shared story')}</span>
      <p>${esc(summary)}</p>
      <small>${esc(story.privacyNote || 'Private story details stay private.')}</small>
    </div>
    <div class="pp-community-pal-detail-stats">
      ${detailTraitMarkup(traits)}
    </div>
    <section class="pp-community-pal-detail-section">
      <h4>What stays private</h4>
      <ul class="pp-community-pal-detail-list">
        ${detailListMarkup(safeguards)}
      </ul>
    </section>
    <section class="pp-community-pal-detail-section">
      <h4>Coming later</h4>
      <div class="pp-community-pal-detail-hooks">
        ${detailHookMarkup(hooks)}
      </div>
    </section>
  `;
}

function closeDetailModal() {
  if (!detailModal || !detailContent) return;
  detailModal.hidden = true;
  document.body.classList.remove('pp-community-pal-modal-open');
  detailContent.innerHTML = '<div class="pp-community-pal-detail-loading">Loading Community Pal...</div>';
  if (detailPreviousFocus && typeof detailPreviousFocus.focus === 'function') {
    detailPreviousFocus.focus();
  }
}

async function openDetailModal(heartCode) {
  if (!detailModal || !detailContent || !heartCode) return;
  detailPreviousFocus = document.activeElement;
  detailModal.hidden = false;
  document.body.classList.add('pp-community-pal-modal-open');
  detailContent.innerHTML = '<div class="pp-community-pal-detail-loading">Loading Community Pal...</div>';
  detailClose?.focus();
  try {
    const res = await fetch(`/api/pals/community-previews/${encodeURIComponent(heartCode)}`, { credentials: 'omit' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false || !data?.preview) {
      detailContent.innerHTML = '<div class="pp-community-pal-detail-loading">This Community Pal is not ready to share yet.</div>';
      return;
    }
    detailContent.innerHTML = renderDetail(data.preview);
    const url = new URL(window.location.href);
    url.hash = `pal-${data.preview.heartCode}`;
    window.history.replaceState({ communityPalHeartCode: data.preview.heartCode }, '', url);
  } catch (err) {
    console.warn('[community-pals] detail load failed', err);
    detailContent.innerHTML = '<div class="pp-community-pal-detail-loading">Community Pal could not load.</div>';
  }
}

function bindPreviewButtons() {
  grid?.querySelectorAll('[data-community-pal-open]').forEach((btn) => {
    btn.addEventListener('click', () => openDetailModal(btn.getAttribute('data-community-pal-open')));
  });
}

function initialHeartCodeFromHash() {
  const raw = decodeURIComponent(window.location.hash || '').replace(/^#pal-/i, '').trim();
  return raw.startsWith('PAL-') ? raw : '';
}

async function loadCommunityPalPreviews() {
  if (!panel || !grid) return;
  try {
    const res = await fetch('/api/pals/community-previews?limit=6', { credentials: 'omit' });
    const data = await res.json().catch(() => ({}));
    const previews = Array.isArray(data?.previews) ? data.previews : [];
    if (!res.ok || data?.ok === false || !previews.length) {
      panel.hidden = true;
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = previews.map(previewCard).join('');
    panel.hidden = false;
    bindPreviewButtons();
    const initialHeartCode = initialHeartCodeFromHash();
    if (initialHeartCode) openDetailModal(initialHeartCode);
  } catch (err) {
    console.warn('[community-pals] preview load failed', err);
    panel.hidden = true;
    grid.innerHTML = '';
  }
}

detailClose?.addEventListener('click', closeDetailModal);
detailModal?.addEventListener('click', (event) => {
  if (event.target === detailModal) closeDetailModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && detailModal && !detailModal.hidden) closeDetailModal();
});

loadCommunityPalPreviews();
