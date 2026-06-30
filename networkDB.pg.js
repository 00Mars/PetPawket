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
const VALID_CATEGORIES = new Set(['vet', 'groomer', 'cleaner', 'shelter', 'trainer', 'boarding', 'sitter', 'walker', 'daycare', 'rescue', 'other']);
const VALID_CLAIM_STATUS = new Set(['pending', 'approved', 'rejected']);
const VALID_NOMINATION_STATUS = new Set(['pending', 'reviewed', 'dismissed', 'converted']);
const VALID_IMPORT_SOURCES = new Set(['overture', 'osm', 'irs_eo_bmf', 'manual', 'paid_provider', 'partner_api']);
const VALID_IMPORT_CANDIDATE_STATUS = new Set(['new', 'needs_review', 'approved', 'rejected', 'promoted']);
const VALID_IMPORT_CANDIDATE_READINESS = new Set(['all', 'promotable', 'needs_contact', 'needs_location', 'contact_ready', 'location_ready']);
const CATEGORY_PUBLIC_LABELS = {
  vet: 'Veterinary',
  groomer: 'Grooming',
  cleaner: 'Cleaner',
  shelter: 'Shelters',
  trainer: 'Training',
  boarding: 'Boarding',
  sitter: 'Pet Sitting',
  walker: 'Dog Walking',
  daycare: 'Daycare',
  rescue: 'Rescue',
  other: 'Other',
};
const PLACEHOLDER_SEED_SLUGS = new Set([
  'pawsome-grooming-oxford-ma',
  'oak-street-animal-clinic-providence-ri',
  'harbor-haven-shelter-new-bedford-ma',
]);
const US_STATE_NAMES_BY_CODE = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};
const US_STATE_CODES = new Set(Object.keys(US_STATE_NAMES_BY_CODE));
const US_STATE_CODES_BY_NAME = Object.fromEntries(
  Object.entries(US_STATE_NAMES_BY_CODE).map(([code, name]) => [name.toLowerCase(), code])
);
const US_STATE_ENTRIES = Object.entries(US_STATE_NAMES_BY_CODE).map(([code, name]) => ({
  code,
  name,
  normalizedName: normalizeSearchText(name),
}));
const CATEGORY_SEARCH_ALIASES = [
  ['vet', ['vet', 'vets', 'veterinary', 'veterinarian', 'veterinarians', 'animal hospital', 'pet hospital', 'animal clinic', 'pet clinic', 'vet clinic', 'veterinary clinic']],
  ['groomer', ['groomer', 'groomers', 'grooming', 'pet grooming', 'dog grooming', 'cat grooming', 'dog wash', 'pet salon', 'pet spa', 'salon']],
  ['cleaner', ['cleaner', 'cleaners', 'pet cleaner', 'pet cleaners', 'pet cleaning', 'pet cleanup', 'pet clean up', 'pet waste', 'pet waste removal', 'dog waste', 'dog waste removal', 'pooper scooper', 'pooper scoopers', 'poop scoop', 'poop scooping', 'poop cleanup', 'doody', 'doody cleanup', 'litter box cleaning', 'cat litter cleaning', 'aquarium cleaning', 'fish tank cleaning']],
  ['shelter', ['shelter', 'shelters', 'animal shelter', 'animal shelters', 'humane society', 'spca', 'adoption center', 'pet adoption']],
  ['rescue', ['rescue', 'rescues', 'animal rescue', 'pet rescue']],
  ['trainer', ['trainer', 'trainers', 'training', 'dog training', 'obedience', 'behaviorist', 'animal training']],
  ['boarding', ['boarding', 'boarder', 'boarders', 'kennel', 'kennels', 'pet hotel', 'dog hotel']],
  ['daycare', ['daycare', 'day care', 'dog daycare', 'doggy daycare', 'doggie daycare']],
  ['sitter', ['sitter', 'sitters', 'sitting', 'pet sitter', 'pet sitters', 'pet sitting']],
  ['walker', ['walker', 'walkers', 'walking', 'dog walker', 'dog walkers', 'dog walking']],
].flatMap(([category, aliases]) => aliases.map((alias) => ({
  category,
  alias,
  tokens: normalizeSearchText(alias).split(' ').filter(Boolean),
}))).sort((a, b) => b.tokens.length - a.tokens.length || b.alias.length - a.alias.length);
const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'around', 'business', 'businesses', 'care', 'directory', 'for', 'from', 'in', 'list',
  'listing', 'listings', 'local', 'near', 'network', 'of', 'on', 'organization', 'organizations', 'pet', 'pets',
  'provider', 'providers', 'me', 'my', 'service', 'services', 'the', 'to', 'with',
]);
const AMBIGUOUS_STATE_CODE_TOKENS = new Set(['id', 'in', 'me', 'or']);

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

function normalizeSearchText(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchingStateEntriesForQuery(value, options = {}) {
  const q = normalizeSearchText(value);
  if (!q) return [];
  const allowPrefix = !!options.prefix && q.length >= 2;
  const allowBroad = !!options.broad && q.length >= 4;
  return US_STATE_ENTRIES.filter((entry) => {
    const code = entry.code.toLowerCase();
    if (q === code || q === entry.normalizedName) return true;
    if (allowPrefix && (entry.normalizedName.startsWith(q) || code.startsWith(q))) return true;
    if (allowBroad && (q.includes(entry.normalizedName) || entry.normalizedName.includes(q))) return true;
    return false;
  });
}

function rawSearchTokens(value) {
  return String(value || '').match(/[A-Za-z0-9]+/g) || [];
}

function findPhraseIndexes(tokens, phraseTokens) {
  if (!tokens.length || !phraseTokens.length || phraseTokens.length > tokens.length) return [];
  const indexes = [];
  for (let i = 0; i <= tokens.length - phraseTokens.length; i += 1) {
    let hit = true;
    for (let j = 0; j < phraseTokens.length; j += 1) {
      if (tokens[i + j] !== phraseTokens[j]) {
        hit = false;
        break;
      }
    }
    if (hit) indexes.push(...phraseTokens.map((_token, offset) => i + offset));
  }
  return indexes;
}

function usableStateCodeToken(code, rawToken, tokenCount) {
  const lowerCode = String(code || '').toLowerCase();
  if (!AMBIGUOUS_STATE_CODE_TOKENS.has(lowerCode)) return true;
  if (rawToken === code) return true;
  return tokenCount === 1;
}

function analyzePublicSearchQuery(value, options = {}) {
  const rawTokens = rawSearchTokens(value);
  const tokens = rawTokens.map((token) => normalizeSearchText(token)).filter(Boolean);
  const normalized = normalizeSearchText(value);
  const consumed = new Set();
  const states = new Set();
  const categories = new Set();

  US_STATE_ENTRIES.forEach((entry) => {
    const codeToken = entry.code.toLowerCase();
    tokens.forEach((token, index) => {
      if (token === codeToken && usableStateCodeToken(entry.code, rawTokens[index], tokens.length)) {
        states.add(entry.code);
        consumed.add(index);
      }
    });

    const stateTokens = entry.normalizedName.split(' ').filter(Boolean);
    findPhraseIndexes(tokens, stateTokens).forEach((index) => {
      states.add(entry.code);
      consumed.add(index);
    });

    if (options.prefixState && tokens.length === 1 && tokens[0].length >= 3 && entry.normalizedName.startsWith(tokens[0])) {
      states.add(entry.code);
      consumed.add(0);
    }
  });

  CATEGORY_SEARCH_ALIASES.forEach((item) => {
    const indexes = findPhraseIndexes(tokens, item.tokens);
    if (!indexes.length) return;
    categories.add(item.category);
    indexes.forEach((index) => consumed.add(index));
  });

  const textTokens = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token, index }) => !consumed.has(index)
      && !SEARCH_STOPWORDS.has(token)
      && (token.length >= 3 || /^[0-9]{2,}$/.test(token)))
    .map(({ token }) => token);
  const fallbackAllowed = tokens.some((token, index) => !consumed.has(index) && !SEARCH_STOPWORDS.has(token));

  return {
    raw: txt(value, 120),
    normalized,
    states: Array.from(states),
    categories: Array.from(categories),
    textTokens: Array.from(new Set(textTokens)),
    fallbackAllowed,
  };
}

