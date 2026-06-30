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

function clearNode(node) {
  while (node?.firstChild) node.removeChild(node.firstChild);
}

function makeEl(tag, className = '', text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function appendChildren(parent, children = []) {
  children.filter(Boolean).forEach((child) => parent.appendChild(child));
  return parent;
}

function safeHref(value, fallback = '#') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return fallback;
  }
}

function makeLink(className, href, text) {
  const link = makeEl('a', className, text);
  const safe = safeHref(href);
  link.setAttribute('href', safe);
  if (safe === '#') link.setAttribute('aria-disabled', 'true');
  return link;
}

function makeCard(text = '') {
  return makeEl('div', 'cf-card', text);
}

function setEmptyCard(host, text) {
  clearNode(host);
  host.appendChild(makeCard(text));
}

async function loadCases() {
  const host = qs('[data-cases-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/cases');
  const isPlaceholder = Boolean(data.placeholder);
  const cases = data.cases || [];
  if (!cases.length) return setEmptyCard(host, 'No cases published yet.');
  clearNode(host);
  cases.forEach((c) => {
    const pct = c.goalAmount ? Math.min(100, Math.round((c.fundedAmount / c.goalAmount) * 100)) : 0;
    const link = c.id ? `/cases/${encodeURIComponent(c.id)}` : '/cases';
    const title = makeEl('h3');
    title.appendChild(makeLink('cf-link', link, c.title || 'Case'));
    const card = appendChildren(makeCard(), [
      makeEl('span', 'cf-tag', isPlaceholder ? 'Example case' : 'Active case'),
      title,
      makeEl('p', '', c.summary || ''),
      makeEl('div', 'cf-notice', `${formatMoney(c.fundedAmount || 0, c.currency || 'USD')} of ${formatMoney(c.goalAmount || 0, c.currency || 'USD')} funded - ${pct}%`),
      makeLink('cf-btn ghost', link, 'View case'),
    ]);
    host.appendChild(card);
  });
}

async function loadEvents() {
  const host = qs('[data-events-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/events');
  const isPlaceholder = Boolean(data.placeholder);
  const events = data.events || [];
  if (!events.length) return setEmptyCard(host, 'No events scheduled yet.');
  clearNode(host);
  events.forEach((e) => {
    const date = e.startsAt ? new Date(e.startsAt).toLocaleString() : 'TBD';
    const button = makeEl('button', 'cf-btn ghost', 'RSVP');
    button.type = 'button';
    button.setAttribute('data-rsvp-button', '');
    button.dataset.eventId = String(e.id || '');
    button.dataset.eventTitle = String(e.title || '');
    host.appendChild(appendChildren(makeCard(), [
      makeEl('span', 'cf-tag', `${isPlaceholder ? 'Example event' : 'Upcoming'} - #${e.id || 'TBD'}`),
      makeEl('h3', '', e.title || 'Event'),
      makeEl('p', '', e.description || ''),
      makeEl('div', 'cf-notice', `${date} - ${e.location || 'Location TBD'}`),
      button,
    ]));
  });
  wireEventButtons();
}

async function loadFunds() {
  const selects = qsa('[data-fund-select]');
  if (!selects.length) return;
  const { data } = await fetchJSON('/api/donations/funds');
  const funds = data.funds || [];
  selects.forEach((select) => {
    clearNode(select);
    funds.forEach((f) => {
      const option = makeEl('option', '', f.name || f.code || 'Fund');
      option.value = String(f.code || '');
      select.appendChild(option);
    });
  });
}

