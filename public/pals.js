import { authFetch, getSession, onAuthChange } from './auth.js';

const root = document.querySelector('[data-pals-app]');
const urlState = readUrlState();
let urlStateApplied = false;
let requestedCertificateOpened = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function palStatusLabel(pal = {}) {
  if (pal.consentState === 'review_required') return 'Sharing requested';
  if (pal.consentState === 'pending') return 'Being checked';
  if (pal.consentState === 'revoked') return 'Sharing paused';
  if (pal.originType === 'story_submission' && pal.consentState === 'granted') return 'Ready to share';
  if (pal.privacyState === 'private') return 'Private';
  return String(pal.privacyState || 'Private').replace(/_/g, ' ');
}

function palClassLabel(value = '') {
  return String(value || 'honorary')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = !!hidden;
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search || '');
  return {
    petId: String(params.get('petId') || params.get('pet') || '').trim(),
    journalEntryId: String(params.get('journalEntryId') || params.get('journal') || params.get('memoryId') || '').trim(),
    heartCode: String(params.get('heartCode') || params.get('heartcode') || '').trim().toUpperCase(),
    source: String(params.get('source') || '').trim(),
  };
}

function syncCertificateUrl(heartCode, source = 'certificate-opened') {
  const code = String(heartCode || '').trim().toUpperCase();
  if (!code) return;
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('heartCode', code);
  url.searchParams.set('source', source);
  url.hash = 'honorary-pal-certificates';
  window.history.replaceState({ pawketPalHeartCode: code }, '', url);
  urlState.heartCode = code;
  urlState.source = source;
  requestedCertificateOpened = true;
}

function findPet(pets = [], petId = '') {
  return pets.find((pet) => String(pet?.id || '') === String(petId || '')) || null;
}

function journalTypeLabel(value = '') {
  const labels = {
    note: 'Daily note',
    story: 'Story moment',
    milestone: 'Milestone',
    wellness: 'Wellness',
    vet: 'Vet visit',
    medication: 'Medication',
    meal: 'Meal',
    walk: 'Walk',
    training: 'Training',
    grooming: 'Grooming',
    play: 'Play',
    behavior: 'Behavior',
    weight: 'Weight',
    allergy: 'Allergy',
    rescue: 'Rescue/adoption',
    memorial: 'Memorial',
    charm: 'CHARM note',
    'pawket-pal': 'Pawket Pal',
  };
  return labels[String(value || '').trim().toLowerCase()] || 'Journal memory';
}

function compactText(value = '', max = 420) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function setStatus(message = '', tone = 'info') {
  const el = root?.querySelector('[data-pal-status]');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', tone === 'error');
  el.classList.toggle('is-success', tone === 'success');
}

function setStoryStatus(message = '', tone = 'info') {
  const el = root?.querySelector('[data-pal-story-status]');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('is-error', tone === 'error');
  el.classList.toggle('is-success', tone === 'success');
}

function renderCertificate(pal) {
  const el = root?.querySelector('[data-pal-certificate]');
  if (!el) return;

  if (!pal) {
    el.innerHTML = `
      <div class="pp-pals-certificate-empty">
        <i class="bi bi-stars"></i>
        <h3>Your next private Pal will appear here.</h3>
        <p>Saved Pals remain visible below when you are signed in.</p>
      </div>
    `;
    return;
  }

  const created = formatDate(pal.createdAt);
  const heartCode = escapeHtml(pal.heartCode);
  el.innerHTML = `
    <div class="pp-pals-certificate-live">
      <div class="pp-pals-certificate-icon"><i class="bi bi-patch-check"></i></div>
      <span class="pp-story-meta">${escapeHtml(palClassLabel(pal.palClass))}</span>
      <h3>${escapeHtml(pal.name)}</h3>
      <div class="pp-pals-heartcode"><i class="bi bi-heart"></i><span>${heartCode}</span></div>
      <div class="pp-pals-certificate-meta">
        <span>${escapeHtml(palStatusLabel(pal))}</span>
        ${created ? `<span>Issued ${escapeHtml(created)}</span>` : ''}
      </div>
      <p>This Pal is private to the signed-in account. Public stories, Community Pals, and CHARM connections happen only when sharing is chosen and checked.</p>
      <div class="pp-pals-certificate-actions">
        <button type="button" class="pp-ghost-btn" data-pal-copy="${heartCode}">
          <i class="bi bi-clipboard"></i>
          Copy Pal Code
        </button>
        <a class="pp-ghost-btn" href="/account.html#account-pawket-pals">
          <i class="bi bi-person-heart"></i>
          View in Account
        </a>
        <a class="pp-ghost-btn" href="#honorary-pal-certificates">
          <i class="bi bi-patch-plus"></i>
          Create Another
        </a>
        <span class="pp-pals-copy-note" data-pal-copy-note></span>
      </div>
    </div>
  `;
}

