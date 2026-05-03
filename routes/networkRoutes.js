// routes/networkRoutes.js — Pawket Network + Pawket Partners Ops APIs
import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { requireAuth as requireAuthDefault } from '../middleware/requireAuth.js';
import {
  listPublicListings,
  getPublicListingBySlug,
  getPublicListingById,
  getGeocodeCache,
  upsertGeocodeCache,
  createLead,
  updateLeadDelivery,
  createActivityEvent,
  createClaimRequest,
  getOwnerListings,
  getOwnerListingById,
  hasOwnerMembership,
  updateOwnerListingProfile,
  replaceOwnerServices,
  replaceOwnerFaqs,
  replaceOwnerOffers,
  updateOwnerIntegration,
  isOpsUser,
  listClaims,
  approveClaim,
  rejectClaim,
  updateOpsListingVerification,
  updateOpsListingTier,
  updateOpsListingFeatures,
  listOpsListings,
  upsertListingFromSeed,
} from '../networkDB.pg.js';
import { geocodeUsLocation, buildGeocodeKey } from '../utils/networkGeocode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const claimUploadDir = path.join(__dirname, '..', 'uploads', 'network', 'claims');
fs.mkdirSync(claimUploadDir, { recursive: true });

const VALID_STATUS = new Set(['unclaimed', 'claimed', 'partner']);
const VALID_TIERS = new Set(['partner', 'partner_plus', 'partner_elite']);
const VALID_CATEGORIES = new Set(['vet', 'groomer', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other']);
const VALID_SORT = new Set(['relevance', 'distance', 'featured', 'newest']);
const VALID_CLAIM_STATUS = new Set(['pending', 'approved', 'rejected']);
const VALID_PORTAL_MODE = new Set(['internal_profile', 'external_site']);
const VALID_LEAD_DESTINATION = new Set(['email', 'webhook', 'both']);
const VALID_LEAD_DELIVERY_MODE = new Set(['test', 'live', 'disabled']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SIMPLE_PHONE_RE = /^[+\d().\-\s]{7,40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedClaimMime = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, claimUploadDir),
    filename: (_req, file, cb) => {
      const safeName = String(file.originalname || 'proof').replace(/[^a-zA-Z0-9._-]/g, '-');
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedClaimMime.has(file.mimetype)) return cb(new Error('INVALID_FILE_TYPE'));
    return cb(null, true);
  },
});

const ipWindow = new Map();
function limited(req, key, max = 8, ms = 60_000) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const token = `${ip}:${key}`;
  const data = ipWindow.get(token) || [];
  const keep = data.filter((t) => now - t < ms);
  keep.push(now);
  ipWindow.set(token, keep);
  return keep.length > max;
}

function clean(v, max = 1000) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function cleanLower(v, max = 1000) {
  const s = clean(v, max);
  return s ? s.toLowerCase() : null;
}

function toFinite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isHttpsUrl(v) {
  const s = clean(v, 2048);
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidId(v) {
  const s = clean(v, 80);
  return !!(s && (UUID_RE.test(s) || /^[A-Za-z0-9_-]{4,80}$/.test(s)));
}

function leadDeliveryMode() {
  const mode = cleanLower(process.env.LEAD_DELIVERY_MODE || process.env.PAWKET_NETWORK_LEAD_DELIVERY_MODE, 24);
  if (mode && VALID_LEAD_DELIVERY_MODE.has(mode)) return mode;
  return process.env.NODE_ENV === 'production' ? 'live' : 'test';
}

function compactErrors(...items) {
  return items.map((item) => clean(item, 120)).filter(Boolean).join('; ') || null;
}

function invalid(res, error, details = null) {
  return res.status(400).json({ ok: false, error, ...(details ? { details } : {}) });
}

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

let deps = {
  requireAuth: requireAuthDefault,
  listPublicListings,
  getPublicListingBySlug,
  getPublicListingById,
  getGeocodeCache,
  upsertGeocodeCache,
  createLead,
  updateLeadDelivery,
  createActivityEvent,
  createClaimRequest,
  getOwnerListings,
  getOwnerListingById,
  hasOwnerMembership,
  updateOwnerListingProfile,
  replaceOwnerServices,
  replaceOwnerFaqs,
  replaceOwnerOffers,
  updateOwnerIntegration,
  isOpsUser,
  listClaims,
  approveClaim,
  rejectClaim,
  updateOpsListingVerification,
  updateOpsListingTier,
  updateOpsListingFeatures,
  listOpsListings,
  upsertListingFromSeed,
  geocodeUsLocation,
  buildGeocodeKey,
};

const defaultDeps = { ...deps };

export function __setNetworkRouteDepsForTests(partial = {}) {
  deps = { ...deps, ...(partial || {}) };
}

export function __resetNetworkRouteDepsForTests() {
  deps = { ...defaultDeps };
}

const networkAuth = (req, res, next) => deps.requireAuth()(req, res, next);

function requireDbUser(req, res, next) {
  if (!req.dbUser?.id) return unauthorized(res);
  return next();
}

function claimUploadMiddleware(req, res, next) {
  upload.single('business_identity_doc')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return invalid(res, 'File exceeds maximum size (8MB)');
    }
    if (String(err?.message || '').includes('INVALID_FILE_TYPE')) {
      return invalid(res, 'File must be PDF, PNG, or JPEG');
    }
    return invalid(res, 'Invalid claim upload');
  });
}

