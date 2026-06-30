// palDB.pg.js - Pawket Pal identity data access.
import crypto from 'crypto';
import pkg from 'pg';

const { Pool } = pkg;

function normalizeConnString(raw) {
  if (!raw) return raw;
  return raw.replace('@host:', '@localhost:');
}

const connectionString = normalizeConnString(process.env.DATABASE_URL);
const useSSL = process.env.PGSSLMODE === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({ connectionString, ssl: useSSL });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAL_CONSENT_REVIEW_STATUSES = new Set(['review_required', 'pending', 'granted', 'revoked']);
const STORY_SUBMISSION_TYPES = new Set(['adoption', 'rescue', 'memorial', 'milestone', 'care', 'community', 'other']);
const COMMUNITY_DRAFT_RELEASE_CHECKLIST = [
  'consentAuditPassed',
  'publicCopyReviewed',
  'privateStoryProtected',
  'moderationPassed',
  'artDirectionReady',
  'charmCherishReviewed',
  'finalReleaseApproved',
];

const COMMUNITY_DRAFT_RELEASE_LABELS = {
  consentAuditPassed: 'consent audit',
  publicCopyReviewed: 'public copy review',
  privateStoryProtected: 'private story protection',
  moderationPassed: 'moderation review',
  artDirectionReady: 'art direction readiness',
  charmCherishReviewed: 'CHARM/CHERISH claim review',
  finalReleaseApproved: 'final release approval',
};

const PAL_SELECT = `
  id,
  heartcode AS "heartCode",
  name,
  slug,
  pal_class AS "palClass",
  rarity_tier AS "rarityTier",
  privacy_state AS "privacyState",
  consent_state AS "consentState",
  release_state AS "releaseState",
  origin_type AS "originType",
  owner_user_id AS "ownerUserId",
  inspired_by_pet_id AS "inspiredByPetId",
  source_journal_entry_id AS "sourceJournalEntryId",
  origin_summary AS "originSummary",
  public_story_summary AS "publicStorySummary",
  internal_story_notes AS "internalStoryNotes",
  edition_name AS "editionName",
  edition_code AS "editionCode",
  edition_number AS "editionNumber",
  edition_size AS "editionSize",
  release_event AS "releaseEvent",
  charm_alignment AS "charmAlignment",
  cherish_alignment AS "cherishAlignment",
  charm_enabled AS "charmEnabled",
  cherish_enabled AS "cherishEnabled",
  traits,
  game_stats AS "gameStats",
  quest_history AS "questHistory",
  perks,
  transfer_locked AS "transferLocked",
  market_enabled AS "marketEnabled",
  market_notes AS "marketNotes",
  metadata,
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const PAL_REVIEW_SELECT = `
  c.id,
  c.pal_id AS "palId",
  c.user_id AS "userId",
  c.pet_id AS "petId",
  c.journal_entry_id AS "journalEntryId",
  c.status,
  c.allow_private_pal AS "allowPrivatePal",
  c.allow_public_story AS "allowPublicStory",
  c.allow_community_pal AS "allowCommunityPal",
  c.allow_charm_connection AS "allowCharmConnection",
  c.allow_cherish_connection AS "allowCherishConnection",
  c.allow_marketing_use AS "allowMarketingUse",
  c.allow_transfer AS "allowTransfer",
  c.consent_text AS "consentText",
  c.review_notes AS "reviewNotes",
  c.reviewed_by_user_id AS "reviewedByUserId",
  c.granted_at AS "grantedAt",
  c.revoked_at AS "revokedAt",
  c.created_at AS "createdAt",
  c.updated_at AS "updatedAt",
  p.heartcode AS "heartCode",
  p.name AS "palName",
  p.pal_class AS "palClass",
  p.rarity_tier AS "rarityTier",
  p.privacy_state AS "privacyState",
  p.consent_state AS "palConsentState",
  p.release_state AS "releaseState",
  p.origin_type AS "originType",
  p.origin_summary AS "originSummary",
  p.public_story_summary AS "publicStorySummary",
  p.internal_story_notes AS "internalStoryNotes",
  p.owner_user_id AS "ownerUserId",
  p.metadata,
  u.email AS "ownerEmail",
  u.first_name AS "ownerFirstName",
  u.last_name AS "ownerLastName",
  pet.name AS "petName",
  pet.species AS "petSpecies",
  pet.breed AS "petBreed",
  j.title AS "journalTitle",
  j.entry_type AS "journalEntryType",
  j.highlighted AS "journalHighlighted",
  j.visibility AS "journalVisibility",
  ru.email AS "reviewedByEmail"
