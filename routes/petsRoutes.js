// routes/petsRoutes.js — FULL SUPERSET RESTORE
// Features:
//  - List / create / update / delete pets
//  - Avatar upload (base64) + placeholder multi-image hook
//  - Journal CRUD: list/add/get/update/delete
//  - Recommendations via Shopify storefrontFetch with caching & retry
//  - Raw debug + bulk export/import
//  - Structured error responses
//  - All historical helper imports reactivated
//  - Email → ensureUser() always, never silent failure
//
// ENV toggles:
//  - PETS_RECO_CACHE_MS (default 5m) recommendation cache TTL
//  - PETS_DEBUG=true enables verbose logging
//
// TODO (optional future):
//  - Multipart avatar (use multer)
//  - Pagination for journal entries
//  - Fine-grained permission checks

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { requireAuth } from '../middleware/requireAuth.js';
import {
  ensureUser,
  getUserByEmail,
  getPetsByUserId,
  addPet,
  updatePetById,
  deletePetById,
  getPetJournal,
  addPetJournalEntry,
  updatePetJournalEntry,
  deletePetJournalEntry,
  getPetJournalEntryById
} from '../userDB.pg.js';

import { storefrontFetch } from '../utils/shopify.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'pets');
const PETS_DEBUG = String(process.env.PETS_DEBUG || '').toLowerCase() === 'true';
const RECO_CACHE_MS = parseInt(process.env.PETS_RECO_CACHE_MS || '300000', 10); // 5m default

function log(...a){ if (PETS_DEBUG) console.log('[pets]', ...a); }
function warn(...a){ console.warn('[pets]', ...a); }
function errLog(...a){ console.error('[pets]', ...a); }

try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) { warn('mkdir uploads/pets failed:', e.message); }

router.use(express.json({ limit: '12mb' }));
router.use(express.urlencoded({ extended: false }));
router.use(requireAuth);

// --------------------------------------------------
// Utility: uniform error responses
// --------------------------------------------------
function sendError(res, status, message, code='ERR') {
  return res.status(status).json({ ok:false, error:message, code });
}

// --------------------------------------------------
// Data shaping helpers
// --------------------------------------------------
const csv = v =>
  Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean)
  : String(v ?? '').split(',').map(s => s.trim()).filter(Boolean);

function toISODate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString().slice(0,10);
}

const SPECIES_ALLOWED = new Set([
  'dog','cat','bird','fish','reptile',
  'rabbit','hamster','guinea pig','ferret','horse',
  'small','other'
]);

const SPECIES_ALIASES = new Map([
  ['guineapig', 'guinea pig'],
  ['small pet', 'small'],
  ['small-pet', 'small'],
  ['smallpet', 'small'],
  ['bunny', 'rabbit'],
  ['kitten', 'cat'],
  ['puppy', 'dog'],
  ['lizard', 'reptile'],
  ['snake', 'reptile'],
  ['gecko', 'reptile'],
]);

function normalizeSpecies(input) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return null;
  const mapped = SPECIES_ALIASES.get(raw) || raw;
  if (SPECIES_ALLOWED.has(mapped)) return mapped;
  return 'other';
}

function coerceSex(raw) {
  const val = raw?.sex ?? raw?.gender ?? raw?.traits?.sex ?? raw?.traits?.gender;
  if (val === undefined) return undefined;
  if (val === null) return null;
  const v = String(val).trim().toLowerCase();
  if (['f','female','girl'].includes(v)) return 'female';
  if (['m','male','boy'].includes(v))    return 'male';
  if (['unknown','n/a',''].includes(v))  return null;
  return v;
}

function coerceSpayNeuter(raw) {
  const val = raw?.spayedNeutered ?? raw?.spayNeuter ?? raw?.spayed ?? raw?.neutered ?? raw?.traits?.spayNeuter;
  if (val === undefined) return undefined;
  if (val === null) return null;
  if (val === true || val === false) return !!val;
  const s = String(val).trim().toLowerCase();
  if (['1','true','yes','y','t','spayed','neutered','fixed'].includes(s)) return true;
  if (['0','false','no','n','f','intact'].includes(s)) return false;
  if (['unknown','n/a',''].includes(s)) return null;
  return null;
}