function validateListingsQuery(query = {}) {
  const out = {};
  const q = clean(query.q, 120);
  if (q) out.q = q;

  const category = cleanLower(query.category, 40);
  if (category) {
    if (!VALID_CATEGORIES.has(category)) return { error: 'Invalid category filter' };
    out.category = category;
  }

  const status = cleanLower(query.status, 24);
  if (status) {
    if (!VALID_STATUS.has(status)) return { error: 'Invalid status filter' };
    out.status = status;
  }

  const tier = cleanLower(query.tier, 24);
  if (tier) {
    if (!VALID_TIERS.has(tier)) return { error: 'Invalid tier filter' };
    out.tier = tier;
  }

  const sort = cleanLower(query.sort, 20);
  if (sort) {
    if (!VALID_SORT.has(sort)) return { error: 'Invalid sort option' };
    out.sort = sort;
  }

  const page = query.page != null ? Number(query.page) : null;
  if (page != null) {
    if (!Number.isInteger(page) || page < 1 || page > 100000) return { error: 'Invalid page value' };
    out.page = page;
  }

  const pageSizeRaw = query.page_size ?? query.pageSize;
  const pageSize = pageSizeRaw != null ? Number(pageSizeRaw) : null;
  if (pageSize != null) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) return { error: 'Invalid page_size value' };
    out.page_size = pageSize;
  }

  const claimed = query.claimed != null ? String(query.claimed) : null;
  if (claimed != null) {
    if (!['0', '1', 'true', 'false'].includes(claimed.toLowerCase())) return { error: 'Invalid claimed filter' };
    out.claimed = ['1', 'true'].includes(claimed.toLowerCase()) ? '1' : '0';
  }

  const partner = query.partner != null ? String(query.partner) : null;
  if (partner != null) {
    if (!['0', '1', 'true', 'false'].includes(partner.toLowerCase())) return { error: 'Invalid partner filter' };
    out.partner = ['1', 'true'].includes(partner.toLowerCase()) ? '1' : '0';
  }

  const charm = query.supports_charm != null ? String(query.supports_charm) : null;
  if (charm != null) {
    if (!['0', '1', 'true', 'false'].includes(charm.toLowerCase())) return { error: 'Invalid supports_charm filter' };
    out.supports_charm = ['1', 'true'].includes(charm.toLowerCase()) ? '1' : '0';
  }

  const state = clean(query.state, 16);
  if (state) {
    if (!/^[A-Za-z]{2}$/.test(state)) return { error: 'Invalid state filter' };
    out.state = state.toUpperCase();
  }

  const city = clean(query.city, 120);
  if (city) out.city = city;

  const postal = clean(query.postal_code, 16);
  if (postal) {
    if (!/^[A-Za-z0-9\- ]{3,12}$/.test(postal)) return { error: 'Invalid postal_code filter' };
    out.postal_code = postal;
  }

  const lat = query.lat != null ? toFinite(query.lat) : null;
  const lng = query.lng != null ? toFinite(query.lng) : null;
  if ((lat == null) !== (lng == null)) return { error: 'lat and lng must be provided together' };
  if (lat != null || lng != null) {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return { error: 'Invalid lat/lng range' };
    out.lat = lat;
    out.lng = lng;
  }

  const radius = query.radius_mi != null ? toFinite(query.radius_mi) : null;
  if (radius != null) {
    if (radius <= 0 || radius > 500) return { error: 'Invalid radius_mi range' };
    out.radius_mi = radius;
  }

  return { value: out };
}

