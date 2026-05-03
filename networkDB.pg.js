// networkDB.pg.js — Pawket Network data access
import pkg from 'pg';

const { Pool } = pkg;
const connectionString = process.env.DATABASE_URL;
if (process.env.NODE_ENV === 'production' && !connectionString) {
  throw new Error('DATABASE_URL is required in production.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
});

const VALID_TIERS = new Set(['partner', 'partner_plus', 'partner_elite']);
const VALID_STATUS = new Set(['unclaimed', 'claimed', 'partner']);
const VALID_CATEGORIES = new Set(['vet', 'groomer', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other']);
const VALID_CLAIM_STATUS = new Set(['pending', 'approved', 'rejected']);

const LISTING_BASE = `
  l.id,
  l.slug,
  l.name,
  l.category_primary AS "categoryPrimary",
  l.categories,
  l.address_line1 AS "addressLine1",
  l.city,
  l.state,
  l.postal_code AS "postalCode",
  l.latitude,
  l.longitude,
  l.service_area_radius_mi AS "serviceAreaRadiusMi",
  l.phone,
  l.website_url AS "websiteUrl",
  l.short_description AS "shortDescription",
  l.description,
  l.hours_text AS "hoursText",
  l.status,
  l.partner_tier AS "partnerTier",
  l.partner_since AS "partnerSince",
  l.owner_user_id AS "ownerUserId",
  l.claim_status AS "claimStatus",
  l.email_verified AS "emailVerified",
  l.phone_verified AS "phoneVerified",
  l.business_identity_verified AS "businessIdentityVerified",
  l.manual_review_passed AS "manualReviewPassed",
  l.enable_lead_form AS "enableLeadForm",
  l.enable_offers AS "enableOffers",
  l.enable_priority_rank AS "enablePriorityRank",
  l.enable_featured_slots AS "enableFeaturedSlots",
  l.lead_destination AS "leadDestination",
  l.lead_email AS "leadEmail",
  l.lead_webhook_url AS "leadWebhookUrl",
  l.portal_mode AS "portalMode",
  l.external_site_url AS "externalSiteUrl",
  l.charm_enabled AS "charmEnabled",
  l.charm_program_type AS "charmProgramType",
  l.charm_public_blurb AS "charmPublicBlurb",
  l.charm_receipt_url AS "charmReceiptUrl",
  l.charm_match_cap_monthly AS "charmMatchCapMonthly",
  l.featured_rank AS "featuredRank",
  l.cover_image_url AS "coverImageUrl",
  l.created_at AS "createdAt",
  l.updated_at AS "updatedAt"
`;

function txt(v, max = 2000) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function arr(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => txt(x, 80)).filter(Boolean);
}

function httpsUrl(v) {
  const s = txt(v, 2048);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function int(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function isoDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapListing(r) {
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    category_primary: r.categoryPrimary,
    categories: Array.isArray(r.categories) ? r.categories : [],
    location: {
      address_line1: r.addressLine1,
      city: r.city,
      state: r.state,
      postal_code: r.postalCode,
      lat: r.latitude != null ? Number(r.latitude) : null,
      lng: r.longitude != null ? Number(r.longitude) : null,
      service_area_radius_mi: r.serviceAreaRadiusMi,
    },
    contact: {
      phone: r.phone,
      website_url: r.websiteUrl,
    },
    short_description: r.shortDescription,
    description: r.description,
    hours_text: r.hoursText,
    status: r.status,
    partner_tier: r.partnerTier,
    partner_since: r.partnerSince,
    owner_user_id: r.ownerUserId,
    claim_status: r.claimStatus,
    verification: {
      email_verified: !!r.emailVerified,
      phone_verified: !!r.phoneVerified,
      business_identity_verified: !!r.businessIdentityVerified,
      manual_review_passed: !!r.manualReviewPassed,
    },
    features: {
      enable_lead_form: !!r.enableLeadForm,
      enable_offers: !!r.enableOffers,
      enable_priority_rank: !!r.enablePriorityRank,
      enable_featured_slots: !!r.enableFeaturedSlots,
    },
    lead_destination: r.leadDestination,
    lead_email: r.leadEmail,
    lead_webhook_url: r.leadWebhookUrl,
    portal_mode: r.portalMode,
    external_site_url: r.externalSiteUrl,
    charm_support: {
      enabled: !!r.charmEnabled,
      program_type: r.charmProgramType,
      public_blurb: r.charmPublicBlurb,
      receipt_url: r.charmReceiptUrl,
      match_cap_monthly: r.charmMatchCapMonthly != null ? Number(r.charmMatchCapMonthly) : null,
    },
    featured_rank: r.featuredRank,
    cover_image_url: r.coverImageUrl,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

async function listingChildren(listingId) {
  const [media, services, faqs, offers] = await Promise.all([
    pool.query(`SELECT id, url, alt, sort_order AS "sortOrder" FROM network_listing_media WHERE listing_id = $1 ORDER BY sort_order ASC, created_at ASC`, [listingId]),
    pool.query(`SELECT id, name, price_from AS "priceFrom", price_to AS "priceTo", notes, sort_order AS "sortOrder" FROM network_listing_services WHERE listing_id = $1 ORDER BY sort_order ASC, created_at ASC`, [listingId]),
    pool.query(`SELECT id, question, answer, sort_order AS "sortOrder" FROM network_listing_faqs WHERE listing_id = $1 ORDER BY sort_order ASC, created_at ASC`, [listingId]),
    pool.query(`SELECT id, title, code, details, expires_at AS "expiresAt", is_active AS "isActive", sort_order AS "sortOrder" FROM network_listing_offers WHERE listing_id = $1 ORDER BY sort_order ASC, created_at ASC`, [listingId]),
  ]);
  return { media: media.rows, services: services.rows, faqs: faqs.rows, offers: offers.rows };
}

export async function getPublicListingById(id) {
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l WHERE l.id = $1 LIMIT 1`, [id]);
  return mapListing(rows[0]);
}

export async function getPublicListingBySlug(slug) {
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l WHERE l.slug = $1 LIMIT 1`, [String(slug || '').trim()]);
  if (!rows[0]) return null;
  const listing = mapListing(rows[0]);
  const children = await listingChildren(listing.id);
  return {
    ...listing,
    media: children.media,
    services: children.services,
    faqs: children.faqs,
    offers: listing.features.enable_offers ? children.offers.filter((o) => o.isActive) : [],
    badges: {
      claimed: listing.status !== 'unclaimed',
      pawket_partner: listing.status === 'partner',
      supports_charm: !!listing.charm_support.enabled,
    },
  };
}

export async function listPublicListings(filters = {}) {
  const params = [];
  const where = [];

  const page = Math.max(1, Number(filters.page) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(filters.page_size || filters.pageSize) || 12));

  if (filters.q) {
    params.push(`%${String(filters.q).trim()}%`);
    const i = params.length;
    where.push(`(l.name ILIKE $${i} OR l.short_description ILIKE $${i} OR l.description ILIKE $${i} OR l.city ILIKE $${i} OR l.state ILIKE $${i} OR l.postal_code ILIKE $${i})`);
  }
  if (filters.category) {
    params.push(String(filters.category).trim().toLowerCase());
    const i = params.length;
    where.push(`(l.category_primary::text = $${i} OR $${i} = ANY(l.categories))`);
  }
  if (filters.status) {
    params.push(String(filters.status).trim().toLowerCase());
    const i = params.length;
    where.push(`l.status::text = $${i}`);
  }
  if (String(filters.claimed || '') === '1') where.push(`l.status IN ('claimed','partner')`);
  if (String(filters.partner || '') === '1') where.push(`l.status = 'partner'`);
  if (String(filters.supports_charm || '') === '1') where.push(`l.charm_enabled = TRUE`);
  if (filters.tier) {
    params.push(String(filters.tier).trim().toLowerCase());
    const i = params.length;
    where.push(`l.partner_tier::text = $${i}`);
  }
  if (filters.state) {
    params.push(String(filters.state).trim().toUpperCase());
    const i = params.length;
    where.push(`UPPER(l.state) = $${i}`);
  }
  if (filters.city) {
    params.push(String(filters.city).trim().toLowerCase());
    const i = params.length;
    where.push(`LOWER(l.city) = $${i}`);
  }
  if (filters.postal_code) {
    params.push(String(filters.postal_code).trim());
    const i = params.length;
    where.push(`l.postal_code = $${i}`);
  }

  const lat = num(filters.lat);
  const lng = num(filters.lng);
  const radius = num(filters.radius_mi);
  let distanceExpr = 'NULL::double precision';
  if (lat != null && lng != null) {
    params.push(lat);
    const latI = params.length;
    params.push(lng);
    const lngI = params.length;
    distanceExpr = `(3959 * acos(least(1, greatest(-1, cos(radians($${latI})) * cos(radians(l.latitude)) * cos(radians(l.longitude) - radians($${lngI})) + sin(radians($${latI})) * sin(radians(l.latitude))))))`;
    where.push(`l.latitude IS NOT NULL AND l.longitude IS NOT NULL`);
    if (radius != null) {
      params.push(radius);
      const radI = params.length;
      where.push(`${distanceExpr} <= $${radI}`);
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sort = String(filters.sort || 'relevance').trim().toLowerCase();
  let orderBy = `ORDER BY CASE l.status WHEN 'partner' THEN 0 WHEN 'claimed' THEN 1 ELSE 2 END, COALESCE(l.featured_rank, 999999), l.created_at DESC`;
  if (sort === 'distance' && lat != null && lng != null) orderBy = `ORDER BY ${distanceExpr} ASC, l.created_at DESC`;
  if (sort === 'featured') orderBy = `ORDER BY COALESCE(l.featured_rank, 999999), l.created_at DESC`;
  if (sort === 'newest') orderBy = `ORDER BY l.created_at DESC`;

  const offset = (page - 1) * pageSize;
  params.push(pageSize);
  const limI = params.length;
  params.push(offset);
  const offI = params.length;

  const [rowsRes, countRes] = await Promise.all([
    pool.query(`SELECT ${LISTING_BASE}, ${distanceExpr} AS "distanceMi" FROM network_listings l ${whereSql} ${orderBy} LIMIT $${limI} OFFSET $${offI}`, params),
    pool.query(`SELECT COUNT(*)::int AS total FROM network_listings l ${whereSql}`, params.slice(0, params.length - 2)),
  ]);

  return {
    page,
    pageSize,
    total: countRes.rows[0]?.total || 0,
    items: rowsRes.rows.map((r) => ({ ...mapListing(r), distance_mi: r.distanceMi != null ? Number(r.distanceMi) : null })),
  };
}

export async function getGeocodeCache(queryKey) {
  const { rows } = await pool.query(`SELECT query_key AS "queryKey", query_text AS "queryText", city, state, postal_code AS "postalCode", latitude, longitude, provider, raw_response AS "rawResponse" FROM network_geocode_cache WHERE query_key = $1 LIMIT 1`, [queryKey]);
  return rows[0] || null;
}

export async function upsertGeocodeCache(input) {
  const queryKey = txt(input?.queryKey, 180);
  if (!queryKey || input?.latitude == null || input?.longitude == null) return null;
  const { rows } = await pool.query(
    `INSERT INTO network_geocode_cache (query_key, query_text, city, state, postal_code, latitude, longitude, provider, raw_response, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,NOW())
     ON CONFLICT (query_key) DO UPDATE SET query_text = EXCLUDED.query_text, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, provider = EXCLUDED.provider, raw_response = EXCLUDED.raw_response, updated_at = NOW()
     RETURNING query_key AS "queryKey", query_text AS "queryText", city, state, postal_code AS "postalCode", latitude, longitude, provider`,
    [
      queryKey,
      txt(input?.queryText, 200) || queryKey,
      txt(input?.city, 80),
      txt(input?.state, 24),
      txt(input?.postalCode, 20),
      Number(input.latitude),
      Number(input.longitude),
      txt(input?.provider, 40) || 'nominatim',
      JSON.stringify(input?.rawResponse || {}),
    ]
  );
  return rows[0] || null;
}

export async function createLead(input = {}) {
  const { rows } = await pool.query(
    `INSERT INTO network_leads (listing_id, user_id, name, email, phone, message, source_page, source_path, destination, delivery_status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'queued',NOW())
     RETURNING id, listing_id AS "listingId", created_at AS "createdAt"`,
    [
      input.listingId,
      input.userId || null,
      txt(input.name, 140),
      txt(input.email, 240),
      txt(input.phone, 40),
      txt(input.message, 5000),
      txt(input.sourcePage, 120),
      txt(input.sourcePath, 400),
      txt(input.destination, 24) || 'email',
    ]
  );
  return rows[0] || null;
}

export async function updateLeadDelivery(id, status, errorText = null) {
  const safe = ['queued', 'sent', 'failed'].includes(status) ? status : 'queued';
  await pool.query(`UPDATE network_leads SET delivery_status = $2, delivery_error = $3, updated_at = NOW() WHERE id = $1`, [id, safe, txt(errorText, 600)]);
}

export async function createActivityEvent(input = {}) {
  const { rows } = await pool.query(
    `INSERT INTO network_activity_events (listing_id, user_id, event_type, metadata) VALUES ($1,$2,$3,$4::jsonb) RETURNING id`,
    [input.listingId || null, input.userId || null, txt(input.eventType, 80), JSON.stringify(input.metadata || {})]
  );
  return rows[0] || null;
}

export async function createClaimRequest(input = {}) {
  const listing = await getPublicListingById(input.listingId);
  if (!listing) throw new Error('LISTING_NOT_FOUND');
  if (listing.status !== 'unclaimed') {
    const err = new Error('CLAIM_NOT_ALLOWED_STATUS');
    err.code = 'CLAIM_NOT_ALLOWED_STATUS';
    throw err;
  }

  const pending = await pool.query(
    `SELECT id, status, requested_by_user_id AS "requestedByUserId"
     FROM network_claim_requests
     WHERE listing_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [input.listingId]
  );
  if (pending.rows[0]) {
    if (pending.rows[0].requestedByUserId === input.userId) {
      return { id: pending.rows[0].id, status: pending.rows[0].status, duplicate: true };
    }
    const err = new Error('CLAIM_ALREADY_PENDING');
    err.code = 'CLAIM_ALREADY_PENDING';
    throw err;
  }

  const { rows } = await pool.query(
    `INSERT INTO network_claim_requests (listing_id, requested_by_user_id, business_email, phone, business_identity_doc_url, business_identity_doc_path, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW())
     RETURNING id, status, created_at AS "createdAt"`,
    [input.listingId, input.userId, txt(input.businessEmail, 240), txt(input.phone, 40), httpsUrl(input.businessIdentityDocUrl), txt(input.businessIdentityDocPath, 420)]
  );
  await pool.query(`UPDATE network_listings SET claim_status = 'pending', updated_at = NOW() WHERE id = $1`, [input.listingId]);
  return rows[0] || null;
}

async function membership(userId, listingId) {
  const { rows } = await pool.query(
    `SELECT role::text AS role, status::text AS status FROM network_listing_memberships WHERE user_id = $1 AND listing_id = $2 AND status = 'active' LIMIT 1`,
    [userId, listingId]
  );
  return rows[0] || null;
}

export async function hasOwnerMembership(userId, listingId) {
  return !!(await membership(userId, listingId));
}

export async function getOwnerListings(userId) {
  const { rows } = await pool.query(
    `SELECT ${LISTING_BASE}, m.role::text AS "membershipRole", m.status::text AS "membershipStatus"
     FROM network_listing_memberships m
     INNER JOIN network_listings l ON l.id = m.listing_id
     WHERE m.user_id = $1 AND m.status = 'active'
     ORDER BY l.updated_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...mapListing(r), membership_role: r.membershipRole, membership_status: r.membershipStatus }));
}

export async function getOwnerListingById(userId, listingId) {
  const m = await membership(userId, listingId);
  if (!m) return null;
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l WHERE l.id = $1 LIMIT 1`, [listingId]);
  if (!rows[0]) return null;
  const listing = mapListing(rows[0]);
  const children = await listingChildren(listingId);
  return { ...listing, membership_role: m.role, membership_status: m.status, media: children.media, services: children.services, faqs: children.faqs, offers: children.offers };
}

export async function updateOwnerListingProfile(userId, listingId, patch = {}) {
  const m = await membership(userId, listingId);
  if (!m) return null;
  const updates = [];
  const params = [listingId];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };

  if (patch.name !== undefined) put('name', txt(patch.name, 160));
  if (patch.category_primary !== undefined) put('category_primary', txt(patch.category_primary, 40));
  if (patch.categories !== undefined) put('categories', arr(patch.categories));
  if (patch.address_line1 !== undefined) put('address_line1', txt(patch.address_line1, 180));
  if (patch.city !== undefined) put('city', txt(patch.city, 120));
  if (patch.state !== undefined) put('state', txt(patch.state, 40));
  if (patch.postal_code !== undefined) put('postal_code', txt(patch.postal_code, 20));
  if (patch.lat !== undefined) put('latitude', num(patch.lat));
  if (patch.lng !== undefined) put('longitude', num(patch.lng));
  if (patch.service_area_radius_mi !== undefined) put('service_area_radius_mi', int(patch.service_area_radius_mi));
  if (patch.phone !== undefined) put('phone', txt(patch.phone, 40));
  if (patch.website_url !== undefined) put('website_url', httpsUrl(patch.website_url));
  if (patch.short_description !== undefined) put('short_description', txt(patch.short_description, 280));
  if (patch.description !== undefined) put('description', txt(patch.description, 7000));
  if (patch.hours_text !== undefined) put('hours_text', txt(patch.hours_text, 320));
  if (patch.cover_image_url !== undefined) put('cover_image_url', httpsUrl(patch.cover_image_url));

  if (!updates.length) return getOwnerListingById(userId, listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getOwnerListingById(userId, listingId);
}

async function replaceRows(listingId, table, cols, rows) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM ${table} WHERE listing_id = $1`, [listingId]);
    if (rows.length) {
      let idx = 1;
      const p = [];
      const tuples = rows.map((row, i) => {
        const values = [listingId, ...cols.map((c) => row[c]), i];
        p.push(...values);
        const ph = values.map(() => `$${idx++}`);
        return `(${ph.join(', ')})`;
      });
      await client.query(`INSERT INTO ${table} (listing_id, ${cols.join(', ')}, sort_order) VALUES ${tuples.join(', ')}`, p);
    }
    await client.query(`UPDATE network_listings SET updated_at = NOW() WHERE id = $1`, [listingId]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function replaceOwnerServices(userId, listingId, services = []) {
  if (!(await membership(userId, listingId))) return null;
  const rows = (Array.isArray(services) ? services : []).map((s) => ({ name: txt(s?.name, 140), price_from: num(s?.price_from), price_to: num(s?.price_to), notes: txt(s?.notes, 500) })).filter((x) => x.name);
  await replaceRows(listingId, 'network_listing_services', ['name', 'price_from', 'price_to', 'notes'], rows.slice(0, 50));
  return getOwnerListingById(userId, listingId);
}

export async function replaceOwnerFaqs(userId, listingId, faqs = []) {
  if (!(await membership(userId, listingId))) return null;
  const rows = (Array.isArray(faqs) ? faqs : []).map((f) => ({ question: txt(f?.question, 340), answer: txt(f?.answer, 2000) })).filter((x) => x.question && x.answer);
  await replaceRows(listingId, 'network_listing_faqs', ['question', 'answer'], rows.slice(0, 40));
  return getOwnerListingById(userId, listingId);
}

export async function replaceOwnerOffers(userId, listingId, offers = []) {
  if (!(await membership(userId, listingId))) return null;
  const rows = (Array.isArray(offers) ? offers : []).map((o) => ({ title: txt(o?.title, 180), code: txt(o?.code, 80), details: txt(o?.details, 1200), expires_at: o?.expires_at ? new Date(o.expires_at).toISOString() : null, is_active: o?.is_active !== false })).filter((x) => x.title);
  await replaceRows(listingId, 'network_listing_offers', ['title', 'code', 'details', 'expires_at', 'is_active'], rows.slice(0, 30));
  return getOwnerListingById(userId, listingId);
}

export async function updateOwnerIntegration(userId, listingId, patch = {}) {
  if (!(await membership(userId, listingId))) return null;
  const updates = [];
  const params = [listingId];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };
  if (patch.portal_mode !== undefined) put('portal_mode', txt(patch.portal_mode, 40));
  if (patch.external_site_url !== undefined) put('external_site_url', httpsUrl(patch.external_site_url));
  if (patch.lead_destination !== undefined) put('lead_destination', txt(patch.lead_destination, 24));
  if (patch.lead_email !== undefined) put('lead_email', txt(patch.lead_email, 240));
  if (patch.lead_webhook_url !== undefined) put('lead_webhook_url', httpsUrl(patch.lead_webhook_url));
  if (patch.enable_lead_form !== undefined) put('enable_lead_form', !!patch.enable_lead_form);
  if (patch.enable_offers !== undefined) put('enable_offers', !!patch.enable_offers);
  if (!updates.length) return getOwnerListingById(userId, listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getOwnerListingById(userId, listingId);
}

export async function isOpsUser(userId) {
  const { rows } = await pool.query(`SELECT 1 FROM network_ops_roles WHERE user_id = $1 LIMIT 1`, [userId]);
  return !!rows[0];
}

export async function grantOpsRole(userId, grantedByUserId = null) {
  const { rows } = await pool.query(
    `INSERT INTO network_ops_roles (user_id, granted_by_user_id, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET granted_by_user_id = EXCLUDED.granted_by_user_id, updated_at = NOW()
     RETURNING id, user_id AS "userId", granted_by_user_id AS "grantedByUserId", created_at AS "createdAt"`,
    [userId, grantedByUserId]
  );
  return rows[0] || null;
}

export async function listClaims(status = 'pending', limit = 80) {
  const s = ['pending', 'approved', 'rejected'].includes(String(status)) ? String(status) : 'pending';
  const lim = Math.min(250, Math.max(1, Number(limit) || 80));
  const { rows } = await pool.query(
    `SELECT c.id, c.status, c.business_email AS "businessEmail", c.phone, c.business_identity_doc_url AS "businessIdentityDocUrl", c.business_identity_doc_path AS "businessIdentityDocPath", c.review_notes AS "reviewNotes", c.created_at AS "createdAt", c.reviewed_at AS "reviewedAt", c.listing_id AS "listingId", c.requested_by_user_id AS "requestedByUserId", l.name AS "listingName", l.slug AS "listingSlug", l.status AS "listingStatus", u.email AS "requestedByEmail", ru.email AS "reviewedByEmail"
     FROM network_claim_requests c
     INNER JOIN network_listings l ON l.id = c.listing_id
     INNER JOIN users u ON u.id = c.requested_by_user_id
     LEFT JOIN users ru ON ru.id = c.reviewed_by_user_id
     WHERE c.status = $1
     ORDER BY c.created_at DESC
     LIMIT $2`,
    [s, lim]
  );
  return rows;
}

export async function approveClaim(claimId, reviewerId, reviewNotes = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = await client.query(
      `SELECT id, status::text AS status, listing_id AS "listingId", requested_by_user_id AS "requestedByUserId"
       FROM network_claim_requests
       WHERE id = $1
       FOR UPDATE`,
      [claimId]
    );
    const claim = c.rows[0];
    if (!claim) { await client.query('ROLLBACK'); return null; }
    if (claim.status !== 'pending') {
      const err = new Error('CLAIM_NOT_PENDING');
      err.code = 'CLAIM_NOT_PENDING';
      throw err;
    }

    await client.query(`UPDATE network_claim_requests SET status = 'approved', review_notes = $2, reviewed_by_user_id = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $1`, [claimId, txt(reviewNotes, 1800), reviewerId]);
    await client.query(`UPDATE network_listings SET owner_user_id = $2, status = 'claimed', claim_status = 'approved', claim_verified_at = NOW(), updated_at = NOW() WHERE id = $1`, [claim.listingId, claim.requestedByUserId]);
    await client.query(`INSERT INTO network_listing_memberships (listing_id, user_id, role, status, updated_at) VALUES ($1, $2, 'owner', 'active', NOW()) ON CONFLICT (listing_id, user_id) DO UPDATE SET role = 'owner', status = 'active', updated_at = NOW()`, [claim.listingId, claim.requestedByUserId]);
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function rejectClaim(claimId, reviewerId, reviewNotes = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const c = await client.query(
      `SELECT id, status::text AS status, listing_id AS "listingId"
       FROM network_claim_requests
       WHERE id = $1
       FOR UPDATE`,
      [claimId]
    );
    const claim = c.rows[0];
    if (!claim) { await client.query('ROLLBACK'); return null; }
    if (claim.status !== 'pending') {
      const err = new Error('CLAIM_NOT_PENDING');
      err.code = 'CLAIM_NOT_PENDING';
      throw err;
    }
    await client.query(`UPDATE network_claim_requests SET status = 'rejected', review_notes = $2, reviewed_by_user_id = $3, reviewed_at = NOW(), updated_at = NOW() WHERE id = $1`, [claimId, txt(reviewNotes, 1800), reviewerId]);
    await client.query(`UPDATE network_listings SET claim_status = 'rejected', updated_at = NOW() WHERE id = $1`, [claim.listingId]);
    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updateOpsListingVerification(listingId, patch = {}) {
  const updates = [];
  const params = [listingId];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };
  if (patch.email_verified !== undefined) put('email_verified', !!patch.email_verified);
  if (patch.phone_verified !== undefined) put('phone_verified', !!patch.phone_verified);
  if (patch.business_identity_verified !== undefined) put('business_identity_verified', !!patch.business_identity_verified);
  if (patch.manual_review_passed !== undefined) put('manual_review_passed', !!patch.manual_review_passed);
  if (!updates.length) return getPublicListingById(listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getPublicListingById(listingId);
}

function partnerGate(l) {
  return !!(l?.verification?.email_verified && l?.verification?.phone_verified && l?.verification?.business_identity_verified && l?.verification?.manual_review_passed);
}

export async function updateOpsListingTier(listingId, tier) {
  const listing = await getPublicListingById(listingId);
  if (!listing) return null;
  const rawTier = txt(tier, 40);
  if (rawTier && !VALID_TIERS.has(rawTier)) {
    const err = new Error('INVALID_TIER');
    err.code = 'INVALID_TIER';
    throw err;
  }
  const nextTier = rawTier || null;
  if (nextTier && (!listing.owner_user_id || listing.status === 'unclaimed' || listing.claim_status !== 'approved')) {
    const err = new Error('CLAIM_REQUIRED');
    err.code = 'CLAIM_REQUIRED';
    throw err;
  }
  if (nextTier && !partnerGate(listing)) {
    const err = new Error('PARTNER_GATE_NOT_MET');
    err.code = 'PARTNER_GATE_NOT_MET';
    throw err;
  }
  if (!nextTier) {
    await pool.query(`UPDATE network_listings SET partner_tier = NULL, partner_since = NULL, status = CASE WHEN owner_user_id IS NULL THEN 'unclaimed' ELSE 'claimed' END, updated_at = NOW() WHERE id = $1`, [listingId]);
  } else {
    await pool.query(`UPDATE network_listings SET partner_tier = $2, partner_since = COALESCE(partner_since, CURRENT_DATE), status = 'partner', updated_at = NOW() WHERE id = $1`, [listingId, nextTier]);
  }
  return getPublicListingById(listingId);
}

export async function updateOpsListingFeatures(listingId, patch = {}) {
  const updates = [];
  const params = [listingId];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };
  if (patch.enable_lead_form !== undefined) put('enable_lead_form', !!patch.enable_lead_form);
  if (patch.enable_offers !== undefined) put('enable_offers', !!patch.enable_offers);
  if (patch.enable_priority_rank !== undefined) put('enable_priority_rank', !!patch.enable_priority_rank);
  if (patch.enable_featured_slots !== undefined) put('enable_featured_slots', !!patch.enable_featured_slots);
  if (patch.featured_rank !== undefined) put('featured_rank', int(patch.featured_rank));
  if (!updates.length) return getPublicListingById(listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getPublicListingById(listingId);
}

export async function listOpsListings(limit = 200) {
  const lim = Math.min(500, Math.max(1, Number(limit) || 200));
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l ORDER BY l.updated_at DESC LIMIT $1`, [lim]);
  return rows.map(mapListing);
}

async function replaceSeedChildren(listingId, seed = {}) {
  const mediaSource = Array.isArray(seed.media) ? seed.media : [];
  const photoSource = Array.isArray(seed.photos) ? seed.photos : [];
  const mediaRows = [...mediaSource, ...photoSource]
    .map((item) => {
      if (typeof item === 'string') {
        const url = httpsUrl(item);
        return url ? { url, alt: txt(seed.name, 180) } : null;
      }
      const url = httpsUrl(item?.url || item?.src);
      return url ? { url, alt: txt(item?.alt || seed.name, 180) } : null;
    })
    .filter(Boolean)
    .slice(0, 20);

  const services = (Array.isArray(seed.services) ? seed.services : [])
    .map((s) => ({
      name: txt(s?.name, 140),
      price_from: num(s?.price_from ?? s?.priceFrom),
      price_to: num(s?.price_to ?? s?.priceTo),
      notes: txt(s?.notes, 500),
    }))
    .filter((s) => s.name)
    .slice(0, 50);

  const faqs = (Array.isArray(seed.faqs) ? seed.faqs : [])
    .map((f) => ({
      question: txt(f?.question, 340),
      answer: txt(f?.answer, 2000),
    }))
    .filter((f) => f.question && f.answer)
    .slice(0, 40);

  const offers = (Array.isArray(seed.offers) ? seed.offers : [])
    .map((o) => ({
      title: txt(o?.title, 180),
      code: txt(o?.code, 80),
      details: txt(o?.details, 1200),
      expires_at: isoDateOrNull(o?.expires_at || o?.expiresAt),
      is_active: o?.is_active !== false && o?.isActive !== false,
    }))
    .filter((o) => o.title)
    .slice(0, 30);

  await replaceRows(listingId, 'network_listing_media', ['url', 'alt'], mediaRows);
  await replaceRows(listingId, 'network_listing_services', ['name', 'price_from', 'price_to', 'notes'], services);
  await replaceRows(listingId, 'network_listing_faqs', ['question', 'answer'], faqs);
  await replaceRows(listingId, 'network_listing_offers', ['title', 'code', 'details', 'expires_at', 'is_active'], offers);
}

export async function upsertListingFromSeed(seed = {}) {
  const slug = txt(seed.slug || seed.id, 180);
  if (!slug) throw new Error('SEED_LISTING_SLUG_REQUIRED');

  const { rows } = await pool.query(
    `INSERT INTO network_listings (slug, name, category_primary, categories, address_line1, city, state, postal_code, latitude, longitude, service_area_radius_mi, phone, website_url, short_description, description, hours_text, status, partner_tier, partner_since, claim_status, email_verified, phone_verified, business_identity_verified, manual_review_passed, enable_lead_form, enable_offers, enable_priority_rank, enable_featured_slots, lead_destination, lead_email, lead_webhook_url, portal_mode, external_site_url, charm_enabled, charm_program_type, charm_public_blurb, charm_receipt_url, charm_match_cap_monthly, featured_rank, cover_image_url, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,NOW())
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, category_primary = EXCLUDED.category_primary, categories = EXCLUDED.categories, address_line1 = EXCLUDED.address_line1, city = EXCLUDED.city, state = EXCLUDED.state, postal_code = EXCLUDED.postal_code, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, service_area_radius_mi = EXCLUDED.service_area_radius_mi, phone = EXCLUDED.phone, website_url = EXCLUDED.website_url, short_description = EXCLUDED.short_description, description = EXCLUDED.description, hours_text = EXCLUDED.hours_text, status = EXCLUDED.status, partner_tier = EXCLUDED.partner_tier, partner_since = EXCLUDED.partner_since, claim_status = EXCLUDED.claim_status, email_verified = EXCLUDED.email_verified, phone_verified = EXCLUDED.phone_verified, business_identity_verified = EXCLUDED.business_identity_verified, manual_review_passed = EXCLUDED.manual_review_passed, enable_lead_form = EXCLUDED.enable_lead_form, enable_offers = EXCLUDED.enable_offers, enable_priority_rank = EXCLUDED.enable_priority_rank, enable_featured_slots = EXCLUDED.enable_featured_slots, lead_destination = EXCLUDED.lead_destination, lead_email = EXCLUDED.lead_email, lead_webhook_url = EXCLUDED.lead_webhook_url, portal_mode = EXCLUDED.portal_mode, external_site_url = EXCLUDED.external_site_url, charm_enabled = EXCLUDED.charm_enabled, charm_program_type = EXCLUDED.charm_program_type, charm_public_blurb = EXCLUDED.charm_public_blurb, charm_receipt_url = EXCLUDED.charm_receipt_url, charm_match_cap_monthly = EXCLUDED.charm_match_cap_monthly, featured_rank = EXCLUDED.featured_rank, cover_image_url = EXCLUDED.cover_image_url, updated_at = NOW()
     RETURNING id`,
    [
      slug,
      txt(seed.name, 160) || slug,
      VALID_CATEGORIES.has(txt(seed.category_primary, 40) || '') ? txt(seed.category_primary, 40) : 'other',
      arr(seed.categories || [seed.category_primary]),
      txt(seed?.location?.address_line1 || seed.address_line1, 180),
      txt(seed?.location?.city || seed.city, 120),
      txt(seed?.location?.state || seed.state, 40),
      txt(seed?.location?.postal_code || seed.postal_code, 20),
      num(seed?.location?.lat ?? seed.lat),
      num(seed?.location?.lng ?? seed.lng),
      int(seed?.location?.service_area_radius_mi ?? seed.service_area_radius_mi),
      txt(seed?.contact?.phone || seed.phone, 40),
      httpsUrl(seed?.contact?.website_url || seed.website_url),
      txt(seed.short_description, 280),
      txt(seed.description, 7000),
      txt(seed.hours_text, 320),
      VALID_STATUS.has(txt(seed.status, 24) || '') ? txt(seed.status, 24) : 'unclaimed',
      txt(seed.partner_tier, 40),
      txt(seed.partner_since, 20),
      VALID_CLAIM_STATUS.has(txt(seed.claim_status, 24) || '') ? txt(seed.claim_status, 24) : ((txt(seed.status, 24) === 'unclaimed') ? 'pending' : 'approved'),
      !!(seed?.verification?.verified_identity || seed.email_verified),
      !!(seed?.verification?.verified_business || seed.phone_verified),
      !!(seed?.verification?.verified_license || seed.business_identity_verified),
      !!seed.manual_review_passed,
      !!seed?.features?.enable_lead_form,
      !!seed?.features?.enable_offers,
      !!seed?.features?.enable_priority_rank,
      !!seed?.features?.enable_featured_slots,
      txt(seed.lead_destination, 24) || 'email',
      txt(seed.lead_email, 240),
      httpsUrl(seed.lead_webhook_url),
      txt(seed.portal_mode, 40) || 'internal_profile',
      httpsUrl(seed.external_site_url),
      !!(seed?.charm_support?.enabled || seed.charm_enabled),
      txt(seed?.charm_support?.program_type || seed.charm_program_type, 40),
      txt(seed?.charm_support?.public_blurb || seed.charm_public_blurb, 360),
      httpsUrl(seed?.charm_support?.receipt_url || seed.charm_receipt_url),
      num(seed?.charm_support?.match_cap_monthly ?? seed.charm_match_cap_monthly),
      int(seed.featured_rank),
      httpsUrl(seed.cover_image_url),
    ]
  );
  const listingId = rows[0]?.id;
  if (listingId) await replaceSeedChildren(listingId, seed);
  return getPublicListingById(listingId);
}

export async function closeNetworkDbPool() {
  await pool.end();
}

export { pool };