function weightKg(raw) {
  const kg = raw?.weight_kg ?? raw?.weightKg;
  if (kg != null && isFinite(Number(kg))) return Number(kg);
  const lb = raw?.weightLb ?? raw?.traits?.weightLb;
  if (lb != null && isFinite(Number(lb))) {
    return Math.round(Number(lb) * 0.45359237 * 1000)/1000;
  }
  return undefined;
}

function buildPatch(body) {
  const p = {};
  if (body.name     !== undefined) p.name     = String(body.name).trim() || null;
  if (body.species  !== undefined) {
    p.species = normalizeSpecies(body.species);
  }
  if (body.breed    !== undefined) p.breed    = String(body.breed).trim() || null;
  if (body.birthday !== undefined) p.birthday = toISODate(body.birthday);

  const sx = coerceSex(body); if (sx !== undefined) p.sex = sx;
  const sn = coerceSpayNeuter(body); if (sn !== undefined) p.spayed_neutered = sn;
  const w  = weightKg(body); if (w !== undefined) p.weight_kg = w;

  if (body.notes !== undefined) p.notes = String(body.notes || '').trim() || null;
  if (body.allergies !== undefined) p.allergies = csv(body.allergies);
  if (body.dislikes  !== undefined) p.dislikes  = csv(body.dislikes);
  if (body.toy_prefs !== undefined) p.toy_prefs = csv(body.toy_prefs);
  if (body.food_prefs!== undefined) p.food_prefs= csv(body.food_prefs);

  if (body.traits !== undefined) {
    try {
      p.traits = typeof body.traits === 'string' ? JSON.parse(body.traits) : body.traits;
    } catch { p.traits = {}; }
  }

  // Placeholder for multi-image gallery future:
  if (body.gallery && Array.isArray(body.gallery)) {
    p.gallery = body.gallery.slice(0,16).map(x => String(x).trim()).filter(Boolean);
  }

  return p;
}

// --------------------------------------------------
// User resolution (hard requirement)
// --------------------------------------------------
async function resolveUser(req, res) {
  const email = req.customer?.email || req.dbUser?.email;
  if (!email) return sendError(res, 401, 'Unauthorized', 'NO_EMAIL');
  try {
    const user = await ensureUser(email);
    return user;
  } catch (e) {
    errLog('ensureUser error:', e);
    return sendError(res, 500, 'User resolution failed', 'ENSURE_FAIL');
  }
}

// --------------------------------------------------
// GET / (list pets)
// --------------------------------------------------
router.get('/', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const rows = await getPetsByUserId(user.id);
    log('list count', rows.length);
    res.json({ ok:true, pets: rows || [] });
  } catch (e) {
    errLog('list error:', e);
    sendError(res, 500, 'Failed to load pets', 'LIST_FAIL');
  }
});

// --------------------------------------------------
// POST / (create)
// --------------------------------------------------
router.post('/', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const { name } = req.body || {};
    if (!name) return sendError(res, 400, 'name required', 'NAME_MISSING');

    const base = buildPatch(req.body);
    const inserted = await addPet(user.email, {
      name: base.name,
      species: base.species,
      breed: base.breed,
      birthday: base.birthday,
      traits: base.traits || {}
    });
    if (!inserted) return sendError(res, 500, 'Insert failed', 'INSERT_FAIL');

    const extra = { ...base };
    delete extra.name; delete extra.species; delete extra.breed; delete extra.birthday; delete extra.traits;
    if (Object.keys(extra).length) {
      await updatePetById(user.id, inserted.id, extra);
    }

    res.status(201).json({ ok:true, pet: inserted });
  } catch (e) {
    errLog('create error:', e);
    sendError(res, 500, 'Failed to create pet', 'CREATE_FAIL');
  }
});