function validateLeadPayload(body = {}) {
  const name = clean(body.name, 140);
  const email = clean(body.email, 240);
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 5000);
  if (!name || !email || !message) return { error: 'name, email, message are required' };
  if (!EMAIL_RE.test(email)) return { error: 'Invalid email format' };
  if (phone && !SIMPLE_PHONE_RE.test(phone)) return { error: 'Invalid phone format' };
  return { value: { name, email, phone, message } };
}

function validateClaimPayload(body = {}, hasFile = false) {
  const businessEmail = clean(body.business_email, 240);
  const phone = clean(body.phone, 40);
  const businessIdentityDocUrl = clean(body.business_identity_doc_url, 2048);
  if (!businessEmail || !phone) return { error: 'business_email and phone are required' };
  if (!EMAIL_RE.test(businessEmail)) return { error: 'Invalid business_email format' };
  if (!SIMPLE_PHONE_RE.test(phone)) return { error: 'Invalid phone format' };
  if (businessIdentityDocUrl && !isHttpsUrl(businessIdentityDocUrl)) return { error: 'business_identity_doc_url must be https://' };
  if (!hasFile && !businessIdentityDocUrl) return { error: 'Provide a proof file or business_identity_doc_url' };
  return { value: { businessEmail, phone, businessIdentityDocUrl } };
}

function validateOwnerProfilePatch(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' };
  const allowed = new Set([
    'name', 'category_primary', 'categories', 'address_line1', 'city', 'state', 'postal_code', 'lat', 'lng',
    'service_area_radius_mi', 'phone', 'website_url', 'short_description', 'description', 'hours_text', 'cover_image_url',
  ]);
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length) return { error: `Unknown profile fields: ${unknown.join(', ')}` };

  const patch = { ...body };
  if (patch.category_primary !== undefined) {
    const category = cleanLower(patch.category_primary, 40);
    if (!category || !VALID_CATEGORIES.has(category)) return { error: 'Invalid category_primary' };
    patch.category_primary = category;
  }
  if (patch.categories !== undefined) {
    if (!Array.isArray(patch.categories)) return { error: 'categories must be an array' };
    const categories = patch.categories.map((c) => cleanLower(c, 40)).filter(Boolean);
    if (categories.some((c) => !VALID_CATEGORIES.has(c))) return { error: 'Invalid categories value' };
    patch.categories = categories;
  }
  if (patch.website_url !== undefined && patch.website_url !== null && clean(patch.website_url, 2048) && !isHttpsUrl(patch.website_url)) {
    return { error: 'website_url must be https://' };
  }
  if (patch.cover_image_url !== undefined && patch.cover_image_url !== null && clean(patch.cover_image_url, 2048) && !isHttpsUrl(patch.cover_image_url)) {
    return { error: 'cover_image_url must be https://' };
  }
  if (patch.state !== undefined && patch.state !== null) {
    const st = clean(patch.state, 16);
    if (st && !/^[A-Za-z]{2}$/.test(st)) return { error: 'state must be a 2-letter code' };
    if (st) patch.state = st.toUpperCase();
  }
  if (patch.lat !== undefined && patch.lat !== null) {
    const lat = toFinite(patch.lat);
    if (lat == null || lat < -90 || lat > 90) return { error: 'Invalid lat value' };
    patch.lat = lat;
  }
  if (patch.lng !== undefined && patch.lng !== null) {
    const lng = toFinite(patch.lng);
    if (lng == null || lng < -180 || lng > 180) return { error: 'Invalid lng value' };
    patch.lng = lng;
  }
  if (patch.service_area_radius_mi !== undefined && patch.service_area_radius_mi !== null) {
    const radius = toFinite(patch.service_area_radius_mi);
    if (radius == null || radius < 0 || radius > 500) return { error: 'Invalid service_area_radius_mi' };
    patch.service_area_radius_mi = Math.round(radius);
  }
  if (patch.phone !== undefined && patch.phone !== null) {
    const phone = clean(patch.phone, 40);
    if (phone && !SIMPLE_PHONE_RE.test(phone)) return { error: 'Invalid phone format' };
    patch.phone = phone;
  }
  return { value: patch };
}

