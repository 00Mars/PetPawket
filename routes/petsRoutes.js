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
import sharp from 'sharp';

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
const AVATAR_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=\s]+)$/i;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_PIXELS = 16_000_000;
const JOURNAL_PHOTO_DATA_URL_RE = /^data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=\s]+)$/i;
const MAX_JOURNAL_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_JOURNAL_TEXT_CHARS = 5000;
const MAX_JOURNAL_TITLE_CHARS = 120;
const MAX_JOURNAL_FIELD_CHARS = 80;
const MAX_JOURNAL_TAGS = 20;
const MAX_JOURNAL_TAG_CHARS = 50;
const MAX_JOURNAL_METADATA_CHARS = 20_000;

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

function validationError(message, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.status = 400;
  err.code = code;
  return err;
}

function cleanJournalString(value, max, field, { required = false } = {}) {
  if (value === undefined) {
    if (required) throw validationError(`${field} required`, `${field.toUpperCase()}_MISSING`);
    return undefined;
  }
  if (value === null) {
    if (required) throw validationError(`${field} required`, `${field.toUpperCase()}_MISSING`);
    return null;
  }
  const cleaned = String(value).trim();
  if (required && !cleaned) throw validationError(`${field} required`, `${field.toUpperCase()}_MISSING`);
  if (cleaned.length > max) throw validationError(`${field} is too long`, `${field.toUpperCase()}_TOO_LONG`);
  return cleaned || null;
}

function decodedBase64Bytes(b64) {
  const clean = String(b64 || '').replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

function normalizeJournalPhoto(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.startsWith('/uploads/pets/')) {
    if (raw.includes('..') || !/^\/uploads\/pets\/[A-Za-z0-9._/-]+$/.test(raw)) {
      throw validationError('Invalid journal photo path', 'PHOTO_INVALID');
    }
    return raw;
  }

  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
    throw validationError('External journal photos are not allowed', 'PHOTO_EXTERNAL_BLOCKED');
  }

  const match = JOURNAL_PHOTO_DATA_URL_RE.exec(raw);
  if (!match) throw validationError('Invalid journal photo data', 'PHOTO_INVALID');
  const subtype = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  const b64 = match[2].replace(/\s/g, '');
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 === 1) {
    throw validationError('Invalid journal photo data', 'PHOTO_INVALID');
  }
  if (decodedBase64Bytes(b64) > MAX_JOURNAL_PHOTO_BYTES) {
    throw validationError('Journal photo is too large', 'PHOTO_TOO_LARGE');
  }
  return `data:image/${subtype};base64,${b64}`;
}

