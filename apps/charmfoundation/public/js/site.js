// apps/charmfoundation/public/js/site.js

function qs(sel, root = document) {
  return root.querySelector(sel);
}

function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

function formatMoney(amount = 0, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${Number(amount || 0).toFixed(2)}`;
  }
}

function setAlert(form, message, ok = true) {
  const slot = form.querySelector('[data-form-status]');
  if (!slot) return;
  slot.textContent = message;
  slot.classList.toggle('cf-alert', true);
  slot.style.borderColor = ok ? 'rgba(25, 50, 74, 0.2)' : 'rgba(200, 60, 60, 0.4)';
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

async function loadCases() {
  const host = qs('[data-cases-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/cases');
  const isPlaceholder = Boolean(data.placeholder);
  const cases = data.cases || [];
  host.innerHTML = cases.map((c) => {
    const pct = c.goalAmount ? Math.min(100, Math.round((c.fundedAmount / c.goalAmount) * 100)) : 0;
    const link = c.id ? `/cases/${c.id}` : '/cases';
    return `
      <div class="cf-card">
        <span class="cf-tag">${isPlaceholder ? 'Example case' : 'Active case'}</span>
        <h3><a class="cf-link" href="${link}">${c.title}</a></h3>
        <p>${c.summary || ''}</p>
        <div class="cf-notice">${formatMoney(c.fundedAmount || 0, c.currency || 'USD')} of ${formatMoney(c.goalAmount || 0, c.currency || 'USD')} funded - ${pct}%</div>
        <a class="cf-btn ghost" href="${link}">View case</a>
      </div>
    `;
  }).join('') || '<div class="cf-card">No cases published yet.</div>';
}

async function loadEvents() {
  const host = qs('[data-events-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/events');
  const isPlaceholder = Boolean(data.placeholder);
  const events = data.events || [];
  host.innerHTML = events.map((e) => {
    const date = e.startsAt ? new Date(e.startsAt).toLocaleString() : 'TBD';
    return `
      <div class="cf-card">
        <span class="cf-tag">${isPlaceholder ? 'Example event' : 'Upcoming'} - #${e.id || 'TBD'}</span>
        <h3>${e.title}</h3>
        <p>${e.description || ''}</p>
        <div class="cf-notice">${date} - ${e.location || 'Location TBD'}</div>
        <button class="cf-btn ghost" type="button" data-rsvp-button data-event-id="${e.id || ''}" data-event-title="${e.title || ''}">RSVP</button>
      </div>
    `;
  }).join('') || '<div class="cf-card">No events scheduled yet.</div>';
  wireEventButtons();
}

async function loadFunds() {
  const selects = qsa('[data-fund-select]');
  if (!selects.length) return;
  const { data } = await fetchJSON('/api/donations/funds');
  const funds = data.funds || [];
  selects.forEach((select) => {
    select.innerHTML = funds.map((f) => `<option value="${f.code}">${f.name}</option>`).join('');
  });
}

async function loadReceipts() {
  const host = qs('[data-receipts-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/donations/impact/receipts');
  const receipts = data.receipts || [];
  host.innerHTML = receipts.map((r) => {
    return `
      <div class="cf-card cf-receipt-card">
        <span class="cf-tag">${r.month || 'Receipt'}</span>
        <h3>${formatMoney(r.totalAmount || 0)}</h3>
        <p>${r.summary?.note || 'Impact receipt summary will appear here.'}</p>
      </div>
    `;
  }).join('') || '<div class="cf-card">No receipts published yet.</div>';
}

function collectCheckedValues(form, name) {
  return qsa(`input[name="${name}"]:checked`, form).map((el) => el.value);
}

function fieldValue(form, name) {
  const field = form?.elements?.namedItem(name);
  if (!field) return '';
  if (typeof RadioNodeList !== 'undefined' && field instanceof RadioNodeList) return field.value || '';
  return field.value || '';
}

function wireForms() {
  qsa('form[data-form="partner-intake"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        orgName: fieldValue(form, 'orgName'),
        contactName: fieldValue(form, 'contactName'),
        contactEmail: fieldValue(form, 'contactEmail'),
        contactPhone: fieldValue(form, 'contactPhone'),
        orgType: fieldValue(form, 'orgType'),
        message: fieldValue(form, 'message')
      };
      const { ok } = await fetchJSON('/api/partners/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? 'Thanks! Our CHARM team will follow up shortly.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });

  qsa('form[data-form="volunteer-signup"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        firstName: fieldValue(form, 'firstName'),
        lastName: fieldValue(form, 'lastName'),
        email: fieldValue(form, 'email'),
        phone: fieldValue(form, 'phone'),
        interests: fieldValue(form, 'interests'),
        availability: fieldValue(form, 'availability'),
        message: fieldValue(form, 'message')
      };
      const { ok } = await fetchJSON('/api/volunteers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? 'You are on the list! We will reach out with next steps.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });

  qsa('form[data-form="donation"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        amount: fieldValue(form, 'amount'),
        currency: 'USD',
        fundCode: fieldValue(form, 'fund'),
        donorName: fieldValue(form, 'donorName'),
        donorEmail: fieldValue(form, 'donorEmail'),
        donorPhone: fieldValue(form, 'donorPhone'),
        note: fieldValue(form, 'note')
      };
      const { ok, data } = await fetchJSON('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? data.message || 'Donation captured.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });

  qsa('form[data-form="event-rsvp"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventId = fieldValue(form, 'eventId');
      const payload = {
        name: fieldValue(form, 'name'),
        email: fieldValue(form, 'email'),
        phone: fieldValue(form, 'phone'),
        attendees: fieldValue(form, 'attendees')
      };
      const { ok } = await fetchJSON(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? 'RSVP received! We will email you event details.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });

  qsa('form[data-form="newsletter"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const interests = collectCheckedValues(form, 'interests');
      const payload = {
        email: fieldValue(form, 'email'),
        firstName: fieldValue(form, 'firstName'),
        interests: interests.length ? interests.join(', ') : fieldValue(form, 'interests'),
        frequency: fieldValue(form, 'frequency')
      };
      const { ok, data } = await fetchJSON('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? data.message || 'You are on the list.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });

  qsa('form[data-form="contact"]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: fieldValue(form, 'name'),
        email: fieldValue(form, 'email'),
        topic: fieldValue(form, 'topic'),
        message: fieldValue(form, 'message')
      };
      const { ok, data } = await fetchJSON('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setAlert(form, ok ? data.message || 'Thanks! We will be in touch.' : 'Something went wrong. Please try again.', ok);
      if (ok) form.reset();
    });
  });
}

function wireEventButtons() {
  const form = qs('form[data-form="event-rsvp"]');
  const idInput = form?.elements?.namedItem('eventId');
  if (!form || !idInput) return;
  qsa('[data-rsvp-button]').forEach((btn) => {
    btn.addEventListener('click', () => {
      idInput.value = btn.dataset.eventId || '';
      const status = form.querySelector('[data-form-status]');
      if (status && btn.dataset.eventTitle) {
        status.textContent = `RSVP for ${btn.dataset.eventTitle}. We'll confirm by email.`;
      }
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function wireNavToggle() {
  const toggle = qs('[data-nav-toggle]');
  const links = qs('.cf-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => {
    links.classList.toggle('is-open');
  });
}