function validateRowsPayload(key, body, max = 50) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' };
  const rows = body[key];
  if (!Array.isArray(rows)) return { error: `${key} must be an array` };
  if (rows.length > max) return { error: `${key} exceeds max items (${max})` };
  return { value: rows };
}

function validateOwnerIntegrationPatch(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' };
  const allowed = new Set(['portal_mode', 'external_site_url', 'lead_destination', 'lead_email', 'lead_webhook_url', 'enable_lead_form', 'enable_offers']);
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length) return { error: `Unknown integration fields: ${unknown.join(', ')}` };

  const patch = { ...body };
  if (patch.portal_mode !== undefined) {
    const mode = cleanLower(patch.portal_mode, 40);
    if (!mode || !VALID_PORTAL_MODE.has(mode)) return { error: 'Invalid portal_mode' };
    patch.portal_mode = mode;
  }
  if (patch.lead_destination !== undefined) {
    const dest = cleanLower(patch.lead_destination, 24);
    if (!dest || !VALID_LEAD_DESTINATION.has(dest)) return { error: 'Invalid lead_destination' };
    patch.lead_destination = dest;
  }
  if (patch.external_site_url !== undefined && clean(patch.external_site_url, 2048) && !isHttpsUrl(patch.external_site_url)) {
    return { error: 'external_site_url must be https://' };
  }
  if (patch.lead_webhook_url !== undefined && clean(patch.lead_webhook_url, 2048) && !isHttpsUrl(patch.lead_webhook_url)) {
    return { error: 'lead_webhook_url must be https://' };
  }
  if (patch.lead_email !== undefined && clean(patch.lead_email, 240)) {
    if (!EMAIL_RE.test(patch.lead_email)) return { error: 'Invalid lead_email format' };
  }
  for (const key of ['enable_lead_form', 'enable_offers']) {
    if (patch[key] !== undefined && typeof patch[key] !== 'boolean') {
      return { error: `${key} must be a boolean` };
    }
  }
  if (patch.portal_mode === 'external_site' && !clean(patch.external_site_url, 2048)) {
    return { error: 'external_site_url is required for external_site mode' };
  }
  if (patch.lead_destination === 'email' || patch.lead_destination === 'both') {
    if (!clean(patch.lead_email, 240)) return { error: 'lead_email is required for email/both destinations' };
  }
  if (patch.lead_destination === 'webhook' || patch.lead_destination === 'both') {
    if (!clean(patch.lead_webhook_url, 2048)) return { error: 'lead_webhook_url is required for webhook/both destinations' };
  }
  return { value: patch };
}

function validateOpsVerificationPatch(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' };
  const allowed = new Set(['email_verified', 'phone_verified', 'business_identity_verified', 'manual_review_passed']);
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length) return { error: `Unknown verification fields: ${unknown.join(', ')}` };
  if (!Object.keys(body).length) return { error: 'At least one verification field is required' };
  for (const key of Object.keys(body)) {
    if (typeof body[key] !== 'boolean') return { error: `${key} must be a boolean` };
  }
  return { value: body };
}

function validateOpsFeaturesPatch(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be an object' };
  const allowed = new Set(['enable_lead_form', 'enable_offers', 'enable_priority_rank', 'enable_featured_slots', 'featured_rank']);
  const unknown = Object.keys(body).filter((k) => !allowed.has(k));
  if (unknown.length) return { error: `Unknown features fields: ${unknown.join(', ')}` };
  for (const key of ['enable_lead_form', 'enable_offers', 'enable_priority_rank', 'enable_featured_slots']) {
    if (body[key] !== undefined && typeof body[key] !== 'boolean') {
      return { error: `${key} must be a boolean` };
    }
  }
  if (body.featured_rank !== undefined && body.featured_rank !== null) {
    const rank = Number(body.featured_rank);
    if (!Number.isInteger(rank) || rank < 0 || rank > 1000000) return { error: 'featured_rank must be an integer between 0 and 1000000' };
  }
  return { value: body };
}

async function requireOwnerAccess(req, res, next) {
  try {
    const listingId = clean(req.params?.id, 80);
    if (!listingId || !isValidId(listingId)) return invalid(res, 'Invalid listing id');
    const listing = await deps.getPublicListingById(listingId);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    const allowed = await deps.hasOwnerMembership(req.dbUser.id, listingId);
    if (!allowed) return res.status(403).json({ ok: false, error: 'Forbidden' });
    req.networkListingId = listingId;
    return next();
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to verify owner access' });
  }
}

