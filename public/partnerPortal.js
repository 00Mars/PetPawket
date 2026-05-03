// public/partnerPortal.js
import { getSession } from './auth.js';

const listEl = document.querySelector('[data-owner-listings]');
const statusEl = document.querySelector('[data-owner-status]');

const profileForm = document.querySelector('[data-owner-profile-form]');
const servicesForm = document.querySelector('[data-owner-services-form]');
const faqsForm = document.querySelector('[data-owner-faqs-form]');
const offersForm = document.querySelector('[data-owner-offers-form]');
const integrationForm = document.querySelector('[data-owner-integration-form]');
const servicesRowsEl = document.querySelector('[data-owner-services-rows]');
const faqsRowsEl = document.querySelector('[data-owner-faqs-rows]');
const offersRowsEl = document.querySelector('[data-owner-offers-rows]');
const addServiceBtn = document.querySelector('[data-owner-add-service]');
const addFaqBtn = document.querySelector('[data-owner-add-faq]');
const addOfferBtn = document.querySelector('[data-owner-add-offer]');

let selectedId = null;
let cache = [];
const ROW_LIMITS = {
  service: 50,
  faq: 40,
  offer: 30,
};

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg || '';
}

function esc(v) {
  return String(v || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function api(url, options = {}) {
  const needsOwnerAuth = String(url || '').startsWith('/api/network/owner/');
  if (needsOwnerAuth) {
    const session = await getSession();
    if (!session?.signedIn) {
      return {
        ok: false,
        status: 401,
        body: { error: 'Sign in required for Partner Portal.' },
        authSkipped: true,
      };
    }
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok && body?.ok, status: res.status, body };
}

function renderServiceRow(row = {}) {
  const name = esc(row.name || '');
  const priceFrom = esc(row.price_from ?? row.priceFrom ?? '');
  const priceTo = esc(row.price_to ?? row.priceTo ?? '');
  const notes = esc(row.notes || '');
  return `
    <article class="pp-network-item pp-network-row-editor" data-owner-row="service">
      <div class="pp-network-row pp-network-row--triple">
        <input class="pp-network-input" data-field="name" placeholder="Service name" value="${name}" />
        <input class="pp-network-input" data-field="price_from" type="number" min="0" step="0.01" placeholder="Price from" value="${priceFrom}" />
        <input class="pp-network-input" data-field="price_to" type="number" min="0" step="0.01" placeholder="Price to" value="${priceTo}" />
      </div>
      <textarea class="pp-network-textarea pp-network-textarea--sm" data-field="notes" placeholder="Notes (optional)">${notes}</textarea>
      <div class="pp-network-actions">
        <button class="pp-network-btn ghost pp-network-btn--sm" type="button" data-owner-remove-row>Remove</button>
      </div>
    </article>
  `;
}

function renderFaqRow(row = {}) {
  const question = esc(row.question || '');
  const answer = esc(row.answer || '');
  return `
    <article class="pp-network-item pp-network-row-editor" data-owner-row="faq">
      <input class="pp-network-input" data-field="question" placeholder="Question" value="${question}" />
      <textarea class="pp-network-textarea pp-network-textarea--sm" data-field="answer" placeholder="Answer">${answer}</textarea>
      <div class="pp-network-actions">
        <button class="pp-network-btn ghost pp-network-btn--sm" type="button" data-owner-remove-row>Remove</button>
      </div>
    </article>
  `;
}

function renderOfferRow(row = {}) {
  const title = esc(row.title || '');
  const code = esc(row.code || '');
  const details = esc(row.details || '');
  const expiresAt = row.expires_at || row.expiresAt;
  const expiresDate = esc(expiresAt ? String(expiresAt).slice(0, 10) : '');
  const isActive = row.is_active !== false && row.isActive !== false;
  return `
    <article class="pp-network-item pp-network-row-editor" data-owner-row="offer">
      <div class="pp-network-row pp-network-row--triple">
        <input class="pp-network-input" data-field="title" placeholder="Offer title" value="${title}" />
        <input class="pp-network-input" data-field="code" placeholder="Code (optional)" value="${code}" />
        <input class="pp-network-input" data-field="expires_at" type="date" value="${expiresDate}" />
      </div>
      <textarea class="pp-network-textarea pp-network-textarea--sm" data-field="details" placeholder="Offer details (optional)">${details}</textarea>
      <label class="pp-network-inline-check"><input type="checkbox" data-field="is_active" ${isActive ? 'checked' : ''} /> Active offer</label>
      <div class="pp-network-actions">
        <button class="pp-network-btn ghost pp-network-btn--sm" type="button" data-owner-remove-row>Remove</button>
      </div>
    </article>
  `;
}

function setRows(container, rows, renderer) {
  if (!container) return;
  const safeRows = Array.isArray(rows) && rows.length ? rows : [{}];
  container.innerHTML = safeRows.map((row) => renderer(row)).join('');
  updateRowEditorControls();
}

function appendRow(container, renderer, row = {}) {
  if (!container) return;
  container.insertAdjacentHTML('beforeend', renderer(row));
  updateRowEditorControls();
}

function wireRows(container, rowType, appendBlankRow) {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-owner-remove-row]');
    if (!removeBtn) return;
    const row = removeBtn.closest(`[data-owner-row="${rowType}"]`);
    if (!row) return;
    row.remove();
    if (!container.querySelector(`[data-owner-row="${rowType}"]`)) {
      appendBlankRow();
      return;
    }
    updateRowEditorControls();
  });
}