function resolvePetPawketBase() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
  return 'https://petpawket.com';
}

function applyPetPawketLinks() {
  const base = resolvePetPawketBase().replace(/\/+$/, '');
  qsa('[data-petpawket-link]').forEach((el) => {
    const path = el.getAttribute('data-petpawket-link') || '/';
    const next = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    el.setAttribute('href', next);
    if (!el.getAttribute('target')) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

function wireStoreLink() {
  const footer = qs('.cf-footer');
  if (!footer || footer.querySelector('[data-petpawket-link]')) return;

  const line = document.createElement('p');
  line.className = 'cf-notice';
  line.append('Looking for Pawket Packs that fund rescue care? ');

  const link = document.createElement('a');
  link.className = 'cf-link';
  link.setAttribute('data-petpawket-link', '/');
  link.textContent = 'Shop Pet Pawket';
  line.appendChild(link);

  footer.appendChild(line);
}

function addFooterCopyright() {
  const footer = qs('.cf-footer');
  if (!footer || footer.querySelector('[data-copyright]')) return;
  const target = footer.querySelector('.cf-footer-bottom') || footer;
  const line = document.createElement('p');
  line.className = 'cf-notice';
  line.setAttribute('data-copyright', '');
  const year = new Date().getFullYear();
  line.textContent = `© ${year} CHARM Foundation. All rights reserved.`;
  target.appendChild(line);
}

function parseCaseId() {
  const url = new URL(window.location.href);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'cases' && parts[1]) return parts[1];
  return url.searchParams.get('id');
}

async function loadCaseDetail() {
  const root = qs('[data-case-detail]');
  if (!root) return;
  const caseId = parseCaseId();
  if (!caseId) {
    root.innerHTML = '<div class="cf-card">Case details are unavailable.</div>';
    return;
  }

  const { ok, data } = await fetchJSON(`/api/cases/${caseId}`);
  if (!ok || !data?.case) {
    root.innerHTML = '<div class="cf-card">Case not found.</div>';
    return;
  }

  const c = data.case;
  const isPlaceholder = Boolean(data.placeholder);
  const pct = c.goalAmount ? Math.min(100, Math.round((c.fundedAmount / c.goalAmount) * 100)) : 0;

  const tagEl = root.querySelector('[data-case-tag]');
  if (tagEl) tagEl.textContent = isPlaceholder ? 'Example case' : 'Active case';

  const titleEl = root.querySelector('[data-case-title]');
  if (titleEl) titleEl.textContent = c.title || 'Rescue case';

  const summaryEl = root.querySelector('[data-case-summary]');
  if (summaryEl) summaryEl.textContent = c.summary || 'Case details will be published soon.';

  const metaEl = root.querySelector('[data-case-meta]');
  if (metaEl) {
    metaEl.textContent = c.goalAmount
      ? `${formatMoney(c.fundedAmount || 0, c.currency || 'USD')} of ${formatMoney(c.goalAmount || 0, c.currency || 'USD')} funded - ${pct}%`
      : 'Funding totals will be published soon.';
  }

  const progressEl = root.querySelector('[data-case-progress]');
  if (progressEl) progressEl.style.width = `${pct}%`;

  const descEl = root.querySelector('[data-case-description]');
  if (descEl) descEl.textContent = c.description || c.summary || 'Case description will be available soon.';

  const updatesEl = root.querySelector('[data-case-updates]');
  if (updatesEl) {
    const updates = Array.isArray(data.updates) ? data.updates : [];
    updatesEl.innerHTML = updates.length
      ? updates.map((u) => `
          <div class="cf-card">
            <span class="cf-tag">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Update'}</span>
            <h3>${u.title || 'Update'}</h3>
            <p>${u.body || ''}</p>
          </div>
        `).join('')
      : '<div class="cf-card">Updates will appear here as they are published.</div>';
  }

  const docsEl = root.querySelector('[data-case-docs]');
  if (docsEl) {
    const docs = Array.isArray(data.documents) ? data.documents : [];
    docsEl.innerHTML = docs.length
      ? docs.map((d) => `
          <div class="cf-card">
            <span class="cf-tag">${d.docType || 'Document'}</span>
            <h3>${d.label || 'Case document'}</h3>
            <a class="cf-btn ghost" href="${d.url || '#'}" ${d.url ? '' : 'aria-disabled="true"'}>Open document</a>
          </div>
        `).join('')
      : '<div class="cf-card">Documents and receipts will be posted here.</div>';
  }
}

async function loadContentData() {
  const hosts = qsa('[data-content-faq], [data-content-partners], [data-content-highlights], [data-content-reports], [data-content-press], [data-content-board], [data-content-policies], [data-content-stats], [data-content-trust]');
  if (!hosts.length) return;

  let data = null;
  try {
    const res = await fetch('/data/content.json');
    data = await res.json();
  } catch {
    return;
  }
  if (!data) return;

  const faqHost = qs('[data-content-faq]');
  if (faqHost) {
    const items = data.faq || [];
    faqHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <span class="cf-tag">${item.tag || 'FAQ'}</span>
        <h3>${item.q || ''}</h3>
        <p>${item.a || ''}</p>
      </div>
    `).join('') || '<div class="cf-card">FAQ entries will appear here.</div>';
  }

  const partnerHost = qs('[data-content-partners]');
  if (partnerHost) {
    const items = data.partnerSpotlights || [];
    partnerHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <span class="cf-tag">${item.tag || 'Example partner'}</span>
        <h3>${item.name || ''}</h3>
        <p>${item.summary || ''}</p>
        <div class="cf-notice">Spotlights shared with permission.</div>
      </div>
    `).join('') || '<div class="cf-card">Partner spotlights will appear here.</div>';
  }

  const highlightHost = qs('[data-content-highlights]');
  if (highlightHost) {
    const items = data.monthlyHighlights || [];
    highlightHost.innerHTML = items.map((item) => `
      <div class="cf-card cf-receipt-card">
        <span class="cf-tag">${item.tag || 'Example highlight'}</span>
        <h3>${item.title || ''}</h3>
        <p>${item.summary || ''}</p>
      </div>
    `).join('') || '<div class="cf-card">Monthly highlights will appear here.</div>';
  }

  const reportsHost = qs('[data-content-reports]');
  if (reportsHost) {
    const items = data.reports || [];
    reportsHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <span class="cf-tag">${item.date || 'Report'}</span>
        <h3>${item.title || ''}</h3>
        <a class="cf-btn ghost" href="${item.url || '#'}" ${item.url && item.url !== '#' ? '' : 'aria-disabled="true"'}>View report</a>
      </div>
    `).join('') || '<div class="cf-card">Reports will appear here.</div>';
  }

  const pressHost = qs('[data-content-press]');
  if (pressHost) {
    const items = data.press || [];
    pressHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <span class="cf-tag">${item.outlet || 'Press'}</span>
        <h3>${item.title || ''}</h3>
        <div class="cf-notice">${item.date || ''}</div>
        <a class="cf-btn ghost" href="${item.url || '#'}" ${item.url && item.url !== '#' ? '' : 'aria-disabled="true"'}>Read coverage</a>
      </div>
    `).join('') || '<div class="cf-card">Press mentions will appear here.</div>';
  }

  const boardHost = qs('[data-content-board]');
  if (boardHost) {
    const items = data.board || [];
    boardHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <h3>${item.name || ''}</h3>
        <p>${item.role || ''}</p>
      </div>
    `).join('') || '<div class="cf-card">Board listings will appear here.</div>';
  }

  const statsHost = qs('[data-content-stats]');
  if (statsHost) {
    const items = data.homeStats || [];
    statsHost.innerHTML = items.map((item) => `
      <div class="cf-stat">
        <div class="cf-stat-value">${item.value || ''}</div>
        <div class="cf-notice">${item.label || ''}</div>
      </div>
    `).join('') || '<div class="cf-stat"><div class="cf-stat-value">--</div><div class="cf-notice">Loading stats...</div></div>';
  }

  const trustHost = qs('[data-content-trust]');
  if (trustHost) {
    const items = data.trustCards || [];
    trustHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <span class="cf-tag">${item.tag || 'Trust'}</span>
        <h3>${item.title || ''}</h3>
        <p>${item.summary || ''}</p>
        <a class="cf-btn ghost" href="${item.href || '#'}">Learn more</a>
      </div>
    `).join('') || '<div class="cf-card">Trust resources will appear here.</div>';
  }

  const policiesHost = qs('[data-content-policies]');
  if (policiesHost) {
    const items = data.policies || [];
    policiesHost.innerHTML = items.map((item) => `
      <div class="cf-card">
        <h3>${item.title || ''}</h3>
        <a class="cf-btn ghost" href="${item.url || '#'}" ${item.url && item.url !== '#' ? '' : 'aria-disabled="true"'}>View policy</a>
      </div>
    `).join('') || '<div class="cf-card">Policies will appear here.</div>';
  }
}

