// public/pawketNetworkDetail.js
const host = document.querySelector('[data-network-detail]');
const CATEGORY_LABELS = {
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
};

const TIER_LABELS = {
  partner: 'Partner',
  partner_plus: 'Partner+',
  partner_elite: 'Partner Elite',
};

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

function slugFromPath() {
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'pawket-network' && parts[1]) return decodeURIComponent(parts[1]);
  const q = new URLSearchParams(location.search).get('listing');
  return q ? decodeURIComponent(q) : '';
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Category pending';
}

function tierLabel(tier) {
  return TIER_LABELS[tier] || tier || 'Partner';
}

function claimStatusLabel(status) {
  if (status === 'approved') return 'Claim approved';
  if (status === 'rejected') return 'Claim rejected';
  if (status === 'pending') return 'Claim pending review';
  return '';
}

function leadForm(listing) {
  if (!listing.features?.enable_lead_form) return '';
  return `
    <form class="pp-network-panel pp-network-panel--form" id="network-lead-form" data-lead-form>
      <h3>Request appointment or info</h3>
      <p class="pp-network-muted">Your request is saved in Pet Pawket for partner follow-up and ops verification.</p>
      <input class="pp-network-input" name="name" placeholder="Your name" required />
      <input class="pp-network-input" name="email" type="email" placeholder="Your email" required />
      <input class="pp-network-input" name="phone" placeholder="Phone (optional)" />
      <textarea class="pp-network-textarea" name="message" placeholder="How can this partner help?" required></textarea>
      <div class="pp-network-actions">
        <button class="pp-network-btn" type="submit">Send request</button>
      </div>
      <p class="pp-network-status" data-lead-status></p>
    </form>
  `;
}

function claimForm(listing) {
  if (listing.status !== 'unclaimed') return '';
  return `
    <form class="pp-network-panel pp-network-panel--form" id="network-claim-form" data-claim-form>
      <h3>Claim this listing</h3>
      <p class="pp-network-muted">Submit proof and our Pawket Partners Ops team will review your claim.</p>
      <input class="pp-network-input" name="business_email" type="email" placeholder="Business email" required />
      <input class="pp-network-input" name="phone" placeholder="Business phone" required />
      <input class="pp-network-input" name="business_identity_doc_url" placeholder="Proof document URL (https://...)" />
      <input class="pp-network-input" name="business_identity_doc" type="file" accept=".pdf,image/png,image/jpeg" />
      <button class="pp-network-btn" type="submit">Submit claim</button>
      <p class="pp-network-status" data-claim-status></p>
    </form>
  `;
}

function listingBadges(listing) {
  const out = [];
  if (listing.status === 'partner') {
    out.push('<span class="pp-network-badge status-partner">Pawket Verified Partner</span>');
    out.push(`<span class="pp-network-badge tier">${esc(tierLabel(listing.partner_tier))}</span>`);
  } else if (listing.status === 'claimed') {
    out.push('<span class="pp-network-badge status-claimed">Owner Claimed</span>');
  } else {
    out.push('<span class="pp-network-badge status-unclaimed">Network Listing</span>');
  }
  if (listing.charm_support?.enabled) out.push('<span class="pp-network-badge charm">Supports CHARM</span>');
  return out.join('');
}

function listingContextChips(listing) {
  const chips = [];
  chips.push(`<span class="pp-network-chip pp-network-chip--context">${esc(categoryLabel(listing.category_primary))}</span>`);
  if (listing.portal_mode === 'external_site' && listing.external_site_url) {
    chips.push('<span class="pp-network-chip">External site bridge</span>');
  } else {
    chips.push('<span class="pp-network-chip">Pawket profile listing</span>');
  }
  const claimState = claimStatusLabel(listing.claim_status);
  if (claimState) chips.push(`<span class="pp-network-chip">${esc(claimState)}</span>`);
  if (listing.features?.enable_lead_form) chips.push('<span class="pp-network-chip">Lead form enabled</span>');
  return chips.join('');
}