function rowCount(container, rowType) {
  return container?.querySelectorAll(`[data-owner-row="${rowType}"]`)?.length || 0;
}

function updateRowEditorControls() {
  if (addServiceBtn) addServiceBtn.disabled = rowCount(servicesRowsEl, 'service') >= ROW_LIMITS.service;
  if (addFaqBtn) addFaqBtn.disabled = rowCount(faqsRowsEl, 'faq') >= ROW_LIMITS.faq;
  if (addOfferBtn) addOfferBtn.disabled = rowCount(offersRowsEl, 'offer') >= ROW_LIMITS.offer;
}

function asOptionalNumber(raw, label) {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

function collectServices() {
  const rows = servicesRowsEl?.querySelectorAll('[data-owner-row="service"]') || [];
  const services = [];
  rows.forEach((row, index) => {
    const name = row.querySelector('[data-field="name"]')?.value?.trim() || '';
    const priceFromRaw = row.querySelector('[data-field="price_from"]')?.value || '';
    const priceToRaw = row.querySelector('[data-field="price_to"]')?.value || '';
    const notes = row.querySelector('[data-field="notes"]')?.value?.trim() || '';
    const hasAny = !!(name || priceFromRaw || priceToRaw || notes);
    if (!hasAny) return;
    if (!name) throw new Error(`Service row ${index + 1}: name is required.`);
    const priceFrom = asOptionalNumber(priceFromRaw, `Service row ${index + 1} price from`);
    const priceTo = asOptionalNumber(priceToRaw, `Service row ${index + 1} price to`);
    if (priceFrom != null && priceTo != null && priceTo < priceFrom) {
      throw new Error(`Service row ${index + 1}: price to cannot be lower than price from.`);
    }
    services.push({
      name,
      price_from: priceFrom,
      price_to: priceTo,
      notes: notes || null,
    });
  });
  return services;
}

function collectFaqs() {
  const rows = faqsRowsEl?.querySelectorAll('[data-owner-row="faq"]') || [];
  const faqs = [];
  rows.forEach((row, index) => {
    const question = row.querySelector('[data-field="question"]')?.value?.trim() || '';
    const answer = row.querySelector('[data-field="answer"]')?.value?.trim() || '';
    const hasAny = !!(question || answer);
    if (!hasAny) return;
    if (!question || !answer) {
      throw new Error(`FAQ row ${index + 1}: both question and answer are required.`);
    }
    faqs.push({ question, answer });
  });
  return faqs;
}

function collectOffers() {
  const rows = offersRowsEl?.querySelectorAll('[data-owner-row="offer"]') || [];
  const offers = [];
  rows.forEach((row, index) => {
    const title = row.querySelector('[data-field="title"]')?.value?.trim() || '';
    const code = row.querySelector('[data-field="code"]')?.value?.trim() || '';
    const details = row.querySelector('[data-field="details"]')?.value?.trim() || '';
    const expiresAt = row.querySelector('[data-field="expires_at"]')?.value || '';
    const isActive = !!row.querySelector('[data-field="is_active"]')?.checked;
    const hasAny = !!(title || code || details || expiresAt);
    if (!hasAny) return;
    if (!title) throw new Error(`Offer row ${index + 1}: title is required.`);
    offers.push({
      title,
      code: code || null,
      details: details || null,
      expires_at: expiresAt || null,
      is_active: isActive,
    });
  });
  return offers;
}

function fillProfile(listing) {
  if (!profileForm || !listing) return;
  profileForm.name.value = listing.name || '';
  profileForm.city.value = listing.location?.city || '';
  profileForm.state.value = listing.location?.state || '';
  profileForm.postal_code.value = listing.location?.postal_code || '';
  profileForm.phone.value = listing.contact?.phone || '';
  profileForm.website_url.value = listing.contact?.website_url || '';
  profileForm.short_description.value = listing.short_description || '';

  setRows(servicesRowsEl, listing.services || [], renderServiceRow);
  setRows(faqsRowsEl, listing.faqs || [], renderFaqRow);
  setRows(offersRowsEl, listing.offers || [], renderOfferRow);

  integrationForm.portal_mode.value = listing.portal_mode || 'internal_profile';
  integrationForm.lead_destination.value = listing.lead_destination || 'email';
  integrationForm.external_site_url.value = listing.external_site_url || '';
  integrationForm.lead_email.value = listing.lead_email || '';
  integrationForm.lead_webhook_url.value = listing.lead_webhook_url || '';
  integrationForm.enable_lead_form.checked = !!listing.features?.enable_lead_form;
  integrationForm.enable_offers.checked = !!listing.features?.enable_offers;
}

function renderList() {
  if (!listEl) return;
  if (!cache.length) {
    listEl.innerHTML = '<p class="pp-network-muted">No managed listings yet. Claim a listing from Pawket Network first.</p>';
    return;
  }

  listEl.innerHTML = cache.map((item) => `
    <button type="button" class="pp-network-item ${selectedId === item.id ? 'is-selected' : ''}" data-owner-id="${esc(item.id)}">
      <div class="pp-network-item-head">
        <strong>${esc(item.name)}</strong>
        <span class="pp-network-badge">${esc(item.status)}</span>
      </div>
      <span class="pp-network-muted">${esc(item.location?.city || '')}${item.location?.city && item.location?.state ? ', ' : ''}${esc(item.location?.state || '')}</span>
    </button>
  `).join('');

  listEl.querySelectorAll('[data-owner-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      selectedId = btn.getAttribute('data-owner-id');
      renderList();
      await loadDetail(selectedId);
    });
  });
}