function renderPalsList(pals = [], signedIn = false) {
  const list = root?.querySelector('[data-pal-list]');
  const refresh = root?.querySelector('[data-pal-refresh]');
  if (!list) return;

  setHidden(refresh, !signedIn);

  if (!signedIn) {
    list.innerHTML = '<div class="pp-pals-list-note">Sign in to see private Pals connected to this account.</div>';
    return;
  }

  if (!pals.length) {
    list.innerHTML = '<div class="pp-pals-list-note">No private Pals yet.</div>';
    return;
  }

  list.innerHTML = pals.map((pal) => {
    const created = formatDate(pal.createdAt);
    return `
      <article class="pp-pals-mini-card">
        <span class="pp-pals-card-chip">${escapeHtml(palStatusLabel(pal))}</span>
        <h4>${escapeHtml(pal.name)}</h4>
        <code>${escapeHtml(pal.heartCode)}</code>
        <div class="pp-pals-card-meta">
          <span>${escapeHtml(palClassLabel(pal.palClass))}</span>
          ${created ? `<span>${escapeHtml(created)}</span>` : ''}
        </div>
        <button type="button" class="pp-ghost-btn" data-pal-open="${escapeHtml(pal.heartCode)}">Open Pal</button>
      </article>
    `;
  }).join('');
}

function fillPetSelect(pets = []) {
  const options = ['<option value="">No specific profile</option>'];
  pets.forEach((pet) => {
    if (!pet?.id || !pet?.name) return;
    const detail = [pet.species, pet.breed].filter(Boolean).join(' - ');
    const label = detail ? `${pet.name} (${detail})` : pet.name;
    options.push(`<option value="${escapeHtml(pet.id)}">${escapeHtml(label)}</option>`);
  });
  root?.querySelectorAll('[data-pal-pet-select]').forEach((select) => {
    const current = select.value;
    select.innerHTML = options.join('');
    if (current && pets.some((pet) => String(pet.id) === current)) select.value = current;
  });
}

async function parseJson(res) {
  try { return await res.json(); } catch { return {}; }
}

async function loadPets() {
  const res = await authFetch('/api/pets');
  if (!res.ok) return [];
  const data = await parseJson(res);
  return Array.isArray(data?.pets) ? data.pets : Array.isArray(data) ? data : [];
}

async function loadJournalEntry(petId, journalEntryId) {
  if (!petId || !journalEntryId) return null;
  const res = await authFetch(`/api/pets/${encodeURIComponent(petId)}/journal/${encodeURIComponent(journalEntryId)}`);
  if (!res.ok) return null;
  const data = await parseJson(res);
  return data?.entry || data?.journalEntry || data || null;
}

async function loadPals() {
  const res = await authFetch('/api/pals?limit=24');
  if (!res.ok) return [];
  const data = await parseJson(res);
  return Array.isArray(data?.pals) ? data.pals : [];
}

