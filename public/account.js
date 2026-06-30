// public/account.js — Account page wiring for Pets (list, add, edit, delete, journal)
// Node 20 / ESM client script; vanilla JS; Shopify cookie auth via credentials:'include'.

import { authFetch } from '/auth.js';
import { PetsBus } from '/petsEvents.js';

console.info('[account.js] pets v2+traits-save+avatar-fixes');
// Emit init so listeners (e.g., For My Pets pane) can boot deterministically
try { PetsBus.emit('pets:init', { when: Date.now() }); } catch { /* noop */ }

//
// -------------------------------
// Utilities
// -------------------------------
function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
function safeMediaUrl(v) {
  const raw = String(v || '').trim();
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(raw)) return raw;
  return safeUrl(raw);
}
function show(el) { el?.classList?.remove('d-none', 'hidden'); }
function hide(el) { el?.classList?.add('d-none'); }
function setInlineStatus(id, message, level = 'info') {
  const el = document.getElementById(id);
  if (!el || !message) return;
  el.className = `alert alert-${level} mt-2`;
  el.setAttribute('role', level === 'danger' ? 'alert' : 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  el.classList.remove('d-none', 'hidden');
}
function clearInlineStatus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.add('d-none');
}
function notifyStoryProgress(detail = {}) {
  try {
    document.dispatchEvent(new CustomEvent('pp:story:refresh', { detail }));
  } catch {}
}

function buildPawketPalHandoffUrl({ petId = '', journalEntryId = '', heartCode = '', source = 'account' } = {}) {
  const params = new URLSearchParams();
  if (petId) params.set('petId', String(petId));
  if (journalEntryId) params.set('journalEntryId', String(journalEntryId));
  if (heartCode) params.set('heartCode', String(heartCode));
  if (source) params.set('source', String(source));
  const query = params.toString();
  return `/pals.html${query ? `?${query}` : ''}#honorary-pal-certificates`;
}

// Account-wide alert banner for critical data fetch failures
const accountAlert = document.querySelector('[data-account-alert]');
let accountAlertShown = false;
function setAccountAlert(message, level = 'warning') {
  if (!accountAlert || !message) return;
  accountAlert.className = `alert alert-${level}`;
  accountAlert.setAttribute('role', 'alert');
  accountAlert.textContent = message;
  accountAlert.classList.remove('d-none');
  accountAlertShown = true;
}
function clearAccountAlert() {
  if (!accountAlert) return;
  if (!accountAlertShown) return;
  accountAlert.classList.add('d-none');
  accountAlertShown = false;
}
// Allow other modules to surface account errors
window.PP_accountAlert = setAccountAlert;
window.PP_accountClearAlert = clearAccountAlert;
/* Focus helpers + improved open/close */
let __activeModalId = null;
let __lastFocus = null;