async function loadDetail(id) {
  const { ok, body, status } = await api(`/api/network/owner/listings/${encodeURIComponent(id)}`);
  if (!ok) {
    setStatus(status === 401 ? 'Sign in to access Partner Portal.' : (body?.error || 'Unable to load listing details.'));
    return;
  }
  fillProfile(body.listing);
  setStatus(`Editing: ${body.listing.name}`);
}

async function loadOwnedListings() {
  setStatus('Loading your listings...');
  const { ok, body, status } = await api('/api/network/owner/listings');
  if (!ok) {
    setStatus(status === 401 ? 'Sign in required for Partner Portal.' : (body?.error || 'Unable to load listings.'));
    return;
  }
  cache = body.listings || [];
  selectedId = cache[0]?.id || null;
  renderList();
  if (selectedId) await loadDetail(selectedId);
  else setStatus('No managed listings yet.');
}

function wireForm(form, endpointBuilder, payloadBuilder, label) {
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedId) {
      setStatus('Select a listing first.');
      return;
    }

    let payload;
    try {
      payload = payloadBuilder();
    } catch (err) {
      setStatus(err?.message || `Invalid ${label} payload`);
      return;
    }

    setStatus(`Saving ${label}...`);
    const { ok, body } = await api(endpointBuilder(selectedId), {
      method: form === profileForm ? 'PATCH' : form === integrationForm ? 'PATCH' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!ok) {
      setStatus(body?.error || `Unable to save ${label}.`);
      return;
    }
    setStatus(`${label} saved.`);
    if (body?.listing) {
      const idx = cache.findIndex((x) => x.id === body.listing.id);
      if (idx >= 0) cache[idx] = body.listing;
      renderList();
      fillProfile(body.listing);
    }
  });
}