async function applyUrlStateToForm(pets = []) {
  if (!root || urlStateApplied) return;
  if (!urlState.petId && !urlState.journalEntryId) return;

  const form = root.querySelector('[data-pal-form]');
  if (!form) return;

  const pet = findPet(pets, urlState.petId);
  const nameEl = form.querySelector('[name="name"]');
  const petSelect = root.querySelector('[data-pal-pet-select]');
  const journalInput = root.querySelector('[data-pal-journal-entry-id]');
  const originEl = form.querySelector('[name="originSummary"]');

  if (petSelect && pet?.id) petSelect.value = String(pet.id);
  if (journalInput) journalInput.value = urlState.journalEntryId || '';

  let journalEntry = null;
  if (pet?.id && urlState.journalEntryId) {
    journalEntry = await loadJournalEntry(pet.id, urlState.journalEntryId);
  }

  if (journalEntry?.id) {
    const title = compactText(journalEntry.title || '');
    const note = compactText(journalEntry.text || journalEntry.note || '', 520);
    const type = journalTypeLabel(journalEntry.entryType || journalEntry.entry_type || '');
    const petName = pet?.name || 'this pet';
    const isCore = journalEntry.highlighted === true || journalEntry.coreMemory === true;

    if (nameEl && !nameEl.value.trim()) {
      nameEl.value = `${petName}'s ${isCore ? 'Favorite Memory' : 'Memory'} Pal`;
    }
    if (originEl && !originEl.value.trim()) {
      originEl.value = compactText([
        `Private Honorary Pal connected to ${petName}'s ${isCore ? 'favorite memory' : type.toLowerCase()}.`,
        title ? `Title: ${title}.` : '',
        note ? `Memory note: ${note}` : '',
      ].filter(Boolean).join(' '), 1200);
    }
    setStatus('Prefilled from the selected private journal memory. Check it before creating the Pal.', 'success');
  } else if (pet?.id) {
    const petName = pet.name || 'this pet';
    if (nameEl && !nameEl.value.trim()) nameEl.value = `${petName}'s Honorary Pal`;
    if (originEl && !originEl.value.trim()) {
      originEl.value = `Private Honorary Pal connected to ${petName}'s Pet Pawket profile.`;
    }
    setStatus('Prefilled from the selected private pet profile. Check it before creating the Pal.', 'success');
  } else if (urlState.petId) {
    setStatus('That pet profile could not be found for this signed-in account.', 'error');
  }

  urlStateApplied = true;
}

async function refreshPrivatePals({ focusLatest = false } = {}) {
  const list = root?.querySelector('[data-pal-list]');
  if (list) list.innerHTML = '<div class="pp-pals-list-note">Loading private Pals...</div>';

  const [pets, pals] = await Promise.all([loadPets(), loadPals()]);
  fillPetSelect(pets);
  await applyUrlStateToForm(pets);
  renderPalsList(pals, true);
  if (focusLatest && pals[0]) renderCertificate(pals[0]);
  return pals;
}

async function openRequestedCertificate() {
  if (!urlState.heartCode || requestedCertificateOpened) return;
  requestedCertificateOpened = true;
  await openCertificate(urlState.heartCode, { syncUrl: false });
}

async function setAuthMode() {
  if (!root) return;
  const session = await getSession({ force: true });
  const signedIn = !!session?.signedIn;
  root.querySelectorAll('[data-pal-auth="signed-out"]').forEach((el) => setHidden(el, signedIn));
  root.querySelectorAll('[data-pal-auth="signed-in"]').forEach((el) => setHidden(el, !signedIn));

  if (!signedIn) {
    renderCertificate(null);
    renderPalsList([], false);
    return;
  }

  const label = root.querySelector('[data-pal-session-label]');
  if (label) label.textContent = 'Private account record';
  setStatus('');
  await refreshPrivatePals();
  await openRequestedCertificate();
}