function __getFocusable(root) {
  const sel = [
    'a[href]','button:not([disabled])','input:not([disabled])','select:not([disabled])',
    'textarea:not([disabled])','[tabindex]:not([tabindex="-1"])'
  ].join(',');
  return [...root.querySelectorAll(sel)].filter(el => {
    const style = window.getComputedStyle(el);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}
function __trapKeydown(e) {
  const m = document.getElementById(__activeModalId);
  if (!m) return;
  if (e.key === 'Escape') { closeModal(__activeModalId); return; }
  if (e.key !== 'Tab') return;
  const f = __getFocusable(m);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  __activeModalId = id;
  __lastFocus = document.activeElement;
  m.classList.remove('hidden');
  m.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const content = m.querySelector('[data-modal-content]') || m.querySelector('.modal-content');
  if (content) content.setAttribute('tabindex', '-1');
  (content || m).focus();
  m.addEventListener('keydown', __trapKeydown, { passive: false });
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('hidden');
  m.setAttribute('aria-hidden', 'true');
  const otherOpenModal = [...document.querySelectorAll('.custom-modal')]
    .some(el => el !== m && !el.classList.contains('hidden'));
  document.body.style.overflow = otherOpenModal ? 'hidden' : '';
  m.removeEventListener('keydown', __trapKeydown);
  queueMicrotask(() => { try { __lastFocus?.focus(); } catch {} });
  __activeModalId = null;
}

let accountConfirmResolve = null;
let accountConfirmLastFocus = null;

function closeAccountConfirm(result = false) {
  const modal = document.getElementById('accountConfirmModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  const otherOpenModal = [...document.querySelectorAll('.custom-modal')]
    .some(el => el !== modal && !el.classList.contains('hidden'));
  document.body.style.overflow = otherOpenModal ? 'hidden' : '';
  const resolve = accountConfirmResolve;
  accountConfirmResolve = null;
  queueMicrotask(() => { try { accountConfirmLastFocus?.focus(); } catch {} });
  accountConfirmLastFocus = null;
  if (resolve) resolve(!!result);
}

function ensureAccountConfirmModal() {
  let modal = document.getElementById('accountConfirmModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'accountConfirmModal';
  modal.className = 'custom-modal hidden account-confirm-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('aria-labelledby', 'accountConfirmTitle');
  modal.setAttribute('aria-describedby', 'accountConfirmMessage');
  modal.innerHTML = `
    <div class="modal-content account-confirm-content" data-modal-content>
      <h3 id="accountConfirmTitle">Confirm action</h3>
      <p id="accountConfirmMessage" class="text-muted mb-0"></p>
      <div class="account-confirm-actions">
        <button type="button" class="btn btn-outline-secondary" data-confirm-result="cancel">Cancel</button>
        <button type="button" class="btn btn-danger" data-confirm-result="confirm">Confirm</button>
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => {
    const action = e.target.closest('[data-confirm-result]');
    if (action) {
      closeAccountConfirm(action.getAttribute('data-confirm-result') === 'confirm');
      return;
    }
    if (e.target === modal) closeAccountConfirm(false);
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAccountConfirm(false);
  });
  document.body.appendChild(modal);
  return modal;
}

function accountConfirm({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'danger' } = {}) {
  const modal = ensureAccountConfirmModal();
  if (accountConfirmResolve) closeAccountConfirm(false);

  const titleEl = modal.querySelector('#accountConfirmTitle');
  const messageEl = modal.querySelector('#accountConfirmMessage');
  const confirmBtn = modal.querySelector('[data-confirm-result="confirm"]');
  const cancelBtn = modal.querySelector('[data-confirm-result="cancel"]');

  if (titleEl) titleEl.textContent = title || 'Confirm action';
  if (messageEl) messageEl.textContent = message || 'Please confirm this action.';
  if (confirmBtn) {
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = `btn btn-${tone === 'warning' ? 'warning' : 'danger'}`;
  }
  if (cancelBtn) cancelBtn.textContent = cancelLabel;

  accountConfirmLastFocus = document.activeElement;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const content = modal.querySelector('[data-modal-content]') || modal.querySelector('.modal-content');
  if (content) content.setAttribute('tabindex', '-1');
  (confirmBtn || content || modal).focus();

  return new Promise(resolve => { accountConfirmResolve = resolve; });
}

// Close when clicking the dim overlay (outside .modal-content)
document.addEventListener('click', (e) => {
  const m = e.target.closest('.custom-modal');
  if (!m) return;
  const content = m.querySelector('.modal-content');
  if (content && !content.contains(e.target) && !e.target.closest('[data-action]')) {
    closeModal(m.id);
  }
});

//
// -------------------------------
// Session + gated content toggle
// -------------------------------
async function loadSession() {
  const res = await fetch('/api/session', { credentials: 'include' });
  if (!res.ok) {
    toggleAuthUI(false);
    return { signedIn: false };
  }
  const data = await res.json();
  toggleAuthUI(!!data?.signedIn, data?.email);
  return data;
}

function toggleAuthUI(signedIn, email = '') {
  const signedOut = document.querySelector('[data-auth="signed-out"]');
  const signedInEl = document.querySelector('[data-auth="signed-in"]');
  const gated = document.querySelector('[data-auth-visible="signed-in"]');
  if (signedIn) {
    hide(signedOut); show(signedInEl); show(gated);
    const ue = document.getElementById('userEmail'); if (ue) ue.textContent = email || '';
  } else {
    show(signedOut); hide(signedInEl); hide(gated);
    clearAccountAlert();
  }
}

document.addEventListener('click', (e) => {
  const closer = e.target.closest('[data-close]');
  if (closer) {
    const id = closer.getAttribute('data-close');
    if (id) closeModal(id);
  }
});

document.addEventListener('keydown', (e) => {
  const fileLabel = e.target.closest?.('.account-file-label[for]');
  if (!fileLabel || (e.key !== 'Enter' && e.key !== ' ')) return;
  const targetId = fileLabel.getAttribute('for');
  if (!targetId || !['editPetAvatar', 'newPetAvatar'].includes(targetId)) return;
  e.preventDefault();
  document.getElementById(targetId)?.click();
});

//
// -------------------------------
// Pets — list, add, edit, delete
// -------------------------------
let PETS = [];                     // latest cache from GET /api/pets
let PAWKET_PALS = [];              // private Pawket Pal certificates from /api/pals
let ADDRESSES = [];                // latest cache from GET /api/addresses
let CURRENT_PET_ID = null;
let CURRENT_PET_SNAPSHOT = null;   // used to compute minimal diff
let CURRENT_AVATAR_DATAURL = null; // set when user picks an avatar file
let ADD_PET_AVATAR_DATAURL = null; // set when user stages a new-pet avatar
let PET_JOURNAL_SUMMARIES = new Map();
let PET_JOURNAL_SUMMARY_RUN = 0;

const PET_DETAIL_OTHER_VALUE = '__other__';
const PET_DETAIL_OPTIONS = {
  dog: {
    label: 'Breed',
    placeholder: 'Select a dog breed',
    otherLabel: 'Other dog breed',
    help: 'Choose a common dog breed, or select Other to type it in.',
    options: [
      'Mixed Breed', 'Labrador Retriever', 'Golden Retriever', 'French Bulldog', 'German Shepherd',
      'Poodle', 'Doodle / Poodle Mix', 'Bulldog', 'Beagle', 'Rottweiler', 'Dachshund',
      'Pembroke Welsh Corgi', 'Australian Shepherd', 'Yorkshire Terrier', 'Boxer', 'Great Dane',
      'Siberian Husky', 'Cavalier King Charles Spaniel', 'Shih Tzu', 'Boston Terrier', 'Pomeranian',
      'Havanese', 'Border Collie', 'Chihuahua', 'Maltese', 'Pit Bull / Bully Mix'
    ],
  },
  cat: {
    label: 'Breed',
    placeholder: 'Select a cat breed',
    otherLabel: 'Other cat breed',
    help: 'Choose a common cat breed, or select Other to type it in.',
    options: [
      'Domestic Shorthair', 'Domestic Medium Hair', 'Domestic Longhair', 'Maine Coon', 'Siamese',
      'Ragdoll', 'British Shorthair', 'Bengal', 'Persian', 'Sphynx', 'Abyssinian',
      'Russian Blue', 'Scottish Fold', 'American Shorthair', 'Norwegian Forest Cat',
      'Oriental Shorthair', 'Birman', 'Devon Rex', 'Cornish Rex', 'Himalayan'
    ],
  },
  bird: {
    label: 'Bird species',
    placeholder: 'Select a bird species',
    otherLabel: 'Other bird species',
    help: 'Birds are usually described by species or type rather than breed.',
    options: [
      'African Grey Parrot', 'Amazon Parrot', 'Blue-fronted Amazon Parrot', 'Budgerigar / Parakeet',
      'Canary', 'Cockatiel', 'Cockatoo', 'Conure', 'Dove', 'Eclectus Parrot', 'Finch',
      'Indian Ringneck Parakeet', 'Lovebird', 'Macaw', 'Parrotlet', 'Pionus Parrot',
      'Quaker Parrot', 'Senegal Parrot', 'Lorikeet', 'Toucan'
    ],
  },
  rabbit: {
    label: 'Rabbit breed',
    placeholder: 'Select a rabbit breed',
    otherLabel: 'Other rabbit breed',
    help: 'Choose a common rabbit breed, or select Other to type it in.',
    options: [
      'Holland Lop', 'Mini Lop', 'Netherland Dwarf', 'Lionhead', 'Mini Rex', 'Rex',
      'Dutch', 'Flemish Giant', 'English Angora', 'French Lop', 'Californian',
      'New Zealand', 'Harlequin', 'Jersey Wooly'
    ],
  },
  hamster: {
    label: 'Hamster type',
    placeholder: 'Select a hamster type',
    otherLabel: 'Other hamster type',
    help: 'Choose a common hamster type, or select Other to type it in.',
    options: ['Syrian Hamster', 'Dwarf Campbell Hamster', 'Dwarf Winter White Hamster', 'Roborovski Hamster', 'Chinese Hamster'],
  },
  'guinea pig': {
    label: 'Guinea pig breed',
    placeholder: 'Select a guinea pig breed',
    otherLabel: 'Other guinea pig breed',
    help: 'Choose a common guinea pig breed, or select Other to type it in.',
    options: ['American', 'Abyssinian', 'Peruvian', 'Teddy', 'Texel', 'Silkie / Sheltie', 'Skinny Pig', 'Coronet'],
  },
  reptile: {
    label: 'Reptile species',
    placeholder: 'Select a reptile species',
    otherLabel: 'Other reptile species',
    help: 'Choose a common reptile species, or select Other to type it in.',
    options: [
      'Bearded Dragon', 'Leopard Gecko', 'Crested Gecko', 'Ball Python', 'Corn Snake',
      'King Snake', 'Boa Constrictor', 'Russian Tortoise', 'Red-eared Slider', 'Greek Tortoise',
      'Blue-tongued Skink', 'Green Iguana', 'Chameleon'
    ],
  },
  fish: {
    label: 'Fish type',
    placeholder: 'Select a fish type',
    otherLabel: 'Other fish type',
    help: 'Choose a common fish type, or select Other to type it in.',
    options: [
      'Betta', 'Goldfish', 'Guppy', 'Tetra', 'Molly', 'Platy', 'Angelfish', 'Cichlid',
      'Corydoras Catfish', 'Pleco', 'Koi', 'Discus', 'Gourami', 'Clownfish'
    ],
  },
  horse: {
    label: 'Horse breed',
    placeholder: 'Select a horse breed',
    otherLabel: 'Other horse breed',
    help: 'Choose a common horse breed, or select Other to type it in.',
    options: [
      'Quarter Horse', 'Thoroughbred', 'Arabian', 'Paint Horse', 'Appaloosa', 'Morgan',
      'Tennessee Walking Horse', 'Friesian', 'Clydesdale', 'Mustang', 'Warmblood', 'Shetland Pony'
    ],
  },
  ferret: {
    label: 'Ferret type',
    placeholder: 'Select a ferret type',
    otherLabel: 'Other ferret type',
    help: 'Choose a common ferret coat/type, or select Other to type it in.',
    options: ['Sable', 'Black Sable', 'Albino', 'Champagne', 'Chocolate', 'Cinnamon', 'Panda', 'Silver', 'Mixed / Unknown'],
  },
  other: {
    label: 'Breed / species / type',
    placeholder: 'Select an option',
    otherLabel: 'Other',
    help: 'Choose Other to type the best description for this pet.',
    options: ['Mixed / Unknown'],
  },
};

function normalizePetSpeciesForDetail(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return 'other';
  if (value.includes('guinea')) return 'guinea pig';
  if (value.includes('bird') || value.includes('parrot') || value.includes('parakeet') ||
      value.includes('cockatiel') || value.includes('cockatoo') || value.includes('macaw') ||
      value.includes('conure') || value.includes('finch') || value.includes('canary') ||
      value.includes('lovebird') || value.includes('amazon') || value.includes('lorikeet') ||
      value.includes('dove')) return 'bird';
  if (value.includes('dog') || value.includes('puppy') || value.includes('canine')) return 'dog';
  if (value.includes('cat') || value.includes('kitten') || value.includes('feline')) return 'cat';
  if (value.includes('rabbit') || value.includes('bunny')) return 'rabbit';
  if (value.includes('hamster')) return 'hamster';
  if (value.includes('reptile') || value.includes('lizard') || value.includes('snake') || value.includes('turtle') || value.includes('tortoise') || value.includes('gecko')) return 'reptile';
  if (value.includes('fish') || value.includes('betta') || value.includes('goldfish')) return 'fish';
  if (value.includes('horse') || value.includes('pony')) return 'horse';
  if (value.includes('ferret')) return 'ferret';
  return PET_DETAIL_OPTIONS[value] ? value : 'other';
}

function getPetDetailConfig(species) {
  return PET_DETAIL_OPTIONS[normalizePetSpeciesForDetail(species)] || PET_DETAIL_OPTIONS.other;
}

function getPetDetailLabel(species) {
  return getPetDetailConfig(species).label || 'Breed / species / type';
}

function titleCasePetLabel(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .map(part => part ? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}` : '')
    .join(' ');
}

function formatPetSpecies(species) {
  const normalized = normalizePetSpeciesForDetail(species);
  if (!species) return '';
  if (normalized === 'other') return titleCasePetLabel(species);
  return titleCasePetLabel(normalized);
}

function formatPetValue(value, fallback = 'Unknown') {
  if (value === null || value === undefined || value === '') return fallback;
  return titleCasePetLabel(value);
}

function getPetFixedLabel(pet = {}) {
  const fixed = pet.spayedNeutered ?? pet.spayed_neutered;
  if (fixed === true) return 'Yes';
  if (fixed === false) return 'No';
  return 'Unknown';
}

function getPetCardTone(species) {
  const normalized = normalizePetSpeciesForDetail(species);
  if (['dog', 'cat', 'bird', 'rabbit', 'hamster', 'guinea pig', 'reptile', 'fish', 'horse', 'ferret'].includes(normalized)) {
    return normalized.replace(/\s+/g, '-');
  }
  return 'other';
}

function getPetCardState(summary = emptyJournalSummary()) {
  const entries = Number(summary.entries || 0);
  const core = Number(summary.core || 0);
  if (summary.state === 'loading') {
    return { tone: 'loading', icon: 'bi-arrow-repeat', label: 'Loading care trail' };
  }
  if (summary.state === 'error') {
    return { tone: 'attention', icon: 'bi-exclamation-triangle', label: 'Care trail unavailable' };
  }
  if (core > 0) {
    return { tone: 'core', icon: 'bi-stars', label: 'Favorite memory saved' };
  }
  if (entries > 0) {
    return { tone: 'active', icon: 'bi-journal-check', label: 'Care trail active' };
  }
  return { tone: 'ready', icon: 'bi-lock', label: 'Private profile' };
}

function renderPetCardState(summary = emptyJournalSummary()) {
  const state = getPetCardState(summary);
  return `
    <span class="account-pet-state-badge is-${escapeHtml(state.tone)}" data-pet-card-state>
      <i class="bi ${escapeHtml(state.icon)}" aria-hidden="true"></i>
      <span>${escapeHtml(state.label)}</span>
    </span>`;
}

function sortJournalEntriesNewestFirst(entries = []) {
  return entries.slice().sort((a, b) => {
    const aTime = new Date(a.occurredAt || a.createdAt || 0).getTime() || 0;
    const bTime = new Date(b.occurredAt || b.createdAt || 0).getTime() || 0;
    return bTime - aTime;
  });
}

function summarizeJournalEntries(entries = []) {
  const normalized = sortJournalEntriesNewestFirst(entries.map(normalizeJournalEntry));
  const coreEntries = normalized.filter(entry => entry.highlighted);
  const latest = normalized[0] || null;
  const coreLatest = coreEntries[0] || null;
  const handoffTargets = new Set();

  normalized.forEach(entry => {
    const targets = Array.isArray(entry.metadata?.handoffTargets)
      ? entry.metadata.handoffTargets
      : inferJournalHandoffTargets(entry);
    targets.forEach(target => handoffTargets.add(target));
  });

  return {
    state: 'ready',
    entries: normalized.length,
    core: coreEntries.length,
    latest,
    coreLatest,
    handoffTargets: [...handoffTargets],
  };
}

function emptyJournalSummary(state = 'loading') {
  return {
    state,
    entries: 0,
    core: 0,
    latest: null,
    coreLatest: null,
    handoffTargets: [],
  };
}

function renderPetJournalSummary(summary = emptyJournalSummary()) {
  if (summary.state === 'error') {
    return `
      <div class="account-pet-journal-status" data-pet-journal-status>
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <span>Journal summary unavailable</span>
      </div>`;
  }

  if (summary.state === 'loading') {
    return `
      <div class="account-pet-journal-status" data-pet-journal-status>
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        <span>Loading story trail...</span>
      </div>`;
  }

  const latest = summary.latest;
  const coreLatest = summary.coreLatest;
  const latestTitle = latest ? (latest.title || defaultJournalTitle(latest)) : '';
  const latestDate = latest ? formatJournalDate(latest.occurredAt || latest.createdAt, '') : '';
  const coreTitle = coreLatest ? (coreLatest.title || defaultJournalTitle(coreLatest)) : '';
  const handoffCount = summary.handoffTargets.length;
  const handoffs = summary.handoffTargets.length
    ? summary.handoffTargets.slice(0, 4).map(target => (
        `<span>${escapeHtml(JOURNAL_HANDOFF_LABELS[target] || target)}</span>`
      )).join('')
    : '<span>Ready for a Pal</span>';

  return `
    <div class="account-pet-summary-shell">
      <div class="account-pet-stats" aria-label="Pet journal summary">
        <span><strong data-pet-journal-count>${summary.entries}</strong><small>${summary.entries === 1 ? 'entry' : 'entries'}</small></span>
        <span><strong data-pet-core-count>${summary.core}</strong><small>Favorites</small></span>
        <span><strong>${handoffCount}</strong><small>${handoffCount === 1 ? 'step' : 'steps'}</small></span>
      </div>
      <div class="account-pet-story-stack">
        <div class="account-pet-memory ${summary.core ? 'has-core-memory' : ''}" data-pet-core-summary>
          <i class="bi ${summary.core ? 'bi-stars' : 'bi-journal-plus'}" aria-hidden="true"></i>
          <div>
            <strong>${summary.core ? 'Favorite memory saved' : 'Favorite memory ready'}</strong>
            <span>${summary.core ? escapeHtml(coreTitle) : 'Mark one meaningful entry when the moment is ready.'}</span>
          </div>
        </div>
        <div class="account-pet-latest">
          <i class="bi bi-clock-history" aria-hidden="true"></i>
          <span>${latest ? `Latest${latestDate ? ` ${escapeHtml(latestDate.split(',')[0])}` : ''}: ${escapeHtml(latestTitle)}` : 'Add the first care note, story moment, or favorite memory.'}</span>
        </div>
      </div>
      <div class="account-pet-handoff-row">
        <span class="account-pet-handoff-label">Suggested next steps</span>
        <div class="account-pet-handoff-tags" aria-label="Suggested Pet Pawket next steps">${handoffs}</div>
      </div>
    </div>`;
}

function getPalsForPet(petId) {
  if (!petId) return [];
  return PAWKET_PALS.filter(pal => String(pal.inspiredByPetId || '') === String(petId));
}

function getPalsForJournalEntry(entryId) {
  if (!entryId) return [];
  return PAWKET_PALS.filter(pal => String(pal.sourceJournalEntryId || '') === String(entryId));
}

function palStatusLabel(pal = {}) {
  if (pal.consentState === 'review_required') return 'Sharing requested';
  if (pal.privacyState === 'private') return 'Private';
  return String(pal.privacyState || 'Private').replace(/_/g, ' ');
}

function palClassLabel(value = '') {
  return String(value || 'honorary')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function formatAccountPalDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderAccountPawketPals(pals = []) {
  const summary = document.querySelector('[data-account-pal-summary]');
  const count = document.querySelector('[data-account-pal-count]');
  if (!summary) return;

  if (count) count.textContent = `${pals.length} ${pals.length === 1 ? 'Pal' : 'Pals'}`;

  if (!pals.length) {
    summary.innerHTML = `
      <div class="account-pal-empty">
        <div class="account-pal-empty-icon"><i class="bi bi-stars" aria-hidden="true"></i></div>
        <div>
          <strong>No private Pals yet.</strong>
          <p class="mb-0">Honor a pet profile or favorite memory to create the first private Pawket Pal, or send a private-first story when sharing may feel right.</p>
        </div>
        <div class="account-pal-source-map" aria-label="Private Pawket Pal source path">
          <span><i class="bi bi-person-heart" aria-hidden="true"></i><strong>Profile</strong><small>Pet details</small></span>
          <span><i class="bi bi-stars" aria-hidden="true"></i><strong>Memory</strong><small>Private note</small></span>
          <span><i class="bi bi-patch-check" aria-hidden="true"></i><strong>Pal</strong><small>Keepsake</small></span>
          <span><i class="bi bi-shield-check" aria-hidden="true"></i><strong>Share</strong><small>Only by choice</small></span>
        </div>
        <div class="account-pal-empty-actions">
          <a class="btn btn-primary btn-sm" href="${buildPawketPalHandoffUrl()}">
            <i class="bi bi-patch-plus" aria-hidden="true"></i> Create Pal
          </a>
          <a class="btn btn-outline-primary btn-sm" href="/pals.html#pal-story-intake">
            <i class="bi bi-send-heart" aria-hidden="true"></i> Submit story
          </a>
        </div>
      </div>`;
    return;
  }

  const petLinked = pals.filter(pal => pal.inspiredByPetId).length;
  const memoryLinked = pals.filter(pal => pal.sourceJournalEntryId).length;
  const reviewCount = pals.filter(pal => pal.consentState === 'review_required').length;
  const latestCards = pals.slice(0, 3).map(pal => {
    const created = formatAccountPalDate(pal.createdAt);
    const href = buildPawketPalHandoffUrl({ heartCode: pal.heartCode, source: 'account-heartcode' });
    return `
      <article class="account-pal-mini-card">
        <span class="account-pal-chip">${escapeHtml(palStatusLabel(pal))}</span>
        <h3>${escapeHtml(pal.name || 'Honorary Pawket Pal')}</h3>
        <code>${escapeHtml(pal.heartCode || '')}</code>
        <div class="account-pal-card-meta">
          <span>${escapeHtml(palClassLabel(pal.palClass))}</span>
          ${created ? `<span>${escapeHtml(created)}</span>` : ''}
        </div>
        <a class="btn btn-sm btn-outline-primary" href="${escapeHtml(href)}">
          <i class="bi bi-patch-check" aria-hidden="true"></i> Open
        </a>
      </article>`;
  }).join('');

  summary.innerHTML = `
    <div class="account-pal-dashboard">
      <div class="account-pal-metrics" aria-label="Private Pawket Pal summary">
        <span><strong>${pals.length}</strong><small>Pals</small></span>
        <span><strong>${petLinked}</strong><small>Pet links</small></span>
        <span><strong>${memoryLinked}</strong><small>Memory links</small></span>
        <span><strong>${reviewCount}</strong><small>Share requests</small></span>
      </div>
      <div class="account-pal-source-map" aria-label="Private Pawket Pal source path">
        <span><i class="bi bi-person-heart" aria-hidden="true"></i><strong>Profile</strong><small>Pet details</small></span>
        <span><i class="bi bi-journal-heart" aria-hidden="true"></i><strong>Journal</strong><small>Story notes</small></span>
        <span><i class="bi bi-stars" aria-hidden="true"></i><strong>Memory</strong><small>Private note</small></span>
        <span><i class="bi bi-patch-check" aria-hidden="true"></i><strong>Pal</strong><small>Keepsake</small></span>
      </div>
      <div class="account-pal-paths" aria-label="Pawket Pal path boundaries">
        <span><i class="bi bi-lock" aria-hidden="true"></i><strong>Private Pals</strong><small>Stay in your account unless you ask to share.</small></span>
        <span><i class="bi bi-shield-check" aria-hidden="true"></i><strong>Sharing check</strong><small>Stories are checked before any public use.</small></span>
        <span><i class="bi bi-chat-heart" aria-hidden="true"></i><strong>Community previews</strong><small>Only chosen story details reach Town Square.</small></span>
      </div>
      <div class="account-pal-mini-grid">${latestCards}</div>
      <div class="account-pal-next">
        <div>
          <strong>Keep private stories close.</strong>
          <span>Pet profiles and favorite memories now connect directly to private Honorary Pals.</span>
        </div>
        <div class="account-pal-next-actions">
          <a class="btn btn-outline-primary btn-sm" href="${buildPawketPalHandoffUrl()}">
            <i class="bi bi-stars" aria-hidden="true"></i> Open Pawket Pals
          </a>
          <a class="btn btn-outline-primary btn-sm" href="/pals.html#pal-story-intake">
            <i class="bi bi-send-heart" aria-hidden="true"></i> Submit story
          </a>
        </div>
      </div>
    </div>`;
}

async function loadPawketPals() {
  const summary = document.querySelector('[data-account-pal-summary]');
  if (summary) summary.innerHTML = '<p class="text-muted mb-0">Loading private Pawket Pals...</p>';

  try {
    const res = await authFetch('/api/pals?limit=24');
    if (res.status === 401) {
      PAWKET_PALS = [];
      renderAccountPawketPals([]);
      return;
    }
    if (!res.ok) throw new Error('Pawket Pal fetch failed');
    const payload = await res.json().catch(() => ({}));
    PAWKET_PALS = Array.isArray(payload?.pals) ? payload.pals : [];
    renderAccountPawketPals(PAWKET_PALS);
    if (PETS.length) renderPets(PETS);
  } catch (err) {
    console.warn('[account.js] private Pawket Pals failed:', err);
    PAWKET_PALS = [];
    if (summary) {
      summary.innerHTML = `
        <div class="account-empty-state account-empty-state--compact">
          <strong>Private Pals could not load.</strong>
          <p class="mb-0">Refresh the page or open Pawket Pals directly to manage certificates.</p>
        </div>`;
    }
  }
}

function setPetJournalSummary(petId, summary) {
  if (!petId) return;
  PET_JOURNAL_SUMMARIES.set(String(petId), summary);
  const target = document.querySelector(`[data-pet-journal-summary="${CSS.escape(String(petId))}"]`);
  if (target) target.innerHTML = renderPetJournalSummary(summary);
  const card = document.querySelector(`[data-pet-id="${CSS.escape(String(petId))}"]`);
  if (card) {
    card.classList.toggle('has-core-memory', !!summary?.core);
    card.setAttribute('data-core-memory-count', String(summary?.core || 0));
    card.setAttribute('data-journal-entry-count', String(summary?.entries || 0));
    const stateTarget = card.querySelector('[data-pet-card-state]');
    if (stateTarget) {
      const state = getPetCardState(summary);
      stateTarget.className = `account-pet-state-badge is-${state.tone}`;
      stateTarget.innerHTML = `<i class="bi ${state.icon}" aria-hidden="true"></i><span>${escapeHtml(state.label)}</span>`;
    }
    const coreDot = card.querySelector('.account-pet-core-dot');
    if (coreDot) {
      const hasCore = !!summary?.core;
      coreDot.setAttribute('title', hasCore ? 'Favorite memory saved' : 'No favorite memory yet');
      coreDot.innerHTML = `<i class="bi ${hasCore ? 'bi-stars' : 'bi-journal'}" aria-hidden="true"></i>`;
    }
  }
}

async function hydratePetJournalSummaries(pets = []) {
  const run = ++PET_JOURNAL_SUMMARY_RUN;
  await Promise.allSettled((Array.isArray(pets) ? pets : []).map(async pet => {
    if (!pet?.id) return;
    setPetJournalSummary(pet.id, PET_JOURNAL_SUMMARIES.get(String(pet.id)) || emptyJournalSummary('loading'));
    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(pet.id)}/journal`, { credentials: 'include' });
      if (!res.ok) throw new Error('Pet journal summary fetch failed');
      const payload = await res.json().catch(() => ({}));
      const entries = Array.isArray(payload)
        ? payload
        : (payload.journal || payload.entries || payload.items || []);
      if (run !== PET_JOURNAL_SUMMARY_RUN) return;
      setPetJournalSummary(pet.id, summarizeJournalEntries(entries || []));
    } catch (err) {
      if (run !== PET_JOURNAL_SUMMARY_RUN) return;
      console.warn('[account.js] pet journal summary failed:', err);
      setPetJournalSummary(pet.id, emptyJournalSummary('error'));
    }
  }));
}

function syncPetDetailValueFromControls() {
  const hidden = document.getElementById('editPetBreed');
  const select = document.getElementById('editPetBreedSelect');
  const other = document.getElementById('editPetBreedOther');
  if (!hidden || !select) return '';

  const value = select.value === PET_DETAIL_OTHER_VALUE
    ? (other?.value || '').trim()
    : (select.value || '').trim();
  hidden.value = value;
  return value;
}

function syncAddPetDetailValueFromControls() {
  const hidden = document.getElementById('newPetBreed');
  const select = document.getElementById('newPetBreedSelect');
  const other = document.getElementById('newPetBreedOther');
  if (!hidden || !select) return '';

  const value = select.value === PET_DETAIL_OTHER_VALUE
    ? (other?.value || '').trim()
    : (select.value || '').trim();
  hidden.value = value;
  return value;
}

function configurePetDetailField(species, currentValue = '') {
  const cfg = getPetDetailConfig(species);
  const label = document.getElementById('editPetBreedLabel');
  const select = document.getElementById('editPetBreedSelect');
  const other = document.getElementById('editPetBreedOther');
  const hidden = document.getElementById('editPetBreed');
  const help = document.getElementById('editPetBreedHelp');
  if (!select || !hidden) return;

  if (label) label.textContent = cfg.label;
  if (help) help.textContent = cfg.help;

  const options = Array.isArray(cfg.options) ? cfg.options : [];
  const current = String(currentValue || '').trim();
  select.innerHTML = [
    `<option value="">${escapeHtml(cfg.placeholder || 'Select an option')}</option>`,
    ...options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="${PET_DETAIL_OTHER_VALUE}">${escapeHtml(cfg.otherLabel || 'Other')}</option>`,
  ].join('');

  const matched = options.find(value => value.toLowerCase() === current.toLowerCase());
  if (matched) {
    select.value = matched;
    if (other) {
      other.value = '';
      other.classList.add('d-none');
      other.required = false;
    }
    hidden.value = matched;
  } else if (current) {
    select.value = PET_DETAIL_OTHER_VALUE;
    if (other) {
      other.value = current;
      other.placeholder = cfg.otherLabel || 'Other';
      other.classList.remove('d-none');
      other.required = true;
    }
    hidden.value = current;
  } else {
    select.value = '';
    if (other) {
      other.value = '';
      other.placeholder = cfg.otherLabel || 'Other';
      other.classList.add('d-none');
      other.required = false;
    }
    hidden.value = '';
  }
}

function configureAddPetDetailField(species, currentValue = '') {
  const cfg = getPetDetailConfig(species);
  const label = document.getElementById('newPetBreedLabel');
  const select = document.getElementById('newPetBreedSelect');
  const other = document.getElementById('newPetBreedOther');
  const hidden = document.getElementById('newPetBreed');
  const help = document.getElementById('newPetBreedHelp');
  if (!select || !hidden) return;

  if (label) label.textContent = cfg.label;
  if (help) help.textContent = cfg.help;

  const options = Array.isArray(cfg.options) ? cfg.options : [];
  const current = String(currentValue || '').trim();
  select.innerHTML = [
    `<option value="">${escapeHtml(cfg.placeholder || 'Select an option')}</option>`,
    ...options.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`),
    `<option value="${PET_DETAIL_OTHER_VALUE}">${escapeHtml(cfg.otherLabel || 'Other')}</option>`,
  ].join('');

  const matched = options.find(value => value.toLowerCase() === current.toLowerCase());
  if (matched) {
    select.value = matched;
    if (other) {
      other.value = '';
      other.classList.add('d-none');
      other.required = false;
    }
    hidden.value = matched;
  } else if (current) {
    select.value = PET_DETAIL_OTHER_VALUE;
    if (other) {
      other.value = current;
      other.placeholder = cfg.otherLabel || 'Other';
      other.classList.remove('d-none');
      other.required = true;
    }
    hidden.value = current;
  } else {
    select.value = '';
    if (other) {
      other.value = '';
      other.placeholder = cfg.otherLabel || 'Other';
      other.classList.add('d-none');
      other.required = false;
    }
    hidden.value = '';
  }
}

function updateEditPetModalChrome({ name, species, detail } = {}) {
  const titleEl = document.querySelector('[data-edit-pet-title]');
  const subtitleEl = document.querySelector('[data-edit-pet-subtitle]');
  const pillEl = document.querySelector('[data-edit-pet-species-pill]');
  const petName = String(name || document.getElementById('editPetName')?.value || '').trim();
  const speciesValue = String(species || document.getElementById('editPetType')?.value || '').trim();
  const detailValue = String(detail || document.getElementById('editPetBreed')?.value || '').trim();
  const speciesLabel = formatPetSpecies(speciesValue) || 'Pet profile';
  const detailLabel = getPetDetailLabel(speciesValue).toLowerCase();

  if (titleEl) titleEl.textContent = petName ? `Edit ${petName}` : 'Edit pet profile';
  if (subtitleEl) {
    subtitleEl.textContent = detailValue
      ? `${speciesLabel} profile with ${detailLabel}: ${detailValue}.`
      : `${speciesLabel} profile details for Pawket Packs, journals, and care notes.`;
  }
  if (pillEl) pillEl.textContent = speciesLabel;
}

function updateAddPetModalChrome({ name, species, detail } = {}) {
  const titleEl = document.querySelector('[data-add-pet-title]');
  const subtitleEl = document.querySelector('[data-add-pet-subtitle]');
  const pillEl = document.querySelector('[data-add-pet-species-pill]');
  const petName = String(name || document.getElementById('newPetName')?.value || '').trim();
  const speciesValue = String(species || document.getElementById('newPetType')?.value || '').trim();
  const detailValue = String(detail || document.getElementById('newPetBreed')?.value || '').trim();
  const speciesLabel = formatPetSpecies(speciesValue) || 'New profile';
  const detailLabel = getPetDetailLabel(speciesValue).toLowerCase();

  if (titleEl) titleEl.textContent = petName ? `Add ${petName}` : 'Add a pet profile';
  if (subtitleEl) {
    subtitleEl.textContent = detailValue
      ? `${speciesLabel} profile with ${detailLabel}: ${detailValue}.`
      : `${speciesLabel} details for Pawket Packs, journals, and care notes.`;
  }
  if (pillEl) pillEl.textContent = speciesLabel;
}

function wirePetDetailField() {
  const typeEl = document.getElementById('editPetType');
  const nameEl = document.getElementById('editPetName');
  const select = document.getElementById('editPetBreedSelect');
  const other = document.getElementById('editPetBreedOther');
  if (nameEl && !nameEl.dataset.petChromeWired) {
    nameEl.dataset.petChromeWired = '1';
    nameEl.addEventListener('input', () => updateEditPetModalChrome());
  }
  if (typeEl && !typeEl.dataset.petDetailWired) {
    typeEl.dataset.petDetailWired = '1';
    typeEl.addEventListener('change', () => {
      configurePetDetailField(typeEl.value, '');
      updateEditPetModalChrome({ species: typeEl.value, detail: '' });
    });
  }
  if (select && !select.dataset.petDetailWired) {
    select.dataset.petDetailWired = '1';
    select.addEventListener('change', () => {
      const cfg = getPetDetailConfig(typeEl?.value);
      if (other) {
        const isOther = select.value === PET_DETAIL_OTHER_VALUE;
        other.classList.toggle('d-none', !isOther);
        other.required = isOther;
        other.placeholder = cfg.otherLabel || 'Other';
        if (isOther) other.focus();
        else other.value = '';
      }
      const detail = syncPetDetailValueFromControls();
      updateEditPetModalChrome({ species: typeEl?.value, detail });
    });
  }
  if (other && !other.dataset.petDetailWired) {
    other.dataset.petDetailWired = '1';
    other.addEventListener('input', () => {
      const detail = syncPetDetailValueFromControls();
      updateEditPetModalChrome({ species: typeEl?.value, detail });
    });
  }
}

function wireAddPetDetailField() {
  const typeEl = document.getElementById('newPetType');
  const nameEl = document.getElementById('newPetName');
  const select = document.getElementById('newPetBreedSelect');
  const other = document.getElementById('newPetBreedOther');
  if (nameEl && !nameEl.dataset.petChromeWired) {
    nameEl.dataset.petChromeWired = '1';
    nameEl.addEventListener('input', () => updateAddPetModalChrome());
  }
  if (typeEl && !typeEl.dataset.petDetailWired) {
    typeEl.dataset.petDetailWired = '1';
    typeEl.addEventListener('change', () => {
      configureAddPetDetailField(typeEl.value, '');
      updateAddPetModalChrome({ species: typeEl.value, detail: '' });
    });
  }
  if (select && !select.dataset.petDetailWired) {
    select.dataset.petDetailWired = '1';
    select.addEventListener('change', () => {
      const cfg = getPetDetailConfig(typeEl?.value);
      if (other) {
        const isOther = select.value === PET_DETAIL_OTHER_VALUE;
        other.classList.toggle('d-none', !isOther);
        other.required = isOther;
        other.placeholder = cfg.otherLabel || 'Other';
        if (isOther) other.focus();
        else other.value = '';
      }
      const detail = syncAddPetDetailValueFromControls();
      updateAddPetModalChrome({ species: typeEl?.value, detail });
    });
  }
  if (other && !other.dataset.petDetailWired) {
    other.dataset.petDetailWired = '1';
    other.addEventListener('input', () => {
      const detail = syncAddPetDetailValueFromControls();
      updateAddPetModalChrome({ species: typeEl?.value, detail });
    });
  }
}

function writeAddPetTraitsJson() {
  const input = document.getElementById('addPetTraitsJson');
  if (input) input.value = JSON.stringify(collectAddPetTraits());
}

function collectAddPetTraits() {
  const modal = document.getElementById('addPetModal');
  if (!modal) return {};
  const traits = {};

  modal.querySelectorAll('[data-add-trait]').forEach(group => {
    const key = group.getAttribute('data-add-trait');
    if (!key) return;
    const multi = group.getAttribute('data-multi') === 'true';
    const selected = Array.from(group.querySelectorAll('.trait-chip[aria-pressed="true"]'))
      .map(btn => String(btn.dataset.value || '').trim())
      .filter(Boolean);
    if (multi) {
      if (selected.length) traits[key] = selected;
    } else if (selected[0]) {
      traits[key] = selected[0];
    }
  });

  modal.querySelectorAll('[data-add-trait-key]').forEach(input => {
    const key = input.getAttribute('data-add-trait-key');
    if (!key) return;
    const raw = String(input.value || '').trim();
    if (!raw) return;
    if (input.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) traits[key] = n;
    } else {
      traits[key] = raw;
    }
  });

  return traits;
}

function resetAddPetTraitControls() {
  const modal = document.getElementById('addPetModal');
  if (!modal) return;
  modal.querySelectorAll('[data-add-trait]').forEach(group => {
    const multi = group.getAttribute('data-multi') === 'true';
    const chips = Array.from(group.querySelectorAll('.trait-chip'));
    if (multi) {
      chips.forEach(chip => chip.setAttribute('aria-pressed', 'false'));
      return;
    }
    const unknown = chips.find(chip => String(chip.dataset.value || '').toLowerCase() === 'unknown');
    chips.forEach(chip => chip.setAttribute('aria-pressed', chip === unknown ? 'true' : 'false'));
  });
  const allergyWrap = modal.querySelector('[data-add-trait="allergies"]');
  if (allergyWrap) allergyWrap.innerHTML = '';
  modal.querySelectorAll('[data-add-trait-key], [data-add-trait-input]').forEach(input => { input.value = ''; });
  writeAddPetTraitsJson();
}

function addAddPetAllergyChip(value) {
  const allergyWrap = document.querySelector('#addPetModal [data-add-trait="allergies"]');
  if (!allergyWrap) return;
  const clean = String(value || '').trim();
  if (!clean) return;
  const exists = Array.from(allergyWrap.querySelectorAll('.trait-chip'))
    .some(chip => String(chip.dataset.value || '').toLowerCase() === clean.toLowerCase());
  if (exists) return;
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'trait-chip';
  chip.dataset.value = clean;
  chip.setAttribute('aria-pressed', 'true');
  chip.textContent = clean;
  allergyWrap.appendChild(chip);
  writeAddPetTraitsJson();
}

const EDIT_TRAIT_FIELDS = {
  neckIn: '#trait-neck-in',
  chestIn: '#trait-chest-in',
  backIn: '#trait-back-in',
  notes: '#trait-notes',
};

function normalizeTraitList(value) {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function collectEditPetTraits() {
  const modal = document.getElementById('editPetModal');
  if (!modal) return {};
  const traits = {};

  modal.querySelectorAll('[data-trait]').forEach(group => {
    const key = group.getAttribute('data-trait');
    if (!key) return;
    const multi = group.getAttribute('data-multi') === 'true';
    const selected = Array.from(group.querySelectorAll('.trait-chip[aria-pressed="true"]'))
      .map(btn => String(btn.dataset.value || '').trim())
      .filter(Boolean);
    if (multi) {
      if (selected.length) traits[key] = selected;
    } else if (selected[0]) {
      traits[key] = selected[0];
    }
  });

  Object.entries(EDIT_TRAIT_FIELDS).forEach(([key, selector]) => {
    const input = modal.querySelector(selector);
    if (!input) return;
    const raw = String(input.value || '').trim();
    if (!raw) return;
    if (input.type === 'number') {
      const n = Number(raw);
      if (Number.isFinite(n)) traits[key] = n;
    } else {
      traits[key] = raw;
    }
  });

  return traits;
}

function writeEditPetTraitsJson() {
  const input = document.getElementById('petTraitsJson');
  if (input) input.value = JSON.stringify(collectEditPetTraits());
}

function addEditPetAllergyChip(value, { sync = true } = {}) {
  const allergyWrap = document.querySelector('#editPetModal [data-trait="allergies"]');
  if (!allergyWrap) return;
  const clean = String(value || '').trim();
  if (!clean) return;
  const exists = Array.from(allergyWrap.querySelectorAll('.trait-chip'))
    .some(chip => String(chip.dataset.value || '').toLowerCase() === clean.toLowerCase());
  if (exists) return;
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'trait-chip';
  chip.dataset.value = clean;
  chip.setAttribute('aria-pressed', 'true');
  chip.textContent = clean;
  allergyWrap.appendChild(chip);
  if (sync) writeEditPetTraitsJson();
}

function resetAddPetModal() {
  const form = document.getElementById('addPetForm');
  form?.reset();
  ADD_PET_AVATAR_DATAURL = null;
  updateNewPetAvatarPreview('');
  clearInlineStatus('addPetFormStatus');
  configureAddPetDetailField('', '');
  resetAddPetTraitControls();
  updateAddPetModalChrome({ name: '', species: '', detail: '' });
}

function openAddPetModal() {
  resetAddPetModal();
  openModal('addPetModal');
  queueMicrotask(() => {
    try { document.getElementById('newPetName')?.focus(); } catch {}
  });
}

// Ensure For-My-Pets pane shell is always visible (content visibility is controlled by bridge)
(function ensureMyPetsPaneShell() {
  const PANE = document.getElementById('myPetsPane');
  if (PANE) { PANE.classList.remove('d-none','hidden'); PANE.hidden = false; }
})();

async function loadPets() {
  const list = $('#petList');
  if (!list) return;
  list.innerHTML = `<div class="text-muted">Loading pets…</div>`;
  try {
    const res = await fetch('/api/pets', { credentials: 'include' });
    const data = await res.json().catch(() => ([]));
    if (!res.ok) throw new Error('Pets fetch failed');
    // API might return array or {pets:[...]}
    PETS = Array.isArray(data) ? data : (data.pets || []);
    const livePetIds = new Set(PETS.map(pet => String(pet.id)));
    PET_JOURNAL_SUMMARIES.forEach((_summary, petId) => {
      if (!livePetIds.has(String(petId))) PET_JOURNAL_SUMMARIES.delete(petId);
    });
    renderPets(PETS);
    hydratePetJournalSummaries(PETS).catch(err => console.warn('[account.js] journal summaries failed:', err));
    // Bus notifications for dependent panes (For My Pets, etc.)
    try {
      PetsBus.emit('pets:list:loaded', PETS);
      PetsBus.emit('pets:changed', PETS);
    } catch {}
  } catch (err) {
    list.innerHTML = `<div class="text-danger">Failed to load pets</div>`;
    setAccountAlert('Some account data failed to load. Please refresh or try again.', 'warning');
  }
}

function renderPets(pets) {
  const list = $('#petList');
  if (!list) return;
  if (!Array.isArray(pets) || pets.length === 0) {
    list.innerHTML = `
      <div class="account-empty-state">
        <strong>Start by adding the pet you love.</strong>
        <p class="mb-0">Pet profiles power journal memories, Pawket Pack fit, and better product picks.</p>
      </div>`;
    return;
  }

  list.innerHTML = pets.map(p => {
    const name    = escapeHtml(p.name);
    const species = escapeHtml(formatPetSpecies(p.species));
    const breed   = escapeHtml(p.breed || '');
    const detailLabel = escapeHtml(getPetDetailLabel(p.species));
    const bday    = p.birthday ? escapeHtml(String(p.birthday).slice(0,10)) : '';
    const avatar  = safeMediaUrl(p.avatar) || '/assets/images/default-pet.png';
    const petId = escapeHtml(p.id);
    const rawPetId = String(p.id);
    const sex = escapeHtml(formatPetValue(p.sex));
    const fixed = escapeHtml(getPetFixedLabel(p));
    const summary = PET_JOURNAL_SUMMARIES.get(rawPetId) || emptyJournalSummary('loading');
    const coreCount = Number(summary.core || 0);
    const entryCount = Number(summary.entries || 0);
    const palCount = getPalsForPet(rawPetId).length;
    const tone = escapeHtml(getPetCardTone(p.species));
    const birthdayLine = bday ? `<span><i class="bi bi-cake2" aria-hidden="true"></i> ${bday}</span>` : '';
    const detailLine = breed ? `<span><i class="bi bi-tag" aria-hidden="true"></i> ${detailLabel}: ${breed}</span>` : '';
    const palLine = palCount
      ? `<span><i class="bi bi-patch-check" aria-hidden="true"></i> ${palCount} private Pal${palCount === 1 ? '' : 's'}</span>`
      : '<span><i class="bi bi-stars" aria-hidden="true"></i> Ready for an Honorary Pal</span>';
    const photoAlt = `${name || 'Pet'} profile photo`;
    const palHref = buildPawketPalHandoffUrl({ petId: rawPetId, source: 'pet-profile' });

    return `
      <article class="account-pet-card ${coreCount ? 'has-core-memory' : ''}" data-pet-id="${petId}" data-core-memory-count="${coreCount}" data-journal-entry-count="${entryCount}" data-pet-tone="${tone}">
        <div class="account-pet-card-body">
          <div class="account-pet-avatar-wrap">
            <img class="pet-thumb account-pet-thumb"
                 src="${escapeHtml(avatar)}" alt="${escapeHtml(photoAlt)}"
                 loading="lazy" />
            <span class="account-pet-core-dot" title="${coreCount ? 'Favorite memory saved' : 'No favorite memory yet'}" aria-hidden="true">
              <i class="bi ${coreCount ? 'bi-stars' : 'bi-journal'}"></i>
            </span>
            ${species ? `<span class="account-pet-photo-label">${species}</span>` : ''}
          </div>

          <div class="account-pet-main">
            <div class="account-pet-topline">
              <div class="account-pet-title">
                <span class="account-pet-eyebrow">Pet profile</span>
                <div class="account-pet-name-line">
                  <h5>${name}</h5>
                  ${species ? `<span class="account-pet-species-pill">${species}</span>` : ''}
                </div>
                <span class="account-pet-privacy-note"><i class="bi bi-shield-lock" aria-hidden="true"></i> Private care record</span>
              </div>
              ${renderPetCardState(summary)}
            </div>
            <div class="account-pet-actions" aria-label="${name} actions">
              <button class="btn btn-outline-secondary" data-action="open-journal" data-pet-id="${petId}" type="button">
                <i class="bi bi-journals" aria-hidden="true"></i><span>Journal</span>
              </button>
              <a class="btn btn-outline-info account-pal-handoff-btn" href="${escapeHtml(palHref)}">
                <i class="bi bi-patch-plus" aria-hidden="true"></i><span>Honor Pal</span>
              </a>
              <button class="btn btn-outline-primary" data-action="open-edit" data-pet-id="${petId}" type="button">
                <i class="bi bi-pencil" aria-hidden="true"></i><span>Edit</span>
              </button>
              <button class="btn btn-outline-danger" data-action="delete-pet" data-pet-id="${petId}" type="button">
                <i class="bi bi-trash" aria-hidden="true"></i><span>Delete</span>
              </button>
            </div>

            <div class="account-pet-meta-card">
              <div class="account-pet-meta">
                ${detailLine}
                ${birthdayLine}
                <span><i class="bi bi-gender-ambiguous" aria-hidden="true"></i> Sex: ${sex}</span>
                <span><i class="bi bi-heart-pulse" aria-hidden="true"></i> Fixed: ${fixed}</span>
                ${palLine}
              </div>
            </div>

            <div class="account-pet-journal-summary" data-pet-journal-summary="${petId}">
              ${renderPetJournalSummary(summary)}
            </div>
          </div>
        </div>
      </article>`;
  }).join('');
}

// Reusable: file -> dataURL with 5MB guard
async function readFileAsDataURL(file, statusId = 'petFormStatus') {
  if (!file) return null;
  const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
  if (!allowedImageTypes.has(String(file.type || '').toLowerCase())) {
    setInlineStatus(statusId, 'Please select a PNG, JPEG, GIF, or WebP photo.', 'warning');
    setAccountAlert('Please select a PNG, JPEG, GIF, or WebP photo.', 'warning');
    return null;
  }
  if (file.size > 5 * 1024 * 1024) {
    setInlineStatus(statusId, 'Please select a photo 5MB or smaller.', 'warning');
    setAccountAlert('Please select a photo 5MB or smaller.', 'warning');
    return null;
  }
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Add Pet form
const addPetForm = document.getElementById('addPetForm');
if (addPetForm) {
  addPetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name    = document.getElementById('newPetName')?.value?.trim() || '';
    const species = document.getElementById('newPetType')?.value?.trim() || '';
    const breed   = syncAddPetDetailValueFromControls();
    const birthday= document.getElementById('newPetBirthday')?.value || null;
    const traits  = collectAddPetTraits();
    writeAddPetTraitsJson();
    if (!name || !species) {
      setInlineStatus('addPetFormStatus', 'Name and type are required.', 'warning');
      setAccountAlert('Add a name and pet type to create a profile.', 'warning');
      return;
    }

    const payload = {
      name,
      species,
      birthday,
      breed,
      traits,
      ...normalizeTraitsToTopLevel(traits),
    };

    clearInlineStatus('addPetFormStatus');
    const res = await fetch('/api/pets', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Add pet failed');
      setInlineStatus('addPetFormStatus', 'Could not add that pet profile. Please try again.', 'danger');
      setAccountAlert('Could not add that pet profile. Please try again.', 'warning');
      return;
    }
    const created = await res.json().catch(() => ({}));
    const petId = created?.pet?.id;
    if (ADD_PET_AVATAR_DATAURL && petId) {
      const avatarRes = await fetch(`/api/pets/${encodeURIComponent(petId)}/avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: ADD_PET_AVATAR_DATAURL }),
      });
      if (!avatarRes.ok) {
        console.warn('[account.js] new pet avatar upload failed:', await avatarRes.text().catch(() => ''));
      }
    }
    closeModal('addPetModal');
    resetAddPetModal();
    setAccountAlert(`${name} was added to your Pet Pawket account.`, 'success');
    try {
      PetsBus.emit('pet:created', { temp: true, name, species, birthday, breed, traits });
      PetsBus.emit('pets:refresh:request');
    } catch {}
    await loadPets();
    notifyStoryProgress({ source: 'pet-created' });
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-add-pet]')) {
    openAddPetModal();
    return;
  }

  const addTraitChip = e.target.closest('#addPetModal .trait-chip');
  if (!addTraitChip) return;
  const group = addTraitChip.closest('[data-add-trait]');
  if (!group) return;
  const key = group.getAttribute('data-add-trait');
  const multi = group.getAttribute('data-multi') === 'true';
  if (key === 'allergies') {
    addTraitChip.remove();
    writeAddPetTraitsJson();
    return;
  }
  if (multi) {
    const next = addTraitChip.getAttribute('aria-pressed') !== 'true';
    addTraitChip.setAttribute('aria-pressed', next ? 'true' : 'false');
  } else {
    group.querySelectorAll('.trait-chip').forEach(chip => {
      chip.setAttribute('aria-pressed', chip === addTraitChip ? 'true' : 'false');
    });
  }
  writeAddPetTraitsJson();
});