`;

function httpError(statusCode, message, code = 'PAL_ERROR') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function httpErrorWithDetails(statusCode, message, code, details) {
  const err = httpError(statusCode, message, code);
  err.details = details;
  return err;
}

function cleanText(value, max = 1000) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, max) : null;
}

function hasOwn(input, key) {
  return Object.prototype.hasOwnProperty.call(asObject(input), key);
}

function cleanUuid(value, label, required = false) {
  const text = cleanText(value, 80);
  if (!text) {
    if (required) throw httpError(400, `${label} is required`, 'INVALID_ID');
    return null;
  }
  if (!UUID_RE.test(text)) throw httpError(400, `${label} must be a valid id`, 'INVALID_ID');
  return text;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(text)) return false;
  return fallback;
}

function reviewLimit(value, fallback = 80) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), 250);
}

function normalizeReviewStatus(value, fallback = 'review_required', allowAll = false) {
  const status = cleanText(value, 40) || fallback;
  if (allowAll && status === 'all') return 'all';
  if (!PAL_CONSENT_REVIEW_STATUSES.has(status)) {
    throw httpError(400, 'Invalid Pawket Pal review status', 'INVALID_REVIEW_STATUS');
  }
  return status;
}

function normalizeStorySubmissionType(value) {
  const type = cleanText(value, 40)?.toLowerCase().replace(/\s+/g, '_') || 'other';
  return STORY_SUBMISSION_TYPES.has(type) ? type : 'other';
}

function defaultCommunityDraftReleaseChecklist() {
  return Object.fromEntries(COMMUNITY_DRAFT_RELEASE_CHECKLIST.map((key) => [key, false]));
}

function normalizeCommunityDraftReleaseChecklist(input = {}, existing = {}) {
  const raw = asObject(input);
  const current = { ...defaultCommunityDraftReleaseChecklist(), ...asObject(existing) };
  COMMUNITY_DRAFT_RELEASE_CHECKLIST.forEach((key) => {
    if (hasOwn(raw, key)) current[key] = bool(raw[key], false);
  });
  return current;
}

function normalizeDraftWorkbenchTraits(input = {}, existing = {}, source = {}) {
  const raw = asObject(input);
  const existingTraits = asObject(existing);
  const current = {
    ...existingTraits,
    sourceStoryType: existingTraits.sourceStoryType || source?.metadata?.storySubmission?.storyType || null,
    draftStage: existingTraits.draftStage || 'internal_template',
  };
  [
    'primaryTrait',
    'secondaryTrait',
    'kindnessAffinity',
    'questAbility',
    'mood',
    'abilityNotes',
    'visualMood',
  ].forEach((key) => {
    if (hasOwn(raw, key)) current[key] = cleanText(raw[key], key === 'abilityNotes' ? 900 : 120);
  });
  Object.keys(raw).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(current, key)) return;
    const value = raw[key];
    current[key] = typeof value === 'string' ? cleanText(value, 500) : value;
  });
  return current;
}

function redactedCommunityPreview(row = {}) {
  const metadata = communityDraftMetadata(row);
  const releaseGate = asObject(metadata.releaseGate);
  const publicApproval = asObject(metadata.publicApproval);
  const publicPreviewApproved = row.privacyState === 'public'
    && row.releaseState === 'active'
    && publicApproval.status === 'public_preview_approved';
  const traits = asObject(row.traits);
  const sourceStoryType = metadata.sourceStoryType || traits.sourceStoryType || null;
  const storyTypeLabel = sourceStoryType
    ? `${String(sourceStoryType).replace(/_/g, ' ')} story`
    : 'reviewed story';
  return {
    heartCode: row.heartCode,
    name: row.name,
    palClass: 'community',
    previewState: publicPreviewApproved
      ? 'public_preview_approved'
      : releaseGate.status || 'release_review_ready',
    releaseState: row.releaseState,
    rarityTier: row.rarityTier || 'family',
    publicStorySummary: row.publicStorySummary,
    inspiredBy: `Consent-safe ${storyTypeLabel}`,
    traits: {
      primaryTrait: traits.primaryTrait || null,
      kindnessAffinity: traits.kindnessAffinity || null,
      questAbility: traits.questAbility || null,
      visualMood: traits.visualMood || null,
    },
    boundaries: {
      privateStoryRedacted: true,
      ownerRedacted: true,
      sourceHeartCodeRedacted: true,
      marketEnabled: false,
      transferLocked: true,
      publicPreviewApproved,
      publicSurfaceApproved: publicPreviewApproved,
      publicRelease: publicPreviewApproved,
      publicDrop: false,
      charmClaimEnabled: false,
      cherishClaimEnabled: false,
    },
    updatedAt: row.updatedAt,
  };
}

function redactedCommunityDetail(row = {}) {
  const preview = redactedCommunityPreview(row);
  const traits = asObject(preview.traits);
  const publicApproved = preview.previewState === 'public_preview_approved';
  return {
    ...preview,
    detailSections: {
      identity: {
        title: 'HeartCode identity',
        heartCode: preview.heartCode,
        palClass: 'Community Pal',
        rarityTier: preview.rarityTier,
        previewState: preview.previewState,
        publicStatus: publicApproved ? 'Approved public preview' : 'Preview unavailable',
      },
      story: {
        title: 'Story-safe summary',
        inspiredBy: preview.inspiredBy,
        summary: preview.publicStorySummary,
        privacyNote: 'The private source story, owner details, source HeartCode, and internal review notes are redacted from this public view.',
      },
      traits: [
        { label: 'Primary trait', value: traits.primaryTrait || 'Gentle' },
        { label: 'Kindness affinity', value: traits.kindnessAffinity || 'Care' },
        { label: 'Quest ability', value: traits.questAbility || 'Community support' },
        { label: 'Visual mood', value: traits.visualMood || 'Warm companion' },
      ],
      safeguards: [
        { label: 'Private story', value: 'Redacted' },
        { label: 'Owner account', value: 'Redacted' },
        { label: 'Source HeartCode', value: 'Redacted' },
        { label: 'Market and trading', value: 'Disabled' },
        { label: 'Transfers', value: 'Locked' },
        { label: 'Public drop', value: 'Not enabled' },
        { label: 'CHARM/CHERISH claims', value: 'Not enabled' },
      ],
      futureHooks: [
        {
          label: 'Heroic Quests',
          status: 'Planned',
          body: 'This Pal can later connect to reviewed community quests after quest rules and rewards are defined.',
        },
        {
          label: 'Share Studio',
          status: 'Planned',
          body: 'Approved public previews can later become share cards or badges without exposing private story material.',
        },
        {
          label: 'Pawket Haven',
          status: 'Future',
          body: 'The Pal identity is ready for future companion-world behavior once game rules and safeguards exist.',
        },
      ],
    },
  };
}

function normalizeHonoraryConsent(input = {}) {
  const raw = asObject(input);
  const allowPrivatePal = bool(raw.allow_private_pal ?? raw.allowPrivatePal, true);
  const allowPublicStory = bool(raw.allow_public_story ?? raw.allowPublicStory, false);
  const allowCommunityPal = bool(raw.allow_community_pal ?? raw.allowCommunityPal, false);
  const allowCharmConnection = bool(raw.allow_charm_connection ?? raw.allowCharmConnection, false);
  const allowCherishConnection = bool(raw.allow_cherish_connection ?? raw.allowCherishConnection, false);
  const allowMarketingUse = bool(raw.allow_marketing_use ?? raw.allowMarketingUse, false);
  const allowTransfer = bool(raw.allow_transfer ?? raw.allowTransfer, false);
  const reviewRequested = allowPublicStory
    || allowCommunityPal
    || allowCharmConnection
    || allowCherishConnection
    || allowMarketingUse
    || allowTransfer;

  return {
    status: reviewRequested ? 'review_required' : 'granted',
    allowPrivatePal,
    allowPublicStory,
    allowCommunityPal,
    allowCharmConnection,
    allowCherishConnection,
    allowMarketingUse,
    allowTransfer,
    consentText: cleanText(raw.consent_text ?? raw.consentText, 2000)
      || 'Private Honorary Pawket Pal created by the account owner. No public story, community character, marketing, transfer, CHARM, or CHERISH rights are granted unless separately reviewed.',
  };
}

function generatePalHeartCode(palClass = 'honorary') {
  const classCode = {
    honorary: 'HON',
    community: 'COM',
    limited_edition: 'LTD',
    one_of_one: 'ONE',
  }[palClass] || 'PAL';
  const year = new Date().getUTCFullYear();
  const random = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `PAL-${classCode}-${year}-${random}`;
}

function normalizePalHeartCode(value, label = 'heartCode', required = false) {
  const text = cleanText(value, 120)?.toUpperCase();
  if (!text) {
    if (required) throw httpError(400, `${label} is required`, 'HEARTCODE_REQUIRED');
    return null;
  }
  if (!/^PAL-[A-Z0-9][A-Z0-9-]{6,}$/.test(text)) {
    throw httpError(400, `${label} must be a valid Pawket Pal HeartCode`, 'INVALID_HEARTCODE');
  }
  return text;
}

async function assertOwnedPet(client, petId, ownerUserId) {
  if (!petId) return null;
  const result = await client.query(
    `SELECT id FROM pets WHERE id = $1 AND user_id = $2 LIMIT 1;`,
    [petId, ownerUserId]
  );
  if (!result.rows[0]) throw httpError(404, 'Pet profile was not found for this account', 'PET_NOT_FOUND');
  return result.rows[0];
}

async function assertOwnedJournalEntry(client, journalEntryId, ownerUserId, petId = null) {
  if (!journalEntryId) return null;
  const result = await client.query(
    `SELECT id, pet_id AS "petId"
       FROM pet_journal
      WHERE id = $1 AND user_id = $2
      LIMIT 1;`,
    [journalEntryId, ownerUserId]
  );
  const row = result.rows[0];
  if (!row) throw httpError(404, 'Journal entry was not found for this account', 'JOURNAL_NOT_FOUND');
  if (petId && row.petId !== petId) {
    throw httpError(400, 'Journal entry must belong to the selected pet profile', 'JOURNAL_PET_MISMATCH');
  }
  return row;
}

export async function listPawketPalsForUser(ownerUserId, options = {}) {
  const userId = cleanUuid(ownerUserId, 'ownerUserId', true);
  const limit = Number.isInteger(Number(options.limit))
    ? Math.min(Math.max(Number(options.limit), 1), 48)
    : 24;
  const result = await pool.query(
    `SELECT ${PAL_SELECT}
       FROM pawket_pals
      WHERE owner_user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2;`,
    [userId, limit]
  );
  return result.rows;
}

export async function getPawketPalForUser(identifier, ownerUserId) {
  const userId = cleanUuid(ownerUserId, 'ownerUserId', true);
  const lookup = cleanText(identifier, 120);
  if (!lookup) throw httpError(400, 'Pawket Pal id or HeartCode is required', 'PAL_LOOKUP_REQUIRED');

  const result = await pool.query(
    `SELECT ${PAL_SELECT}
       FROM pawket_pals
      WHERE owner_user_id = $1
        AND (id::text = $2 OR heartcode = UPPER($2))
      LIMIT 1;`,
    [userId, lookup]
  );
  return result.rows[0] || null;
}

export async function createHonoraryPawketPal(input = {}) {
  const ownerUserId = cleanUuid(input.ownerUserId ?? input.owner_user_id, 'ownerUserId', true);
  const name = cleanText(input.name, 120);
  if (!name) throw httpError(400, 'name is required', 'NAME_REQUIRED');

  const petId = cleanUuid(input.petId ?? input.pet_id ?? input.inspiredByPetId ?? input.inspired_by_pet_id, 'petId');
  const journalEntryId = cleanUuid(
    input.journalEntryId ?? input.journal_entry_id ?? input.sourceJournalEntryId ?? input.source_journal_entry_id,
    'journalEntryId'
  );
  const consent = normalizeHonoraryConsent(input.consent);
  const publicStorySummary = cleanText(input.publicStorySummary ?? input.public_story_summary, 1200);
  const publicUseRequested = consent.allowPublicStory || consent.allowCommunityPal;

  if (publicStorySummary && !publicUseRequested) {
    throw httpError(
      400,
      'publicStorySummary requires public story or community Pal consent for review',
      'PUBLIC_STORY_CONSENT_REQUIRED'
    );
  }

  const originSummary = cleanText(input.originSummary ?? input.origin_summary, 2000);
  const internalStoryNotes = cleanText(input.internalStoryNotes ?? input.internal_story_notes, 2000);
  const traits = asObject(input.traits);
  const rawMetadata = asObject(input.metadata);
  const metadata = {
    ...rawMetadata,
    createdVia: cleanText(input.createdVia ?? rawMetadata.createdVia, 80) || 'api:pals:honorary',
  };
  const requestedOriginType = cleanText(input.originType ?? input.origin_type, 40);
  const originType = requestedOriginType === 'story_submission'
    ? 'story_submission'
    : journalEntryId ? 'journal_entry' : petId ? 'pet_profile' : 'manual';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assertOwnedPet(client, petId, ownerUserId);
    await assertOwnedJournalEntry(client, journalEntryId, ownerUserId, petId);

    let pal = null;
    for (let attempt = 0; attempt < 5 && !pal; attempt += 1) {
      const heartCode = generatePalHeartCode('honorary');
      const inserted = await client.query(
        `INSERT INTO pawket_pals (
          heartcode,
          name,
          pal_class,
          privacy_state,
          consent_state,
          release_state,
          origin_type,
          owner_user_id,
          inspired_by_pet_id,
          source_journal_entry_id,
          origin_summary,
          public_story_summary,
          internal_story_notes,
          traits,
          metadata
        )
        VALUES (
          $1, $2, 'honorary', 'private', $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb
        )
        ON CONFLICT (heartcode) DO NOTHING
        RETURNING ${PAL_SELECT};`,
        [
          heartCode,
          name,
          consent.status,
          originType,
          ownerUserId,
          petId,
          journalEntryId,
          originSummary,
          publicStorySummary,
          internalStoryNotes,
          JSON.stringify(traits),
          JSON.stringify(metadata),
        ]
      );
      pal = inserted.rows[0] || null;
    }

    if (!pal) throw httpError(500, 'Could not allocate a unique HeartCode', 'HEARTCODE_ALLOC_FAILED');

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        to_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'issued', $3, $3, $4, $5::jsonb);`,
      [
        pal.id,
        pal.heartCode,
        ownerUserId,
        'Honorary Pawket Pal HeartCode issued as a private account record.',
        JSON.stringify({ palClass: 'honorary', privacyState: 'private' }),
      ]
    );

    await client.query(
      `INSERT INTO pawket_pal_story_consents (
        pal_id,
        user_id,
        pet_id,
        journal_entry_id,
        status,
        allow_private_pal,
        allow_public_story,
        allow_community_pal,
        allow_charm_connection,
        allow_cherish_connection,
        allow_marketing_use,
        allow_transfer,
        consent_text,
        granted_at
      )
      VALUES (
        $1, $2, $3, $4, $5::pawket_pal_consent_state, $6, $7, $8, $9, $10, $11, $12, $13,
        CASE WHEN $5::pawket_pal_consent_state = 'granted'::pawket_pal_consent_state THEN NOW() ELSE NULL END
      );`,
      [
        pal.id,
        ownerUserId,
        petId,
        journalEntryId,
        consent.status,
        consent.allowPrivatePal,
        consent.allowPublicStory,
        consent.allowCommunityPal,
        consent.allowCharmConnection,
        consent.allowCherishConnection,
        consent.allowMarketingUse,
        consent.allowTransfer,
        consent.consentText,
      ]
    );

    await client.query('COMMIT');
    return pal;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function createPawketPalStorySubmission(input = {}) {
  const ownerUserId = cleanUuid(input.ownerUserId ?? input.owner_user_id, 'ownerUserId', true);
  const storyTitle = cleanText(input.storyTitle ?? input.story_title ?? input.title, 140);
  if (!storyTitle) throw httpError(400, 'storyTitle is required', 'STORY_TITLE_REQUIRED');

  const storyText = cleanText(input.storyText ?? input.story_text ?? input.internalStoryNotes, 5000);
  if (!storyText || storyText.length < 20) {
    throw httpError(400, 'storyText must be at least 20 characters', 'STORY_TEXT_REQUIRED');
  }

  const publicStorySummary = cleanText(input.publicStorySummary ?? input.public_story_summary, 1200);
  if (!publicStorySummary || publicStorySummary.length < 20) {
    throw httpError(400, 'publicStorySummary must be at least 20 characters', 'PUBLIC_SUMMARY_REQUIRED');
  }

  const rawConsent = asObject(input.consent);
  const allowPublicStory = bool(rawConsent.allow_public_story ?? rawConsent.allowPublicStory, false);
  const allowCommunityPal = bool(rawConsent.allow_community_pal ?? rawConsent.allowCommunityPal, false);
  if (!allowPublicStory && !allowCommunityPal) {
    throw httpError(400, 'Story submissions require public story or Community Pal review consent', 'STORY_REVIEW_CONSENT_REQUIRED');
  }

  const storyType = normalizeStorySubmissionType(input.storyType ?? input.story_type);
  const palName = cleanText(input.name ?? input.palName ?? input.pal_name, 120) || `${storyTitle} Pal`;
  const originSummary = cleanText(input.originSummary ?? input.origin_summary, 2000)
    || `Story submission: ${storyTitle}. Type: ${storyType.replace(/_/g, ' ')}. Submitted for consent-safe Pawket Pal review.`;
  const consentText = cleanText(rawConsent.consent_text ?? rawConsent.consentText, 2000)
    || 'Story submitted by the signed-in account owner for Pawket Pal review. Public story, Community Pal, CHARM, CHERISH, marketing, or transfer use remains blocked unless reviewed and granted by ops.';

  return createHonoraryPawketPal({
    ownerUserId,
    name: palName,
    petId: input.petId ?? input.pet_id,
    journalEntryId: input.journalEntryId ?? input.journal_entry_id,
    originType: 'story_submission',
    originSummary,
    publicStorySummary,
    internalStoryNotes: storyText,
    createdVia: 'api:pals:story-submission',
    metadata: {
      ...asObject(input.metadata),
      storySubmission: {
        title: storyTitle,
        storyType,
        submittedAt: new Date().toISOString(),
      },
    },
    consent: {
      allowPrivatePal: true,
      allowPublicStory,
      allowCommunityPal,
      allowCharmConnection: bool(rawConsent.allow_charm_connection ?? rawConsent.allowCharmConnection, false),
      allowCherishConnection: bool(rawConsent.allow_cherish_connection ?? rawConsent.allowCherishConnection, false),
      allowMarketingUse: bool(rawConsent.allow_marketing_use ?? rawConsent.allowMarketingUse, false),
      allowTransfer: bool(rawConsent.allow_transfer ?? rawConsent.allowTransfer, false),
      consentText,
    },
  });
}