function buildPayload(form) {
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const petId = String(data.get('petId') || '').trim();
  const journalEntryId = String(data.get('journalEntryId') || '').trim();
  const originSummary = String(data.get('originSummary') || '').trim();
  const allowReview = !!form.querySelector('[data-pal-review-toggle]')?.checked;
  const publicStorySummary = String(data.get('publicStorySummary') || '').trim();

  return {
    name,
    ...(petId ? { petId } : {}),
    ...(journalEntryId ? { journalEntryId } : {}),
    ...(originSummary ? { originSummary } : {}),
    ...(allowReview && publicStorySummary ? { publicStorySummary } : {}),
    consent: {
      allowPrivatePal: true,
      allowPublicStory: allowReview,
      allowCommunityPal: allowReview,
      allowCharmConnection: false,
      allowCherishConnection: false,
      allowMarketingUse: false,
      allowTransfer: false,
    },
  };
}

function buildStorySubmissionPayload(form) {
  const data = new FormData(form);
  const storyTitle = String(data.get('storyTitle') || '').trim();
  const storyType = String(data.get('storyType') || 'other').trim();
  const petId = String(data.get('petId') || '').trim();
  const storyText = String(data.get('storyText') || '').trim();
  const publicStorySummary = String(data.get('publicStorySummary') || '').trim();
  const allowPublicStory = !!form.querySelector('[name="allowPublicStory"]')?.checked;
  const allowCommunityPal = !!form.querySelector('[name="allowCommunityPal"]')?.checked;

  return {
    storyTitle,
    storyType,
    ...(petId ? { petId } : {}),
    storyText,
    publicStorySummary,
    consent: {
      allowPrivatePal: true,
      allowPublicStory,
      allowCommunityPal,
      allowCharmConnection: !!form.querySelector('[name="allowCharmConnection"]')?.checked,
      allowCherishConnection: !!form.querySelector('[name="allowCherishConnection"]')?.checked,
      allowMarketingUse: false,
      allowTransfer: false,
    },
  };
}

async function createHonoraryPal(form) {
  const submit = form.querySelector('button[type="submit"]');
  const payload = buildPayload(form);
  if (!payload.name) {
    setStatus('Add a Pal name before creating it.', 'error');
    return;
  }

  submit?.setAttribute('disabled', 'disabled');
  setStatus('Creating private Pal...');
  try {
    const res = await authFetch('/api/pals/honorary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Pal request failed (${res.status})`);
    }

    form.reset();
    const summary = root.querySelector('[data-pal-review-summary]');
    setHidden(summary, true);
    renderCertificate(data.pal);
    syncCertificateUrl(data.pal?.heartCode, 'certificate-created');
    await refreshPrivatePals();
    setStatus(
      data.pal?.consentState === 'review_required'
        ? 'Private Pal created. We will check the story before anything is shared.'
        : 'Private Pal created.',
      'success'
    );
  } catch (err) {
    setStatus(err?.message || 'Pal request failed.', 'error');
  } finally {
    submit?.removeAttribute('disabled');
  }
}

async function submitStoryForReview(form) {
  const submit = form.querySelector('button[type="submit"]');
  const payload = buildStorySubmissionPayload(form);
  if (!payload.storyTitle) {
    setStoryStatus('Add a story title before sending it.', 'error');
    return;
  }
  if (!payload.storyText || payload.storyText.length < 20) {
    setStoryStatus('Add a private story note with at least 20 characters.', 'error');
    return;
  }
  if (!payload.publicStorySummary || payload.publicStorySummary.length < 20) {
    setStoryStatus('Add a shareable summary with at least 20 characters.', 'error');
    return;
  }
  if (!payload.consent.allowPublicStory && !payload.consent.allowCommunityPal) {
    setStoryStatus('Choose whether this can be considered for a shared story or Community Pal.', 'error');
    return;
  }

  submit?.setAttribute('disabled', 'disabled');
  setStoryStatus('Sending story...');
  try {
    const res = await authFetch('/api/pals/story-submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await parseJson(res);

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || `Story submission failed (${res.status})`);
    }

    form.reset();
    const publicToggle = form.querySelector('[name="allowPublicStory"]');
    const communityToggle = form.querySelector('[name="allowCommunityPal"]');
    if (publicToggle) publicToggle.checked = false;
    if (communityToggle) communityToggle.checked = false;
    renderCertificate(data.pal);
    syncCertificateUrl(data.pal?.heartCode, 'story-submission');
    await refreshPrivatePals();
    setStoryStatus('Story sent. The Pal remains private unless sharing is approved later.', 'success');
  } catch (err) {
    setStoryStatus(err?.message || 'Story submission failed.', 'error');
  } finally {
    submit?.removeAttribute('disabled');
  }
}