async function loadReceipts() {
  const host = qs('[data-receipts-list]');
  if (!host) return;
  const { data } = await fetchJSON('/api/donations/impact/receipts');
  const receipts = data.receipts || [];
  if (!receipts.length) return setEmptyCard(host, 'No receipts published yet.');
  clearNode(host);
  receipts.forEach((r) => {
    host.appendChild(appendChildren(makeEl('div', 'cf-card cf-receipt-card'), [
      makeEl('span', 'cf-tag', r.month || 'Receipt'),
      makeEl('h3', '', formatMoney(r.totalAmount || 0)),
      makeEl('p', '', r.summary?.note || 'Impact receipt summary will appear here.'),
    ]));
  });
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
    setEmptyCard(root, 'Case details are unavailable.');
    return;
  }

  const { ok, data } = await fetchJSON(`/api/cases/${caseId}`);
  if (!ok || !data?.case) {
    setEmptyCard(root, 'Case not found.');
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
    if (!updates.length) {
      setEmptyCard(updatesEl, 'Updates will appear here as they are published.');
    } else {
      clearNode(updatesEl);
      updates.forEach((u) => {
        updatesEl.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Update'),
          makeEl('h3', '', u.title || 'Update'),
          makeEl('p', '', u.body || ''),
        ]));
      });
    }
  }

  const docsEl = root.querySelector('[data-case-docs]');
  if (docsEl) {
    const docs = Array.isArray(data.documents) ? data.documents : [];
    if (!docs.length) {
      setEmptyCard(docsEl, 'Documents and receipts will be posted here.');
    } else {
      clearNode(docsEl);
      docs.forEach((d) => {
        docsEl.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', d.docType || 'Document'),
          makeEl('h3', '', d.label || 'Case document'),
          makeLink('cf-btn ghost', d.url || '#', 'Open document'),
        ]));
      });
    }
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
    if (!items.length) setEmptyCard(faqHost, 'FAQ entries will appear here.');
    else {
      clearNode(faqHost);
      items.forEach((item) => {
        faqHost.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', item.tag || 'FAQ'),
          makeEl('h3', '', item.q || ''),
          makeEl('p', '', item.a || ''),
        ]));
      });
    }
  }

  const partnerHost = qs('[data-content-partners]');
  if (partnerHost) {
    const items = data.partnerSpotlights || [];
    if (!items.length) setEmptyCard(partnerHost, 'Partner spotlights will appear here.');
    else {
      clearNode(partnerHost);
      items.forEach((item) => {
        partnerHost.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', item.tag || 'Example partner'),
          makeEl('h3', '', item.name || ''),
          makeEl('p', '', item.summary || ''),
          makeEl('div', 'cf-notice', 'Spotlights shared with permission.'),
        ]));
      });
    }
  }

  const highlightHost = qs('[data-content-highlights]');
  if (highlightHost) {
    const items = data.monthlyHighlights || [];
    if (!items.length) setEmptyCard(highlightHost, 'Monthly highlights will appear here.');
    else {
      clearNode(highlightHost);
      items.forEach((item) => {
        highlightHost.appendChild(appendChildren(makeEl('div', 'cf-card cf-receipt-card'), [
          makeEl('span', 'cf-tag', item.tag || 'Example highlight'),
          makeEl('h3', '', item.title || ''),
          makeEl('p', '', item.summary || ''),
        ]));
      });
    }
  }

  const reportsHost = qs('[data-content-reports]');
  if (reportsHost) {
    const items = data.reports || [];
    if (!items.length) setEmptyCard(reportsHost, 'Reports will appear here.');
    else {
      clearNode(reportsHost);
      items.forEach((item) => {
        reportsHost.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', item.date || 'Report'),
          makeEl('h3', '', item.title || ''),
          makeLink('cf-btn ghost', item.url || '#', 'View report'),
        ]));
      });
    }
  }

  const pressHost = qs('[data-content-press]');
  if (pressHost) {
    const items = data.press || [];
    if (!items.length) setEmptyCard(pressHost, 'Press mentions will appear here.');
    else {
      clearNode(pressHost);
      items.forEach((item) => {
        pressHost.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', item.outlet || 'Press'),
          makeEl('h3', '', item.title || ''),
          makeEl('div', 'cf-notice', item.date || ''),
          makeLink('cf-btn ghost', item.url || '#', 'Read coverage'),
        ]));
      });
    }
  }

  const boardHost = qs('[data-content-board]');
  if (boardHost) {
    const items = data.board || [];
    if (!items.length) setEmptyCard(boardHost, 'Board listings will appear here.');
    else {
      clearNode(boardHost);
      items.forEach((item) => {
        boardHost.appendChild(appendChildren(makeCard(), [
          makeEl('h3', '', item.name || ''),
          makeEl('p', '', item.role || ''),
        ]));
      });
    }
  }

  const statsHost = qs('[data-content-stats]');
  if (statsHost) {
    const items = data.homeStats || [];
    clearNode(statsHost);
    if (!items.length) {
      statsHost.appendChild(appendChildren(makeEl('div', 'cf-stat'), [
        makeEl('div', 'cf-stat-value', '--'),
        makeEl('div', 'cf-notice', 'Loading stats...'),
      ]));
    } else {
      items.forEach((item) => {
        statsHost.appendChild(appendChildren(makeEl('div', 'cf-stat'), [
          makeEl('div', 'cf-stat-value', item.value || ''),
          makeEl('div', 'cf-notice', item.label || ''),
        ]));
      });
    }
  }

  const trustHost = qs('[data-content-trust]');
  if (trustHost) {
    const items = data.trustCards || [];
    if (!items.length) setEmptyCard(trustHost, 'Trust resources will appear here.');
    else {
      clearNode(trustHost);
      items.forEach((item) => {
        trustHost.appendChild(appendChildren(makeCard(), [
          makeEl('span', 'cf-tag', item.tag || 'Trust'),
          makeEl('h3', '', item.title || ''),
          makeEl('p', '', item.summary || ''),
          makeLink('cf-btn ghost', item.href || '#', 'Learn more'),
        ]));
      });
    }
  }

  const policiesHost = qs('[data-content-policies]');
  if (policiesHost) {
    const items = data.policies || [];
    if (!items.length) setEmptyCard(policiesHost, 'Policies will appear here.');
    else {
      clearNode(policiesHost);
      items.forEach((item) => {
        policiesHost.appendChild(appendChildren(makeCard(), [
          makeEl('h3', '', item.title || ''),
          makeLink('cf-btn ghost', item.url || '#', 'View policy'),
        ]));
      });
    }
  }
}