// --------------------------------------------------
// PATCH /:id (update)
// --------------------------------------------------
router.patch('/:id', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const id = String(req.params.id||'').trim();
    if (!id) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    const patch = buildPatch(req.body || {});
    if (!Object.keys(patch).length) return sendError(res, 400, 'No fields to update', 'EMPTY_PATCH');
    const updated = await updatePetById(user.id, id, patch);
    if (!updated) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
    res.json({ ok:true, pet: updated });
  } catch (e) {
    errLog('update error:', e);
    sendError(res, 500, 'Failed to update pet', 'UPDATE_FAIL');
  }
});

// --------------------------------------------------
// DELETE /:id
// --------------------------------------------------
router.delete('/:id', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const id = String(req.params.id||'').trim();
    if (!id) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    const ok = await deletePetById(user.id, id);
    if (!ok) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
    res.json({ ok:true });
  } catch (e) {
    errLog('delete error:', e);
    sendError(res, 500, 'Failed to delete pet', 'DELETE_FAIL');
  }
});

// --------------------------------------------------
// POST /:id/avatar (base64 upload)
// --------------------------------------------------
router.post('/:id/avatar', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const id = String(req.params.id||'').trim();
    const { imageBase64, remove } = req.body || {};
    if (!id) return sendError(res, 400, 'Pet id required', 'ID_MISSING');

    if (remove === true) {
      const updated = await updatePetById(user.id, id, { avatar: null });
      if (!updated) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
      return res.json({ ok:true, pet: updated });
    }

    if (!imageBase64 || !/^data:image\/[a-zA-Z]+;base64,/.test(imageBase64)) {
      return sendError(res, 400, 'Invalid image data', 'BAD_IMAGE');
    }
    const ext = imageBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64/)?.[1] || 'png';
    const fileName = `${id}.${Date.now()}.${ext}`.replace(/[^a-zA-Z0-9._-]/g,'');
    const filePath = path.join(UPLOAD_DIR, fileName);
    const b64 = imageBase64.split(',')[1];
    fs.writeFileSync(filePath, Buffer.from(b64,'base64'));
    const updated = await updatePetById(user.id, id, { avatar: `/uploads/pets/${fileName}` });
    if (!updated) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
    res.json({ ok:true, pet: updated });
  } catch (e) {
    errLog('avatar error:', e);
    sendError(res, 500, 'Failed to upload avatar', 'AVATAR_FAIL');
  }
});

// DELETE /:id/avatar (remove avatar)
router.delete('/:id/avatar', async (req, res) => {
  const user = await resolveUser(req, res);
  if (!user || res.headersSent) return;
  try {
    const id = String(req.params.id||'').trim();
    if (!id) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    const updated = await updatePetById(user.id, id, { avatar: null });
    if (!updated) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
    res.json({ ok:true, pet: updated });
  } catch (e) {
    errLog('avatar delete error:', e);
    sendError(res, 500, 'Failed to remove avatar', 'AVATAR_DELETE_FAIL');
  }
});

// --------------------------------------------------
// JOURNAL: GET /:id/journal (list)
// --------------------------------------------------
router.get('/:id/journal', async (req, res) => {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    if (!petId) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    const entries = await getPetJournal(user.id, petId);
    res.json({ ok:true, journal: entries || [] });
  } catch (e) {
    errLog('journal list error:', e);
    sendError(res, 500, 'Failed to load journal', 'JOURNAL_LIST_FAIL');
  }
});

// --------------------------------------------------
// JOURNAL: POST /:id/journal (create)
// --------------------------------------------------
router.post('/:id/journal', async (req, res) => {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    const {
      text,
      title,
      entryType,
      entry_type,
      occurredAt,
      occurred_at,
      mood,
      tags,
      photo,
      photoDataUrl,
      highlighted,
      coreMemory,
      visibility,
      metadata
    } = req.body || {};
    const finalPhoto = photo ?? photoDataUrl ?? null;
    const finalText = String(text || '').trim();
    if (!petId) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    if (!finalText) return sendError(res, 400, 'text required', 'TEXT_MISSING');
    const entry = await addPetJournalEntry(user.id, petId, {
      text: finalText,
      title,
      entryType: entryType ?? entry_type,
      occurredAt: occurredAt ?? occurred_at,
      mood,
      tags,
      photo: finalPhoto,
      highlighted: highlighted === true || coreMemory === true,
      visibility,
      metadata,
    });
    res.status(201).json({ ok:true, entry });
  } catch (e) {
    errLog('journal create error:', e);
    sendError(res, 500, 'Failed to add entry', 'JOURNAL_CREATE_FAIL');
  }
});