document.getElementById('addTraitAllergyInput')?.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  addAddPetAllergyChip(e.currentTarget.value);
  e.currentTarget.value = '';
});

document.getElementById('addPetModal')?.addEventListener('input', (e) => {
  if (e.target.matches('[data-add-trait-key]')) writeAddPetTraitsJson();
});

document.getElementById('editPetModal')?.addEventListener('click', (e) => {
  const editTraitChip = e.target.closest('.trait-chip');
  if (!editTraitChip) return;
  const group = editTraitChip.closest('[data-trait]');
  if (!group) return;
  const key = group.getAttribute('data-trait');
  const multi = group.getAttribute('data-multi') === 'true';
  if (key === 'allergies') {
    editTraitChip.remove();
    writeEditPetTraitsJson();
    return;
  }
  if (multi) {
    const next = editTraitChip.getAttribute('aria-pressed') !== 'true';
    editTraitChip.setAttribute('aria-pressed', next ? 'true' : 'false');
  } else {
    group.querySelectorAll('.trait-chip').forEach(chip => {
      chip.setAttribute('aria-pressed', chip === editTraitChip ? 'true' : 'false');
    });
  }
  writeEditPetTraitsJson();
});

document.getElementById('editPetModal')?.addEventListener('keydown', (e) => {
  if (!e.target.matches('[data-trait-input="allergies"]')) return;
  if (e.key !== 'Enter') return;
  e.preventDefault();
  addEditPetAllergyChip(e.target.value);
  e.target.value = '';
});