wireForm(
  profileForm,
  (id) => `/api/network/owner/listings/${encodeURIComponent(id)}/profile`,
  () => ({
    name: profileForm.name.value,
    city: profileForm.city.value,
    state: profileForm.state.value,
    postal_code: profileForm.postal_code.value,
    phone: profileForm.phone.value,
    website_url: profileForm.website_url.value,
    short_description: profileForm.short_description.value,
  }),
  'profile'
);

wireForm(
  servicesForm,
  (id) => `/api/network/owner/listings/${encodeURIComponent(id)}/services`,
  () => ({ services: collectServices() }),
  'services'
);

wireForm(
  faqsForm,
  (id) => `/api/network/owner/listings/${encodeURIComponent(id)}/faqs`,
  () => ({ faqs: collectFaqs() }),
  'FAQs'
);

wireForm(
  offersForm,
  (id) => `/api/network/owner/listings/${encodeURIComponent(id)}/offers`,
  () => ({ offers: collectOffers() }),
  'offers'
);

wireForm(
  integrationForm,
  (id) => `/api/network/owner/listings/${encodeURIComponent(id)}/integration`,
  () => ({
    portal_mode: integrationForm.portal_mode.value,
    lead_destination: integrationForm.lead_destination.value,
    external_site_url: integrationForm.external_site_url.value,
    lead_email: integrationForm.lead_email.value,
    lead_webhook_url: integrationForm.lead_webhook_url.value,
    enable_lead_form: integrationForm.enable_lead_form.checked,
    enable_offers: integrationForm.enable_offers.checked,
  }),
  'integration'
);

addServiceBtn?.addEventListener('click', () => {
  if (rowCount(servicesRowsEl, 'service') >= ROW_LIMITS.service) {
    setStatus(`Service limit reached (${ROW_LIMITS.service}).`);
    updateRowEditorControls();
    return;
  }
  appendRow(servicesRowsEl, renderServiceRow);
});
addFaqBtn?.addEventListener('click', () => {
  if (rowCount(faqsRowsEl, 'faq') >= ROW_LIMITS.faq) {
    setStatus(`FAQ limit reached (${ROW_LIMITS.faq}).`);
    updateRowEditorControls();
    return;
  }
  appendRow(faqsRowsEl, renderFaqRow);
});
addOfferBtn?.addEventListener('click', () => {
  if (rowCount(offersRowsEl, 'offer') >= ROW_LIMITS.offer) {
    setStatus(`Offer limit reached (${ROW_LIMITS.offer}).`);
    updateRowEditorControls();
    return;
  }
  appendRow(offersRowsEl, renderOfferRow);
});

wireRows(servicesRowsEl, 'service', () => appendRow(servicesRowsEl, renderServiceRow));
wireRows(faqsRowsEl, 'faq', () => appendRow(faqsRowsEl, renderFaqRow));
wireRows(offersRowsEl, 'offer', () => appendRow(offersRowsEl, renderOfferRow));

updateRowEditorControls();
loadOwnedListings();