async function loadCaseSpotlight() {
  const host = qs('[data-case-spotlight]');
  if (!host) return;
  const { data } = await fetchJSON('/api/cases');
  const isPlaceholder = Boolean(data.placeholder);
  const caseItem = (data.cases || [])[0];
  if (!caseItem) {
    host.innerHTML = '<div class="cf-card">Case spotlight will appear here.</div>';
    return;
  }

  const pct = caseItem.goalAmount ? Math.min(100, Math.round((caseItem.fundedAmount / caseItem.goalAmount) * 100)) : 0;
  const link = caseItem.id ? `/cases/${caseItem.id}` : '/cases';

  host.innerHTML = `
    <div class="cf-card cf-spotlight-card">
      <span class="cf-tag">${isPlaceholder ? 'Example case spotlight' : 'Case spotlight'}</span>
      <h3>${caseItem.title || 'Case spotlight'}</h3>
      <p>${caseItem.summary || ''}</p>
      <div class="cf-notice">${formatMoney(caseItem.fundedAmount || 0, caseItem.currency || 'USD')} of ${formatMoney(caseItem.goalAmount || 0, caseItem.currency || 'USD')} funded - ${pct}%</div>
      <div class="cf-progress"><span style="width: ${pct}%;"></span></div>
      <div class="cf-cta">
        <a class="cf-btn" href="${link}">View case</a>
        <a class="cf-btn ghost" href="/donate">Support CHARM</a>
      </div>
    </div>
  `;
}

window.addEventListener('DOMContentLoaded', () => {
  wireNavToggle();
  wireStoreLink();
  addFooterCopyright();
  applyPetPawketLinks();
  loadCases();
  loadEvents();
  loadFunds();
  loadReceipts();
  wireForms();
  loadCaseDetail();
  loadCaseSpotlight();
  loadContentData();
});