document.getElementById('editPetModal')?.addEventListener('input', (e) => {
  if (e.target.matches('#trait-neck-in, #trait-chest-in, #trait-back-in, #trait-notes')) {
    writeEditPetTraitsJson();
  }
});

// Delegated actions: open edit, delete, open journal
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const petId  = btn.getAttribute('data-pet-id');

  if (action === 'open-edit')    openEditModal(petId);
  if (action === 'delete-pet')  await deletePet(petId);
  if (action === 'open-journal') openJournalModal(petId);
});

async function deletePet(petId) {
  if (!petId) return;
  const pet = PETS.find(p => String(p.id) === String(petId));
  const petName = pet?.name || 'this pet';
  const confirmed = await accountConfirm({
    title: 'Delete pet profile?',
    message: `This will remove ${petName}'s profile and saved pet details from this account. This cannot be undone.`,
    confirmLabel: 'Delete profile',
  });
  if (!confirmed) return;
  const res = await fetch(`/api/pets/${petId}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) {
    console.error('Delete failed');
    setAccountAlert('Could not delete that pet profile. Please try again.', 'warning');
    return;
  }
	  PET_JOURNAL_SUMMARIES.delete(String(petId));
	  try { PetsBus.emit('pet:deleted', { id: petId }); } catch {}
	  setAccountAlert(`${petName} was removed from your account.`, 'success');
	  await loadPets();
	  notifyStoryProgress({ source: 'pet-deleted' });
	}

wirePetDetailField();
wireAddPetDetailField();
configureAddPetDetailField('', '');

//
// --------- Traits helpers (always include + normalize to top-level) ---------
function getHiddenTraits() {
  const input = document.getElementById('petTraitsJson');
  if (!input) return {};
  const raw = input.value ?? '';
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

function normalizeTraitsToTopLevel(traits = {}) {
  const patch = {};
  // sex: "female" | "male" | "unknown" -> DB expects lower-case or null
  if (typeof traits.sex === 'string') {
    const s = traits.sex.trim().toLowerCase();
    if (s === 'female' || s === 'male') patch.sex = s;
    else if (s === 'unknown' || s === '') patch.sex = null;
  }
  // spayNeuter enum -> boolean/null
  if (traits.spayNeuter !== undefined && traits.spayNeuter !== null) {
    const v = String(traits.spayNeuter).trim().toLowerCase();
    if (['spayed','neutered','fixed','true','yes','y','1'].includes(v)) patch.spayedNeutered = true;
    else if (['intact','false','no','n','0'].includes(v)) patch.spayedNeutered = false;
    else if (v === 'unknown' || v === '') patch.spayedNeutered = null;
  }
  return patch;
}

// Build minimal patch from edit form fields compared to snapshot
function buildPetPatchFromForm() {
  syncPetDetailValueFromControls();
  writeEditPetTraitsJson();
  const name   = (document.getElementById('editPetName')?.value ?? '').trim();
  const type   = (document.getElementById('editPetType')?.value ?? '').trim();
  const breed  = (document.getElementById('editPetBreed')?.value ?? '').trim();
  const bday   = (document.getElementById('editPetBirthday')?.value ?? '');

  const snap = CURRENT_PET_SNAPSHOT || {};
  const patch = {};
  if (name   && name   !== snap.name)          patch.name    = name;
  if (type) {
    const typeNorm = String(type).toLowerCase();
    const snapNorm = String(snap.species || '').toLowerCase();
    if (typeNorm !== snapNorm) patch.species = type; // send user’s selected value
  }
  const snapBreed = String(snap.breed || '').trim();
  if (breed !== snapBreed) patch.breed = breed;

  const normSnapBday = snap.birthday ? String(snap.birthday).slice(0,10) : '';
  if (bday && bday !== normSnapBday)           patch.birthday= bday;

  // Always include traits (even empty object), then normalize into top-level
  const traits = getHiddenTraits();
  patch.traits = traits;
  Object.assign(patch, normalizeTraitsToTopLevel(traits));

  return patch;
}

//
// -------------------------------
// Edit Pet Modal
// -------------------------------
const editForm = document.getElementById('editPetForm');

function setSelectValueCaseInsensitive(selectEl, raw) {
  if (!selectEl) return;
  const v = String(raw ?? '').trim();
  if (!v) { selectEl.value = ''; return; }
  const opts = Array.from(selectEl.options || []);
  const hit = opts.find(o =>
    String(o.value).toLowerCase() === v.toLowerCase() ||
    String(o.text).toLowerCase()  === v.toLowerCase()
  );
  selectEl.value = hit ? hit.value : '';
}

function hydrateTraitChipsFromPet(pet) {
  const traits = { ...(pet?.traits || {}) };

  // Fill from top-level fields when traits don’t include them
  if (!traits.sex && pet?.sex) traits.sex = pet.sex;
  if (!traits.size && pet?.size) traits.size = pet.size;
  if (traits.allergies == null && Array.isArray(pet?.allergies) && pet.allergies.length) {
    traits.allergies = pet.allergies;
  }
  if (traits.notes == null && pet?.notes) traits.notes = pet.notes;
  if (traits.spayNeuter == null) {
    if (pet?.spayedNeutered === true) {
      traits.spayNeuter = pet?.sex === 'male' ? 'neutered' : 'spayed';
    } else if (pet?.spayedNeutered === false) {
      traits.spayNeuter = 'intact';
    } else {
      traits.spayNeuter = 'unknown';
    }
  }

  // Apply to chip UI
  const modal = document.getElementById('editPetModal');
  if (!modal) return;

  const allergyWrap = modal.querySelector('[data-trait="allergies"]');
  if (allergyWrap) {
    allergyWrap.innerHTML = '';
    normalizeTraitList(traits.allergies).forEach(value => {
      addEditPetAllergyChip(value, { sync: false });
    });
  }

  modal.querySelectorAll('.trait-chips[data-trait]').forEach(group => {
    const key   = group.getAttribute('data-trait');
    const multi = group.getAttribute('data-multi') === 'true';
    const val   = traits[key];

    const btns = Array.from(group.querySelectorAll('.trait-chip'));
    if (multi) {
      const set = new Set(normalizeTraitList(val).map(s => String(s).toLowerCase()));
      btns.forEach(b => b.setAttribute('aria-pressed', set.has(String(b.dataset.value).toLowerCase()) ? 'true' : 'false'));
    } else {
      const chosen = val == null ? 'unknown' : String(val).toLowerCase();
      btns.forEach(b => b.setAttribute('aria-pressed',
        String(b.dataset.value).toLowerCase() === chosen ? 'true' : 'false'
      ));
    }
  });

  Object.entries(EDIT_TRAIT_FIELDS).forEach(([key, selector]) => {
    const input = modal.querySelector(selector);
    if (input) input.value = traits[key] ?? '';
  });

  // Keep the hidden JSON in sync so submit picks up the rendered controls.
  writeEditPetTraitsJson();
}

function openEditModal(petId) {
  CURRENT_PET_ID = petId;
  CURRENT_AVATAR_DATAURL = null;
  clearInlineStatus('petFormStatus');

  const pet = PETS.find(p => String(p.id) === String(petId));
  if (!pet) return;

  CURRENT_PET_SNAPSHOT = { ...pet };

  const nameEl  = document.getElementById('editPetName');
  const typeEl  = document.getElementById('editPetType');
  const breedEl = document.getElementById('editPetBreed');
  const bdayEl  = document.getElementById('editPetBirthday');
  const preview = document.getElementById('avatarPreview');

  if (nameEl)  nameEl.value  = pet.name ?? '';
  if (typeEl)  setSelectValueCaseInsensitive(typeEl, pet.species);
  configurePetDetailField(typeEl?.value || pet.species, pet.breed ?? '');
  if (breedEl && !document.getElementById('editPetBreedSelect')) breedEl.value = pet.breed ?? '';
  if (bdayEl)  bdayEl.value  = pet.birthday ? String(pet.birthday).slice(0,10) : '';
  if (preview) preview.src   = safeMediaUrl(pet.avatar) || '/assets/images/default-pet.png';
  updateEditPetModalChrome({ name: pet.name, species: typeEl?.value || pet.species, detail: pet.breed });

  // Hydrate trait chips and hidden JSON BEFORE opening so the enhancer won’t reset them
  hydrateTraitChipsFromPet(pet);

  openModal('editPetModal');
}

if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!CURRENT_PET_ID) return;
    clearInlineStatus('petFormStatus');

    // Build a minimal patch; includes traits + normalized top-level fields
    const patch = buildPetPatchFromForm();

    // Always send PATCH so trait-only changes persist (even if only 'traits' changed)
    try {
      const res = await fetch(`/api/pets/${encodeURIComponent(CURRENT_PET_ID)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        console.error('Update failed', await res.text());
        setInlineStatus('petFormStatus', 'Could not save profile. Please try again.', 'danger');
        return;
      }
      try { PetsBus.emit('pet:updated', { id: CURRENT_PET_ID, patch }); } catch {}
    } catch (err) {
      console.warn('[account.js] save failed:', err);
      setInlineStatus('petFormStatus', 'Could not save profile. Please try again.', 'danger');
      return;
    }

    // Optional avatar upload if changed
    if (CURRENT_AVATAR_DATAURL) {
      const res2 = await fetch(`/api/pets/${encodeURIComponent(CURRENT_PET_ID)}/avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: CURRENT_AVATAR_DATAURL }),
      });
      if (!res2.ok) {
        console.error('Avatar upload failed', await res2.text());
        // continue anyway
      }
      CURRENT_AVATAR_DATAURL = null;
    }

	    closeModal('editPetModal');
	    setAccountAlert('Pet profile saved.', 'success');
	    await loadPets(); // rebind from server truth
	    notifyStoryProgress({ source: 'pet-updated' });
	  });
	}

//
// -------------------------------
// Avatar helpers + handlers (robust remove + click-to-remove/replace)
// -------------------------------
function updateAvatarPreview(src) {
  const preview = document.getElementById('avatarPreview');
  if (preview) preview.src = safeMediaUrl(src) || '/assets/images/default-pet.png';
}

function updateNewPetAvatarPreview(src) {
  const preview = document.getElementById('newPetAvatarPreview');
  if (preview) preview.src = safeMediaUrl(src) || '/assets/images/default-pet.png';
}

/**
 * Try multiple server patterns so removal works regardless of backend route:
 * 1) POST /api/pets/:id/avatar  { remove:true }
 * 2) DELETE /api/pets/:id/avatar
 * 3) PATCH /api/pets/:id        { avatar:null, avatarUrl:null }
 */
async function removePetAvatar(petId) {
  if (!petId) return { ok: false, tried: [] };
  const tried = [];

  // 1) POST remove:true
  try {
    tried.push('POST /api/pets/:id/avatar {remove:true}');
    const r1 = await fetch(`/api/pets/${encodeURIComponent(petId)}/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove: true }),
    });
    if (r1.ok) return { ok: true, via: tried[tried.length - 1] };
  } catch {}

  // 2) DELETE avatar endpoint
  try {
    tried.push('DELETE /api/pets/:id/avatar');
    const r2 = await fetch(`/api/pets/${encodeURIComponent(petId)}/avatar`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (r2.ok) return { ok: true, via: tried[tried.length - 1] };
  } catch {}

  // 3) PATCH avatar null (common fallback)
  try {
    tried.push('PATCH /api/pets/:id {avatar:null, avatarUrl:null}');
    const r3 = await fetch(`/api/pets/${encodeURIComponent(petId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: null, avatarUrl: null }),
    });
    if (r3.ok) return { ok: true, via: tried[tried.length - 1] };
  } catch {}

  return { ok: false, tried };
}

// Avatar file selection → preview & stage upload (no default submit)
document.getElementById('newPetAvatar')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setInlineStatus('addPetFormStatus', 'Please choose an image 5MB or smaller.', 'warning');
    return;
  }
  const dataUrl = await readFileAsDataURL(file, 'addPetFormStatus');
  if (!dataUrl) return;
  ADD_PET_AVATAR_DATAURL = dataUrl;
  updateNewPetAvatarPreview(ADD_PET_AVATAR_DATAURL);
});

document.getElementById('newPetAvatarPreview')?.addEventListener('click', () => {
  clearInlineStatus('addPetFormStatus');
  document.getElementById('newPetAvatar')?.click();
});

document.getElementById('removeNewPetAvatarBtn')?.addEventListener('click', () => {
  ADD_PET_AVATAR_DATAURL = null;
  updateNewPetAvatarPreview('');
  const input = document.getElementById('newPetAvatar');
  if (input) input.value = '';
  clearInlineStatus('addPetFormStatus');
});

document.getElementById('editPetAvatar')?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    setInlineStatus('petFormStatus', 'Please choose an image 5MB or smaller.', 'warning');
    e.target.value = '';
    return;
  }
  const dataUrl = await readFileAsDataURL(file);
  if (!dataUrl) return;
  CURRENT_AVATAR_DATAURL = dataUrl;
  updateAvatarPreview(CURRENT_AVATAR_DATAURL);
});

// Click the avatar to choose a replacement. The X button handles removal.
document.getElementById('avatarPreview')?.addEventListener('click', async () => {
  if (!CURRENT_PET_ID) return;
  clearInlineStatus('petFormStatus');
  document.getElementById('editPetAvatar')?.click();
});

// Keep the old button wired too (in case you show it later via CSS)
document.getElementById('removeAvatarBtn')?.addEventListener('click', async () => {
  if (!CURRENT_PET_ID) return;
  const confirmed = await accountConfirm({
    title: 'Remove pet photo?',
    message: 'This will return the profile to the default Pet Pawket avatar.',
    confirmLabel: 'Remove photo',
  });
  if (!confirmed) return;
  const { ok } = await removePetAvatar(CURRENT_PET_ID);
  if (!ok) {
    setInlineStatus('petFormStatus', 'Could not remove the photo. Please try again.', 'danger');
    return;
  }
  CURRENT_AVATAR_DATAURL = null;
  updateAvatarPreview('/assets/images/default-pet.png');
  try { await loadPets(); } catch {}
});

//
// -------------------------------
// Pet Journal Modal (timeline, Core Memories, and connected path metadata)
// -------------------------------
const JOURNAL_ENTRY_TYPES = [
  { value: 'note', label: 'Daily note', icon: 'bi-journal-text' },
  { value: 'story', label: 'Story moment', icon: 'bi-bookmark-heart' },
  { value: 'milestone', label: 'Milestone', icon: 'bi-award' },
  { value: 'wellness', label: 'Wellness', icon: 'bi-heart-pulse' },
  { value: 'vet', label: 'Vet visit', icon: 'bi-clipboard2-pulse' },
  { value: 'medication', label: 'Medication', icon: 'bi-capsule' },
  { value: 'meal', label: 'Meal', icon: 'bi-egg-fried' },
  { value: 'walk', label: 'Walk', icon: 'bi-signpost-split' },
  { value: 'training', label: 'Training', icon: 'bi-mortarboard' },
  { value: 'grooming', label: 'Grooming', icon: 'bi-scissors' },
  { value: 'play', label: 'Play', icon: 'bi-joystick' },
  { value: 'behavior', label: 'Behavior', icon: 'bi-chat-heart' },
  { value: 'weight', label: 'Weight', icon: 'bi-speedometer2' },
  { value: 'allergy', label: 'Allergy', icon: 'bi-exclamation-triangle' },
  { value: 'rescue', label: 'Rescue/adoption', icon: 'bi-house-heart' },
  { value: 'memorial', label: 'Memorial', icon: 'bi-stars' },
  { value: 'charm', label: 'CHARM note', icon: 'bi-shield-heart' },
  { value: 'pawket-pal', label: 'Pawket Pal', icon: 'bi-controller' },
];

const JOURNAL_TYPE_BY_VALUE = new Map(JOURNAL_ENTRY_TYPES.map(type => [type.value, type]));
const JOURNAL_VISIBILITY_LABELS = {
  private: 'Private',
  shareable: 'Shareable later',
  community: 'Town Square candidate',
  'charm-foundation': 'CHARM care note',
};
const JOURNAL_HANDOFF_LABELS = {
  'pawket-pals': 'Pawket Pals',
  'charm-foundation': 'CHARM',
  'share-studio': 'Share Studio',
  'town-square': 'Town Square',
};
const JOURNAL_MOODS = [
  '',
  'Happy',
  'Playful',
  'Calm',
  'Energetic',
  'Sleepy',
  'Curious',
  'Concerned',
  'Anxious',
  'Protective',
  'Peaceful',
  'Excited',
  'Lonely',
  'Mischievous',
  'Inspired',
];
let JOURNAL_CACHE = [];
let JOURNAL_LOAD_RUN = 0;

function getJournalTypeMeta(value = 'note') {
  const normalized = String(value || 'note').trim().toLowerCase();
  return JOURNAL_TYPE_BY_VALUE.get(normalized) || JOURNAL_TYPE_BY_VALUE.get('note');
}

function journalTypeOptions(currentType = 'note', { includeAll = false, allLabel = 'All entries' } = {}) {
  const current = includeAll ? String(currentType || '') : getJournalTypeMeta(currentType).value;
  const options = includeAll
    ? [`<option value=""${current ? '' : ' selected'}>${escapeHtml(allLabel)}</option>`]
    : [];
  options.push(...JOURNAL_ENTRY_TYPES.map(type => {
    const selected = type.value === current ? ' selected' : '';
    return `<option value="${escapeHtml(type.value)}"${selected}>${escapeHtml(type.label)}</option>`;
  }));
  return options.join('');
}

function journalMoodOptions(currentMood = '') {
  const normalizedCurrent = String(currentMood || '').trim();
  const values = [...JOURNAL_MOODS];
  if (normalizedCurrent && !values.some(v => v.toLowerCase() === normalizedCurrent.toLowerCase())) {
    values.push(normalizedCurrent);
  }
  return values.map(value => {
    const label = value || 'No mood';
    const selected = value.toLowerCase() === normalizedCurrent.toLowerCase() ? ' selected' : '';
    return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
  }).join('');
}

function setSelectOptions(selectEl, optionsHtml, preferredValue = '') {
  if (!selectEl) return;
  const selectedValue = String(preferredValue ?? selectEl.value ?? '');
  selectEl.innerHTML = optionsHtml;
  const hasPreferred = Array.from(selectEl.options || [])
    .some(option => String(option.value) === selectedValue);
  if (hasPreferred) selectEl.value = selectedValue;
}

function ensureJournalControlOptions() {
  const typeEl = document.getElementById('journalEntryType');
  const filterEl = document.getElementById('journalFilterType');
  const moodEl = document.getElementById('journalMood');
  setSelectOptions(typeEl, journalTypeOptions(typeEl?.value || 'note'), typeEl?.value || 'note');
  setSelectOptions(filterEl, journalTypeOptions(filterEl?.value || '', { includeAll: true }), filterEl?.value || '');
  setSelectOptions(moodEl, journalMoodOptions(moodEl?.value || 'Happy'), moodEl?.value || 'Happy');
}

function normalizeJournalTags(input) {
  if (Array.isArray(input)) {
    return input.map(tag => String(tag).replace(/^#/, '').trim()).filter(Boolean);
  }
  return String(input || '')
    .split(',')
    .map(tag => tag.replace(/^#/, '').trim())
    .filter(Boolean);
}

function uniqueJournalTags(...tagGroups) {
  const seen = new Set();
  const out = [];
  tagGroups.flatMap(normalizeJournalTags).forEach(tag => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(tag);
  });
  return out;
}

function formatDateForDatetimeLocal(value = new Date()) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseJournalLocalDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formatJournalDate(value, fallback = 'Just now') {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeJournalEntry(entry = {}) {
  const createdAt = entry.createdAt || entry.CreatedAt || entry.created_at || entry.created || '';
  const occurredAt = entry.occurredAt || entry.occurred_at || createdAt;
  const entryType = getJournalTypeMeta(entry.entryType || entry.entry_type || 'note').value;
  const metadata = entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
    ? entry.metadata
    : {};
  return {
    id: entry.id,
    userId: entry.userId || entry.user_id,
    petId: entry.petId || entry.pet_id,
    title: String(entry.title || '').trim(),
    entryType,
    occurredAt,
    text: String(entry.text || entry.note || '').trim(),
    mood: String(entry.mood || '').trim(),
    tags: normalizeJournalTags(entry.tags || []),
    photo: entry.photo || '',
    highlighted: entry.highlighted === true || entry.coreMemory === true,
    visibility: JOURNAL_VISIBILITY_LABELS[entry.visibility] ? entry.visibility : 'private',
    metadata,
    createdAt,
    updatedAt: entry.updatedAt || entry.updated_at || '',
  };
}

function getJournalEntryById(entryId) {
  return JOURNAL_CACHE.find(entry => String(entry.id) === String(entryId)) || null;
}

function inferJournalHandoffTargets({ entryType = 'note', visibility = 'private', highlighted = false, tags = [] } = {}) {
  const targets = new Set();
  const type = getJournalTypeMeta(entryType).value;
  const normalizedTags = normalizeJournalTags(tags).map(tag => tag.toLowerCase());

  if (highlighted || ['story', 'milestone', 'memorial', 'rescue', 'pawket-pal'].includes(type)) {
    targets.add('pawket-pals');
  }
  if (['vet', 'medication', 'wellness', 'allergy', 'weight', 'rescue', 'charm'].includes(type) || visibility === 'charm-foundation') {
    targets.add('charm-foundation');
  }
  if (visibility === 'shareable' || visibility === 'community' || highlighted) {
    targets.add('share-studio');
  }
  if (visibility === 'community') {
    targets.add('town-square');
  }
  if (normalizedTags.some(tag => ['rescue', 'adoption', 'foster', 'medical', 'shelter'].includes(tag))) {
    targets.add('charm-foundation');
  }

  return [...targets];
}

function buildJournalMetadata(draft = {}, existing = {}) {
  const metadata = existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {};
  const handoffTargets = inferJournalHandoffTargets(draft);
  return {
    ...metadata,
    source: 'account-journal',
    schemaVersion: 1,
    handoffTargets,
    updatedAt: new Date().toISOString(),
  };
}

function defaultJournalTitle(entry) {
  const type = getJournalTypeMeta(entry.entryType);
  const date = entry.occurredAt ? new Date(entry.occurredAt) : null;
  const day = date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : '';
  return [type.label, day].filter(Boolean).join(' · ') || 'Journal entry';
}

function getJournalFilters() {
  return {
    type: document.getElementById('journalFilterType')?.value || '',
    query: String(document.getElementById('journalSearch')?.value || '').trim().toLowerCase(),
    coreOnly: document.getElementById('journalCoreOnly')?.checked === true,
  };
}

function filterJournalEntries(entries) {
  const filters = getJournalFilters();
  return entries.filter(entry => {
    if (filters.type && entry.entryType !== filters.type) return false;
    if (filters.coreOnly && !entry.highlighted) return false;
    if (!filters.query) return true;

    const type = getJournalTypeMeta(entry.entryType);
    const haystack = [
      entry.title,
      entry.text,
      entry.mood,
      type.label,
      JOURNAL_VISIBILITY_LABELS[entry.visibility],
      ...entry.tags,
    ].join(' ').toLowerCase();
    return haystack.includes(filters.query);
  });
}

function renderJournalStats(entries) {
  const stats = document.getElementById('journalStats');
  if (!stats) return;

  const coreCount = entries.filter(entry => entry.highlighted).length;
  const latest = entries[0]?.occurredAt || entries[0]?.createdAt || '';
  const moodCounts = new Map();
  entries.forEach(entry => {
    if (!entry.mood) return;
    moodCounts.set(entry.mood, (moodCounts.get(entry.mood) || 0) + 1);
  });
  const topMood = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'None yet';

  stats.innerHTML = `
    <div class="journal-stat">
      <strong>${entries.length}</strong>
      <span>Entries</span>
    </div>
    <div class="journal-stat">
      <strong>${coreCount}</strong>
      <span>Favorite Memories</span>
    </div>
    <div class="journal-stat">
      <strong>${escapeHtml(topMood)}</strong>
      <span>Top mood</span>
    </div>
    <div class="journal-stat">
      <strong>${escapeHtml(latest ? formatJournalDate(latest, 'None yet') : 'None yet')}</strong>
      <span>Latest</span>
    </div>
  `;
}

function renderJournalEntry(entry) {
  const type = getJournalTypeMeta(entry.entryType);
  const title = entry.title || defaultJournalTitle(entry);
  const when = formatJournalDate(entry.occurredAt || entry.createdAt);
  const moodBadge = entry.mood
    ? `<span class="journal-mood"><i class="bi bi-emoji-smile" aria-hidden="true"></i>${escapeHtml(entry.mood)}</span>`
    : '';
  const coreBadge = entry.highlighted
    ? '<span class="journal-core-memory"><i class="bi bi-stars" aria-hidden="true"></i>Favorite Memory</span>'
    : '';
  const tags = entry.tags.length
    ? `<div class="journal-tags">${entry.tags.map(tag => `<span class="journal-tag">#${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  const photoUrl = safeMediaUrl(entry.photo);
  const photo = photoUrl
    ? `<div class="journal-photo">
         <img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(title)} photo" />
         <button class="btn btn-sm btn-outline-warning" data-action="remove-photo" type="button"><i class="bi bi-image" aria-hidden="true"></i> Remove Photo</button>
       </div>`
    : '';
  const handoffTargets = Array.isArray(entry.metadata?.handoffTargets)
    ? entry.metadata.handoffTargets
    : inferJournalHandoffTargets(entry);
  const handoffBadges = handoffTargets.length
    ? `<div class="journal-handoff-tags" aria-label="Connected story ideas">
        ${handoffTargets.map(target => `<span>${escapeHtml(JOURNAL_HANDOFF_LABELS[target] || target)}</span>`).join('')}
       </div>`
    : '';
  const sourcePetId = entry.petId || CURRENT_PET_ID || '';
  const linkedPalCount = getPalsForJournalEntry(entry.id).length;
  const palHref = buildPawketPalHandoffUrl({
    petId: sourcePetId,
    journalEntryId: entry.id,
    source: entry.highlighted ? 'core-memory' : 'journal-entry',
  });
  const palLabel = linkedPalCount ? 'Pal linked' : (entry.highlighted ? 'Honor memory' : 'Make Pal');

  return `
    <li class="journal-entry-wrapper" data-entry-id="${escapeHtml(entry.id)}" data-entry-type="${escapeHtml(entry.entryType)}" data-mood="${escapeHtml(entry.mood || 'Unknown')}" data-highlighted="${entry.highlighted ? 'true' : 'false'}">
      <div class="journal-entry-shell">
        <div class="journal-entry-icon" aria-hidden="true"><i class="bi ${escapeHtml(type.icon)}"></i></div>
        <div class="journal-entry-content">
          <div class="journal-entry-topline">
            <span class="journal-entry-date">${escapeHtml(when)}</span>
            <span class="journal-type-chip">${escapeHtml(type.label)}</span>
            <span class="journal-visibility-chip">${escapeHtml(JOURNAL_VISIBILITY_LABELS[entry.visibility] || 'Private')}</span>
          </div>
          <h5 class="journal-entry-title">${escapeHtml(title)}</h5>
          <div class="journal-entry-badges">${moodBadge}${coreBadge}</div>
          <div class="journal-note">${escapeHtml(entry.text)}</div>
          ${tags}
          ${handoffBadges}
          ${photo}
        </div>
        <div class="journal-actions">
          <button class="btn btn-sm btn-outline-warning" data-action="toggle-core-memory" aria-pressed="${entry.highlighted ? 'true' : 'false'}" type="button"><i class="bi bi-stars" aria-hidden="true"></i><span>${entry.highlighted ? 'Unmark' : 'Favorite'}</span></button>
          <a class="btn btn-sm btn-outline-info account-pal-handoff-btn" href="${escapeHtml(palHref)}"><i class="bi bi-patch-plus" aria-hidden="true"></i><span>${escapeHtml(palLabel)}</span></a>
          <button class="btn btn-sm btn-outline-secondary" data-action="edit-journal" type="button"><i class="bi bi-pencil" aria-hidden="true"></i><span>Edit</span></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete-journal" type="button"><i class="bi bi-trash3" aria-hidden="true"></i><span>Delete</span></button>
        </div>
      </div>
    </li>`;
}

function renderJournalTimeline() {
  const list = document.getElementById('journalEntryList');
  const empty = document.getElementById('journalEmpty');
  if (!list) return;

  renderJournalStats(JOURNAL_CACHE);
  const filteredEntries = filterJournalEntries(JOURNAL_CACHE);

  if (!JOURNAL_CACHE.length) {
    list.innerHTML = '';
    if (empty) {
      empty.textContent = 'No entries yet. Add the first care note, story moment, or favorite memory.';
      empty.style.display = '';
    }
    return;
  }

  if (!filteredEntries.length) {
    list.innerHTML = '';
    if (empty) {
      empty.textContent = 'No journal entries match these filters.';
      empty.style.display = '';
    }
    return;
  }

  list.innerHTML = filteredEntries.map(renderJournalEntry).join('');
  if (empty) empty.style.display = 'none';
}

function setJournalComposerStatus(message, level = 'muted') {
  const status = document.getElementById('journalComposerStatus');
  if (!status) return;
  status.textContent = message || '';
  status.dataset.level = level;
}

function clearJournalPhotoPreview() {
  const wrap = document.getElementById('journalPhotoPreviewWrap');
  if (wrap) wrap.innerHTML = '';
}

function resetJournalComposer(pet) {
  ensureJournalControlOptions();
  const titleEl = document.getElementById('newJournalTitle');
  const noteEl = document.getElementById('newJournalNote');
  const tagsEl = document.getElementById('journalTags');
  const moodEl = document.getElementById('journalMood');
  const photoEl = document.getElementById('journalPhoto');
  const typeEl = document.getElementById('journalEntryType');
  const occurredEl = document.getElementById('journalOccurredAt');
  const visibilityEl = document.getElementById('journalVisibility');
  const coreEl = document.getElementById('journalCoreMemory');

  if (titleEl) {
    titleEl.value = '';
    titleEl.placeholder = pet?.name ? `${pet.name}'s moment title` : 'Morning walk, first trick, vet follow-up...';
  }
  if (noteEl) {
    noteEl.value = '';
    noteEl.placeholder = pet?.name ? `What happened with ${pet.name}?` : "Today's update...";
    try { noteEl.dispatchEvent(new Event('input')); } catch {}
  }
  if (tagsEl) tagsEl.value = '';
  if (moodEl) moodEl.value = 'Happy';
  if (photoEl) photoEl.value = '';
  if (typeEl) typeEl.value = 'note';
  if (occurredEl) occurredEl.value = formatDateForDatetimeLocal(new Date());
  if (visibilityEl) visibilityEl.value = 'private';
  if (coreEl) coreEl.checked = false;
  clearJournalPhotoPreview();
  setJournalComposerStatus('');
}

function openJournalModal(petId) {
  CURRENT_PET_ID = petId;

  ensureJournalEnhancements();

  const pet = PETS.find(p => String(p.id) === String(petId));
  const idxEl = document.getElementById('journalPetIndex');
  const label = document.getElementById('journalLabel');
  if (label) label.textContent = pet?.name ? `Pet Journal — ${pet.name}` : 'Pet Journal';

  const sub = document.getElementById('journalSubhead');
  if (sub) {
    const meta = [pet?.species, pet?.breed].filter(Boolean).join(' • ');
    sub.textContent = meta ? `${meta} • Notes, care, story moments, and favorite memories.` : 'Capture notes, moods, care moments, and favorite memories.';
  }

  if (idxEl) idxEl.value = petId;
  resetJournalComposer(pet);

  openModal('journal-modal');
  loadPetJournal(petId).catch(err => console.error('loadPetJournal', err));
}

function ensureJournalEnhancements() {
  ensureJournalControlOptions();

  const noteEl = document.getElementById('newJournalNote');
  const photoEl = document.getElementById('journalPhoto');

  if (noteEl && !noteEl.dataset.journalCount) {
    noteEl.dataset.journalCount = '1';
    const counter = document.createElement('div');
    counter.id = 'journalNoteCount';
    counter.className = 'journal-note-count text-muted small';
    noteEl.insertAdjacentElement('afterend', counter);
    const update = () => {
      const len = noteEl.value?.length || 0;
      counter.textContent = `${len} characters`;
    };
    noteEl.addEventListener('input', update);
    update();
  }

  if (photoEl && !photoEl.dataset.journalPreview) {
    photoEl.dataset.journalPreview = '1';
    let wrap = document.getElementById('journalPhotoPreviewWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'journalPhotoPreviewWrap';
      wrap.className = 'journal-photo-preview';
      photoEl.insertAdjacentElement('afterend', wrap);
    }
    photoEl.addEventListener('change', async () => {
      const file = photoEl.files?.[0];
      if (!file) { wrap.innerHTML = ''; return; }
      const dataUrl = await readFileAsDataURL(file, 'journalComposerStatus');
      if (!dataUrl) return;
      wrap.innerHTML = `<img src="${dataUrl}" alt="Journal preview" />`;
    });
  }

  document.querySelectorAll('[data-journal-prompt]').forEach(btn => {
    if (btn.dataset.journalPromptWired === '1') return;
    btn.dataset.journalPromptWired = '1';
    btn.addEventListener('click', () => {
      const typeEl = document.getElementById('journalEntryType');
      const titleEl = document.getElementById('newJournalTitle');
      const noteEl = document.getElementById('newJournalNote');
      const tagsEl = document.getElementById('journalTags');
      const type = getJournalTypeMeta(btn.dataset.journalType || 'note');
      if (typeEl) typeEl.value = type.value;
      if (titleEl && !titleEl.value.trim()) titleEl.value = `${type.label} update`;
      if (noteEl) {
        const prompt = btn.dataset.journalText || '';
        noteEl.value = noteEl.value.trim() ? `${noteEl.value.trim()}\n\n${prompt}` : prompt;
        try { noteEl.dispatchEvent(new Event('input')); } catch {}
        noteEl.focus();
      }
      if (tagsEl) {
        tagsEl.value = uniqueJournalTags(tagsEl.value, btn.dataset.journalTags || '').join(', ');
      }
    });
  });

  ['journalFilterType', 'journalSearch', 'journalCoreOnly'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || el.dataset.journalFilterWired === '1') return;
    el.dataset.journalFilterWired = '1';
    el.addEventListener(id === 'journalSearch' ? 'input' : 'change', renderJournalTimeline);
  });
}