// --------------------------------------------------
// JOURNAL: GET /:id/journal/:entryId (single)
// --------------------------------------------------
router.get('/:id/journal/:entryId', async (req, res) => {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    const entryId = String(req.params.entryId||'').trim();
    if (!petId || !entryId) return sendError(res, 400, 'Missing ids', 'ID_MISSING');
    const entry = await getPetJournalEntryById(user.id, petId, entryId);
    if (!entry) return sendError(res, 404, 'Not found', 'NOT_FOUND');
    res.json({ ok:true, entry });
  } catch (e) {
    errLog('journal single error:', e);
    sendError(res, 500, 'Failed to load entry', 'JOURNAL_SINGLE_FAIL');
  }
});

// --------------------------------------------------
// JOURNAL: PATCH /:id/journal/:entryId
// --------------------------------------------------
router.patch('/:id/journal/:entryId', async (req, res) => {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    const entryId = String(req.params.entryId||'').trim();
    if (!petId || !entryId) return sendError(res, 400, 'Missing ids', 'ID_MISSING');

    const patch = {};
    if (req.body.text !== undefined) patch.text = req.body.text;
    if (req.body.title !== undefined) patch.title = req.body.title;
    if (req.body.entryType !== undefined) patch.entryType = req.body.entryType;
    if (req.body.entry_type !== undefined && patch.entryType === undefined) patch.entryType = req.body.entry_type;
    if (req.body.occurredAt !== undefined) patch.occurredAt = req.body.occurredAt;
    if (req.body.occurred_at !== undefined && patch.occurredAt === undefined) patch.occurredAt = req.body.occurred_at;
    if (req.body.mood !== undefined) patch.mood = req.body.mood;
    if (req.body.tags !== undefined) patch.tags = req.body.tags;
    if (req.body.photo !== undefined) patch.photo = req.body.photo;
    if (req.body.highlighted !== undefined) patch.highlighted = req.body.highlighted;
    if (req.body.coreMemory !== undefined && patch.highlighted === undefined) patch.highlighted = req.body.coreMemory;
    if (req.body.visibility !== undefined) patch.visibility = req.body.visibility;
    if (req.body.metadata !== undefined) patch.metadata = req.body.metadata;
    if (req.body.photoDataUrl !== undefined && patch.photo === undefined) patch.photo = req.body.photoDataUrl;
    if (req.body.removePhoto === true) patch.photo = null;

    if (!Object.keys(patch).length) return sendError(res, 400, 'No patch fields', 'EMPTY_PATCH');

    const updated = await updatePetJournalEntry(user.id, petId, entryId, patch);
    if (!updated) return sendError(res, 404, 'Entry not found or no changes', 'NOT_FOUND');
    res.json({ ok:true, entry: updated });
  } catch (e) {
    errLog('journal update error:', e);
    sendError(res, 500, 'Failed to update entry', 'JOURNAL_UPDATE_FAIL');
  }
});

// --------------------------------------------------
// JOURNAL: DELETE /:id/journal/:entryId
// --------------------------------------------------
router.delete('/:id/journal/:entryId', async (req, res) => {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    const entryId = String(req.params.entryId||'').trim();
    if (!petId || !entryId) return sendError(res, 400, 'Missing ids', 'ID_MISSING');
    const ok = await deletePetJournalEntry(user.id, petId, entryId);
    if (!ok) return sendError(res, 404, 'Entry not found', 'NOT_FOUND');
    res.json({ ok:true });
  } catch (e) {
    errLog('journal delete error:', e);
    sendError(res, 500, 'Failed to delete entry', 'JOURNAL_DELETE_FAIL');
  }
});