function addPublicSearchClauses(alias, query, params, options = {}) {
  const analysis = analyzePublicSearchQuery(query, options);
  const clauses = [];

  if (analysis.states.length) {
    params.push(analysis.states);
    clauses.push(`UPPER(${alias}.state) = ANY($${params.length}::text[])`);
  }

  if (analysis.categories.length) {
    params.push(analysis.categories);
    clauses.push(`(${alias}.category_primary::text = ANY($${params.length}::text[]) OR ${alias}.categories && $${params.length}::text[])`);
  }

  analysis.textTokens.forEach((token) => {
    params.push(`%${token}%`);
    const i = params.length;
    clauses.push(`(
      ${alias}.name ILIKE $${i}
      OR ${alias}.address_line1 ILIKE $${i}
      OR ${alias}.city ILIKE $${i}
      OR ${alias}.state ILIKE $${i}
      OR ${alias}.postal_code ILIKE $${i}
      OR ${alias}.category_primary::text ILIKE $${i}
      OR array_to_string(${alias}.categories, ' ') ILIKE $${i}
      OR concat_ws(', ', NULLIF(${alias}.city, ''), NULLIF(${alias}.state, '')) ILIKE $${i}
      OR concat_ws(' ', NULLIF(${alias}.address_line1, ''), NULLIF(${alias}.city, ''), NULLIF(${alias}.state, ''), NULLIF(${alias}.postal_code, '')) ILIKE $${i}
      OR concat_ws(', ', NULLIF(${alias}.address_line1, ''), NULLIF(${alias}.city, ''), NULLIF(${alias}.state, ''), NULLIF(${alias}.postal_code, '')) ILIKE $${i}
    )`);
  });

  if (!clauses.length && analysis.fallbackAllowed && analysis.normalized.length >= 3) {
    params.push(`%${query}%`);
    const i = params.length;
    clauses.push(`(
      ${alias}.name ILIKE $${i}
      OR ${alias}.address_line1 ILIKE $${i}
      OR ${alias}.city ILIKE $${i}
      OR ${alias}.postal_code ILIKE $${i}
      OR ${alias}.category_primary::text ILIKE $${i}
      OR array_to_string(${alias}.categories, ' ') ILIKE $${i}
      OR concat_ws(', ', NULLIF(${alias}.city, ''), NULLIF(${alias}.state, '')) ILIKE $${i}
      OR concat_ws(' ', NULLIF(${alias}.address_line1, ''), NULLIF(${alias}.city, ''), NULLIF(${alias}.state, ''), NULLIF(${alias}.postal_code, '')) ILIKE $${i}
      OR concat_ws(', ', NULLIF(${alias}.address_line1, ''), NULLIF(${alias}.city, ''), NULLIF(${alias}.state, ''), NULLIF(${alias}.postal_code, '')) ILIKE $${i}
    )`);
  }

  return { clauses, analysis };
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

function httpUrl(v) {
  const s = txt(v, 2048);
  if (!s) return null;
  try {
    const u = new URL(s);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null;
  } catch {
    return null;
  }
}

function safeCategory(v) {
  const category = txt(v, 40)?.toLowerCase() || '';
  return VALID_CATEGORIES.has(category) ? category : null;
}

function slugify(v) {
  const s = String(v || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return s.slice(0, 180) || `network-listing-${Date.now()}`;
}

function lowerHost(v) {
  const s = txt(v, 2048);
  if (!s) return '';
  try {
    return new URL(s).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function seedError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
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

function mapPublicListing(r) {
  const listing = mapListing(r);
  if (!listing) return null;
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    category_primary: listing.category_primary,
    categories: listing.categories,
    location: listing.location,
    contact: listing.contact,
    short_description: listing.short_description,
    description: listing.description,
    hours_text: listing.hours_text,
    status: listing.status,
    partner_tier: listing.partner_tier,
    partner_since: listing.partner_since,
    features: {
      enable_lead_form: !!listing.features?.enable_lead_form,
      enable_offers: !!listing.features?.enable_offers,
    },
    portal_mode: listing.portal_mode,
    external_site_url: listing.external_site_url,
    charm_support: listing.charm_support,
    cover_image_url: listing.cover_image_url,
    created_at: listing.created_at,
    updated_at: listing.updated_at,
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
  return mapPublicListing(rows[0]);
}

export async function getInternalListingById(id) {
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l WHERE l.id = $1 LIMIT 1`, [id]);
  return mapListing(rows[0]);
}

export async function getPublicListingBySlug(slug) {
  const { rows } = await pool.query(`SELECT ${LISTING_BASE} FROM network_listings l WHERE l.slug = $1 LIMIT 1`, [String(slug || '').trim()]);
  if (!rows[0]) return null;
  const listing = mapPublicListing(rows[0]);
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
    const { clauses } = addPublicSearchClauses('l', String(filters.q).trim(), params);
    if (clauses.length) where.push(`(${clauses.join(' AND ')})`);
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
  const countParams = lat != null && lng != null && radius == null ? params.slice(0, -2) : params.slice();

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
    pool.query(`SELECT COUNT(*)::int AS total FROM network_listings l ${whereSql}`, countParams),
  ]);

  return {
    page,
    pageSize,
    total: countRes.rows[0]?.total || 0,
    items: rowsRes.rows.map((r) => ({ ...mapPublicListing(r), distance_mi: r.distanceMi != null ? Number(r.distanceMi) : null })),
  };
}

function publicSuggestion(type, label, value, detail = null, extra = {}) {
  const cleanLabel = txt(label, 220);
  const cleanValue = txt(value || label, 220);
  if (!type || !cleanLabel || !cleanValue) return null;
  return {
    type,
    label: cleanLabel,
    value: cleanValue,
    detail: txt(detail, 220),
    ...(extra || {}),
  };
}

function publicSuggestionRank(query, suggestion) {
  const q = String(query || '').trim().toLowerCase();
  const label = String(suggestion?.label || '').toLowerCase();
  const value = String(suggestion?.value || '').toLowerCase();
  const postalSearch = /^[0-9]/.test(q);
  const zipIntent = zipAutocompleteIntent(query);
  if (zipIntent && suggestion?.type === 'zip') {
    const valueText = String(suggestion.postal_code || suggestion.value || '').trim();
    const zipBias = valueText === zipIntent.zip ? 0 : (valueText.startsWith(zipIntent.zip) ? 1 : 2);
    return zipBias;
  }
  const placeIntent = placeAutocompleteIntent(query);
  if (placeIntent && suggestion?.type === 'place') {
    const state = String(suggestion.state || '').toUpperCase();
    const name = String(suggestion.city || suggestion.label || '').split(',')[0].trim().toLowerCase();
    const intentName = String(placeIntent.name || '').toLowerCase();
    const stateIndex = placeIntent.stateCodes.length ? placeIntent.stateCodes.indexOf(state) : -1;
    const stateBias = stateIndex >= 0
      ? stateIndex
      : state === 'MA'
        ? 12
        : ['NH', 'RI', 'CT', 'ME', 'VT', 'NY'].includes(state)
          ? 16
          : 24;
    const nameBias = name === intentName ? 0 : (name.startsWith(intentName) ? 1 : 2);
    return nameBias * 100 + stateBias;
  }
  if (placeIntent && suggestion?.type === 'category' && placeIntent.name && placeIntent.category) return 500;
  if (zipIntent && suggestion?.type === 'category' && zipIntent.category) return 500;
  const typeBias = {
    place: postalSearch ? 3 : 0,
    zip: postalSearch ? 0 : 3,
    state: postalSearch ? 4 : 1,
    category: postalSearch ? 4 : 0,
    area: postalSearch ? 1 : 1,
    listing: 2,
    address: postalSearch ? 2 : 3,
  }[suggestion?.type] ?? 4;
  const matchBias = !q ? 3 : (label === q || value === q ? 0 : (label.startsWith(q) || value.startsWith(q) ? 1 : 2));
  return typeBias * 10 + matchBias;
}

function normalizeUsStateCode(value) {
  const raw = txt(value, 60);
  if (!raw) return null;
  const code = raw.toUpperCase();
  if (US_STATE_CODES.has(code)) return code;
  return US_STATE_CODES_BY_NAME[raw.toLowerCase()] || null;
}

function stateCodesForAutocompletePrefix(value) {
  const raw = txt(value, 80);
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const exact = normalizeUsStateCode(raw);
  if (exact) return [exact];
  const preferred = ['MA', 'NH', 'RI', 'CT', 'ME', 'VT', 'NY'];
  const stateRank = (code) => {
    const hit = preferred.indexOf(code);
    return hit >= 0 ? hit : 100 + code.charCodeAt(0) * 4 + code.charCodeAt(1);
  };
  return Object.entries(US_STATE_NAMES_BY_CODE)
    .filter(([code, name]) => code.toLowerCase().startsWith(lower) || name.toLowerCase().startsWith(lower))
    .map(([code]) => code)
    .sort((a, b) => stateRank(a) - stateRank(b) || a.localeCompare(b));
}

function stripPlaceAutocompleteServiceText(query) {
  let raw = txt(query, 100) || '';
  let category = null;
  for (const entry of CATEGORY_SEARCH_ALIASES) {
    const escaped = entry.alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(^|\\b)${escaped}(?=\\b|$)`, 'ig');
    if (re.test(raw)) {
      if (!category) category = entry.category;
      raw = raw.replace(re, ' ');
    }
  }
  SEARCH_STOPWORDS.forEach((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    raw = raw.replace(new RegExp(`\\b${escaped}\\b`, 'ig'), ' ');
  });
  raw = raw.replace(/\s+,/g, ',').replace(/,\s+/g, ', ').replace(/\s+/g, ' ').replace(/^,+|,+$/g, '').trim();
  return { query: raw, category };
}

function placeAutocompleteIntent(query) {
  const stripped = stripPlaceAutocompleteServiceText(query);
  const raw = txt(stripped.query || query, 100);
  if (!raw || raw.length < 2) return null;
  if (/^\d/.test(raw)) return null;
  const compact = raw.replace(/\s+/g, ' ').trim();
  const commaParts = compact.split(',');
  if (commaParts.length > 1) {
    const name = txt(commaParts.slice(0, -1).join(','), 80);
    const stateText = txt(commaParts[commaParts.length - 1], 80);
    if (!name || name.length < 2) return null;
    return {
      name,
      stateCodes: stateText ? stateCodesForAutocompletePrefix(stateText) : [],
      stateText,
      category: stripped.category,
      hasStateIntent: !!stateText,
    };
  }

  const namedState = Object.entries(US_STATE_NAMES_BY_CODE)
    .sort((a, b) => b[1].length - a[1].length)
    .find(([, name]) => compact.toLowerCase().endsWith(` ${name.toLowerCase()}`));
  if (namedState) {
    const name = txt(compact.slice(0, compact.length - namedState[1].length), 80);
    if (name && name.length >= 2) return { name, stateCodes: [namedState[0]], stateText: namedState[1], category: stripped.category, hasStateIntent: true };
  }

  const tokens = compact.split(' ');
  if (tokens.length > 1) {
    const last = tokens[tokens.length - 1];
    const stateCodes = stateCodesForAutocompletePrefix(last);
    if (stateCodes.length) {
      const name = txt(tokens.slice(0, -1).join(' '), 80);
      if (name && name.length >= 2) return { name, stateCodes, stateText: last, category: stripped.category, hasStateIntent: true };
    }
  }

  return { name: compact, stateCodes: [], stateText: '', category: stripped.category, hasStateIntent: false };
}

function zipAutocompleteIntent(query) {
  const stripped = stripPlaceAutocompleteServiceText(query);
  const raw = txt(stripped.query || query, 100);
  const match = raw?.match(/\b\d{2,5}\b/);
  if (!match) return null;
  const remainder = raw.replace(match[0], '').replace(/[,\s]/g, '');
  if (remainder) return null;
  return { zip: match[0], category: stripped.category };
}

async function listPublicZipCenterSuggestions(query, limit) {
  const intent = zipAutocompleteIntent(query);
  if (!intent) return [];
  const params = [`${intent.zip}%`, intent.zip, Math.max(limit * 3, 12)];
  const { rows } = await pool.query(
    `SELECT p.name, p.latitude, p.longitude
     FROM network_place_index p
     WHERE p.source = 'census_zcta'
       AND p.name LIKE $1
     ORDER BY
       CASE WHEN p.name = $2 THEN 0 WHEN p.name LIKE $1 THEN 1 ELSE 2 END,
       p.name ASC
     LIMIT $3`,
    params
  );
  const detail = intent.category
    ? `${CATEGORY_PUBLIC_LABELS[intent.category] || intent.category} ZIP radius center`
    : 'ZIP radius center';
  return rows.map((row) => publicSuggestion('zip', row.name, row.name, detail, {
    postal_code: row.name,
    lat: row.latitude != null ? Number(row.latitude) : null,
    lng: row.longitude != null ? Number(row.longitude) : null,
    lookup: row.name,
    category: intent.category,
  })).filter(Boolean);
}

async function listPublicPlaceSuggestions(query, limit) {
  const intent = placeAutocompleteIntent(query);
  if (!intent) return [];
  const namePrefix = `${intent.name.toLowerCase()}%`;
  const nameExact = intent.name.toLowerCase();
  const params = [namePrefix, nameExact];
  const where = [`LOWER(p.name) LIKE $1`];
  if (intent.stateCodes.length) {
    params.push(intent.stateCodes);
    where.push(`p.state = ANY($${params.length}::text[])`);
  } else if (intent.hasStateIntent) {
    return [];
  }
  params.push(Math.max(limit * 4, 16));
  const limitI = params.length;

  const { rows } = await pool.query(
    `WITH ranked AS (
       SELECT DISTINCT ON (LOWER(p.name), p.state)
         p.name,
         p.canonical_name AS "canonicalName",
         p.state,
         p.place_kind AS "placeKind",
         p.latitude,
         p.longitude,
         p.source,
         CASE
           WHEN LOWER(p.name) = $2 THEN 0
           WHEN LOWER(p.name) LIKE $1 THEN 1
           ELSE 2
         END AS name_rank,
         CASE p.place_kind
           WHEN 'city' THEN 0
           WHEN 'town' THEN 0
           WHEN 'village' THEN 1
           WHEN 'borough' THEN 1
           WHEN 'municipality' THEN 1
           WHEN 'cdp' THEN 2
           WHEN 'township' THEN 3
           ELSE 4
         END AS kind_rank
       FROM network_place_index p
       WHERE ${where.join(' AND ')}
       ORDER BY LOWER(p.name), p.state,
         CASE p.source WHEN 'census_place' THEN 0 WHEN 'census_cousub' THEN 1 ELSE 2 END,
         kind_rank,
         p.name
     )
     SELECT *
     FROM ranked
     ORDER BY
       CASE WHEN state = 'MA' THEN 0 WHEN state IN ('NH','RI','CT','ME','VT','NY') THEN 1 ELSE 2 END,
       name_rank,
       kind_rank,
       name ASC,
       state ASC
     LIMIT $${limitI}`,
    params
  );

  const detail = intent.category
    ? `${CATEGORY_PUBLIC_LABELS[intent.category] || intent.category} radius center`
    : 'Radius search center';
  return rows.map((row) => publicSuggestion('place', `${row.name}, ${row.state}`, `${row.name}, ${row.state}`, detail, {
    city: row.name,
    state: row.state,
    lat: row.latitude != null ? Number(row.latitude) : null,
    lng: row.longitude != null ? Number(row.longitude) : null,
    lookup: `${row.name}, ${row.state}`,
    category: intent.category,
  })).filter(Boolean);
}

export async function listPublicListingSuggestions(filters = {}) {
  const q = txt(filters.q, 100);
  const limit = Math.min(12, Math.max(1, int(filters.limit) || 8));
  if (!q || q.length < 2) return [];

  const like = `%${q}%`;
  const prefix = `${q}%`;
  const rowLimit = Math.max(limit * 3, 12);
  const searchAnalysis = analyzePublicSearchQuery(q, { prefixState: true });
  const stateMatches = new Map();
  matchingStateEntriesForQuery(q, { prefix: true }).forEach((entry) => stateMatches.set(entry.code, entry));
  searchAnalysis.states.forEach((code) => {
    const name = US_STATE_NAMES_BY_CODE[code];
    if (name) stateMatches.set(code, { code, name, normalizedName: normalizeSearchText(name) });
  });
  const stateEntries = Array.from(stateMatches.values());
  const stateCodes = stateEntries.map((entry) => entry.code);
  const categoryCodes = searchAnalysis.categories.filter((category) => VALID_CATEGORIES.has(category));
  const listingParams = [];
  const { clauses: listingSearchClauses } = addPublicSearchClauses('l', q, listingParams, { prefixState: true });
  const listingWhereSql = listingSearchClauses.length ? listingSearchClauses.join(' AND ') : 'FALSE';
  listingParams.push(prefix);
  const listingPrefixI = listingParams.length;
  listingParams.push(rowLimit);
  const listingLimitI = listingParams.length;

  const [zipCenterSuggestions, placeSuggestions, stateRes, categoryRes, areaRes, listingRes, addressRes, zipRes] = await Promise.all([
    listPublicZipCenterSuggestions(q, rowLimit).catch(() => []),
    listPublicPlaceSuggestions(q, rowLimit).catch(() => []),
    stateCodes.length
      ? pool.query(
        `SELECT UPPER(l.state) AS state, COUNT(*)::int AS count
         FROM network_listings l
         WHERE UPPER(l.state) = ANY($1::text[])
         GROUP BY UPPER(l.state)`,
        [stateCodes]
      )
      : Promise.resolve({ rows: [] }),
    categoryCodes.length
      ? pool.query(
        `SELECT l.category_primary::text AS category, COUNT(*)::int AS count
         FROM network_listings l
         WHERE l.category_primary::text = ANY($1::text[]) OR l.categories && $1::text[]
         GROUP BY l.category_primary
         ORDER BY COUNT(*) DESC, l.category_primary ASC`,
        [categoryCodes]
      )
      : Promise.resolve({ rows: [] }),
    pool.query(
      `SELECT l.city, l.state, COUNT(*)::int AS count
       FROM network_listings l
       WHERE l.city IS NOT NULL
         AND l.state IS NOT NULL
         AND (
           l.city ILIKE $1
           OR l.state ILIKE $2
           OR l.postal_code ILIKE $2
           OR concat_ws(', ', NULLIF(l.city, ''), NULLIF(l.state, '')) ILIKE $1
         )
       GROUP BY l.city, l.state
       ORDER BY
         CASE
           WHEN concat_ws(', ', NULLIF(l.city, ''), NULLIF(l.state, '')) ILIKE $2 THEN 0
           WHEN l.city ILIKE $2 THEN 1
           WHEN l.state ILIKE $2 THEN 2
           ELSE 3
         END,
         COUNT(*) DESC,
         l.city ASC
       LIMIT $3`,
      [like, prefix, rowLimit]
    ),
    pool.query(
      `SELECT l.id, l.slug, l.name, l.category_primary, l.address_line1, l.city, l.state, l.postal_code, l.status
       FROM network_listings l
       WHERE ${listingWhereSql}
       ORDER BY
         CASE
           WHEN l.name ILIKE $${listingPrefixI} THEN 0
           WHEN l.address_line1 ILIKE $${listingPrefixI} THEN 1
           WHEN l.city ILIKE $${listingPrefixI} THEN 2
           ELSE 3
         END,
         CASE l.status WHEN 'partner' THEN 0 WHEN 'claimed' THEN 1 ELSE 2 END,
         l.name ASC
       LIMIT $${listingLimitI}`,
      listingParams
    ),
    pool.query(
      `SELECT l.id, l.slug, l.name, l.address_line1, l.city, l.state, l.postal_code
       FROM network_listings l
       WHERE l.address_line1 IS NOT NULL
         AND (
           concat_ws(' ', NULLIF(l.address_line1, ''), NULLIF(l.city, ''), NULLIF(l.state, ''), NULLIF(l.postal_code, '')) ILIKE $1
           OR concat_ws(', ', NULLIF(l.address_line1, ''), NULLIF(l.city, ''), NULLIF(l.state, ''), NULLIF(l.postal_code, '')) ILIKE $1
         )
       ORDER BY
         CASE WHEN l.address_line1 ILIKE $2 THEN 0 ELSE 1 END,
         l.address_line1 ASC
       LIMIT $3`,
      [like, prefix, rowLimit]
    ),
    pool.query(
      `SELECT l.postal_code, l.city, l.state, COUNT(*)::int AS count
       FROM network_listings l
       WHERE l.postal_code IS NOT NULL
         AND (
           l.postal_code ILIKE $2
           OR l.city ILIKE $1
           OR concat_ws(', ', NULLIF(l.city, ''), NULLIF(l.state, '')) ILIKE $1
         )
       GROUP BY l.postal_code, l.city, l.state
       ORDER BY
         CASE WHEN l.postal_code ILIKE $2 THEN 0 ELSE 1 END,
         COUNT(*) DESC,
         l.postal_code ASC
       LIMIT $3`,
      [like, prefix, rowLimit]
    ),
  ]);

  const suggestions = [];
  const seen = new Set();
  const add = (suggestion) => {
    if (!suggestion) return;
    const key = `${suggestion.type}:${String(suggestion.value || suggestion.label).toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  zipCenterSuggestions.forEach(add);
  placeSuggestions.forEach(add);

  const stateCounts = new Map(stateRes.rows.map((row) => [String(row.state || '').toUpperCase(), Number(row.count || 0)]));
  stateEntries.forEach((entry) => {
    const count = stateCounts.get(entry.code) || 0;
    if (!count) return;
    add(publicSuggestion('state', entry.name, entry.name, `${count} ${count === 1 ? 'listing' : 'listings'}`, {
      state: entry.code,
      count,
    }));
  });

  const categoryCounts = new Map(categoryRes.rows.map((row) => [String(row.category || '').toLowerCase(), Number(row.count || 0)]));
  categoryCodes.forEach((category) => {
    const count = categoryCounts.get(category) || 0;
    if (!count) return;
    const label = CATEGORY_PUBLIC_LABELS[category] || category;
    add(publicSuggestion('category', label, label, `${count} ${count === 1 ? 'listing' : 'listings'}`, {
      category,
      count,
    }));
  });

  areaRes.rows.forEach((row) => {
    const area = [row.city, row.state].filter(Boolean).join(', ');
    const count = Number(row.count || 0);
    add(publicSuggestion('area', area, area, `${count} ${count === 1 ? 'listing' : 'listings'}`, {
      city: row.city,
      state: row.state,
      count,
    }));
  });

  listingRes.rows.forEach((row) => {
    const place = [row.city, row.state].filter(Boolean).join(', ');
    add(publicSuggestion('listing', row.name, row.name, place, {
      slug: row.slug,
      category: row.category_primary,
      address_line1: row.address_line1,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      status: row.status,
    }));
  });

  addressRes.rows.forEach((row) => {
    const cityState = [row.city, row.state].filter(Boolean).join(', ');
    const address = [row.address_line1, cityState, row.postal_code].filter(Boolean).join(', ');
    add(publicSuggestion('address', address, address, row.name, {
      slug: row.slug,
      address_line1: row.address_line1,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
    }));
  });

  zipRes.rows.forEach((row) => {
    const place = [row.city, row.state].filter(Boolean).join(', ');
    const label = [row.postal_code, place].filter(Boolean).join(' · ');
    const count = Number(row.count || 0);
    add(publicSuggestion('zip', label, row.postal_code, `${count} ${count === 1 ? 'listing' : 'listings'}`, {
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      count,
    }));
  });

  return suggestions
    .sort((a, b) => publicSuggestionRank(q, a) - publicSuggestionRank(q, b) || String(a.label).localeCompare(String(b.label)))
    .slice(0, limit);
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

const IMPORT_CANDIDATE_BASE = `
  id,
  source,
  source_record_id AS "sourceRecordId",
  source_url AS "sourceUrl",
  source_payload AS "sourcePayload",
  name,
  category_primary AS "categoryPrimary",
  categories,
  address_line1 AS "addressLine1",
  city,
  state,
  postal_code AS "postalCode",
  latitude,
  longitude,
  phone,
  website_url AS "websiteUrl",
  short_description AS "shortDescription",
  dedupe_key AS "dedupeKey",
  confidence_score AS "confidenceScore",
  confidence_reasons AS "confidenceReasons",
  match_listing_id AS "matchListingId",
  promoted_listing_id AS "promotedListingId",
  status,
  review_notes AS "reviewNotes",
  reviewed_by_user_id AS "reviewedByUserId",
  reviewed_at AS "reviewedAt",
  promoted_at AS "promotedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

function compactKeyPart(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(inc|llc|ltd|co|company|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidateWebsiteHost(v) {
  const s = httpUrl(v);
  if (!s) return '';
  try {
    return new URL(s).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function candidateDedupeKey(input = {}) {
  const sourceRecordId = compactKeyPart(input.source_record_id || input.sourceRecordId);
  if (sourceRecordId && compactKeyPart(input.source)) return `${compactKeyPart(input.source)}:${sourceRecordId}`;
  const name = compactKeyPart(input.name);
  const city = compactKeyPart(input.city || input?.location?.city);
  const state = compactKeyPart(input.state || input?.location?.state);
  const postal = compactKeyPart(input.postal_code || input.postalCode || input?.location?.postal_code);
  const phone = compactKeyPart(input.phone || input?.contact?.phone).replace(/\D/g, '').slice(-10);
  const host = candidateWebsiteHost(input.website_url || input.websiteUrl || input?.contact?.website_url);
  const contact = host || phone || postal || 'no-contact';
  return [name || 'unnamed', city || 'unknown-city', state || 'unknown-state', contact].join('|').slice(0, 420);
}

function importSourceLabel(source) {
  return {
    overture: 'Overture Maps Places',
    osm: 'OpenStreetMap',
    irs_eo_bmf: 'IRS Exempt Organizations Business Master File',
    manual: 'manual review',
    paid_provider: 'licensed provider data',
    partner_api: 'partner API data',
  }[source] || 'source data';
}

function candidatePublicSummary(candidate = {}, city = '', state = '') {
  const place = [city, state].filter(Boolean).join(', ');
  const suffix = place ? ` in ${place}` : '';
  return `${candidate.name} is an unclaimed Pawket Network Listing${suffix}. Owner claim and Pawket Partner verification are still pending.`;
}

function candidateSummaryIsInternal(value) {
  const s = String(value || '').toLowerCase();
  return !s || s.includes('source candidate') || s.includes('source data');
}

function scoreCandidate(c = {}) {
  const reasons = [];
  let score = 0;
  if (c.name) { score += 18; reasons.push('name'); }
  if (c.category_primary && c.category_primary !== 'other') { score += 14; reasons.push('category'); }
  if (c.city && c.state) { score += 18; reasons.push('city/state'); }
  if (c.postal_code) { score += 6; reasons.push('postal'); }
  if (c.latitude != null && c.longitude != null) { score += 10; reasons.push('coordinates'); }
  if (c.website_url) { score += 16; reasons.push('website'); }
  if (c.phone) { score += 12; reasons.push('phone'); }
  if (['overture', 'irs_eo_bmf', 'paid_provider', 'partner_api'].includes(c.source)) { score += 6; reasons.push(c.source); }
  return { score: Math.min(100, score), reasons };
}

function mapImportCandidate(r) {
  if (!r) return null;
  return {
    id: r.id,
    source: r.source,
    source_record_id: r.sourceRecordId,
    source_url: r.sourceUrl,
    source_payload: r.sourcePayload || {},
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
    },
    contact: {
      phone: r.phone,
      website_url: r.websiteUrl,
    },
    short_description: r.shortDescription,
    dedupe_key: r.dedupeKey,
    confidence_score: r.confidenceScore != null ? Number(r.confidenceScore) : 0,
    confidence_reasons: Array.isArray(r.confidenceReasons) ? r.confidenceReasons : [],
    match_listing_id: r.matchListingId,
    promoted_listing_id: r.promotedListingId,
    status: r.status,
    review_notes: r.reviewNotes,
    reviewed_by_user_id: r.reviewedByUserId,
    reviewed_at: r.reviewedAt,
    promoted_at: r.promotedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function applyCandidateReadinessFilter(where, readiness) {
  const value = txt(readiness, 32)?.toLowerCase();
  if (!value || value === 'all') return;
  if (!VALID_IMPORT_CANDIDATE_READINESS.has(value)) {
    const err = new Error('INVALID_IMPORT_CANDIDATE_READINESS');
    err.code = 'INVALID_IMPORT_CANDIDATE_READINESS';
    throw err;
  }
  if (value === 'promotable') {
    where.push(`(status IN ('new','approved') AND city IS NOT NULL AND state IS NOT NULL AND (phone IS NOT NULL OR website_url IS NOT NULL))`);
  } else if (value === 'needs_contact') {
    where.push(`(phone IS NULL AND website_url IS NULL)`);
  } else if (value === 'needs_location') {
    where.push(`(city IS NULL OR state IS NULL)`);
  } else if (value === 'contact_ready') {
    where.push(`(phone IS NOT NULL OR website_url IS NOT NULL)`);
  } else if (value === 'location_ready') {
    where.push(`(city IS NOT NULL AND state IS NOT NULL)`);
  }
}

export function prepareNetworkImportCandidate(input = {}, defaults = {}) {
  const sourceRaw = txt(input.source || defaults.source, 40)?.toLowerCase();
  const source = VALID_IMPORT_SOURCES.has(sourceRaw) ? sourceRaw : null;
  if (!source) throw seedError('NETWORK_IMPORT_SOURCE_REQUIRED', 'Candidate source is required');

  const name = txt(input.name || input.provider_name || input.providerName, 180);
  if (!name) throw seedError('NETWORK_IMPORT_NAME_REQUIRED', 'Candidate name is required');

  const category = safeCategory(input.category_primary || input.categoryPrimary || defaults.category_primary) || 'other';
  const categories = Array.from(new Set(arr(input.categories || [category]).map((c) => c.toLowerCase()).filter((c) => VALID_CATEGORIES.has(c))));
  const city = txt(input?.location?.city || input.city, 120);
  const state = txt(input?.location?.state || input.state, 16)?.toUpperCase();
  const postalCode = txt(input?.location?.postal_code || input.postal_code || input.postalCode, 20);
  const latitude = num(input?.location?.lat ?? input.lat ?? input.latitude);
  const longitude = num(input?.location?.lng ?? input.lng ?? input.longitude);
  const websiteUrl = httpUrl(input?.contact?.website_url || input.website_url || input.websiteUrl);
  const phone = txt(input?.contact?.phone || input.phone, 40);
  const shortDescription = txt(input.short_description || input.shortDescription, 360);
  const prepared = {
    source,
    source_record_id: txt(input.source_record_id || input.sourceRecordId || input.id, 240),
    source_url: httpUrl(input.source_url || input.sourceUrl),
    source_payload: input.source_payload || input.sourcePayload || input.raw || input,
    name,
    category_primary: category,
    categories: categories.length ? categories : [category],
    address_line1: txt(input?.location?.address_line1 || input.address_line1 || input.addressLine1, 180),
    city,
    state,
    postal_code: postalCode,
    latitude,
    longitude,
    phone,
    website_url: websiteUrl,
    short_description: shortDescription,
    dedupe_key: txt(input.dedupe_key || input.dedupeKey, 420),
  };
  prepared.dedupe_key = prepared.dedupe_key || candidateDedupeKey(prepared);
  const scored = scoreCandidate(prepared);
  prepared.confidence_score = num(input.confidence_score || input.confidenceScore) ?? scored.score;
  prepared.confidence_reasons = arr(input.confidence_reasons || input.confidenceReasons || scored.reasons);
  const requestedStatus = txt(input.status, 24);
  const defaultStatus = prepared.confidence_score >= 70 && prepared.city && prepared.state && (prepared.phone || prepared.website_url) ? 'new' : 'needs_review';
  prepared.status = VALID_IMPORT_CANDIDATE_STATUS.has(requestedStatus) ? requestedStatus : defaultStatus;
  prepared.review_notes = txt(input.review_notes || input.reviewNotes, 1800);
  return prepared;
}

export async function upsertNetworkImportCandidate(input = {}, defaults = {}) {
  const c = prepareNetworkImportCandidate(input, defaults);
  const { rows } = await pool.query(
    `INSERT INTO network_import_candidates (source, source_record_id, source_url, source_payload, name, category_primary, categories, address_line1, city, state, postal_code, latitude, longitude, phone, website_url, short_description, dedupe_key, confidence_score, confidence_reasons, status, review_notes, updated_at)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
     ON CONFLICT (source, dedupe_key) DO UPDATE SET
       source_record_id = COALESCE(EXCLUDED.source_record_id, network_import_candidates.source_record_id),
       source_url = COALESCE(EXCLUDED.source_url, network_import_candidates.source_url),
       source_payload = EXCLUDED.source_payload,
       name = EXCLUDED.name,
       category_primary = EXCLUDED.category_primary,
       categories = EXCLUDED.categories,
       address_line1 = EXCLUDED.address_line1,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       postal_code = EXCLUDED.postal_code,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       phone = EXCLUDED.phone,
       website_url = EXCLUDED.website_url,
       short_description = COALESCE(EXCLUDED.short_description, network_import_candidates.short_description),
       confidence_score = EXCLUDED.confidence_score,
       confidence_reasons = EXCLUDED.confidence_reasons,
       status = CASE
         WHEN network_import_candidates.status IN ('rejected','promoted') THEN network_import_candidates.status
         ELSE EXCLUDED.status
       END,
       review_notes = COALESCE(network_import_candidates.review_notes, EXCLUDED.review_notes),
       updated_at = NOW()
     RETURNING ${IMPORT_CANDIDATE_BASE}`,
    [
      c.source,
      c.source_record_id,
      c.source_url,
      JSON.stringify(c.source_payload || {}),
      c.name,
      c.category_primary,
      c.categories,
      c.address_line1,
      c.city,
      c.state,
      c.postal_code,
      c.latitude,
      c.longitude,
      c.phone,
      c.website_url,
      c.short_description,
      c.dedupe_key,
      c.confidence_score,
      c.confidence_reasons,
      c.status,
      c.review_notes,
    ]
  );
  return mapImportCandidate(rows[0]);
}

export async function listNetworkImportCandidates(filters = {}) {
  const params = [];
  const where = [];
  const status = txt(filters.status, 24);
  if (status && status !== 'all') {
    if (!VALID_IMPORT_CANDIDATE_STATUS.has(status)) {
      const err = new Error('INVALID_IMPORT_CANDIDATE_STATUS');
      err.code = 'INVALID_IMPORT_CANDIDATE_STATUS';
      throw err;
    }
    params.push(status);
    where.push(`status = $${params.length}`);
  } else if (!status) {
    params.push('new');
    where.push(`status = $${params.length}`);
  }
  const source = txt(filters.source, 40)?.toLowerCase();
  if (source) {
    if (!VALID_IMPORT_SOURCES.has(source)) {
      const err = new Error('INVALID_IMPORT_SOURCE');
      err.code = 'INVALID_IMPORT_SOURCE';
      throw err;
    }
    params.push(source);
    where.push(`source = $${params.length}`);
  }
  const category = safeCategory(filters.category);
  if (category) {
    params.push(category);
    where.push(`category_primary = $${params.length}`);
  }
  const state = txt(filters.state, 16)?.toUpperCase();
  if (state) {
    params.push(state);
    where.push(`UPPER(state) = $${params.length}`);
  }
  const q = txt(filters.q, 120);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length} OR state ILIKE $${params.length} OR postal_code ILIKE $${params.length} OR source_record_id ILIKE $${params.length})`);
  }
  applyCandidateReadinessFilter(where, filters.readiness);
  const limit = Math.min(500, Math.max(1, Number(filters.limit) || 120));
  const offset = Math.max(0, Number(filters.offset) || 0);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit);
  const limI = params.length;
  params.push(offset);
  const offI = params.length;
  const [rowsRes, countRes] = await Promise.all([
    pool.query(`SELECT ${IMPORT_CANDIDATE_BASE} FROM network_import_candidates ${whereSql} ORDER BY confidence_score DESC, created_at DESC LIMIT $${limI} OFFSET $${offI}`, params),
    pool.query(`SELECT COUNT(*)::int AS total FROM network_import_candidates ${whereSql}`, params.slice(0, params.length - 2)),
  ]);
  return {
    total: countRes.rows[0]?.total || 0,
    limit,
    offset,
    items: rowsRes.rows.map(mapImportCandidate),
  };
}

export async function summarizeNetworkImportCandidates(filters = {}) {
  const params = [];
  const where = [];
  const status = txt(filters.status, 24);
  if (status && status !== 'all') {
    if (!VALID_IMPORT_CANDIDATE_STATUS.has(status)) {
      const err = new Error('INVALID_IMPORT_CANDIDATE_STATUS');
      err.code = 'INVALID_IMPORT_CANDIDATE_STATUS';
      throw err;
    }
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  const source = txt(filters.source, 40)?.toLowerCase();
  if (source) {
    if (!VALID_IMPORT_SOURCES.has(source)) {
      const err = new Error('INVALID_IMPORT_SOURCE');
      err.code = 'INVALID_IMPORT_SOURCE';
      throw err;
    }
    params.push(source);
    where.push(`source = $${params.length}`);
  }
  const category = safeCategory(filters.category);
  if (category) {
    params.push(category);
    where.push(`category_primary = $${params.length}`);
  }
  const state = txt(filters.state, 16)?.toUpperCase();
  if (state) {
    params.push(state);
    where.push(`UPPER(state) = $${params.length}`);
  }
  const q = txt(filters.q, 120);
  if (q) {
    params.push(`%${q}%`);
    where.push(`(name ILIKE $${params.length} OR city ILIKE $${params.length} OR state ILIKE $${params.length} OR postal_code ILIKE $${params.length} OR source_record_id ILIKE $${params.length})`);
  }
  applyCandidateReadinessFilter(where, filters.readiness);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const stateWhereSql = where.length ? `${whereSql} AND state IS NOT NULL` : 'WHERE state IS NOT NULL';
  const [totalsRes, statusRes, sourceRes, stateRes, categoryRes] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COALESCE(ROUND(AVG(confidence_score)::numeric, 1), 0)::float AS "averageConfidence",
         COUNT(*) FILTER (WHERE phone IS NOT NULL OR website_url IS NOT NULL)::int AS "withContact",
         COUNT(*) FILTER (WHERE phone IS NULL AND website_url IS NULL)::int AS "missingContact",
         COUNT(*) FILTER (WHERE city IS NOT NULL AND state IS NOT NULL)::int AS "withLocation",
         COUNT(*) FILTER (WHERE city IS NULL OR state IS NULL)::int AS "missingLocation",
         COUNT(*) FILTER (WHERE status IN ('new','approved') AND city IS NOT NULL AND state IS NOT NULL AND (phone IS NOT NULL OR website_url IS NOT NULL))::int AS promotable
       FROM network_import_candidates ${whereSql}`,
      params
    ),
    pool.query(`SELECT status::text AS key, COUNT(*)::int AS count FROM network_import_candidates ${whereSql} GROUP BY status ORDER BY status`, params),
    pool.query(`SELECT source AS key, COUNT(*)::int AS count FROM network_import_candidates ${whereSql} GROUP BY source ORDER BY count DESC, source ASC LIMIT 10`, params),
    pool.query(`SELECT state AS key, COUNT(*)::int AS count FROM network_import_candidates ${stateWhereSql} GROUP BY state ORDER BY count DESC, state ASC LIMIT 12`, params),
    pool.query(`SELECT category_primary::text AS key, COUNT(*)::int AS count FROM network_import_candidates ${whereSql} GROUP BY category_primary ORDER BY count DESC, category_primary ASC LIMIT 10`, params),
  ]);
  const group = (rows) => rows.map((r) => ({ key: r.key, count: Number(r.count || 0) })).filter((r) => r.key);
  return {
    total: totalsRes.rows[0]?.total || 0,
    average_confidence: Number(totalsRes.rows[0]?.averageConfidence || 0),
    readiness: {
      with_contact: totalsRes.rows[0]?.withContact || 0,
      missing_contact: totalsRes.rows[0]?.missingContact || 0,
      with_location: totalsRes.rows[0]?.withLocation || 0,
      missing_location: totalsRes.rows[0]?.missingLocation || 0,
      promotable: totalsRes.rows[0]?.promotable || 0,
    },
    by_status: group(statusRes.rows),
    by_source: group(sourceRes.rows),
    by_state: group(stateRes.rows),
    by_category: group(categoryRes.rows),
  };
}

export async function updateNetworkImportCandidateStatus(id, reviewerId, patch = {}) {
  const updates = [];
  const params = [id];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };
  if (patch.status !== undefined) {
    const status = txt(patch.status, 24);
    if (!VALID_IMPORT_CANDIDATE_STATUS.has(status)) {
      const err = new Error('INVALID_IMPORT_CANDIDATE_STATUS');
      err.code = 'INVALID_IMPORT_CANDIDATE_STATUS';
      throw err;
    }
    put('status', status);
  }
  if (patch.review_notes !== undefined) put('review_notes', txt(patch.review_notes, 1800));
  if (patch.phone !== undefined) put('phone', txt(patch.phone, 40));
  if (patch.website_url !== undefined || patch.websiteUrl !== undefined) put('website_url', httpUrl(patch.website_url || patch.websiteUrl));
  if (patch.short_description !== undefined || patch.shortDescription !== undefined) put('short_description', txt(patch.short_description || patch.shortDescription, 360));
  if (patch.category_primary !== undefined || patch.categoryPrimary !== undefined) {
    const category = safeCategory(patch.category_primary || patch.categoryPrimary);
    if (!category) {
      const err = new Error('INVALID_IMPORT_CATEGORY');
      err.code = 'INVALID_IMPORT_CATEGORY';
      throw err;
    }
    put('category_primary', category);
  }
  if (!updates.length) {
    const { rows } = await pool.query(`SELECT ${IMPORT_CANDIDATE_BASE} FROM network_import_candidates WHERE id = $1 LIMIT 1`, [id]);
    return mapImportCandidate(rows[0]);
  }
  put('reviewed_by_user_id', reviewerId || null);
  updates.push('reviewed_at = NOW()');
  updates.push('updated_at = NOW()');
  const { rows } = await pool.query(
    `UPDATE network_import_candidates
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING ${IMPORT_CANDIDATE_BASE}`,
    params
  );
  return mapImportCandidate(rows[0]);
}

export async function promoteNetworkImportCandidate(id, reviewerId, options = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT ${IMPORT_CANDIDATE_BASE} FROM network_import_candidates WHERE id = $1 FOR UPDATE`, [id]);
    const candidate = mapImportCandidate(found.rows[0]);
    if (!candidate) {
      await client.query('ROLLBACK');
      return null;
    }
    if (candidate.status === 'rejected' || candidate.status === 'promoted') {
      const err = new Error('IMPORT_CANDIDATE_NOT_PROMOTABLE');
      err.code = 'IMPORT_CANDIDATE_NOT_PROMOTABLE';
      throw err;
    }

    const city = txt(options.city || candidate.location.city, 120);
    const state = txt(options.state || candidate.location.state, 16)?.toUpperCase();
    const sourceLabel = importSourceLabel(candidate.source);
    const seed = {
      slug: txt(options.slug, 180) || slugify(`${candidate.name}-${city}-${state}`),
      name: txt(options.name, 160) || candidate.name,
      category_primary: safeCategory(options.category_primary || options.categoryPrimary || candidate.category_primary) || candidate.category_primary || 'other',
      categories: candidate.categories,
      location: {
        address_line1: txt(options.address_line1 || options.addressLine1 || candidate.location.address_line1, 180),
        city,
        state,
        postal_code: txt(options.postal_code || options.postalCode || candidate.location.postal_code, 20),
        lat: num(options.lat ?? candidate.location.lat),
        lng: num(options.lng ?? candidate.location.lng),
      },
      contact: {
        phone: txt(options.phone || candidate.contact.phone, 40),
        website_url: httpsUrl(options.website_url || options.websiteUrl || candidate.contact.website_url),
      },
      short_description: txt(options.short_description || options.shortDescription, 280)
        || (candidateSummaryIsInternal(candidate.short_description) ? candidatePublicSummary(candidate, city, state) : txt(candidate.short_description, 280)),
      description: txt(options.description, 7000)
        || `This public Network Listing was prepared from ${sourceLabel} source data. Owner claim, Pawket Partner verification, offers, lead routing, and CHARM support remain off until reviewed through Pawket Partners Ops.`,
      status: 'unclaimed',
      claim_status: 'pending',
      source_candidate_id: candidate.id,
    };

    const listingId = await upsertApprovedLaunchListingOnClient(client, seed);
    const updated = await client.query(
      `UPDATE network_import_candidates
       SET status = 'promoted',
           promoted_listing_id = $2,
           match_listing_id = $2,
           reviewed_by_user_id = $3,
           reviewed_at = NOW(),
           promoted_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${IMPORT_CANDIDATE_BASE}`,
      [candidate.id, listingId || null, reviewerId || null]
    );
    await client.query('COMMIT');
    return { candidate: mapImportCandidate(updated.rows[0]), listing: listingId ? await getInternalListingById(listingId) : null };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

function mapNomination(r) {
  if (!r) return null;
  return {
    id: r.id,
    provider_name: r.providerName,
    category_primary: r.categoryPrimary,
    city: r.city,
    state: r.state,
    postal_code: r.postalCode,
    contact: {
      website_url: r.websiteUrl,
      phone: r.phone,
    },
    nominator_email: r.nominatorEmail,
    note: r.note,
    status: r.status,
    source_path: r.sourcePath,
    review_notes: r.reviewNotes,
    reviewed_by_user_id: r.reviewedByUserId,
    reviewed_at: r.reviewedAt,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

const NOMINATION_BASE = `
  id,
  provider_name AS "providerName",
  category_primary AS "categoryPrimary",
  city,
  state,
  postal_code AS "postalCode",
  website_url AS "websiteUrl",
  phone,
  nominator_email AS "nominatorEmail",
  note,
  status,
  source_path AS "sourcePath",
  review_notes AS "reviewNotes",
  reviewed_by_user_id AS "reviewedByUserId",
  reviewed_at AS "reviewedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

export async function createNetworkNomination(input = {}) {
  const category = safeCategory(input.categoryPrimary || input.category_primary) || 'other';
  const { rows } = await pool.query(
    `INSERT INTO network_nominations (provider_name, category_primary, city, state, postal_code, website_url, phone, nominator_email, note, source_path, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     RETURNING ${NOMINATION_BASE}`,
    [
      txt(input.providerName || input.provider_name, 180),
      category,
      txt(input.city, 120),
      txt(input.state, 16)?.toUpperCase(),
      txt(input.postalCode || input.postal_code, 20),
      httpsUrl(input.websiteUrl || input.website_url),
      txt(input.phone, 40),
      txt(input.nominatorEmail || input.nominator_email, 240),
      txt(input.note, 1200),
      txt(input.sourcePath || input.source_path, 400),
    ]
  );
  return mapNomination(rows[0]);
}

export async function listNetworkNominations(filters = {}) {
  const status = txt(filters.status, 24) || 'pending';
  const safeStatus = VALID_NOMINATION_STATUS.has(status) ? status : 'pending';
  const limit = Math.min(250, Math.max(1, Number(filters.limit) || 120));
  const { rows } = await pool.query(
    `SELECT ${NOMINATION_BASE}
     FROM network_nominations
     WHERE status = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [safeStatus, limit]
  );
  return rows.map(mapNomination);
}

export async function updateNetworkNomination(id, reviewerId, patch = {}) {
  const updates = [];
  const params = [id];
  const put = (k, v) => { params.push(v); updates.push(`${k} = $${params.length}`); };
  if (patch.status !== undefined) {
    const status = txt(patch.status, 24);
    if (!VALID_NOMINATION_STATUS.has(status)) {
      const err = new Error('INVALID_NOMINATION_STATUS');
      err.code = 'INVALID_NOMINATION_STATUS';
      throw err;
    }
    put('status', status);
  }
  if (patch.review_notes !== undefined) put('review_notes', txt(patch.review_notes, 1800));
  if (!updates.length) {
    const { rows } = await pool.query(`SELECT ${NOMINATION_BASE} FROM network_nominations WHERE id = $1 LIMIT 1`, [id]);
    return mapNomination(rows[0]);
  }
  put('reviewed_by_user_id', reviewerId || null);
  updates.push('reviewed_at = NOW()');
  updates.push('updated_at = NOW()');
  const { rows } = await pool.query(
    `UPDATE network_nominations
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING ${NOMINATION_BASE}`,
    params
  );
  return mapNomination(rows[0]);
}

export async function createClaimRequest(input = {}) {
  const listing = await getInternalListingById(input.listingId);
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

export async function getClaimProofById(claimId) {
  const { rows } = await pool.query(
    `SELECT id, business_identity_doc_url AS "businessIdentityDocUrl", business_identity_doc_path AS "businessIdentityDocPath"
     FROM network_claim_requests
     WHERE id = $1
     LIMIT 1`,
    [claimId]
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
  if (!updates.length) return getInternalListingById(listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getInternalListingById(listingId);
}

function partnerGate(l) {
  return !!(l?.verification?.email_verified && l?.verification?.phone_verified && l?.verification?.business_identity_verified && l?.verification?.manual_review_passed);
}

export async function updateOpsListingTier(listingId, tier) {
  const listing = await getInternalListingById(listingId);
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
  return getInternalListingById(listingId);
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
  if (!updates.length) return getInternalListingById(listingId);
  updates.push('updated_at = NOW()');
  await pool.query(`UPDATE network_listings SET ${updates.join(', ')} WHERE id = $1`, params);
  return getInternalListingById(listingId);
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

async function replaceRowsOnClient(client, listingId, table, cols, rows) {
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
}

async function replaceSeedChildrenOnClient(client, listingId, seed = {}) {
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

  await replaceRowsOnClient(client, listingId, 'network_listing_media', ['url', 'alt'], mediaRows);
  await replaceRowsOnClient(client, listingId, 'network_listing_services', ['name', 'price_from', 'price_to', 'notes'], services);
  await replaceRowsOnClient(client, listingId, 'network_listing_faqs', ['question', 'answer'], faqs);
  await replaceRowsOnClient(client, listingId, 'network_listing_offers', ['title', 'code', 'details', 'expires_at', 'is_active'], offers);
}

export function prepareApprovedLaunchListing(seed = {}) {
  const slug = txt(seed.slug || seed.id, 180);
  if (!slug) throw seedError('LAUNCH_LISTING_SLUG_REQUIRED', 'Launch listing slug is required');
  if (PLACEHOLDER_SEED_SLUGS.has(slug)) {
    throw seedError('LAUNCH_LISTING_PLACEHOLDER', `Placeholder listing is not launch-approved: ${slug}`);
  }

  const name = txt(seed.name, 160);
  const category = safeCategory(seed.category_primary || seed.categoryPrimary);
  const city = txt(seed?.location?.city || seed.city, 120);
  const state = txt(seed?.location?.state || seed.state, 16)?.toUpperCase();
  const shortDescription = txt(seed.short_description || seed.shortDescription, 280);
  const phone = txt(seed?.contact?.phone || seed.phone, 40);
  const website = httpsUrl(seed?.contact?.website_url || seed.website_url || seed.websiteUrl);
  const host = lowerHost(seed?.contact?.website_url || seed.website_url || seed.websiteUrl);
  const status = txt(seed.status, 24);
  const tier = txt(seed.partner_tier || seed.partnerTier, 40);
  const claimStatus = txt(seed.claim_status || seed.claimStatus, 24);

  if (!name) throw seedError('LAUNCH_LISTING_NAME_REQUIRED', `Launch listing ${slug} needs a name`);
  if (!category) throw seedError('LAUNCH_LISTING_CATEGORY_REQUIRED', `Launch listing ${slug} needs a valid category`);
  if (!city || !state || !/^[A-Z]{2}$/.test(state)) {
    throw seedError('LAUNCH_LISTING_LOCATION_REQUIRED', `Launch listing ${slug} needs city and 2-letter state`);
  }
  if (!shortDescription) throw seedError('LAUNCH_LISTING_SUMMARY_REQUIRED', `Launch listing ${slug} needs a short description`);
  if (!phone && !website) throw seedError('LAUNCH_LISTING_CONTACT_REQUIRED', `Launch listing ${slug} needs a phone or https website`);
  if (host === 'example.com' || host.endsWith('.example.com') || host.endsWith('.test') || /\(555\)|\b555[\s).-]?|555[-.\s]/.test(phone || '')) {
    throw seedError('LAUNCH_LISTING_PLACEHOLDER_CONTACT', `Launch listing ${slug} still has placeholder contact data`);
  }
  if (status && status !== 'unclaimed') {
    throw seedError('LAUNCH_LISTING_UNAPPROVED_STATUS', `Launch listing ${slug} must import as unclaimed until claim review`);
  }
  if (tier) {
    throw seedError('LAUNCH_LISTING_UNAPPROVED_TIER', `Launch listing ${slug} cannot import with a partner tier`);
  }
  if (claimStatus && claimStatus !== 'pending') {
    throw seedError('LAUNCH_LISTING_UNAPPROVED_CLAIM', `Launch listing ${slug} cannot import with an approved claim`);
  }

  const charm = seed.charm_support || seed.charmSupport || {};
  if ((charm.enabled || seed.charm_enabled) && !(charm.reviewed === true || seed.charm_reviewed === true)) {
    throw seedError('LAUNCH_LISTING_CHARM_REVIEW_REQUIRED', `Launch listing ${slug} needs CHARM review before CHARM support can be public`);
  }

  const categories = arr(seed.categories || [category]).map((c) => c.toLowerCase()).filter((c) => VALID_CATEGORIES.has(c));
  return {
    ...seed,
    slug,
    id: slug,
    name,
    category_primary: category,
    categories: categories.length ? Array.from(new Set(categories)) : [category],
    location: {
      ...(seed.location || {}),
      city,
      state,
      postal_code: txt(seed?.location?.postal_code || seed.postal_code || seed.postalCode, 20),
    },
    contact: {
      ...(seed.contact || {}),
      phone,
      website_url: website,
    },
    short_description: shortDescription,
    status: 'unclaimed',
    partner_tier: null,
    partner_since: null,
    claim_status: 'pending',
    verification: {},
    manual_review_passed: false,
    features: {
      enable_lead_form: false,
      enable_offers: false,
      enable_priority_rank: false,
      enable_featured_slots: false,
    },
    lead_destination: 'email',
    lead_email: null,
    lead_webhook_url: null,
    charm_support: {
      enabled: !!(charm.enabled || seed.charm_enabled),
      program_type: txt(charm.program_type || seed.charm_program_type, 40),
      public_blurb: txt(charm.public_blurb || seed.charm_public_blurb, 360),
      receipt_url: httpsUrl(charm.receipt_url || seed.charm_receipt_url),
      match_cap_monthly: num(charm.match_cap_monthly ?? seed.charm_match_cap_monthly),
    },
    featured_rank: null,
  };
}

export async function upsertApprovedLaunchListing(seed = {}) {
  return upsertListingFromSeed(prepareApprovedLaunchListing(seed));
}

async function upsertApprovedLaunchListingOnClient(client, seed = {}) {
  return upsertListingFromSeedOnClient(client, prepareApprovedLaunchListing(seed));
}

async function upsertListingFromSeedOnClient(client, seed = {}) {
  const slug = txt(seed.slug || seed.id, 180);
  if (!slug) throw new Error('SEED_LISTING_SLUG_REQUIRED');

  const { rows } = await client.query(
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
  if (listingId) {
    await replaceSeedChildrenOnClient(client, listingId, seed);
    await client.query(`UPDATE network_listings SET updated_at = NOW() WHERE id = $1`, [listingId]);
  }
  return listingId || null;
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
  return getInternalListingById(listingId);
}

export async function closeNetworkDbPool() {
  await pool.end();
}

export { pool };