async function loadCaseSpotlight() {
  const host = qs('[data-case-spotlight]');
  if (!host) return;
  const { data } = await fetchJSON('/api/cases');
  const isPlaceholder = Boolean(data.placeholder);
  const caseItem = (data.cases || [])[0];
  if (!caseItem) {
    setEmptyCard(host, 'Case spotlight will appear here.');
    return;
  }

  const pct = caseItem.goalAmount ? Math.min(100, Math.round((caseItem.fundedAmount / caseItem.goalAmount) * 100)) : 0;
  const link = caseItem.id ? `/cases/${encodeURIComponent(caseItem.id)}` : '/cases';
  const progress = makeEl('div', 'cf-progress');
  const bar = makeEl('span');
  bar.style.width = `${pct}%`;
  progress.appendChild(bar);
  const cta = appendChildren(makeEl('div', 'cf-cta'), [
    makeLink('cf-btn', link, 'View case'),
    makeLink('cf-btn ghost', '/donate', 'Support CHARM'),
  ]);

  clearNode(host);
  host.appendChild(appendChildren(makeEl('div', 'cf-card cf-spotlight-card'), [
    makeEl('span', 'cf-tag', isPlaceholder ? 'Example case spotlight' : 'Case spotlight'),
    makeEl('h3', '', caseItem.title || 'Case spotlight'),
    makeEl('p', '', caseItem.summary || ''),
    makeEl('div', 'cf-notice', `${formatMoney(caseItem.fundedAmount || 0, caseItem.currency || 'USD')} of ${formatMoney(caseItem.goalAmount || 0, caseItem.currency || 'USD')} funded - ${pct}%`),
    progress,
    cta,
  ]));
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