function requireOps() {
  return async (req, res, next) => {
    const userId = req.dbUser?.id;
    if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const ok = await deps.isOpsUser(userId).catch(() => false);
    if (!ok) return res.status(403).json({ ok: false, error: 'Forbidden' });
    next();
  };
}

async function dispatchLead(listing, lead, payload) {
  const destination = String(listing?.lead_destination || 'email');
  const mode = leadDeliveryMode();
  let emailOk = false;
  let emailError = null;
  let webhookOk = false;
  let webhookError = null;

  if (mode === 'disabled') {
    const deliveryError = 'LEAD_DELIVERY_DISABLED';
    await deps.updateLeadDelivery(lead.id, 'queued', deliveryError);
    return { deliveryStatus: 'queued', deliveryMode: mode, deliveryError };
  }

  if (mode === 'test') {
    const deliveryError = 'TEST_MODE_DELIVERY_NOT_SENT';
    await deps.updateLeadDelivery(lead.id, 'queued', deliveryError);
    return { deliveryStatus: 'queued', deliveryMode: mode, deliveryError };
  }

  if (destination === 'email' || destination === 'both') {
    // No SMTP provider is wired yet. Keep this explicit so delivery is verifiable.
    emailError = listing?.lead_email ? 'EMAIL_DELIVERY_NOT_CONFIGURED' : 'LEAD_EMAIL_MISSING';
  }

  if (destination === 'webhook' || destination === 'both') {
    if (listing?.lead_webhook_url) {
      try {
        const resp = await fetch(listing.lead_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            listingId: listing.id,
            listingSlug: listing.slug,
            name: payload.name,
            email: payload.email,
            phone: payload.phone || null,
            message: payload.message,
            createdAt: lead.createdAt,
          }),
        });
        webhookOk = resp.ok;
        if (!resp.ok) webhookError = `WEBHOOK_HTTP_${resp.status}`;
      } catch (err) {
        webhookError = err?.message || 'WEBHOOK_FAILED';
      }
    } else {
      webhookError = 'LEAD_WEBHOOK_MISSING';
    }
  }

  const success = destination === 'both' ? emailOk && webhookOk : (emailOk || webhookOk);
  const deliveryStatus = success ? 'sent' : 'failed';
  const deliveryError = success ? null : compactErrors(emailError, webhookError, 'DELIVERY_NOT_CONFIGURED');
  await deps.updateLeadDelivery(lead.id, deliveryStatus, deliveryError);
  return { deliveryStatus, deliveryMode: mode, deliveryError };
}

const router = express.Router();