async function loadPetJournal(petId) {
  const loadRun = ++JOURNAL_LOAD_RUN;
  const list = document.getElementById('journalEntryList');
  const empty = document.getElementById('journalEmpty');
  if (!list) return;

  list.innerHTML = `<li class="journal-loading text-muted small">Loading journal…</li>`;
  if (empty) empty.style.display = 'none';

  try {
    const res = await fetch(`/api/pets/${petId}/journal`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load journal');
    const payload = await res.json().catch(() => ({}));
    const entries = Array.isArray(payload)
      ? payload
      : (payload.journal || payload.entries || payload.items || []);

    if (loadRun !== JOURNAL_LOAD_RUN || String(CURRENT_PET_ID) !== String(petId)) return;
    JOURNAL_CACHE = (entries || []).map(normalizeJournalEntry);
    setPetJournalSummary(petId, summarizeJournalEntries(JOURNAL_CACHE));
    renderJournalTimeline();
  } catch (err) {
    if (loadRun !== JOURNAL_LOAD_RUN || String(CURRENT_PET_ID) !== String(petId)) return;
    console.error(err);
    JOURNAL_CACHE = [];
    setPetJournalSummary(petId, emptyJournalSummary('error'));
    renderJournalStats([]);
    list.innerHTML = `<li class="text-danger small">Failed to load journal entries.</li>`;
  }
}

function renderJournalEditForm(li, entry = {}) {
  const existing = li.querySelector('[data-journal-edit-form]');
  if (existing) {
    existing.remove();
    return;
  }

  $all('[data-journal-edit-form]', document.getElementById('journalEntryList')).forEach(form => form.remove());

  const form = document.createElement('form');
  form.className = 'journal-edit-form';
  form.setAttribute('data-journal-edit-form', '1');
  form.innerHTML = `
    <div class="journal-edit-grid">
      <div class="journal-field journal-field--wide">
        <label class="form-label small fw-semibold">Title</label>
        <input class="form-control" name="title" maxlength="90" value="${escapeHtml(entry.title || '')}" placeholder="${escapeHtml(defaultJournalTitle(entry))}" />
      </div>
      <div class="journal-field">
        <label class="form-label small fw-semibold">Type</label>
        <select class="form-select" name="entryType">${journalTypeOptions(entry.entryType)}</select>
      </div>
      <div class="journal-field">
        <label class="form-label small fw-semibold">When</label>
        <input class="form-control" type="datetime-local" name="occurredAt" value="${escapeHtml(formatDateForDatetimeLocal(entry.occurredAt || entry.createdAt))}" />
      </div>
      <div class="journal-field">
        <label class="form-label small fw-semibold">Mood</label>
        <select class="form-select" name="mood">${journalMoodOptions(entry.mood)}</select>
      </div>
      <div class="journal-field">
        <label class="form-label small fw-semibold">Visibility</label>
        <select class="form-select" name="visibility">
          <option value="private"${entry.visibility === 'private' ? ' selected' : ''}>Private</option>
          <option value="shareable"${entry.visibility === 'shareable' ? ' selected' : ''}>Shareable later</option>
          <option value="community"${entry.visibility === 'community' ? ' selected' : ''}>Town Square candidate</option>
          <option value="charm-foundation"${entry.visibility === 'charm-foundation' ? ' selected' : ''}>CHARM care note</option>
        </select>
      </div>
      <div class="journal-field journal-field--wide">
        <label class="form-label small fw-semibold">Tags</label>
        <input class="form-control" name="tags" value="${escapeHtml(entry.tags.join(', '))}" placeholder="walk, vet, cozy" />
      </div>
      <div class="journal-field journal-field--wide">
        <label class="form-label small fw-semibold">Memory note</label>
        <textarea class="form-control" name="text" rows="4" required>${escapeHtml(entry.text || '')}</textarea>
      </div>
      <label class="journal-core-toggle journal-core-toggle--edit">
        <input class="form-check-input" type="checkbox" name="highlighted"${entry.highlighted ? ' checked' : ''} />
        <span><i class="bi bi-stars" aria-hidden="true"></i> Favorite Memory</span>
      </label>
    </div>
    <div class="d-flex flex-wrap gap-2 mt-3">
      <button class="btn btn-primary btn-sm" type="submit"><i class="bi bi-check2-circle" aria-hidden="true"></i> Save memory</button>
      <button class="btn btn-outline-secondary btn-sm" type="button" data-action="cancel-journal-edit">Cancel</button>
    </div>
    <div class="small text-danger mt-2 d-none" data-journal-edit-status role="alert"></div>
  `;

  const anchor = li.querySelector('.journal-entry-content') || li;
  anchor.insertAdjacentElement('beforeend', form);
  form.querySelector('textarea')?.focus();
}

function setJournalEditStatus(form, message) {
  const status = form?.querySelector('[data-journal-edit-status]');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('d-none', !message);
}

const journalListEl = document.getElementById('journalEntryList');
if (journalListEl) {
  journalListEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('button[data-action]');
    if (!btn) return;
    const li = btn.closest('li[data-entry-id]');
    if (!li || !CURRENT_PET_ID) return;

    const entryId = li.getAttribute('data-entry-id');
    const action = btn.getAttribute('data-action');

    if (action === 'cancel-journal-edit') {
      li.querySelector('[data-journal-edit-form]')?.remove();
      return;
    }

    if (action === 'delete-journal') {
      const confirmed = await accountConfirm({
        title: 'Delete journal memory?',
        message: 'This journal entry will be removed from the pet story trail. Favorite memory status and tags on this entry will be deleted too.',
        confirmLabel: 'Delete memory',
      });
      if (!confirmed) return;
      const res = await fetch(`/api/pets/${CURRENT_PET_ID}/journal/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        console.error('Delete failed', await res.text());
        return;
      }
      setAccountAlert('Journal memory deleted.', 'success');
      await loadPetJournal(CURRENT_PET_ID).catch(() => {});
      notifyStoryProgress({ source: 'journal-deleted' });
      return;
    }

    if (action === 'remove-photo') {
      const res = await fetch(`/api/pets/${CURRENT_PET_ID}/journal/${entryId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removePhoto: true }),
      });
      if (!res.ok) {
        console.error('Remove photo failed', await res.text());
        return;
      }
      loadPetJournal(CURRENT_PET_ID).catch(() => {});
      return;
    }

    if (action === 'toggle-core-memory') {
      const entry = getJournalEntryById(entryId);
      const next = li.getAttribute('data-highlighted') !== 'true';
      const metadata = buildJournalMetadata({
        ...(entry || {}),
        highlighted: next,
      }, entry?.metadata || {});
      const res = await fetch(`/api/pets/${CURRENT_PET_ID}/journal/${entryId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highlighted: next, metadata }),
      });
      if (!res.ok) {
        console.error('Core Memory update failed', await res.text());
        return;
      }
      await loadPetJournal(CURRENT_PET_ID).catch(() => {});
      notifyStoryProgress({ source: 'core-memory-updated', highlighted: next });
      return;
    }

    if (action === 'edit-journal') {
      const entry = getJournalEntryById(entryId);
      if (!entry) return;
      renderJournalEditForm(li, entry);
      return;
    }
  });

  journalListEl.addEventListener('submit', async (ev) => {
    const form = ev.target.closest('[data-journal-edit-form]');
    if (!form) return;
    ev.preventDefault();

    const li = form.closest('li[data-entry-id]');
    if (!li || !CURRENT_PET_ID) return;

    const entryId = li.getAttribute('data-entry-id');
    const existingEntry = getJournalEntryById(entryId);
    const text = form.querySelector('[name="text"]')?.value?.trim() || '';
    const title = form.querySelector('[name="title"]')?.value?.trim() || '';
    const entryType = form.querySelector('[name="entryType"]')?.value || 'note';
    const occurredAt = parseJournalLocalDate(form.querySelector('[name="occurredAt"]')?.value || '');
    const mood = form.querySelector('[name="mood"]')?.value?.trim() || '';
    const tags = form.querySelector('[name="tags"]')?.value || '';
    const tagList = normalizeJournalTags(tags);
    const visibility = form.querySelector('[name="visibility"]')?.value || 'private';
    const highlighted = form.querySelector('[name="highlighted"]')?.checked === true;
    if (!text) {
      setJournalEditStatus(form, 'Add a note before saving this memory.');
      return;
    }

    const saveBtn = form.querySelector('button[type="submit"]');
    if (saveBtn) saveBtn.disabled = true;
    setJournalEditStatus(form, '');

    try {
      const patch = {
        title,
        entryType,
        occurredAt,
        text,
        mood: mood || null,
        tags: tagList,
        visibility,
        highlighted,
        metadata: buildJournalMetadata({ entryType, visibility, highlighted, tags: tagList }, existingEntry?.metadata || {}),
      };
      const res = await fetch(`/api/pets/${CURRENT_PET_ID}/journal/${entryId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        console.error('Edit failed', await res.text());
        setJournalEditStatus(form, 'Could not save this memory. Please try again.');
        return;
      }
      await loadPetJournal(CURRENT_PET_ID);
      notifyStoryProgress({ source: 'journal-updated' });
    } catch (err) {
      console.warn('[account.js] journal edit failed:', err);
      setJournalEditStatus(form, 'Could not save this memory. Please try again.');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

const addJournalBtn = document.getElementById('addJournalEntryBtn');
if (addJournalBtn) {
  addJournalBtn.addEventListener('click', async () => {
    if (!CURRENT_PET_ID) return;

    const noteEl  = document.getElementById('newJournalNote');
    const titleEl = document.getElementById('newJournalTitle');
    const tagsEl  = document.getElementById('journalTags');
    const moodEl  = document.getElementById('journalMood');
    const photoEl = document.getElementById('journalPhoto');
    const typeEl = document.getElementById('journalEntryType');
    const occurredEl = document.getElementById('journalOccurredAt');
    const visibilityEl = document.getElementById('journalVisibility');
    const coreEl = document.getElementById('journalCoreMemory');

    const text  = noteEl ? noteEl.value.trim() : '';
    if (!text) {
      setJournalComposerStatus('Add a note before saving this journal entry.', 'danger');
      noteEl?.focus();
      return;
    }

    const title = titleEl ? titleEl.value.trim() : '';
    const tags = tagsEl ? tagsEl.value : '';
    const tagList = normalizeJournalTags(tags);
    const mood = moodEl ? moodEl.value : null;
    const entryType = typeEl ? typeEl.value : 'note';
    const occurredAt = parseJournalLocalDate(occurredEl?.value || '') || new Date().toISOString();
    const visibility = visibilityEl ? visibilityEl.value : 'private';
    const highlighted = coreEl?.checked === true;
    const file = photoEl?.files?.[0] || null;
    const photoDataUrl = file ? await readFileAsDataURL(file) : null;
    const pet = PETS.find(p => String(p.id) === String(CURRENT_PET_ID));
    const metadata = buildJournalMetadata({ entryType, visibility, highlighted, tags: tagList }, {
      petName: pet?.name || null,
    });

    addJournalBtn.disabled = true;
    setJournalComposerStatus('Saving journal entry...', 'muted');
    try {
      const res = await fetch(`/api/pets/${CURRENT_PET_ID}/journal`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          entryType,
          occurredAt,
          text,
          mood,
          tags: tagList,
          photo: photoDataUrl,
          highlighted,
          visibility,
          metadata,
        }),
      });
      if (!res.ok) {
        console.error('Add entry failed', await res.text());
        setJournalComposerStatus('Could not save this journal entry. Please try again.', 'danger');
        return;
      }
      resetJournalComposer(pet);
      await loadPetJournal(CURRENT_PET_ID);
      setJournalComposerStatus('Journal entry saved.', 'success');
      notifyStoryProgress({ source: 'journal-created' });
    } catch (err) {
      console.warn('[account.js] journal create failed:', err);
      setJournalComposerStatus('Could not save this journal entry. Please try again.', 'danger');
    } finally {
      addJournalBtn.disabled = false;
    }
  });
}