async function openCertificate(heartCode, { syncUrl = true } = {}) {
  const res = await authFetch(`/api/pals/${encodeURIComponent(heartCode)}`);
  const data = await parseJson(res);
  if (!res.ok || !data?.pal) {
    setStatus(data?.error || 'Could not open that Pal.', 'error');
    return;
  }
  renderCertificate(data.pal);
  if (syncUrl) syncCertificateUrl(data.pal.heartCode, 'certificate-opened');
  setStatus('');
}

async function copyHeartCode(code, noteEl) {
  try {
    await navigator.clipboard.writeText(code);
    if (noteEl) noteEl.textContent = 'Copied.';
  } catch {
    if (noteEl) noteEl.textContent = 'Copy unavailable.';
  }
}

function targetIsVisible(target) {
  if (!target) return false;
  return !!(target.offsetWidth || target.offsetHeight || target.getClientRects().length);
}

function scrollToPalFallback(hash = '') {
  if (!['#private-pal-certificate-form', '#pal-story-intake'].includes(hash)) return false;
  const target = document.querySelector(hash);
  if (targetIsVisible(target)) return false;
  const fallback = document.querySelector('#honorary-pal-certificates');
  if (!fallback) return false;
  fallback.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', hash);
  return true;
}

function wireEvents() {
  if (!root) return;

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href="#private-pal-certificate-form"], a[href="#pal-story-intake"]');
    if (!link) return;
    if (scrollToPalFallback(link.getAttribute('href') || '')) event.preventDefault();
  });

  root.addEventListener('change', (event) => {
    const toggle = event.target.closest('[data-pal-review-toggle]');
    if (!toggle) return;
    setHidden(root.querySelector('[data-pal-review-summary]'), !toggle.checked);
  });

  root.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-pal-form]');
    const storyForm = event.target.closest('[data-pal-story-form]');
    if (form) {
      event.preventDefault();
      createHonoraryPal(form);
      return;
    }
    if (storyForm) {
      event.preventDefault();
      submitStoryForReview(storyForm);
    }
  });

  root.addEventListener('click', (event) => {
    const refresh = event.target.closest('[data-pal-refresh]');
    if (refresh) {
      event.preventDefault();
      refreshPrivatePals({ focusLatest: true });
      return;
    }

    const open = event.target.closest('[data-pal-open]');
    if (open) {
      event.preventDefault();
      openCertificate(open.getAttribute('data-pal-open'));
      return;
    }

    const copy = event.target.closest('[data-pal-copy]');
    if (copy) {
      event.preventDefault();
      copyHeartCode(copy.getAttribute('data-pal-copy'), root.querySelector('[data-pal-copy-note]'));
    }
  });

  onAuthChange(() => setAuthMode().catch((err) => {
    console.warn('[pals] auth refresh failed', err);
  }));
  document.addEventListener('auth:login', () => setAuthMode().catch(() => {}));
}

if (root) {
  wireEvents();
  setAuthMode().catch((err) => {
    console.warn('[pals] init failed', err);
    setStatus('Pawket Pals could not load right now.', 'error');
  });
}