function servicesMarkup(listing) {
  if (!Array.isArray(listing.services) || !listing.services.length) {
    return '<p class="pp-network-muted">Services will be added by the listing owner.</p>';
  }
  return `
    <div class="pp-network-queue">
      ${listing.services.map((service) => {
        const from = service.priceFrom != null ? Number(service.priceFrom) : null;
        const to = service.priceTo != null ? Number(service.priceTo) : null;
        const price = from != null && to != null
          ? `$${from.toFixed(0)} - $${to.toFixed(0)}`
          : from != null
            ? `From $${from.toFixed(0)}`
            : to != null
              ? `Up to $${to.toFixed(0)}`
              : '';
        return `
          <article class="pp-network-item">
            <div class="pp-network-item-head">
              <strong>${esc(service.name || 'Service')}</strong>
              ${price ? `<span class="pp-network-chip">${esc(price)}</span>` : ''}
            </div>
            ${service.notes ? `<p class="pp-network-muted">${esc(service.notes)}</p>` : ''}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function offersMarkup(listing) {
  if (!Array.isArray(listing.offers) || !listing.offers.length) return '';
  return `
    <section class="pp-network-panel">
      <h3>Partner offers</h3>
      <div class="pp-network-queue">
        ${listing.offers.map((offer) => `
          <article class="pp-network-item">
            <div class="pp-network-item-head">
              <strong>${esc(offer.title)}</strong>
              ${offer.code ? `<span class="pp-network-chip">${esc(offer.code)}</span>` : ''}
            </div>
            ${offer.details ? `<p class="pp-network-muted">${esc(offer.details)}</p>` : ''}
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function faqMarkup(listing) {
  if (!Array.isArray(listing.faqs) || !listing.faqs.length) return '';
  return `
    <section class="pp-network-panel">
      <h3>FAQs</h3>
      <div class="pp-network-queue">
        ${listing.faqs.map((faq) => `
          <article class="pp-network-item">
            <strong>${esc(faq.question || 'Question')}</strong>
            <p class="pp-network-muted">${esc(faq.answer || '')}</p>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function charmImpactMarkup(listing) {
  if (!listing.charm_support?.enabled) return '';
  const capRaw = Number(listing.charm_support.match_cap_monthly);
  const capLabel = Number.isFinite(capRaw) ? `$${capRaw.toFixed(0)}/mo` : '';
  const receiptUrl = safeUrl(listing.charm_support.receipt_url);
  return `
    <section class="pp-network-panel">
      <h3>CHARM impact participation</h3>
      <p class="pp-network-muted">${esc(listing.charm_support.public_blurb || 'This listing participates in CHARM impact support initiatives.')}</p>
      <div class="pp-network-chip-row">
        ${listing.charm_support.program_type ? `<span class="pp-network-chip">${esc(listing.charm_support.program_type.replace(/_/g, ' '))}</span>` : ''}
        ${capLabel ? `<span class="pp-network-chip">Match cap: ${esc(capLabel)}</span>` : ''}
      </div>
      ${receiptUrl ? `<a class="pp-text-link" href="${esc(receiptUrl)}" target="_blank" rel="noopener noreferrer">View CHARM receipt page</a>` : ''}
    </section>
  `;
}

function primaryActionsMarkup(listing) {
  const actions = [];
  const externalUrl = safeUrl(listing.external_site_url);
  if (listing.portal_mode === 'external_site' && externalUrl) {
    actions.push(`<a class="pp-network-btn" href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer" data-outbound data-outbound-source="detail_primary_external">Visit provider site</a>`);
  }
  if (listing.features?.enable_lead_form) {
    actions.push('<a class="pp-network-btn ghost" href="#network-lead-form">Request appointment</a>');
  }
  if (listing.status === 'unclaimed') {
    actions.push('<a class="pp-network-btn ghost" href="#network-claim-form">Claim this listing</a>');
  } else if (listing.status === 'claimed') {
    actions.push('<span class="pp-network-chip">Managed by owner</span>');
  } else if (listing.status === 'partner') {
    actions.push('<span class="pp-network-chip">Partner modules enabled</span>');
  }
  return actions.join('');
}

function leadStatusMessage(body = {}) {
  if (body.deliveryStatus === 'sent') return 'Request sent and saved for verification.';
  if (body.deliveryStatus === 'queued') return 'Request saved. Pet Pawket will verify delivery status.';
  if (body.deliveryStatus === 'failed') return 'Request saved, but delivery needs partner setup review.';
  return 'Request saved for Pet Pawket review.';
}

function render(listing) {
  const media = safeUrl(Array.isArray(listing.media) && listing.media.length ? listing.media[0]?.url : listing.cover_image_url);
  const city = listing.location?.city || '';
  const state = listing.location?.state || '';
  const postal = listing.location?.postal_code || '';
  const locationLine = [city, state].filter(Boolean).join(', ');
  const description = listing.description || listing.short_description || 'Listing details coming soon.';
  const contactActions = [];
  const websiteUrl = safeUrl(listing.contact?.website_url);
  const externalUrl = safeUrl(listing.external_site_url);
  if (websiteUrl) {
    contactActions.push(`<a class="pp-network-chip pp-network-chip--action" href="${esc(websiteUrl)}" target="_blank" rel="noopener noreferrer" data-outbound data-outbound-source="detail_contact_website">Website</a>`);
  }
  if (listing.portal_mode === 'external_site' && externalUrl) {
    contactActions.push(`<a class="pp-network-chip pp-network-chip--action" href="${esc(externalUrl)}" target="_blank" rel="noopener noreferrer" data-outbound data-outbound-source="detail_contact_external">Provider portal</a>`);
  }

  host.innerHTML = `
    <div class="pp-network-listing">
      <section class="pp-network-stack">
        <div class="pp-network-panel">
          <div class="pp-network-item-head pp-network-item-head--detail">
            <div class="pp-network-stack pp-network-stack--tight">
              <h2>${esc(listing.name)}</h2>
              <p class="pp-network-meta">${esc(locationLine)}${postal ? ` ${esc(postal)}` : ''}</p>
            </div>
            <a class="pp-network-chip pp-network-chip--action" href="/pawket-network.html">Back to directory</a>
          </div>
          <div class="pp-network-badges">${listingBadges(listing)}</div>
          <div class="pp-network-chip-row">${listingContextChips(listing)}</div>
          <p>${esc(description)}</p>
          <div class="pp-network-actions pp-network-actions--detail-primary">${primaryActionsMarkup(listing)}</div>
        </div>
        <section class="pp-network-panel pp-network-panel--services">
          <h3>Services</h3>
          ${servicesMarkup(listing)}
        </section>
        ${offersMarkup(listing)}
        ${faqMarkup(listing)}
        ${charmImpactMarkup(listing)}
        ${leadForm(listing)}
        ${claimForm(listing)}
      </section>
      <aside class="pp-network-stack">
        <div class="pp-network-media">${media ? `<img src="${esc(media)}" alt="${esc(listing.name)}" />` : '<div class="pp-network-empty-media">Image coming soon</div>'}</div>
        <div class="pp-network-panel">
          <h3>Contact and hours</h3>
          <p class="pp-network-muted">Phone: ${esc(listing.contact?.phone || 'N/A')}</p>
          <p class="pp-network-muted">Hours: ${esc(listing.hours_text || 'Not provided')}</p>
          <div class="pp-network-chip-row pp-network-chip-row--detail-contact">
            ${contactActions.join('') || '<span class="pp-network-muted">No external links provided.</span>'}
          </div>
        </div>
      </aside>
    </div>
  `;

  host.querySelectorAll('[data-outbound]').forEach((link) => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (!href) return;
      fetch(`/api/network/listings/${encodeURIComponent(listing.id)}/outbound-click`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          href,
          source: link.getAttribute('data-outbound-source') || 'detail_cta',
        }),
      }).catch(() => {});
    });
  });

  const lead = host.querySelector('[data-lead-form]');
  lead?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = lead.querySelector('[data-lead-status]');
    const form = new FormData(lead);
    status.textContent = 'Sending request...';
    const resp = await fetch(`/api/network/listings/${encodeURIComponent(listing.id)}/leads`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
        message: form.get('message'),
        source_path: location.pathname,
      }),
    });
    const body = await resp.json().catch(() => ({}));
    status.textContent = resp.ok && body.ok ? leadStatusMessage(body) : (body.error || 'Unable to send request.');
    if (resp.ok && body.ok) lead.reset();
  });

  const claim = host.querySelector('[data-claim-form]');
  claim?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = claim.querySelector('[data-claim-status]');
    const formData = new FormData(claim);
    status.textContent = 'Submitting claim...';
    const resp = await fetch(`/api/network/listings/${encodeURIComponent(listing.id)}/claim`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    const body = await resp.json().catch(() => ({}));
    status.textContent = resp.ok && body.ok ? 'Claim submitted for review.' : (body.error || 'Unable to submit claim.');
    if (resp.ok && body.ok) claim.reset();
  });
}

async function init() {
  const slug = slugFromPath();
  if (!slug) {
    host.innerHTML = '<p class="pp-network-status">No listing slug found.</p>';
    return;
  }

  try {
    const res = await fetch(`/api/network/listings/${encodeURIComponent(slug)}`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.listing) throw new Error(data?.error || 'Listing not found');

    document.title = `${data.listing.name} | Pawket Network`;
    render(data.listing);
  } catch (err) {
    host.innerHTML = `<p class="pp-network-status">${esc(err?.message || 'Unable to load listing.')}</p>`;
  }
}

init();