export async function listPawketPalReviewQueue(options = {}) {
  const status = normalizeReviewStatus(options.status, 'review_required', true);
  const limit = reviewLimit(options.limit, 80);
  const params = [limit];
  const where = [];
  if (status !== 'all') {
    params.push(status);
    where.push(`c.status = $${params.length}::pawket_pal_consent_state`);
  }

  const result = await pool.query(
    `SELECT ${PAL_REVIEW_SELECT}
       FROM pawket_pal_story_consents c
       INNER JOIN pawket_pals p ON p.id = c.pal_id
       LEFT JOIN users u ON u.id = COALESCE(c.user_id, p.owner_user_id)
       LEFT JOIN users ru ON ru.id = c.reviewed_by_user_id
       LEFT JOIN pets pet ON pet.id = c.pet_id
       LEFT JOIN pet_journal j ON j.id = c.journal_entry_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY
        CASE c.status
          WHEN 'review_required'::pawket_pal_consent_state THEN 0
          WHEN 'pending'::pawket_pal_consent_state THEN 1
          WHEN 'granted'::pawket_pal_consent_state THEN 2
          ELSE 3
        END,
        c.created_at DESC,
        c.id DESC
      LIMIT $1;`,
    params
  );
  return result.rows;
}

export async function summarizePawketPalReviewQueue() {
  const result = await pool.query(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'review_required'::pawket_pal_consent_state)::int AS review_required,
        COUNT(*) FILTER (WHERE status = 'pending'::pawket_pal_consent_state)::int AS pending,
        COUNT(*) FILTER (WHERE status = 'granted'::pawket_pal_consent_state)::int AS granted,
        COUNT(*) FILTER (WHERE status = 'revoked'::pawket_pal_consent_state)::int AS revoked,
        COUNT(*) FILTER (WHERE allow_public_story IS TRUE)::int AS public_story_requested,
        COUNT(*) FILTER (WHERE allow_community_pal IS TRUE)::int AS community_pal_requested,
        COUNT(*) FILTER (WHERE allow_charm_connection IS TRUE)::int AS charm_requested,
        COUNT(*) FILTER (WHERE allow_cherish_connection IS TRUE)::int AS cherish_requested,
        COUNT(*) FILTER (WHERE allow_marketing_use IS TRUE)::int AS marketing_requested,
        COUNT(*) FILTER (WHERE allow_transfer IS TRUE)::int AS transfer_requested
       FROM pawket_pal_story_consents;`
  );
  const row = result.rows[0] || {};
  return {
    total: Number(row.total || 0),
    byStatus: [
      { key: 'review_required', count: Number(row.review_required || 0) },
      { key: 'pending', count: Number(row.pending || 0) },
      { key: 'granted', count: Number(row.granted || 0) },
      { key: 'revoked', count: Number(row.revoked || 0) },
    ],
    requestedRights: {
      publicStory: Number(row.public_story_requested || 0),
      communityPal: Number(row.community_pal_requested || 0),
      charm: Number(row.charm_requested || 0),
      cherish: Number(row.cherish_requested || 0),
      marketing: Number(row.marketing_requested || 0),
      transfer: Number(row.transfer_requested || 0),
    },
  };
}

export async function updatePawketPalReviewStatus(consentId, reviewerUserId, patch = {}) {
  const id = cleanUuid(consentId, 'consentId', true);
  const reviewerId = cleanUuid(reviewerUserId, 'reviewerUserId', true);
  const hasStatus = patch.status !== undefined && patch.status !== null && String(patch.status).trim() !== '';
  const nextStatus = hasStatus ? normalizeReviewStatus(patch.status, 'review_required', false) : null;
  const hasNotes = patch.reviewNotes !== undefined || patch.review_notes !== undefined;
  const reviewNotes = hasNotes ? cleanText(patch.reviewNotes ?? patch.review_notes, 2000) : undefined;

  if (!hasStatus && !hasNotes) {
    throw httpError(400, 'status or reviewNotes is required', 'REVIEW_PATCH_REQUIRED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT c.id, c.pal_id AS "palId", c.status, p.heartcode AS "heartCode"
         FROM pawket_pal_story_consents c
         INNER JOIN pawket_pals p ON p.id = c.pal_id
        WHERE c.id = $1
        FOR UPDATE;`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    const status = nextStatus || current.status;
    const params = [
      id,
      status,
      reviewerId,
      reviewNotes,
      hasNotes,
    ];
    await client.query(
      `UPDATE pawket_pal_story_consents
          SET status = $2::pawket_pal_consent_state,
              reviewed_by_user_id = $3,
              review_notes = CASE WHEN $5 THEN $4 ELSE review_notes END,
              granted_at = CASE WHEN $2::pawket_pal_consent_state = 'granted'::pawket_pal_consent_state THEN COALESCE(granted_at, NOW()) ELSE NULL END,
              revoked_at = CASE WHEN $2::pawket_pal_consent_state = 'revoked'::pawket_pal_consent_state THEN COALESCE(revoked_at, NOW()) ELSE NULL END,
              updated_at = NOW()
        WHERE id = $1;`,
      params
    );

    await client.query(
      `UPDATE pawket_pals
          SET consent_state = $2::pawket_pal_consent_state,
              updated_at = NOW()
        WHERE id = $1;`,
      [current.palId, status]
    );

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'consent_updated', $3, $4, $5::jsonb);`,
      [
        current.palId,
        current.heartCode,
        reviewerId,
        `Pawket Pal consent review updated to ${status}.`,
        JSON.stringify({
          consentId: id,
          previousStatus: current.status,
          nextStatus: status,
          publicReleaseChanged: false,
        }),
      ]
    );

    const updated = await client.query(
      `SELECT ${PAL_REVIEW_SELECT}
         FROM pawket_pal_story_consents c
         INNER JOIN pawket_pals p ON p.id = c.pal_id
         LEFT JOIN users u ON u.id = COALESCE(c.user_id, p.owner_user_id)
         LEFT JOIN users ru ON ru.id = c.reviewed_by_user_id
         LEFT JOIN pets pet ON pet.id = c.pet_id
         LEFT JOIN pet_journal j ON j.id = c.journal_entry_id
        WHERE c.id = $1
        LIMIT 1;`,
      [id]
    );

    await client.query('COMMIT');
    return updated.rows[0] || null;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

function normalizeDraftTraits(input = {}, source = {}) {
  return normalizeDraftWorkbenchTraits(input, {}, source);
}

export async function listCommunityPawketPalDrafts(options = {}) {
  const limit = reviewLimit(options.limit, 40);
  const result = await pool.query(
    `SELECT ${PAL_SELECT},
            metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
            metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
            metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
            metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId"
       FROM pawket_pals
      WHERE pal_class = 'community'
        AND (
          (privacy_state = 'private' AND release_state IN ('draft', 'review'))
          OR (
            privacy_state = 'public'
            AND release_state = 'active'
            AND metadata->'communityDraft'->'publicApproval'->>'status' = 'public_preview_approved'
          )
          OR (
            release_state = 'archived'
            AND metadata->'communityDraft'->'publicArchive'->>'status' = 'public_preview_archived'
          )
        )
      ORDER BY created_at DESC, id DESC
      LIMIT $1;`,
    [limit]
  );
  return result.rows;
}

export async function listPublicCommunityPawketPalPreviews(options = {}) {
  const limit = reviewLimit(options.limit, 12);
  const result = await pool.query(
    `SELECT ${PAL_SELECT}
       FROM pawket_pals
      WHERE pal_class = 'community'
        AND market_enabled IS FALSE
        AND transfer_locked IS TRUE
        AND (
          (
            privacy_state = 'private'
            AND release_state = 'review'
            AND metadata->'communityDraft'->'releaseGate'->>'status' = 'release_review_ready'
          )
          OR (
            privacy_state = 'public'
            AND release_state = 'active'
            AND metadata->'communityDraft'->'publicApproval'->>'status' = 'public_preview_approved'
          )
        )
      ORDER BY updated_at DESC, created_at DESC, id DESC
      LIMIT $1;`,
    [limit]
  );
  return result.rows.map(redactedCommunityPreview);
}

export async function getPublicCommunityPawketPalPreviewByHeartCode(heartCode) {
  const code = normalizePalHeartCode(heartCode, 'heartCode', true);
  const result = await pool.query(
    `SELECT ${PAL_SELECT}
       FROM pawket_pals
      WHERE heartcode = $1
        AND pal_class = 'community'
        AND privacy_state = 'public'
        AND release_state = 'active'
        AND market_enabled IS FALSE
        AND transfer_locked IS TRUE
        AND metadata->'communityDraft'->'publicApproval'->>'status' = 'public_preview_approved'
      LIMIT 1;`,
    [code]
  );
  return result.rows[0] ? redactedCommunityDetail(result.rows[0]) : null;
}

export async function createCommunityPawketPalDraft(input = {}) {
  const consentId = cleanUuid(input.consentId ?? input.consent_id, 'consentId', true);
  const actorUserId = cleanUuid(input.actorUserId ?? input.actor_user_id, 'actorUserId', true);
  const requestedName = cleanText(input.name ?? input.draftName ?? input.draft_name, 120);
  const requestedSummary = cleanText(input.characterSummary ?? input.character_summary ?? input.publicStorySummary, 1600);
  const draftNotes = cleanText(input.draftNotes ?? input.draft_notes, 2000);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      `SELECT ${PAL_SELECT},
              metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
              metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
              metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
              metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId"
         FROM pawket_pals
        WHERE pal_class = 'community'
          AND metadata->'communityDraft'->>'sourceConsentId' = $1
        ORDER BY created_at DESC, id DESC
        LIMIT 1;`,
      [consentId]
    );
    if (existing.rows[0]) {
      await client.query('COMMIT');
      return existing.rows[0];
    }

    const sourceResult = await client.query(
      `SELECT c.id AS "consentId",
              c.status,
              c.allow_public_story AS "allowPublicStory",
              c.allow_community_pal AS "allowCommunityPal",
              c.allow_charm_connection AS "allowCharmConnection",
              c.allow_cherish_connection AS "allowCherishConnection",
              p.id AS "sourcePalId",
              p.heartcode AS "sourceHeartCode",
              p.name AS "sourceName",
              p.origin_type AS "sourceOriginType",
              p.origin_summary AS "originSummary",
              p.public_story_summary AS "publicStorySummary",
              p.internal_story_notes AS "internalStoryNotes",
              p.metadata
         FROM pawket_pal_story_consents c
         INNER JOIN pawket_pals p ON p.id = c.pal_id
        WHERE c.id = $1
        FOR UPDATE OF c, p;`,
      [consentId]
    );
    const source = sourceResult.rows[0];
    if (!source) {
      await client.query('ROLLBACK');
      return null;
    }
    if (source.status !== 'granted') {
      throw httpError(409, 'Community Pal drafts require granted story review consent', 'COMMUNITY_DRAFT_REVIEW_REQUIRED');
    }
    if (!source.allowCommunityPal) {
      throw httpError(409, 'Community Pal draft rights were not granted for this story', 'COMMUNITY_DRAFT_RIGHTS_REQUIRED');
    }

    const sourceStory = asObject(source.metadata)?.storySubmission || {};
    const draftName = requestedName || `${sourceStory.title || source.sourceName} Community Pal`;
    const characterSummary = requestedSummary
      || source.publicStorySummary
      || source.originSummary
      || `Community Pal draft adapted from ${source.sourceHeartCode}.`;
    const metadata = {
      communityDraft: {
        sourceConsentId: consentId,
        sourcePalId: source.sourcePalId,
        sourceHeartCode: source.sourceHeartCode,
        sourceOriginType: source.sourceOriginType,
        sourceStoryTitle: sourceStory.title || null,
        sourceStoryType: sourceStory.storyType || null,
        artDirectionNotes: null,
        releaseChecklist: defaultCommunityDraftReleaseChecklist(),
        releaseGate: {
          status: 'drafting',
          publicReleaseChanged: false,
        },
        createdByUserId: actorUserId,
        createdVia: 'api:pals:ops:community-drafts',
        publicReleaseChanged: false,
      },
    };
    const traits = normalizeDraftTraits(input.traits, source);

    let draft = null;
    for (let attempt = 0; attempt < 5 && !draft; attempt += 1) {
      const heartCode = generatePalHeartCode('community');
      const inserted = await client.query(
        `INSERT INTO pawket_pals (
          heartcode,
          name,
          pal_class,
          rarity_tier,
          privacy_state,
          consent_state,
          release_state,
          origin_type,
          origin_summary,
          public_story_summary,
          internal_story_notes,
          charm_alignment,
          cherish_alignment,
          charm_enabled,
          cherish_enabled,
          traits,
          transfer_locked,
          market_enabled,
          metadata
        )
        VALUES (
          $1, $2, 'community', 'family', 'private', 'granted', 'draft', 'story_submission',
          $3, $4, $5, $6, $7, FALSE, FALSE, $8::jsonb, TRUE, FALSE, $9::jsonb
        )
        ON CONFLICT (heartcode) DO NOTHING
        RETURNING ${PAL_SELECT},
          metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
          metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
          metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
          metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId";`,
        [
          heartCode,
          draftName,
          `Internal Community Pal draft adapted from reviewed source HeartCode ${source.sourceHeartCode}.`,
          characterSummary,
          draftNotes || `Source private story remains internal. Source HeartCode: ${source.sourceHeartCode}.`,
          source.allowCharmConnection ? 'reviewed_source_requested' : null,
          source.allowCherishConnection ? 'reviewed_source_requested' : null,
          JSON.stringify(traits),
          JSON.stringify(metadata),
        ]
      );
      draft = inserted.rows[0] || null;
    }

    if (!draft) throw httpError(500, 'Could not allocate a unique Community Pal HeartCode', 'HEARTCODE_ALLOC_FAILED');

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'issued', $3, $4, $5::jsonb);`,
      [
        draft.id,
        draft.heartCode,
        actorUserId,
        'Internal Community Pawket Pal draft HeartCode issued. No public release was made.',
        JSON.stringify({
          palClass: 'community',
          privacyState: 'private',
          releaseState: 'draft',
          sourceConsentId: consentId,
          sourceHeartCode: source.sourceHeartCode,
          publicReleaseChanged: false,
        }),
      ]
    );

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'updated', $3, $4, $5::jsonb);`,
      [
        source.sourcePalId,
        source.sourceHeartCode,
        actorUserId,
        `Community Pal draft created: ${draft.heartCode}.`,
        JSON.stringify({
          sourceConsentId: consentId,
          communityDraftPalId: draft.id,
          communityDraftHeartCode: draft.heartCode,
          publicReleaseChanged: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return draft;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

function communityDraftMetadata(draft = {}) {
  return asObject(asObject(draft.metadata).communityDraft);
}

function hasMinText(value, min = 20) {
  return String(value || '').trim().replace(/\s+/g, ' ').length >= min;
}

function communityDraftReleaseGateMissingItems(draft = {}) {
  const metadata = communityDraftMetadata(draft);
  const checklist = normalizeCommunityDraftReleaseChecklist(metadata.releaseChecklist);
  const traits = asObject(draft.traits);
  const missing = [];

  if (!hasMinText(draft.name, 3)) missing.push('draft name');
  if (!hasMinText(draft.publicStorySummary, 20)) missing.push('public-safe character summary');
  if (!hasMinText(metadata.artDirectionNotes, 20)) missing.push('visual/art direction notes');
  if (!hasMinText(traits.primaryTrait, 3)) missing.push('primary personality trait');
  COMMUNITY_DRAFT_RELEASE_CHECKLIST.forEach((key) => {
    if (!checklist[key]) missing.push(COMMUNITY_DRAFT_RELEASE_LABELS[key] || key);
  });
  if (!metadata.sourceConsentId || !metadata.sourcePalId || !metadata.sourceHeartCode) {
    missing.push('source consent and HeartCode link');
  }
  if (draft.privacyState !== 'private') missing.push('private draft state');
  if (!['draft', 'review'].includes(draft.releaseState)) missing.push('draft or review release state');
  if (draft.marketEnabled !== false) missing.push('market disabled');
  if (draft.transferLocked !== true) missing.push('transfer locked');
  return missing;
}

function communityDraftPublicApprovalMissingItems(draft = {}) {
  const metadata = communityDraftMetadata(draft);
  const releaseGate = asObject(metadata.releaseGate);
  const missing = communityDraftReleaseGateMissingItems(draft);
  if (draft.privacyState !== 'private') missing.push('private review state before public approval');
  if (draft.releaseState !== 'review') missing.push('internal release review state');
  if (releaseGate.status !== 'release_review_ready') missing.push('release gate ready status');
  if (draft.charmEnabled === true || draft.cherishEnabled === true) {
    missing.push('no public CHARM/CHERISH claims');
  }
  return [...new Set(missing)];
}

function publicPreviewApprovalConfirmationMissing(input = {}) {
  const raw = asObject(input);
  const confirmations = [
    ['confirmPublicPreviewReady', 'public preview readiness confirmation'],
    ['confirmPrivateStoryRedacted', 'private story redaction confirmation'],
    ['confirmNoMarketOrTrading', 'market and trading disabled confirmation'],
    ['confirmNoCharmCherishClaims', 'CHARM/CHERISH claim disabled confirmation'],
  ];
  return confirmations
    .filter(([camel]) => !bool(raw[camel] ?? raw[camel.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)], false))
    .map(([, label]) => label);
}

export async function updateCommunityPawketPalDraft(draftId, actorUserId, input = {}) {
  const id = cleanUuid(draftId, 'draftId', true);
  const reviewerId = cleanUuid(actorUserId, 'actorUserId', true);
  const raw = asObject(input);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT ${PAL_SELECT}
         FROM pawket_pals
        WHERE id = $1
          AND pal_class = 'community'
        FOR UPDATE;`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }
    if (!['draft', 'review'].includes(current.releaseState)) {
      throw httpError(409, 'Only draft or release-review Community Pals can be edited in this workbench', 'COMMUNITY_DRAFT_LOCKED');
    }

    const metadata = asObject(current.metadata);
    const communityDraft = {
      ...communityDraftMetadata(current),
      updatedByUserId: reviewerId,
      updatedAt: new Date().toISOString(),
      publicReleaseChanged: false,
    };

    if (hasOwn(raw, 'artDirectionNotes') || hasOwn(raw, 'art_direction_notes')) {
      communityDraft.artDirectionNotes = cleanText(raw.artDirectionNotes ?? raw.art_direction_notes, 2400);
    }
    if (hasOwn(raw, 'releaseChecklist') || hasOwn(raw, 'release_checklist')) {
      communityDraft.releaseChecklist = normalizeCommunityDraftReleaseChecklist(
        raw.releaseChecklist ?? raw.release_checklist,
        communityDraft.releaseChecklist
      );
    } else {
      communityDraft.releaseChecklist = normalizeCommunityDraftReleaseChecklist({}, communityDraft.releaseChecklist);
    }
    if (hasOwn(raw, 'releaseGateNotes') || hasOwn(raw, 'release_gate_notes')) {
      communityDraft.releaseGateNotes = cleanText(raw.releaseGateNotes ?? raw.release_gate_notes, 1600);
    }

    const nextName = hasOwn(raw, 'name') ? cleanText(raw.name, 120) : current.name;
    if (!nextName) throw httpError(400, 'Community Pal draft name is required', 'COMMUNITY_DRAFT_NAME_REQUIRED');

    const summaryInput = raw.characterSummary ?? raw.character_summary ?? raw.publicStorySummary;
    const nextSummary = (hasOwn(raw, 'characterSummary') || hasOwn(raw, 'character_summary') || hasOwn(raw, 'publicStorySummary'))
      ? cleanText(summaryInput, 1600)
      : current.publicStorySummary;
    const nextInternalNotes = (hasOwn(raw, 'internalStoryNotes') || hasOwn(raw, 'internal_story_notes'))
      ? cleanText(raw.internalStoryNotes ?? raw.internal_story_notes, 2500)
      : current.internalStoryNotes;
    const nextTraits = hasOwn(raw, 'traits')
      ? normalizeDraftWorkbenchTraits(raw.traits, current.traits)
      : normalizeDraftWorkbenchTraits({}, current.traits);

    const updated = await client.query(
      `UPDATE pawket_pals
          SET name = $2,
              public_story_summary = $3,
              internal_story_notes = $4,
              traits = $5::jsonb,
              metadata = $6::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${PAL_SELECT},
          metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
          metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
          metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
          metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId";`,
      [
        id,
        nextName,
        nextSummary,
        nextInternalNotes,
        JSON.stringify(nextTraits),
        JSON.stringify({
          ...metadata,
          communityDraft,
        }),
      ]
    );

    const draft = updated.rows[0];
    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'updated', $3, $4, $5::jsonb);`,
      [
        id,
        draft.heartCode,
        reviewerId,
        'Community Pal draft workbench updated. No public release was made.',
        JSON.stringify({
          workbenchUpdated: true,
          publicReleaseChanged: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return draft;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function submitCommunityPawketPalReleaseGate(draftId, actorUserId, input = {}) {
  const id = cleanUuid(draftId, 'draftId', true);
  const reviewerId = cleanUuid(actorUserId, 'actorUserId', true);
  const confirmPrivateStoryProtected = bool(
    input.confirmPrivateStoryProtected ?? input.confirm_private_story_protected,
    false
  );
  if (!confirmPrivateStoryProtected) {
    throw httpError(400, 'Confirm that private source story details remain protected before submitting the release gate', 'COMMUNITY_DRAFT_RELEASE_CONFIRM_REQUIRED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT ${PAL_SELECT}
         FROM pawket_pals
        WHERE id = $1
          AND pal_class = 'community'
        FOR UPDATE;`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    const missing = communityDraftReleaseGateMissingItems(current);
    if (missing.length) {
      throw httpErrorWithDetails(
        409,
        `Community Pal draft is missing release gate items: ${missing.join(', ')}`,
        'COMMUNITY_DRAFT_RELEASE_GATE_INCOMPLETE',
        { missing }
      );
    }

    const metadata = asObject(current.metadata);
    const communityDraft = {
      ...communityDraftMetadata(current),
      releaseGate: {
        ...asObject(communityDraftMetadata(current).releaseGate),
        status: 'release_review_ready',
        submittedByUserId: reviewerId,
        submittedAt: new Date().toISOString(),
        notes: cleanText(input.releaseGateNotes ?? input.release_gate_notes, 1600),
        publicReleaseChanged: false,
      },
      publicReleaseChanged: false,
    };

    const updated = await client.query(
      `UPDATE pawket_pals
          SET release_state = 'review',
              metadata = $2::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${PAL_SELECT},
          metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
          metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
          metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
          metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId";`,
      [
        id,
        JSON.stringify({
          ...metadata,
          communityDraft,
        }),
      ]
    );
    const draft = updated.rows[0];

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'updated', $3, $4, $5::jsonb);`,
      [
        id,
        draft.heartCode,
        reviewerId,
        'Community Pal draft passed the internal release gate for future public-surface work. No public release was made.',
        JSON.stringify({
          releaseGateStatus: 'release_review_ready',
          releaseState: 'review',
          privacyState: 'private',
          publicReleaseChanged: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return draft;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function approveCommunityPawketPalPublicPreview(draftId, actorUserId, input = {}) {
  const id = cleanUuid(draftId, 'draftId', true);
  const reviewerId = cleanUuid(actorUserId, 'actorUserId', true);
  const missingConfirmations = publicPreviewApprovalConfirmationMissing(input);
  if (missingConfirmations.length) {
    throw httpErrorWithDetails(
      400,
      'Confirm all public preview approval safeguards before approving this Community Pal',
      'COMMUNITY_PUBLIC_APPROVAL_CONFIRM_REQUIRED',
      { missing: missingConfirmations }
    );
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT ${PAL_SELECT}
         FROM pawket_pals
        WHERE id = $1
          AND pal_class = 'community'
        FOR UPDATE;`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    const missing = communityDraftPublicApprovalMissingItems(current);
    if (missing.length) {
      throw httpErrorWithDetails(
        409,
        `Community Pal public preview approval is missing items: ${missing.join(', ')}`,
        'COMMUNITY_PUBLIC_APPROVAL_INCOMPLETE',
        { missing }
      );
    }

    const metadata = asObject(current.metadata);
    const previousCommunityDraft = communityDraftMetadata(current);
    const now = new Date().toISOString();
    const communityDraft = {
      ...previousCommunityDraft,
      publicApproval: {
        ...asObject(previousCommunityDraft.publicApproval),
        status: 'public_preview_approved',
        approvedByUserId: reviewerId,
        approvedAt: now,
        notes: cleanText(
          input.publicApprovalNotes
            ?? input.public_approval_notes
            ?? input.approvalNotes
            ?? input.releaseGateNotes
            ?? input.release_gate_notes,
          1600
        ),
        noMarketOrTrading: true,
        noCharmCherishClaims: true,
        privateStoryRedacted: true,
        publicDrop: false,
      },
      publicSurfaceApproved: true,
      publicSurfaceApprovedAt: now,
      publicReleaseChanged: true,
    };

    const updated = await client.query(
      `UPDATE pawket_pals
          SET privacy_state = 'public',
              release_state = 'active',
              charm_enabled = FALSE,
              cherish_enabled = FALSE,
              transfer_locked = TRUE,
              market_enabled = FALSE,
              market_notes = $2,
              metadata = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${PAL_SELECT},
          metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
          metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
          metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
          metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId";`,
      [
        id,
        'Public preview approval keeps market, trading, transfer, drop, and CHARM/CHERISH claim behavior disabled.',
        JSON.stringify({
          ...metadata,
          communityDraft,
        }),
      ]
    );
    const draft = updated.rows[0];

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'updated', $3, $4, $5::jsonb);`,
      [
        id,
        draft.heartCode,
        reviewerId,
        'Community Pal approved for public preview. Market, trading, public drop, and CHARM/CHERISH claims remain disabled.',
        JSON.stringify({
          publicApprovalStatus: 'public_preview_approved',
          privacyState: 'public',
          releaseState: 'active',
          marketEnabled: false,
          transferLocked: true,
          charmEnabled: false,
          cherishEnabled: false,
          publicDrop: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return draft;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function archiveCommunityPawketPalPublicPreview(draftId, actorUserId, input = {}) {
  const id = cleanUuid(draftId, 'draftId', true);
  const reviewerId = cleanUuid(actorUserId, 'actorUserId', true);
  const confirmRemovePublicPreview = bool(
    input.confirmRemovePublicPreview ?? input.confirm_remove_public_preview,
    false
  );
  if (!confirmRemovePublicPreview) {
    throw httpError(400, 'Confirm that this Community Pal should be removed from the public preview surface', 'COMMUNITY_PUBLIC_ARCHIVE_CONFIRM_REQUIRED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT ${PAL_SELECT}
         FROM pawket_pals
        WHERE id = $1
          AND pal_class = 'community'
        FOR UPDATE;`,
      [id]
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      return null;
    }

    const metadata = asObject(current.metadata);
    const previousCommunityDraft = communityDraftMetadata(current);
    const publicApproval = asObject(previousCommunityDraft.publicApproval);
    if (
      current.privacyState !== 'public'
      || current.releaseState !== 'active'
      || publicApproval.status !== 'public_preview_approved'
    ) {
      throw httpErrorWithDetails(
        409,
        'Only active approved public Community Pal previews can be archived from this action',
        'COMMUNITY_PUBLIC_ARCHIVE_NOT_ACTIVE',
        { missing: ['active approved public preview state'] }
      );
    }

    const now = new Date().toISOString();
    const communityDraft = {
      ...previousCommunityDraft,
      publicApproval: {
        ...publicApproval,
        status: 'public_preview_archived',
      },
      publicArchive: {
        status: 'public_preview_archived',
        archivedByUserId: reviewerId,
        archivedAt: now,
        notes: cleanText(input.archiveNotes ?? input.archive_notes ?? input.publicArchiveNotes, 1600),
        removedFromPublicPreview: true,
        noMarketOrTrading: true,
        noCharmCherishClaims: true,
      },
      publicSurfaceApproved: false,
      publicSurfaceArchivedAt: now,
      publicReleaseChanged: true,
    };

    const updated = await client.query(
      `UPDATE pawket_pals
          SET privacy_state = 'private',
              release_state = 'archived',
              charm_enabled = FALSE,
              cherish_enabled = FALSE,
              transfer_locked = TRUE,
              market_enabled = FALSE,
              market_notes = $2,
              metadata = $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING ${PAL_SELECT},
          metadata->'communityDraft'->>'sourceConsentId' AS "sourceConsentId",
          metadata->'communityDraft'->>'sourcePalId' AS "sourcePalId",
          metadata->'communityDraft'->>'sourceHeartCode' AS "sourceHeartCode",
          metadata->'communityDraft'->>'createdByUserId' AS "createdByUserId";`,
      [
        id,
        'Public preview archived. Market, trading, transfer, drop, and CHARM/CHERISH claim behavior remain disabled.',
        JSON.stringify({
          ...metadata,
          communityDraft,
        }),
      ]
    );
    const draft = updated.rows[0];

    await client.query(
      `INSERT INTO pawket_pal_heartcode_events (
        pal_id,
        heartcode,
        event_type,
        actor_user_id,
        event_note,
        metadata
      )
      VALUES ($1, $2, 'retired', $3, $4, $5::jsonb);`,
      [
        id,
        draft.heartCode,
        reviewerId,
        'Community Pal public preview archived. Redacted public detail and preview lookup were removed.',
        JSON.stringify({
          publicArchiveStatus: 'public_preview_archived',
          privacyState: 'private',
          releaseState: 'archived',
          marketEnabled: false,
          transferLocked: true,
          charmEnabled: false,
          cherishEnabled: false,
        }),
      ]
    );

    await client.query('COMMIT');
    return draft;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export async function closePalDbPool() {
  await pool.end();
}