router.get('/listings', async (req, res) => {
  try {
    const checked = validateListingsQuery(req.query || {});
    if (checked.error) return invalid(res, checked.error);
    const data = await deps.listPublicListings(checked.value || {});
    return res.json({ ok: true, ...data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to load listings' });
  }
});

router.get('/listings/:slug', async (req, res) => {
  try {
    const slug = clean(req.params.slug, 180);
    if (!slug) return invalid(res, 'Invalid listing slug');
    const listing = await deps.getPublicListingBySlug(slug);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to load listing' });
  }
});

router.post('/geocode', async (req, res) => {
  try {
    if (limited(req, 'geocode', 15, 60_000)) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
    const query = clean(req.body?.query, 200);
    if (!query || query.length < 2) return invalid(res, 'query required');

    const key = deps.buildGeocodeKey(query);
    const cached = await deps.getGeocodeCache(key);
    if (cached) {
      return res.json({
        ok: true,
        cached: true,
        location: {
          lat: Number(cached.latitude),
          lng: Number(cached.longitude),
          city: cached.city,
          state: cached.state,
          postal_code: cached.postalCode,
        },
      });
    }

    const hit = await deps.geocodeUsLocation(query);
    if (!hit) return res.status(404).json({ ok: false, error: 'No location found' });
    const saved = await deps.upsertGeocodeCache({ queryKey: key, ...hit });
    return res.json({
      ok: true,
      cached: false,
      location: {
        lat: Number(saved.latitude),
        lng: Number(saved.longitude),
        city: saved.city,
        state: saved.state,
        postal_code: saved.postalCode,
      },
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'Geocode failed' });
  }
});

router.post('/listings/:id/leads', async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    if (limited(req, `lead:${req.params.id}`, 12, 60_000)) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
    const listing = await deps.getPublicListingById(id);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    if (!listing.features.enable_lead_form) return res.status(403).json({ ok: false, error: 'Lead form not enabled' });

    const checked = validateLeadPayload(req.body || {});
    if (checked.error) return invalid(res, checked.error);
    const { name, email, phone, message } = checked.value;

    const lead = await deps.createLead({
      listingId: listing.id,
      userId: req.dbUser?.id || null,
      name,
      email,
      phone,
      message,
      sourcePage: 'pawket-network',
      sourcePath: clean(req.body?.source_path || req.path, 400),
      destination: listing.lead_destination,
    });

    const delivery = await dispatchLead(listing, lead, { name, email, phone, message });
    return res.status(201).json({
      ok: true,
      leadId: lead.id,
      deliveryStatus: delivery.deliveryStatus,
      deliveryMode: delivery.deliveryMode,
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to submit lead' });
  }
});

router.post('/listings/:id/outbound-click', async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    const listing = await deps.getPublicListingById(id);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    const href = clean(req.body?.href, 2048);
    if (href) {
      try {
        const u = new URL(href);
        if (!['https:', 'http:'].includes(u.protocol)) return invalid(res, 'Invalid href');
      } catch {
        return invalid(res, 'Invalid href');
      }
    }
    await deps.createActivityEvent({
      listingId: listing.id,
      userId: req.dbUser?.id || null,
      eventType: 'outbound_click',
      metadata: {
        href,
        source: clean(req.body?.source, 80),
      },
    });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to log click' });
  }
});

router.post('/listings/:id/claim', networkAuth, requireDbUser, claimUploadMiddleware, async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    if (limited(req, `claim:${req.params.id}`, 5, 60_000)) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
    const listing = await deps.getPublicListingById(id);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });

    const checked = validateClaimPayload(req.body || {}, !!req.file);
    if (checked.error) return invalid(res, checked.error);
    const { businessEmail, phone, businessIdentityDocUrl } = checked.value;

    const filePath = req.file ? `/uploads/network/claims/${req.file.filename}` : null;
    const created = await deps.createClaimRequest({
      listingId: listing.id,
      userId: req.dbUser.id,
      businessEmail,
      phone,
      businessIdentityDocPath: filePath,
      businessIdentityDocUrl,
    });
    return res.status(201).json({ ok: true, claim: created });
  } catch (err) {
    const code = String(err?.code || err?.message || '');
    if (code.includes('CLAIM_NOT_ALLOWED_STATUS')) {
      return res.status(409).json({ ok: false, error: 'Listing is not eligible for claim submission' });
    }
    if (code.includes('CLAIM_ALREADY_PENDING')) {
      return res.status(409).json({ ok: false, error: 'A pending claim already exists for this listing' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to submit claim' });
  }
});

router.get('/owner/listings', networkAuth, requireDbUser, async (req, res) => {
  try {
    const listings = await deps.getOwnerListings(req.dbUser.id);
    return res.json({ ok: true, listings });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to load owner listings' });
  }
});

router.get('/owner/listings/:id', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const listing = await deps.getOwnerListingById(req.dbUser.id, req.networkListingId);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to load listing' });
  }
});

router.patch('/owner/listings/:id/profile', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const checked = validateOwnerProfilePatch(req.body || {});
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.updateOwnerListingProfile(req.dbUser.id, req.networkListingId, checked.value);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to update listing' });
  }
});

router.put('/owner/listings/:id/services', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const checked = validateRowsPayload('services', req.body || {}, 50);
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.replaceOwnerServices(req.dbUser.id, req.networkListingId, checked.value);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to save services' });
  }
});

router.put('/owner/listings/:id/faqs', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const checked = validateRowsPayload('faqs', req.body || {}, 40);
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.replaceOwnerFaqs(req.dbUser.id, req.networkListingId, checked.value);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to save FAQs' });
  }
});

router.put('/owner/listings/:id/offers', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const checked = validateRowsPayload('offers', req.body || {}, 30);
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.replaceOwnerOffers(req.dbUser.id, req.networkListingId, checked.value);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to save offers' });
  }
});