//
// -------------------------------
// Profile + Orders (existing sections)
// -------------------------------
async function loadProfile() {
  try {
    const res = await fetch('/api/account/profile', { credentials: 'include' });
    if (!res.ok) {
      setAccountAlert('Unable to load your profile details right now.', 'warning');
      return;
    }
    const p = await res.json();
    $('#profileFirstName') && ($('#profileFirstName').value = p.firstName || '');
    $('#profileLastName')  && ($('#profileLastName').value  = p.lastName || '');
    $('#profileEmail')     && ($('#profileEmail').value     = p.email || '');
  } catch {
    setAccountAlert('Unable to load your profile details right now.', 'warning');
  }
}

// ✅ Wire the Profile form so "Save Changes" actually persists
function wireProfileForm() {
  const form = document.getElementById('profileForm');
  if (!form || form.dataset.wired === '1') return;
  form.dataset.wired = '1';

  const status = document.getElementById('profileStatus');
  const first  = document.getElementById('profileFirstName');
  const last   = document.getElementById('profileLastName');

  async function saveProfile(body) {
    // Prefer POST /update-info if present; otherwise PATCH the base endpoint.
    const tryPost = await fetch('/api/account/profile/update-info', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (tryPost.ok) return tryPost.json().catch(() => ({}));
    if (tryPost.status !== 404 && tryPost.status !== 405) {
      const t = await tryPost.text().catch(() => '');
      throw new Error(`Save failed (${tryPost.status}) ${t}`);
    }
    // Fallback
    const fallback = await fetch('/api/account/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!fallback.ok) {
      const t = await fallback.text().catch(() => '');
      throw new Error(`Save failed (${fallback.status}) ${t}`);
    }
    return fallback.json().catch(() => ({}));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    if (status) { status.className = 'alert alert-info mt-3'; status.style.display = 'block'; status.textContent = 'Saving…'; }
    try {
      const payload = {
        firstName: first?.value?.trim() || '',
        lastName:  last?.value?.trim()  || '',
      };
      await saveProfile(payload);
      if (status) { status.className = 'alert alert-success mt-3'; status.textContent = 'Saved!'; }
      await loadProfile().catch(() => {});
    } catch (err) {
      console.error('[profile save]', err);
      if (status) { status.className = 'alert alert-danger mt-3'; status.textContent = 'Save failed.'; }
    } finally {
      if (btn) btn.disabled = false;
      setTimeout(() => { if (status) status.style.display = 'none'; }, 1500);
    }
  });
}

