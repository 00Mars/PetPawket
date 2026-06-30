import { api } from './api.js';
import { buildPetProfile, petShelfHref } from './petPersonalization.js';
import { PetsBus } from './petsEvents.js';

const DEFAULT_PET_IMAGE = '/assets/images/default-pet.png';
const PERSONALIZED_SELECTOR = '[data-pet-personalize]';

let initialized = false;
let refreshTimer = 0;
let latestPets = [];
let domObserver = null;

function clean(value = '') {
  return String(value ?? '').trim();
}

function possessive(name = '') {
  const safe = clean(name) || 'your pet';
  return `${safe}${safe.toLowerCase().endsWith('s') ? "'" : "'s"}`;
}

function safeMediaUrl(value = '') {
  const raw = clean(value);
  if (!raw) return '';
  if (/^(https?:|data:image\/|\/assets\/|\/uploads\/pets\/)/i.test(raw)) return raw;
  return '';
}

function petAvatarUrl(pet = {}) {
  return safeMediaUrl(pet?.avatar || pet?.avatarUrl || pet?.avatar_url);
}

function petImageCopy(pet = {}, name = 'your pet') {
  return {
    image: petAvatarUrl(pet) || DEFAULT_PET_IMAGE,
    imageAlt: `${name} profile photo`,
  };
}

function readOriginal(el) {
  if (!el) return {};
  if (el.__ppPetOriginal) return el.__ppPetOriginal;
  const original = {
    label: el.querySelector('[data-pet-personalize-label]')?.textContent || '',
    title: el.querySelector('[data-pet-personalize-title]')?.textContent || '',
    body: el.querySelector('[data-pet-personalize-body]')?.textContent || '',
    cta: el.querySelector('[data-pet-personalize-cta]')?.textContent || '',
    href: el.querySelector('[data-pet-personalize-cta]')?.getAttribute('href') || '',
    image: el.querySelector('[data-pet-personalize-image]')?.getAttribute('src') || '',
    imageAlt: el.querySelector('[data-pet-personalize-image]')?.getAttribute('alt') || '',
  };
  el.__ppPetOriginal = original;
  return original;
}

function setText(root, selector, value) {
  const el = root?.querySelector?.(selector);
  if (el && value) el.textContent = value;
}

function setHref(root, selector, value) {
  const el = root?.querySelector?.(selector);
  if (el && value) el.setAttribute('href', value);
}

function setImage(root, value, alt) {
  const img = root?.querySelector?.('[data-pet-personalize-image]');
  if (!img) return;
  img.src = value || DEFAULT_PET_IMAGE;
  if (alt) img.alt = alt;
}

function petCopy(type, pet, original = {}) {
  const profile = buildPetProfile(pet || {});
  const name = profile.name || clean(pet?.name) || 'your pet';
  const petPossessive = possessive(name);
  const imageCopy = petImageCopy(pet, name);
  const speciesLabel = profile.speciesLabel && profile.speciesLabel !== 'Pet'
    ? profile.speciesLabel
    : clean(pet?.species || pet?.type || '');

  if (type === 'profile') {
    return {
      label: speciesLabel ? `${speciesLabel} profile` : 'Pet profile',
      title: `${petPossessive} care details, all in one place.`,
      body: `Save sizes, favorites, routines, and notes so Pet Pawket feels more like ${name}.`,
      cta: `Edit ${name}`,
      href: '/account.html#account-pets',
      ...imageCopy,
    };
  }

  if (type === 'memory') {
    return {
      label: original.label || 'Favorite memory',
      title: `Save ${petPossessive} little moments.`,
      body: 'First walks, brave days, silly habits, and quiet moments all have room here.',
      cta: `Open ${name}'s journal`,
      href: '/account.html#account-pets',
      ...imageCopy,
    };
  }

  if (type === 'pal') {
    return {
      label: original.label || 'Private Pal',
      title: `Make a keepsake for ${name} when it feels right.`,
      body: original.body || '',
      cta: `Make ${name}'s Pal`,
      href: `/pals.html?pet=${encodeURIComponent(pet?.id || '')}#private-pal-certificate-form`,
      ...imageCopy,
    };
  }

  if (type === 'gift') {
    const compact = !clean(original.title) && !clean(original.label);
    return {
      label: original.label || 'Gift',
      title: original.title ? `Send a small kindness for ${name}.` : '',
      body: compact
        ? `Send a Pawket Pass for ${name} when you want to share the love.`
        : 'Share a Pawket Pass for a gift, a thank-you, or a small moment of care.',
      cta: 'Open Passes',
      href: '/loop.html',
      ...imageCopy,
    };
  }

  if (type === 'shop') {
    return {
      label: original.label || 'Shop',
      title: `Find picks for ${name}.`,
      body: `${speciesLabel || 'Pet'} details can help tune toys, treats, care goods, and Pawket Pack ideas.`,
      cta: `Shop for ${name}`,
      href: petShelfHref(pet),
      ...imageCopy,
    };
  }

  return {
    label: original.label,
    title: original.title,
    body: original.body,
    cta: original.cta,
    href: original.href,
    ...imageCopy,
  };
}

