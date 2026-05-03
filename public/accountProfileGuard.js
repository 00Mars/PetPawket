/**
 * Account Profile Guard — simplified
 * - Runs after account.js
 * - Fills first/last/email ONLY if inputs are empty
 * - Tries in order:
 *    1) /api/account/profile (then /api/me as fallback)
 *    2) /api/addresses (default address or first item)
 *    3) Derive name from email if it looks like first.last@...
 */
import { getSession } from './auth.js';

(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const fName = $('#profileFirstName');
  const lName = $('#profileLastName');
  const email = $('#profileEmail');
  if (!fName || !lName || !email) return;

  const setIfEmpty = (input, val) => {
    const v = (val ?? '').toString().trim();
    if (input && !input.value && v) input.value = v;
  };

  const pick = (obj, keys) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return {};
    const src = raw.profile || raw.user || raw.data || raw.customer || raw.account || raw;

    let first = pick(src, ['firstName', 'first_name']);
    let last  = pick(src, ['lastName', 'last_name']);
    let mail  = pick(src, ['email', 'emailAddress', 'email_address']);

    // Shopify default address fallback (if present)
    const def = src.default_address || raw.customer?.default_address;
    if ((!first || !last) && def) {
      first ||= pick(def, ['first_name', 'firstName']);
      last  ||= pick(def,  ['last_name',  'lastName']);
    }

    // Single "name" string fallback
    if ((!first || !last) && src.name) {
      const parts = String(src.name).trim().split(/\s+/);
      first ||= parts[0] || '';
      if (!last && parts.length > 1) last = parts.slice(1).join(' ');
    }

    // Shopify { customer } wrapper
    if ((!first || !last || !mail) && raw.customer) {
      const c = raw.customer;
      first ||= pick(c, ['first_name', 'firstName']);
      last  ||= pick(c, ['last_name',  'lastName']);
      mail  ||= pick(c, ['email']);
    }

    return { first, last, mail };
  }

  async function getJson(url) {
    const r = await fetch(url, { credentials: 'include' });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }

  async function firstProfile() {
    const urls = ['/api/account/profile', '/api/me'];
    for (const u of urls) {
      try {
        const j = await getJson(u);
        const p = normalize(j);
        if (p.first || p.last || p.mail) return p;
      } catch {}
    }
    return {};
  }

  async function firstAddress() {
    const urls = ['/api/addresses'];
    for (const u of urls) {
      try {
        const j = await getJson(u);
        const list = Array.isArray(j?.addresses) ? j.addresses : (Array.isArray(j) ? j : []);
        let def = list.find(a => a.default || a.default_address || a.isDefaultShipping || a.isDefault) || list[0];
        if (def) {
          return {
            first: pick(def, ['first_name', 'firstName']),
            last:  pick(def, ['last_name',  'lastName']),
            mail:  pick(def, ['email'])
          };
        }
      } catch {}
    }
    return {};
  }

  function nameFromEmail(mail) {
    const m = (mail || '').toString().trim();
    if (!m || !/@/.test(m)) return {};
    const local = m.split('@')[0];
    const sep = local.includes('.') ? '.' : (local.includes('_') ? '_' : (local.includes('-') ? '-' : ''));
    if (!sep) return {};
    const parts = local.split(sep).filter(Boolean);
    if (parts.length < 2) return {};
    const cap = s => s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : '';
    return { first: cap(parts[0]), last: cap(parts.slice(1).join(' ')) };
  }

  async function run() {
    // If email label is rendered elsewhere, use it when our email field is empty
    const label = $('[data-auth-user-email]');
    if (!email.value && label) {
      const text = (label.textContent || '').trim();
      if (/@/.test(text)) email.value = text;
    }

    // If account.js already set names, do nothing
    if (fName.value?.trim() && lName.value?.trim()) return;

    const session = await getSession();
    if (!session?.signedIn) return;

    // Profile endpoints
    const prof = await firstProfile();
    setIfEmpty(fName, prof.first);
    setIfEmpty(lName,  prof.last);
    setIfEmpty(email,  prof.mail);

    // Addresses as secondary source
    if (!fName.value || !lName.value) {
      const addr = await firstAddress();
      setIfEmpty(fName, addr.first);
      setIfEmpty(lName,  addr.last);
      setIfEmpty(email,  addr.mail);
    }

    // Derive names from email if still missing
    if ((!fName.value || !lName.value) && email.value) {
      const guess = nameFromEmail(email.value);
      setIfEmpty(fName, guess.first);
      setIfEmpty(lName,  guess.last);
    }
  }

  run().catch(() => {});
})();