router.patch('/owner/listings/:id/integration', networkAuth, requireDbUser, requireOwnerAccess, async (req, res) => {
  try {
    const checked = validateOwnerIntegrationPatch(req.body || {});
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.updateOwnerIntegration(req.dbUser.id, req.networkListingId, checked.value);
    if (!listing) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to save integration settings' });
  }
});

router.get('/partners-ops/claims', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const status = cleanLower(req.query?.status, 24) || 'pending';
    if (!VALID_CLAIM_STATUS.has(status)) return invalid(res, 'Invalid claim status filter');
    const limit = req.query?.limit != null ? Number(req.query.limit) : 120;
    if (!Number.isInteger(limit) || limit < 1 || limit > 250) return invalid(res, 'Invalid limit');
    const claims = await deps.listClaims(status, limit);
    return res.json({ ok: true, claims });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to load claims' });
  }
});

router.post('/partners-ops/claims/:id/approve', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid claim id');
    const reviewNotes = clean(req.body?.review_notes, 1800);
    const result = await deps.approveClaim(id, req.dbUser.id, reviewNotes || null);
    if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
    return res.json({ ok: true });
  } catch (err) {
    if (String(err?.code || err?.message || '').includes('CLAIM_NOT_PENDING')) {
      return res.status(409).json({ ok: false, error: 'Claim is not in pending status' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to approve claim' });
  }
});

router.post('/partners-ops/claims/:id/reject', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid claim id');
    const reviewNotes = clean(req.body?.review_notes, 1800);
    const result = await deps.rejectClaim(id, req.dbUser.id, reviewNotes || null);
    if (!result) return res.status(404).json({ ok: false, error: 'Claim not found' });
    return res.json({ ok: true });
  } catch (err) {
    if (String(err?.code || err?.message || '').includes('CLAIM_NOT_PENDING')) {
      return res.status(409).json({ ok: false, error: 'Claim is not in pending status' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to reject claim' });
  }
});

router.patch('/partners-ops/listings/:id/verification', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    const checked = validateOpsVerificationPatch(req.body || {});
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.updateOpsListingVerification(id, checked.value);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to update verification' });
  }
});

router.patch('/partners-ops/listings/:id/tier', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    const tierRaw = req.body?.partner_tier;
    const tier = tierRaw == null || String(tierRaw).trim() === '' ? null : cleanLower(tierRaw, 40);
    if (tier && !VALID_TIERS.has(tier)) return invalid(res, 'Invalid partner tier value');
    const listing = await deps.updateOpsListingTier(id, tier);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    return res.json({ ok: true, listing });
  } catch (err) {
    if (String(err?.code || '').includes('INVALID_TIER')) {
      return res.status(400).json({ ok: false, error: 'Invalid partner tier value' });
    }
    if (String(err?.code || err?.message || '').includes('PARTNER_GATE_NOT_MET')) {
      return res.status(400).json({ ok: false, error: 'All verification checks must pass before partner tier assignment' });
    }
    if (String(err?.code || err?.message || '').includes('CLAIM_REQUIRED')) {
      return res.status(409).json({ ok: false, error: 'Listing must be claimed and approved before tier assignment' });
    }
    return res.status(500).json({ ok: false, error: 'Failed to update tier' });
  }
});

router.patch('/partners-ops/listings/:id/features', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const id = clean(req.params.id, 80);
    if (!id || !isValidId(id)) return invalid(res, 'Invalid listing id');
    const checked = validateOpsFeaturesPatch(req.body || {});
    if (checked.error) return invalid(res, checked.error);
    const listing = await deps.updateOpsListingFeatures(id, checked.value);
    if (!listing) return res.status(404).json({ ok: false, error: 'Listing not found' });
    return res.json({ ok: true, listing });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to update features' });
  }
});

router.get('/partners-ops/listings', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const limit = req.query?.limit != null ? Number(req.query.limit) : 200;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) return invalid(res, 'Invalid limit');
    const listings = await deps.listOpsListings(limit);
    return res.json({ ok: true, listings });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to load listings' });
  }
});

router.post('/partners-ops/import-seed', networkAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length > 500) return invalid(res, 'Too many seed items');
    const results = [];
    for (const item of items) {
      const out = await deps.upsertListingFromSeed(item);
      results.push(out?.id || null);
    }
    return res.json({ ok: true, imported: results.length });
  } catch {
    return res.status(500).json({ ok: false, error: 'Failed to import seed' });
  }
});

export default router;