async function loadOrders() {
  const container = document.getElementById('orderHistory');
  if (!container) return;
  container.innerHTML = `<div class="spinner-border text-info" role="status"><span class="visually-hidden">Loading...</span></div>`;
  try {
    const res = await fetch('/api/orders', { credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      container.innerHTML = `<div class="text-muted">Link your Shopify account to see order history.</div>`;
      return;
    }
    if (res.status === 503) {
      container.innerHTML = `<div class="text-muted">Shopify is temporarily unavailable. Please try again soon.</div>`;
      setAccountAlert('Shopify is temporarily unavailable. Order history may be delayed.', 'warning');
      return;
    }
    if (!res.ok) throw new Error('Orders load failed');
    const payload = await res.json();
    const orders = Array.isArray(payload)
      ? payload
      : (Array.isArray(payload?.orders) ? payload.orders : []);
    container.innerHTML = Array.isArray(orders) && orders.length
      ? orders.map(o => {
          const when   = o.processedAt ? new Date(o.processedAt).toLocaleString() : '';
          const amount = o.totalPriceV2?.amount ?? '';
          const cur    = o.totalPriceV2?.currencyCode ?? '';
          const items  = (o.lineItems?.edges || []).map(e => `<li>${escapeHtml(e.node.title)} × ${e.node.quantity}</li>`).join('');
          const statusUrl = safeUrl(o.statusUrl);
          return `
            <div class="card mb-3"><div class="card-body">
              <div class="d-flex justify-content-between">
                <div>
                  <div class="fw-semibold">Order #${escapeHtml(o.orderNumber ?? o.name ?? '')}</div>
                  <div class="text-muted small">${escapeHtml(when)}</div>
                </div>
                <div class="text-end">
                  <div class="fw-semibold">${escapeHtml(amount)} ${escapeHtml(cur)}</div>
                  ${statusUrl ? `<a class="small" href="${escapeHtml(statusUrl)}" target="_blank" rel="noopener">Status</a>`:''}
                </div>
              </div>
              <ul class="mt-2 mb-0 small">${items}</ul>
            </div></div>`;
        }).join('')
      : `<div class="text-muted">No recent orders</div>`;
  } catch {
    container.innerHTML = `<div class="text-danger">Failed to load orders</div>`;
    setAccountAlert('Order history is unavailable right now. Please try again shortly.', 'warning');
  }
}

//
// -------------------------------
// Address Book
// -------------------------------
async function loadAddresses() {
  const list = document.getElementById('addressList');
  if (!list) return;
  list.innerHTML = `<div class="text-muted small">Loading…</div>`;
  try {
    const res = await fetch('/api/addresses', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load addresses');
    const rows = await res.json();
    ADDRESSES = Array.isArray(rows) ? rows : [];

    if (!ADDRESSES.length) {
      list.innerHTML = `
        <div class="account-empty-state account-empty-state--compact">
          <strong>No saved addresses yet.</strong>
          <p class="mb-0">Add a shipping address when you are ready for Pawket Packs, gifts, and order updates.</p>
        </div>`;
      return;
    }

    const html = ADDRESSES.map(a => {
      const badges = [
        a.isDefaultShipping ? `<span class="badge bg-info-subtle text-info-emphasis me-1">Default Shipping</span>` : '',
        a.isDefaultBilling  ? `<span class="badge bg-success-subtle text-success-emphasis me-1">Default Billing</span>`  : '',
      ].join('');
      const nameLine = [a.name, a.phone].filter(Boolean).join(' · ');
      const addrLines = [
        a.address1,
        a.address2,
        `${a.city}, ${a.state} ${a.postalCode}`,
        a.country
      ].filter(Boolean).map(escapeHtml).join('<br/>');

      return `
        <li class="border rounded p-2 mb-2" data-address-id="${escapeHtml(a.id)}">
          <div class="d-flex justify-content-between align-items-start">
            <div class="me-2">
              <div class="fw-semibold">${escapeHtml(a.label || 'Address')}</div>
              <div class="small text-muted">${escapeHtml(nameLine)}</div>
              <div class="mt-1">${badges}</div>
            </div>
            <div class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" data-action="edit-address">Edit</button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete-address">Delete</button><br/>
              <button class="btn btn-sm btn-outline-primary mt-1" data-action="set-default-ship">Make Default Ship</button>
              <button class="btn btn-sm btn-outline-success mt-1 ms-1" data-action="set-default-bill">Make Default Bill</button>
            </div>
          </div>
          <div class="mt-2 small">${addrLines}</div>
        </li>`;
    }).join('');

    list.innerHTML = html;
  } catch (e) {
    console.error(e);
    ADDRESSES = [];
    list.innerHTML = `<div class="text-danger small">Failed to load addresses.</div>`;
    setAccountAlert('Address book failed to load. Please refresh or try again later.', 'warning');
  }
}

// ---- Address Book: mount hooks without touching HTML ----
function ensureAddressSection() {
  // If hooks already exist, don't create duplicates
  if (document.getElementById('addressList') &&
      document.getElementById('addressAddBtn') &&
      document.getElementById('account-addresses')) {
    return true;
  }

  // Create the section markup
  const section = document.createElement('section');
  section.id = 'account-addresses';
  section.className = 'mt-4';
  section.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h3 class="h5 m-0">Address Book</h3>
      <button id="addressAddBtn" class="btn btn-sm btn-primary">Add Address</button>
    </div>
    <ul id="addressList" class="list-unstyled m-0 p-0"></ul>
  `;

  // Preferred anchors in your existing Account page (first one found wins)
  const anchors = [
    document.getElementById('account-journal'),
    document.getElementById('account-pets'),
    (function () {
      const o = document.getElementById('ordersContainer');
      if (o) {
        return o.closest('section') || o;
      }
      return null;
    })(),
    document.getElementById('accountRoot'),
    document.querySelector('main .container'),
    document.querySelector('main'),
  ].filter(Boolean);

  // Insert after the first anchor; otherwise append to body (last resort)
  const anchor = anchors[0] || document.body;
  if (anchor.insertAdjacentElement) {
    anchor.insertAdjacentElement('afterend', section);
  } else if (anchor.parentNode) {
    anchor.parentNode.insertBefore(section, anchor.nextSibling);
  } else {
    document.body.appendChild(section);
  }
  return true;
}

function ensureAddressModal() {
  let modal = document.getElementById('addressModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'addressModal';
  modal.className = 'custom-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');
  modal.setAttribute('aria-labelledby', 'addressModalTitle');
  modal.innerHTML = `
    <div class="modal-content account-address-modal" data-modal-content>
      <h3 id="addressModalTitle">Add Address</h3>
      <p class="text-muted small mb-3">Used for Pawket Pack shipping, gifts, and order updates. You can update defaults anytime.</p>
      <form id="addressForm">
        <input type="hidden" name="id" />
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label class="form-label" for="addressLabel">Label</label>
            <input class="form-control" id="addressLabel" name="label" autocomplete="address-line1" placeholder="Home, Work, Family" />
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label" for="addressName">Recipient</label>
            <input class="form-control" id="addressName" name="name" autocomplete="name" placeholder="Full name" />
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label" for="addressPhone">Phone</label>
            <input class="form-control" id="addressPhone" name="phone" autocomplete="tel" placeholder="Optional" />
          </div>
          <div class="col-12">
            <label class="form-label" for="addressLine1">Address line 1</label>
            <input class="form-control" id="addressLine1" name="address1" autocomplete="address-line1" required />
          </div>
          <div class="col-12">
            <label class="form-label" for="addressLine2">Address line 2</label>
            <input class="form-control" id="addressLine2" name="address2" autocomplete="address-line2" placeholder="Apartment, suite, unit" />
          </div>
          <div class="col-12 col-sm-5">
            <label class="form-label" for="addressCity">City</label>
            <input class="form-control" id="addressCity" name="city" autocomplete="address-level2" required />
          </div>
          <div class="col-6 col-sm-3">
            <label class="form-label" for="addressState">State</label>
            <input class="form-control" id="addressState" name="state" autocomplete="address-level1" required />
          </div>
          <div class="col-6 col-sm-4">
            <label class="form-label" for="addressPostal">Postal code</label>
            <input class="form-control" id="addressPostal" name="postalCode" autocomplete="postal-code" required />
          </div>
          <div class="col-12 col-sm-6">
            <label class="form-label" for="addressCountry">Country</label>
            <input class="form-control" id="addressCountry" name="country" autocomplete="country-name" value="US" required />
          </div>
          <div class="col-12">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="addressDefaultShipping" name="isDefaultShipping" />
              <label class="form-check-label" for="addressDefaultShipping">Default shipping address</label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="addressDefaultBilling" name="isDefaultBilling" />
              <label class="form-check-label" for="addressDefaultBilling">Default billing address</label>
            </div>
          </div>
        </div>
        <div id="addressFormStatus" class="small text-danger mt-2 d-none" role="alert" aria-live="polite"></div>
        <div class="d-flex justify-content-between align-items-center gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" data-close="addressModal">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Address</button>
        </div>
      </form>
      <button class="close-btn" data-close="addressModal" aria-label="Close address modal">×</button>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('#addressForm');
  form?.addEventListener('submit', submitAddressForm);
  return modal;
}

function setAddressFormStatus(message) {
  const status = document.getElementById('addressFormStatus');
  if (!status) return;
  status.textContent = message || '';
  status.classList.toggle('d-none', !message);
}

function fillAddressForm(address = {}) {
  const modal = ensureAddressModal();
  const form = modal.querySelector('#addressForm');
  if (!form) return;
  const fields = ['id', 'label', 'name', 'phone', 'address1', 'address2', 'city', 'state', 'postalCode', 'country'];
  fields.forEach(name => {
    const input = form.elements[name];
    if (input) input.value = address?.[name] ?? (name === 'country' ? 'US' : '');
  });
  form.elements.isDefaultShipping.checked = !!address?.isDefaultShipping;
  form.elements.isDefaultBilling.checked = !!address?.isDefaultBilling;
  setAddressFormStatus('');
}

function readAddressForm(form) {
  const value = (name) => form.elements[name]?.value?.trim() || '';
  const data = {
    label: value('label') || null,
    name: value('name') || null,
    phone: value('phone') || null,
    address1: value('address1'),
    address2: value('address2') || null,
    city: value('city'),
    state: value('state'),
    postalCode: value('postalCode'),
    country: value('country') || 'US',
    isDefaultShipping: !!form.elements.isDefaultShipping?.checked,
    isDefaultBilling: !!form.elements.isDefaultBilling?.checked,
  };
  if (!data.address1 || !data.city || !data.state || !data.postalCode || !data.country) {
    setAddressFormStatus('Address line 1, city, state, postal code, and country are required.');
    return null;
  }
  return data;
}

function openAddressModal(address = {}) {
  const modal = ensureAddressModal();
  fillAddressForm(address);
  const title = modal.querySelector('#addressModalTitle');
  const submit = modal.querySelector('button[type="submit"]');
  const editing = !!address?.id;
  if (title) title.textContent = editing ? 'Edit Address' : 'Add Address';
  if (submit) submit.textContent = editing ? 'Save Changes' : 'Save Address';
  openModal('addressModal');
}

async function submitAddressForm(ev) {
  ev.preventDefault();
  const form = ev.currentTarget;
  const id = form.elements.id?.value || '';
  const data = readAddressForm(form);
  if (!data) return;

  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  setAddressFormStatus('');
  try {
    const res = await fetch(id ? `/api/addresses/${encodeURIComponent(id)}` : '/api/addresses', {
      method: id ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setAddressFormStatus(payload?.error || 'Could not save this address. Please check the fields and try again.');
      return;
    }
    closeModal('addressModal');
    setAccountAlert('Address saved.', 'success');
    await loadAddresses();
  } catch (err) {
    console.warn('[account.js] address save failed:', err);
    setAddressFormStatus('Could not save this address. Please try again.');
  } finally {
    if (submit) submit.disabled = false;
  }
}

// Wire address UI once (after ensureAddressSection())
function wireAddressUI() {
  const listEl = document.getElementById('addressList');
  if (listEl && !listEl.__wiredAddressActions) {
    listEl.__wiredAddressActions = true;
    listEl.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const li = btn.closest('li[data-address-id]');
      const id = li?.getAttribute('data-address-id');
      const action = btn.getAttribute('data-action');

      if (action === 'delete-address') {
        const address = ADDRESSES.find(a => String(a.id) === String(id));
        const label = address?.label || address?.address1 || 'this address';
        const confirmed = await accountConfirm({
          title: 'Delete address?',
          message: `This will remove ${label} from your saved account addresses.`,
          confirmLabel: 'Delete address',
        });
        if (!confirmed) return;
        const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
        if (!res.ok) { console.error('Delete failed', await res.text()); return; }
        setAccountAlert('Address removed.', 'success');
        loadAddresses();
        return;
      }

      if (action === 'set-default-ship') {
        const res = await fetch(`/api/addresses/${id}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDefaultShipping: true })
        });
        if (!res.ok) { console.error('Set default ship failed', await res.text()); return; }
        setAccountAlert('Default shipping address updated.', 'success');
        loadAddresses();
        return;
      }

      if (action === 'set-default-bill') {
        const res = await fetch(`/api/addresses/${id}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isDefaultBilling: true })
        });
        if (!res.ok) { console.error('Set default bill failed', await res.text()); return; }
        setAccountAlert('Default billing address updated.', 'success');
        loadAddresses();
        return;
      }

      if (action === 'edit-address') {
        const current = ADDRESSES.find(a => String(a.id) === String(id)) || { id };
        openAddressModal(current);
        return;
      }
    });
  }

  const addBtn = document.getElementById('addressAddBtn');
  if (addBtn && !addBtn.__wiredAddressAdd) {
    addBtn.__wiredAddressAdd = true;
    addBtn.addEventListener('click', async () => {
      openAddressModal();
    });
  }
}

//
// -------------------------------
// Init
// -------------------------------
let accountInitPromise = null;

async function initAccountPage() {
  if (accountInitPromise) return accountInitPromise;
  accountInitPromise = (async () => {
    const session = await loadSession();
    if (!session?.signedIn) return;

    // Wire the profile form before fetching and rendering current values.
    wireProfileForm();

    // Ensure Address section exists, wire once, then load.
    ensureAddressSection();
    wireAddressUI();

    await Promise.allSettled([loadProfile(), loadOrders(), loadPets(), loadPawketPals(), loadAddresses()]);
  })();
  try {
    return await accountInitPromise;
  } finally {
    accountInitPromise = null;
  }
}

initAccountPage().catch((err) => console.warn('[account] init failed:', err));
document.addEventListener('auth:login', () => initAccountPage().catch((err) => console.warn('[account] login init failed:', err)));
document.addEventListener('auth:signup', () => initAccountPage().catch((err) => console.warn('[account] signup init failed:', err)));