// --------------------------------------------------
// Recommendations caching
// --------------------------------------------------
const recoCache = new Map(); // key: petId => { ts, products }

async function handleRecommendations(req, res) {
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const petId = String(req.params.id||'').trim();
    if (!petId) return sendError(res, 400, 'Pet id required', 'ID_MISSING');

    const rows = await getPetsByUserId(user.id);
    const pet = rows.find(r => String(r.id) === petId);
    if (!pet) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');

    // Simple cache
    const cached = recoCache.get(petId);
    if (cached && Date.now() - cached.ts < RECO_CACHE_MS) {
      return res.json({ ok:true, products: cached.products, cached:true });
    }

    const species = pet.species || '';
    const breed   = pet.breed || '';
    const queryTerms = [species, breed].filter(Boolean).join(' ');
    if (!queryTerms) {
      return res.json({ ok:true, products: [], note: 'No species/breed to query.' });
    }

    const first = Math.min(Math.max(parseInt(req.query.limit || '8', 10), 1), 50);
    const gql = `
      query ProductRecommendations($query:String!, $first:Int!) {
        products(first: $first, query: $query) {
          edges {
            node {
              id
              title
              handle
              featuredImage { url }
              productType
              variants(first: 1) { edges { node { id } } }
              priceRange { minVariantPrice { amount currencyCode } }
            }
          }
        }
      }
    `;
    const data = await storefrontFetch(gql, { query: queryTerms, first });
    const edges = data?.data?.products?.edges || [];
    const products = edges.map(e => {
      const n = e.node;
      return {
        ...n,
        image: n.featuredImage?.url || '',
        type: n.productType || '',
        price: n.priceRange?.minVariantPrice?.amount || null,
        currency: n.priceRange?.minVariantPrice?.currencyCode || 'USD'
      };
    });
    recoCache.set(petId, { ts: Date.now(), products });
    res.json({ ok:true, products, items: products, cached:false });
  } catch (e) {
    errLog('recommendations error:', e);
    sendError(res, 500, 'Failed to fetch recommendations', 'RECO_FAIL');
  }
}

router.get('/:id/recommendations', handleRecommendations);
router.get('/:id/recs', handleRecommendations);

// --------------------------------------------------
// GET /raw (debug, non-prod)
// --------------------------------------------------
router.get('/raw', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 403, 'Disabled in production', 'DISABLED');
  }
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const rows = await getPetsByUserId(user.id);
    res.json({ ok:true, count: rows.length, rows });
  } catch (e) {
    errLog('raw error:', e);
    sendError(res, 500, 'Failed to load raw data', 'RAW_FAIL');
  }
});

// --------------------------------------------------
// POST /bulk-import (array of pets) — non-prod
// --------------------------------------------------
router.post('/bulk-import', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return sendError(res, 403, 'Disabled in production', 'DISABLED');
  }
  const user = await resolveUser(req, res); if (!user || res.headersSent) return;
  try {
    const list = Array.isArray(req.body?.pets) ? req.body.pets : [];
    const inserted = [];
    for (const raw of list) {
      if (!raw?.name) continue;
      const base = buildPatch(raw);
      const pet = await addPet(user.email, {
        name: base.name,
        species: base.species,
        breed: base.breed,
        birthday: base.birthday,
        traits: base.traits || {}
      });
      if (pet) inserted.push(pet);
    }
    res.json({ ok:true, insertedCount: inserted.length, inserted });
  } catch (e) {
    errLog('bulk-import error:', e);
    sendError(res, 500, 'Bulk import failed', 'IMPORT_FAIL');
  }
});

// --------------------------------------------------
// GET /echo (debug request body/headers)
// --------------------------------------------------
router.get('/echo', (req, res) => {
  res.json({
    ok:true,
    method:req.method,
    headers:req.headers,
    query:req.query,
    cookies:req.headers.cookie || '',
    customer:req.customer || null,
    dbUser:req.dbUser || null
  });
});

export default router;