function normalizeJournalTagsInput(value) {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const seen = new Set();
  const tags = [];
  for (const item of raw) {
    const tag = String(item || '').replace(/^#/, '').trim();
    if (!tag) continue;
    if (tag.length > MAX_JOURNAL_TAG_CHARS) throw validationError('Journal tag is too long', 'TAG_TOO_LONG');
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
    if (tags.length > MAX_JOURNAL_TAGS) throw validationError('Too many journal tags', 'TOO_MANY_TAGS');
  }
  return tags;
}

function normalizeJournalMetadataInput(value) {
  if (value === undefined) return undefined;
  if (value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw validationError('Journal metadata must be an object', 'METADATA_INVALID');
  }
  const encoded = JSON.stringify(value);
  if (encoded.length > MAX_JOURNAL_METADATA_CHARS) {
    throw validationError('Journal metadata is too large', 'METADATA_TOO_LARGE');
  }
  return value;
}

function normalizeJournalCreatePayload(body = {}) {
  const photo = normalizeJournalPhoto(body.photo ?? body.photoDataUrl ?? null);
  return {
    text: cleanJournalString(body.text, MAX_JOURNAL_TEXT_CHARS, 'text', { required: true }),
    title: cleanJournalString(body.title, MAX_JOURNAL_TITLE_CHARS, 'title'),
    entryType: cleanJournalString(body.entryType ?? body.entry_type ?? 'note', MAX_JOURNAL_FIELD_CHARS, 'entryType') || 'note',
    occurredAt: body.occurredAt ?? body.occurred_at ?? null,
    mood: cleanJournalString(body.mood, MAX_JOURNAL_FIELD_CHARS, 'mood'),
    tags: normalizeJournalTagsInput(body.tags) || [],
    photo,
    highlighted: body.highlighted === true || body.coreMemory === true,
    visibility: cleanJournalString(body.visibility ?? 'private', MAX_JOURNAL_FIELD_CHARS, 'visibility') || 'private',
    metadata: normalizeJournalMetadataInput(body.metadata) || {},
  };
}

function normalizeJournalPatchPayload(body = {}) {
  const patch = {};
  if (body.text !== undefined) patch.text = cleanJournalString(body.text, MAX_JOURNAL_TEXT_CHARS, 'text', { required: true });
  if (body.title !== undefined) patch.title = cleanJournalString(body.title, MAX_JOURNAL_TITLE_CHARS, 'title');
  if (body.entryType !== undefined) patch.entryType = cleanJournalString(body.entryType, MAX_JOURNAL_FIELD_CHARS, 'entryType') || 'note';
  if (body.entry_type !== undefined && patch.entryType === undefined) patch.entryType = cleanJournalString(body.entry_type, MAX_JOURNAL_FIELD_CHARS, 'entryType') || 'note';
  if (body.occurredAt !== undefined) patch.occurredAt = body.occurredAt;
  if (body.occurred_at !== undefined && patch.occurredAt === undefined) patch.occurredAt = body.occurred_at;
  if (body.mood !== undefined) patch.mood = cleanJournalString(body.mood, MAX_JOURNAL_FIELD_CHARS, 'mood');
  if (body.tags !== undefined) patch.tags = normalizeJournalTagsInput(body.tags);
  if (body.photo !== undefined) patch.photo = normalizeJournalPhoto(body.photo);
  if (body.photoDataUrl !== undefined && patch.photo === undefined) patch.photo = normalizeJournalPhoto(body.photoDataUrl);
  if (body.removePhoto === true) patch.photo = null;
  if (body.highlighted !== undefined) patch.highlighted = body.highlighted === true;
  if (body.coreMemory !== undefined && patch.highlighted === undefined) patch.highlighted = body.coreMemory === true;
  if (body.visibility !== undefined) patch.visibility = cleanJournalString(body.visibility, MAX_JOURNAL_FIELD_CHARS, 'visibility') || 'private';
  if (body.metadata !== undefined) patch.metadata = normalizeJournalMetadataInput(body.metadata);
  return patch;
}

export function cleanupUploadedFile(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch {}
}

function avatarError(message = 'Invalid image data', code = 'BAD_IMAGE') {
  const err = new Error(message);
  err.code = code;
  return err;
}

function detectAvatarFormat(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' || buffer.subarray(0, 6).toString('ascii') === 'GIF89a') return 'gif';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export async function preparePetAvatarUpload(imageBase64) {
  const match = AVATAR_DATA_URL_RE.exec(String(imageBase64 || ''));
  if (!match) throw avatarError();

  const declared = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  const b64 = match[2].replace(/\s/g, '');
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 === 1) {
    throw avatarError();
  }
  if (Math.ceil((b64.length * 3) / 4) > MAX_AVATAR_BYTES) {
    throw avatarError('Avatar image is too large', 'IMAGE_TOO_LARGE');
  }

  const input = Buffer.from(b64, 'base64');
  if (!input.length || input.length > MAX_AVATAR_BYTES) {
    throw avatarError(input.length ? 'Avatar image is too large' : 'Invalid image data', input.length ? 'IMAGE_TOO_LARGE' : 'BAD_IMAGE');
  }

  const detected = detectAvatarFormat(input);
  if (!detected || detected !== declared) throw avatarError();

  if (detected === 'gif') {
    return { buffer: input, extension: 'gif', contentType: 'image/gif' };
  }

  const metadata = await sharp(input, { failOn: 'error', limitInputPixels: MAX_AVATAR_PIXELS }).metadata();
  if (!metadata.width || !metadata.height) throw avatarError();

  const pipeline = sharp(input, { failOn: 'error', limitInputPixels: MAX_AVATAR_PIXELS })
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true });
  if (detected === 'jpeg') {
    return { buffer: await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer(), extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (detected === 'png') {
    return { buffer: await pipeline.png().toBuffer(), extension: 'png', contentType: 'image/png' };
  }
  return { buffer: await pipeline.webp({ quality: 85 }).toBuffer(), extension: 'webp', contentType: 'image/webp' };
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

    let pet = inserted;
    const extra = { ...base };
    delete extra.name; delete extra.species; delete extra.breed; delete extra.birthday; delete extra.traits;
    if (Object.keys(extra).length) {
      pet = await updatePetById(user.id, inserted.id, extra) || inserted;
    }

    res.status(201).json({ ok:true, pet });
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
  let filePath = '';
  try {
    const id = String(req.params.id||'').trim();
    const { imageBase64, remove } = req.body || {};
    if (!id) return sendError(res, 400, 'Pet id required', 'ID_MISSING');

    if (remove === true) {
      const updated = await updatePetById(user.id, id, { avatar: null });
      if (!updated) return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
      return res.json({ ok:true, pet: updated });
    }

    const avatar = await preparePetAvatarUpload(imageBase64);
    const fileName = `${id}.${Date.now()}.${avatar.extension}`.replace(/[^a-zA-Z0-9._-]/g,'');
    filePath = path.join(UPLOAD_DIR, fileName);
    fs.writeFileSync(filePath, avatar.buffer);
    const updated = await updatePetById(user.id, id, { avatar: `/uploads/pets/${fileName}` });
    if (!updated) {
      cleanupUploadedFile(filePath);
      return sendError(res, 404, 'Pet not found', 'NOT_FOUND');
    }
    res.json({ ok:true, pet: updated });
  } catch (e) {
    cleanupUploadedFile(filePath);
    if (e?.code === 'BAD_IMAGE' || e?.code === 'IMAGE_TOO_LARGE') {
      return sendError(res, 400, e.message || 'Invalid image data', e.code);
    }
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
    if (!petId) return sendError(res, 400, 'Pet id required', 'ID_MISSING');
    const payload = normalizeJournalCreatePayload(req.body || {});
    const entry = await addPetJournalEntry(user.id, petId, {
      text: payload.text,
      title: payload.title,
      entryType: payload.entryType,
      occurredAt: payload.occurredAt,
      mood: payload.mood,
      tags: payload.tags,
      photo: payload.photo,
      highlighted: payload.highlighted,
      visibility: payload.visibility,
      metadata: payload.metadata,
    });
    res.status(201).json({ ok:true, entry });
  } catch (e) {
    if (e?.status === 400) return sendError(res, 400, e.message, e.code || 'BAD_REQUEST');
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

    const patch = normalizeJournalPatchPayload(req.body || {});

    if (!Object.keys(patch).length) return sendError(res, 400, 'No patch fields', 'EMPTY_PATCH');

    const updated = await updatePetJournalEntry(user.id, petId, entryId, patch);
    if (!updated) return sendError(res, 404, 'Entry not found or no changes', 'NOT_FOUND');
    res.json({ ok:true, entry: updated });
  } catch (e) {
    if (e?.status === 400) return sendError(res, 400, e.message, e.code || 'BAD_REQUEST');
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
// GET /echo (local debug only; never returns cookies or raw headers)
// --------------------------------------------------
if (PETS_DEBUG && process.env.NODE_ENV !== 'production') {
  router.get('/echo', (req, res) => {
    res.json({
      ok:true,
      method:req.method,
      query:req.query,
      customerId:req.customer?.id || null,
      dbUserId:req.dbUser?.id || null
    });
  });
}

export default router;