function restoreGeneric(root) {
  const original = readOriginal(root);
  setText(root, '[data-pet-personalize-label]', original.label);
  setText(root, '[data-pet-personalize-title]', original.title);
  setText(root, '[data-pet-personalize-body]', original.body);
  setText(root, '[data-pet-personalize-cta]', original.cta);
  setHref(root, '[data-pet-personalize-cta]', original.href);
  if (original.image) setImage(root, original.image, original.imageAlt);
  root?.removeAttribute?.('data-pet-personalized');
  root?.removeAttribute?.('data-pet-id');
}

function applyPet(root, pet) {
  if (!root || !pet) return restoreGeneric(root);
  const type = root.getAttribute('data-pet-personalize') || 'profile';
  const original = readOriginal(root);
  const copy = petCopy(type, pet, original);
  setText(root, '[data-pet-personalize-label]', copy.label);
  setText(root, '[data-pet-personalize-title]', copy.title);
  setText(root, '[data-pet-personalize-body]', copy.body);
  setText(root, '[data-pet-personalize-cta]', copy.cta);
  setHref(root, '[data-pet-personalize-cta]', copy.href);
  if (copy.image) setImage(root, copy.image, copy.imageAlt);
  root.setAttribute('data-pet-personalized', 'pet');
  if (pet.id != null) root.setAttribute('data-pet-id', String(pet.id));
}

export function petRotationPool(pets = []) {
  const usable = Array.isArray(pets) ? pets.filter(Boolean) : [];
  if (usable.length <= 1) return usable;
  return [...usable, null];
}

export function petForPersonalizedIndex(pets = [], index = 0) {
  const pool = petRotationPool(pets);
  if (!pool.length) return null;
  return pool[Math.max(0, Number(index) || 0) % pool.length] || null;
}

export function applyPetSurfacePersonalization(pets = latestPets, root = document) {
  const nodes = [...(root?.querySelectorAll?.(PERSONALIZED_SELECTOR) || [])];
  nodes.forEach((node, index) => {
    const pet = petForPersonalizedIndex(pets, index);
    if (pet) applyPet(node, pet);
    else restoreGeneric(node);
  });
  return { nodes: nodes.length, pets: Array.isArray(pets) ? pets.length : 0 };
}

async function loadPets() {
  const result = await api.petsList();
  latestPets = result.ok && Array.isArray(result.pets) ? result.pets : [];
  return latestPets;
}

function scheduleRefresh(delay = 80) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(async () => {
    try {
      await loadPets();
    } catch {
      latestPets = [];
    }
    applyPetSurfacePersonalization(latestPets);
  }, delay);
}

export function initPetSurfacePersonalization() {
  if (initialized) return applyPetSurfacePersonalization(latestPets);
  initialized = true;
  readAllOriginals();
  scheduleRefresh(0);
  observePersonalizedDom();

  document.addEventListener('auth:login', () => scheduleRefresh(0));
  document.addEventListener('auth:signup', () => scheduleRefresh(0));
  document.addEventListener('auth:logout', () => {
    latestPets = [];
    applyPetSurfacePersonalization([]);
  });

  ['pets:list:loaded', 'pets:changed', 'pet:created', 'pet:updated', 'pet:deleted', 'pets:refresh:request']
    .forEach(eventName => PetsBus.on?.(eventName, () => scheduleRefresh(60)));

  return applyPetSurfacePersonalization(latestPets);
}

function readAllOriginals(root = document) {
  root.querySelectorAll?.(PERSONALIZED_SELECTOR).forEach(readOriginal);
}

function observePersonalizedDom() {
  if (domObserver || typeof MutationObserver === 'undefined') return;
  domObserver = new MutationObserver((mutations) => {
    const hasNewPersonalizedNode = mutations.some((mutation) => (
      [...mutation.addedNodes].some((node) => {
        if (node?.nodeType !== 1) return false;
        return node.matches?.(PERSONALIZED_SELECTOR) || node.querySelector?.(PERSONALIZED_SELECTOR);
      })
    ));
    if (!hasNewPersonalizedNode) return;
    readAllOriginals();
    applyPetSurfacePersonalization(latestPets);
  });
  domObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
}
