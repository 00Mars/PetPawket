// public/forMyPets.js
import { getSession } from './auth.js';

const petsList = document.getElementById('petsList');
const recs = document.getElementById('recs');

function esc(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

function safeImageUrl(value, fallback = '/assets/images/placeholder.png') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return fallback;
}

function safeCheckoutUrl(value) {
  try {
    const url = new URL(String(value || ''), window.location.origin);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function card(p) {
  const img = safeImageUrl(p.featuredImage?.url);
  const price = p.priceRange?.minVariantPrice;
  const rawAmount = Number(price?.amount);
  const priceStr = Number.isFinite(rawAmount) ? `${rawAmount.toFixed(2)} ${esc(price.currencyCode || '')}` : '';
  const handle = String(p.handle || '');
  const title = esc(p.title || '');
  return `
    <div class="col-6 col-md-3">
      <div class="card h-100">
        <a href="/product.html?handle=${encodeURIComponent(handle)}" class="text-decoration-none text-reset">
          <img src="${esc(img)}" class="card-img-top" alt="${title}" style="object-fit:cover;height:190px;">
        </a>
        <div class="card-body d-flex flex-column">
          <a href="/product.html?handle=${encodeURIComponent(handle)}" class="stretched-link text-decoration-none text-reset">
            <div class="fw-semibold text-truncate">${title}</div>
          </a>
          <div class="text-muted small mt-1">${priceStr}</div>
        </div>
      </div>
    </div>`;
}

async function loadPets() {
  try {
    const session = await getSession();
    if (!session?.signedIn) {
      petsList.innerHTML = `<div class="text-muted">Sign in to load your pet profiles.</div>`;
      return;
    }
    const r = await fetch('/api/pets', { credentials: 'include' });
    if (r.status === 401 || r.status === 403) {
      petsList.innerHTML = `<div class="text-muted">Sign in to load your pet profiles.</div>`;
      return;
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const pets = j.pets || [];
    petsList.innerHTML = pets.map(p => `
      <div class="col-12 col-md-6">
        <div class="p-3 bg-white rounded-3 border">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <div class="fw-bold fs-5">${esc(p.name || 'Pet')}</div>
              <div class="text-muted small">${esc(p.species || '')} · size ${esc(p.size || '–')} · chew ${esc(p.chew_strength || '–')}</div>
              <div class="text-muted small">Allergies: ${Array.isArray(p.allergies) && p.allergies.length ? p.allergies.map(esc).join(', ') : 'none'}</div>
            </div>
            <button class="btn btn-primary" data-action="see-recs" data-pet-id="${esc(p.id)}">See picks</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    petsList.innerHTML = `<div class="text-danger">Could not load pets.</div>`;
  }
}

async function loadRecs(petId) {
  recs.innerHTML = `<div class="text-muted">Loading recommendations…</div>`;
  try {
    const r = await fetch(`/api/pets/${encodeURIComponent(petId)}/recs?limit=24`, { credentials:'include' });
    const j = await r.json();
    const items = j.items || j.products || [];

    const grid = items.length
      ? items.map(card).join('')
      : `<div class="text-muted">No picks yet.</div>`;

    // Add a box-planning button above the grid (no HTML file changes needed)
    recs.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <div class="fw-semibold">Personalized picks</div>
        <button class="btn btn-primary btn-sm"
                data-action="build-pack"
                data-pet-id="${esc(petId)}">
          Plan box add-ons
        </button>
      </div>
      <div class="row g-3">${grid}</div>
    `;
  } catch {
    recs.innerHTML = `<div class="text-danger">Could not load recommendations.</div>`;
  }
}

// Example button handler (on for-my-pets page after you load pack preview)
async function buildPack(petId){
  const prev = await (await fetch(`/api/pets/${encodeURIComponent(petId)}/recs?limit=24`, { credentials:'include' })).json();
  const lines = (prev.items || prev.products || [])
    .map(p => p.variants?.edges?.[0]?.node?.id)
    .filter(Boolean)
    .map(merch => ({ merchandiseId: merch, quantity: 1 }));

  const r = await fetch('/api/cart/create', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    credentials:'include',
    body: JSON.stringify({ lines })
  });
  const j = await r.json();
  const checkoutUrl = safeCheckoutUrl(j.checkoutUrl);
  if (checkoutUrl) location.href = checkoutUrl;
}


document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="see-recs"]');
  if (btn) {
    loadRecs(btn.dataset.petId);
    return;
  }
  const packBtn = e.target.closest('[data-action="build-pack"]');
  if (packBtn) {
    buildPack(packBtn.dataset.petId);
  }
});

loadPets();
