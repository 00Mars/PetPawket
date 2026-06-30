// scripts/seed-qa-story-world.js
// Fictional local QA seed for Pawket Pals, story consent, and impact surfaces.
import 'dotenv/config';
import pkg from 'pg';

const { Pool } = pkg;

const QA_EMAIL = 'qa-story-family@petpawket.test';
const QA_USER = {
  firstName: 'QA',
  lastName: 'Story Family',
};

const PET_NAME = 'Maple QA';
const JOURNAL_SEED_KEY = 'qa-story-world-journal';
const HONORARY_PAL_SEED_KEY = 'qa-story-world-honorary-pal';
const COMMUNITY_PAL_SEED_KEY = 'qa-story-world-community-pal';
const IMPACT_TITLE = 'QA Seed: Partner Recovery Kits';

const RELEASE_CHECKLIST = {
  consentAuditPassed: true,
  publicCopyReviewed: true,
  privateStoryProtected: true,
  moderationPassed: true,
  artDirectionReady: true,
  charmCherishReviewed: true,
  finalReleaseApproved: true,
};

let pool = null;
let palDb = null;

function normalizeConnString(raw) {
  if (!raw) return raw;
  return raw.replace('@host:', '@localhost:');
}

function assertSafeSeedEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run QA story-world seed with NODE_ENV=production.');
  }
  if (!normalizeConnString(process.env.DATABASE_URL)) {
    throw new Error('DATABASE_URL is required for the QA story-world seed.');
  }
}

function createPool() {
  const connectionString = normalizeConnString(process.env.DATABASE_URL);
  const ssl = process.env.PGSSLMODE === 'require'
    ? { rejectUnauthorized: false }
    : undefined;
  return new Pool({ connectionString, ssl });
}

async function ensureQaUser() {
  const { rows } = await pool.query(
    `INSERT INTO users (email, first_name, last_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
       SET first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           updated_at = NOW()
     RETURNING id, email, first_name AS "firstName", last_name AS "lastName";`,
    [QA_EMAIL, QA_USER.firstName, QA_USER.lastName]
  );
  return rows[0];
}

async function ensureQaPet(userId) {
  const traits = {
    qaSeedKey: 'qa-story-world-pet',
    fictional: true,
    favoriteRitual: 'sunny porch check-ins',
    storyBoundary: 'No real pet, family, rescue, medical, assistance, or memorial details.',
  };

  const existing = await pool.query(
    `SELECT id,
            user_id AS "userId",
            name,
            species,
            breed,
            traits
       FROM pets
      WHERE user_id = $1 AND name = $2 AND species = 'dog'
      ORDER BY created_at ASC
      LIMIT 1;`,
    [userId, PET_NAME]
  );

  if (existing.rows[0]) {
    const { rows } = await pool.query(
      `UPDATE pets
          SET breed = $2,
              traits = COALESCE(traits, '{}'::jsonb) || $3::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING id,
                  user_id AS "userId",
                  name,
                  species,
                  breed,
                  traits;`,
      [existing.rows[0].id, 'Fictional mixed breed', JSON.stringify(traits)]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO pets (user_id, name, species, breed, traits)
     VALUES ($1, $2, 'dog', $3, $4::jsonb)
     RETURNING id,
               user_id AS "userId",
               name,
               species,
               breed,
               traits;`,
    [userId, PET_NAME, 'Fictional mixed breed', JSON.stringify(traits)]
  );
  return rows[0];
}

async function ensureQaJournal(userId, petId) {
  const payload = {
    title: 'Fictional porch-light kindness note',
    text: [
      'Fictional local QA story source. Maple QA is a made-up pet profile used to test Pawket Pal consent,',
      'private journal linking, story-safe public summaries, and review gates without exposing any real pet or family.',
    ].join(' '),
    mood: 'hopeful',
    tags: ['qa-seed', 'pawket-pal', 'story-consent'],
    metadata: {
      qaSeedKey: JOURNAL_SEED_KEY,
      qaSeedVersion: 1,
      fictional: true,
      internalQaOnly: true,
      privacyBoundary: 'No real pet, family, rescue, medical, assistance, or memorial details.',
    },
  };

  const existing = await pool.query(
    `SELECT id
       FROM pet_journal
      WHERE user_id = $1
        AND pet_id = $2
        AND metadata->>'qaSeedKey' = $3
      ORDER BY created_at ASC
      LIMIT 1;`,
    [userId, petId, JOURNAL_SEED_KEY]
  );

  if (existing.rows[0]) {
    const { rows } = await pool.query(
      `UPDATE pet_journal
          SET title = $2,
              text = $3,
              entry_type = 'story',
              mood = $4,
              tags = $5::text[],
              highlighted = TRUE,
              visibility = 'private',
              metadata = $6::jsonb,
              updated_at = NOW()
        WHERE id = $1
        RETURNING id,
                  user_id AS "userId",
                  pet_id AS "petId",
                  title,
                  entry_type AS "entryType",
                  visibility,
                  metadata;`,
      [
        existing.rows[0].id,
        payload.title,
        payload.text,
        payload.mood,
        payload.tags,
        JSON.stringify(payload.metadata),
      ]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `INSERT INTO pet_journal (
       user_id, pet_id, title, text, entry_type, occurred_at, mood, tags, highlighted, visibility, metadata
     )
     VALUES ($1, $2, $3, $4, 'story', NOW(), $5, $6::text[], TRUE, 'private', $7::jsonb)
     RETURNING id,
               user_id AS "userId",
               pet_id AS "petId",
               title,
               entry_type AS "entryType",
               visibility,
               metadata;`,
    [
      userId,
      petId,
      payload.title,
      payload.text,
      payload.mood,
      payload.tags,
      JSON.stringify(payload.metadata),
    ]
  );
  return rows[0];
}

async function findPalBySeedKey(seedKey) {
  const { rows } = await pool.query(
    `SELECT id,
            heartcode AS "heartCode",
            name,
            pal_class AS "palClass",
            privacy_state AS "privacyState",
            consent_state AS "consentState",
            release_state AS "releaseState",
            metadata
       FROM pawket_pals
      WHERE metadata->>'qaSeedKey' = $1
      ORDER BY created_at ASC
      LIMIT 1;`,
    [seedKey]
  );
  return rows[0] || null;
}

async function getConsentForPal(palId) {
  const { rows } = await pool.query(
    `SELECT id,
            pal_id AS "palId",
            status,
            allow_public_story AS "allowPublicStory",
            allow_community_pal AS "allowCommunityPal",
            review_notes AS "reviewNotes"
       FROM pawket_pal_story_consents
      WHERE pal_id = $1
      ORDER BY created_at ASC
      LIMIT 1;`,
    [palId]
  );
  return rows[0] || null;
}

async function ensureHonoraryPal(user, pet, journal) {
  const existing = await findPalBySeedKey(HONORARY_PAL_SEED_KEY);
  if (existing) return existing;

  return palDb.createPawketPalStorySubmission({
    ownerUserId: user.id,
    petId: pet.id,
    journalEntryId: journal.id,
    storyTitle: 'Maple QA porch-light kindness story',
    storyType: 'community',
    name: 'Maple Porchlight Pal',
    originSummary: 'Fictional local QA story submission connected to a test pet profile and private journal entry.',
    publicStorySummary: [
      'A fictional, public-safe Pawket Pal preview for local QA.',
      'This Pal represents steady kindness, small daily care rituals, and a family-centered sense of belonging.',
      'No private source story, owner identity, assistance history, or source HeartCode is shown.',
    ].join(' '),
    storyText: [
      'Fictional QA-only source story. Maple QA is a made-up companion used to test the Share Your Heart',
      'story path, private journal links, Pawket Pal consent review, and public-safe Community Pal adaptation.',
      'This seed contains no real pet, family, rescue, medical, assistance, or memorial information.',
    ].join(' '),
    metadata: {
      qaSeedKey: HONORARY_PAL_SEED_KEY,
      qaSeedVersion: 1,
      fictional: true,
      internalQaOnly: true,
    },
    consent: {
      allowPrivatePal: true,
      allowPublicStory: true,
      allowCommunityPal: true,
      allowCharmConnection: false,
      allowCherishConnection: false,
      allowMarketingUse: false,
      allowTransfer: false,
      consentText: [
        'Fictional QA-only story created for local testing.',
        'Public story and Community Pal review rights are granted only for this local seed.',
        'Foundation, marketing, transfer, market, trading, and public drop uses remain disabled.',
      ].join(' '),
    },
  });
}

async function ensureGrantedConsent(pal, userId) {
  const consent = await getConsentForPal(pal.id);
  if (!consent) {
    throw new Error(`No story consent row found for Pawket Pal ${pal.heartCode || pal.id}.`);
  }
  if (consent.status === 'granted') return consent;

  return palDb.updatePawketPalReviewStatus(consent.id, userId, {
    status: 'granted',
    reviewNotes: [
      'Local QA seed review: fictional story, consent-safe public summary, no protected memorial figure,',
      'no real personal details, no marketing rights, no transfer rights, and no market/trading behavior.',
    ].join(' '),
  });
}

async function findCommunityPalByConsent(consentId) {
  const { rows } = await pool.query(
    `SELECT id,
            heartcode AS "heartCode",
            name,
            privacy_state AS "privacyState",
            release_state AS "releaseState",
            metadata
       FROM pawket_pals
      WHERE pal_class = 'community'
        AND metadata->'communityDraft'->>'sourceConsentId' = $1
      ORDER BY created_at ASC
      LIMIT 1;`,
    [consentId]
  );
  return rows[0] || null;
}

async function markCommunityPalAsQaSeed(palId) {
  await pool.query(
    `UPDATE pawket_pals
        SET metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
      WHERE id = $1;`,
    [
      palId,
      JSON.stringify({
        qaSeedKey: COMMUNITY_PAL_SEED_KEY,
        qaSeedVersion: 1,
        fictional: true,
        internalQaOnly: true,
      }),
    ]
  );
}

function isPublicPreviewApproved(pal) {
  const approval = pal?.metadata?.communityDraft?.publicApproval || {};
  return pal?.privacyState === 'public'
    && pal?.releaseState === 'active'
    && approval.status === 'public_preview_approved';
}

function isReleaseReviewReady(pal) {
  const gate = pal?.metadata?.communityDraft?.releaseGate || {};
  return pal?.releaseState === 'review' && gate.status === 'release_review_ready';
}

async function ensureCommunityPreview(consent, userId) {
  let community = await findCommunityPalByConsent(consent.id);
  if (!community) {
    community = await palDb.createCommunityPawketPalDraft({
      consentId: consent.id,
      actorUserId: userId,
      name: 'Maple Porchlight Pal',
      characterSummary: [
        'Maple Porchlight Pal is a fictional Community Pal preview for local QA.',
        'The public version carries warmth, loyalty, and small daily kindness without exposing private source details.',
      ].join(' '),
      draftNotes: 'Local QA-only Community Pal draft adapted from fictional source material.',
    });
  }

  if (!isPublicPreviewApproved(community)) {
    community = await palDb.updateCommunityPawketPalDraft(community.id, userId, {
      name: 'Maple Porchlight Pal',
      characterSummary: [
        'Maple Porchlight Pal is a fictional, consent-safe Community Pal preview for local QA.',
        'The public summary honors warmth, loyalty, and small daily kindness while keeping the source story,',
        'owner account, and HeartCode lineage redacted.',
      ].join(' '),
      internalStoryNotes: 'Fictional local QA draft. Private source story remains redacted from public surfaces.',
      artDirectionNotes: 'Warm golden companion, soft porch-light palette, gentle expression, simple family-safe details.',
      releaseChecklist: RELEASE_CHECKLIST,
      traits: {
        primaryTrait: 'Gentle',
        secondaryTrait: 'Loyal',
        kindnessAffinity: 'Everyday care',
        questAbility: 'Community encouragement',
        mood: 'Warm',
        visualMood: 'Porch-light companion',
        abilityNotes: 'Future QA hook for kindness quests without activating rewards, markets, or transfers.',
      },
    });
  }

  if (!isPublicPreviewApproved(community) && !isReleaseReviewReady(community)) {
    community = await palDb.submitCommunityPawketPalReleaseGate(community.id, userId, {
      confirmPrivateStoryProtected: true,
      releaseGateNotes: 'Local QA seed gate: fictional source, redacted private story, no market, no trading, no public drop.',
    });
  }

  if (!isPublicPreviewApproved(community)) {
    community = await palDb.approveCommunityPawketPalPublicPreview(community.id, userId, {
      confirmPublicPreviewReady: true,
      confirmPrivateStoryRedacted: true,
      confirmNoMarketOrTrading: true,
      confirmNoCharmCherishClaims: true,
      publicApprovalNotes: 'Approved only as a fictional local QA public preview with market, trading, transfer, and public-drop behavior disabled.',
    });
  }

  await markCommunityPalAsQaSeed(community.id);
  return findCommunityPalByConsent(consent.id);
}

async function upsertImpactCase() {
  const nonQaActive = await pool.query(
    `SELECT id, title
       FROM loop_impact_stories
      WHERE active IS TRUE
        AND status = 'active'
        AND title NOT LIKE 'QA Seed:%'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1;`
  );
  const shouldActivateSeed = !nonQaActive.rows[0];

  const impact = {
    title: IMPACT_TITLE,
    body: [
      'Fictional local QA impact story for testing the public impact ribbon and active case endpoints.',
      'A partner rescue receives recovery kits, comfort supplies, and practical care items after a reviewed intake.',
      'This seed does not represent a real animal, family, emergency request, donation, or assistance decision.',
    ].join(' '),
    petName: 'Scout QA',
    imageUrl: '',
    active: shouldActivateSeed,
    goalAmount: 250,
    currency: 'USD',
    status: 'active',
    priority: 90,
  };

  const existing = await pool.query(
    `SELECT id FROM loop_impact_stories WHERE title = $1 ORDER BY created_at ASC LIMIT 1;`,
    [impact.title]
  );

  let row;
  if (existing.rows[0]) {
    const updated = await pool.query(
      `UPDATE loop_impact_stories
          SET body = $2,
              pet_name = $3,
              image_url = NULLIF($4, ''),
              active = $5,
              goal_amount = $6,
              currency = $7,
              status = $8,
              priority = $9,
              starts_at = COALESCE(starts_at, NOW()),
              completed_at = NULL
        WHERE id = $1
        RETURNING id,
                  title,
                  active,
                  status,
                  priority,
                  goal_amount AS "goalAmount",
                  funded_amount AS "fundedAmount";`,
      [
        existing.rows[0].id,
        impact.body,
        impact.petName,
        impact.imageUrl,
        impact.active,
        impact.goalAmount,
        impact.currency,
        impact.status,
        impact.priority,
      ]
    );
    row = updated.rows[0];
  } else {
    const inserted = await pool.query(
      `INSERT INTO loop_impact_stories (
         title, body, pet_name, image_url, active, goal_amount, currency, status, priority
       )
       VALUES ($1, $2, $3, NULLIF($4, ''), $5, $6, $7, $8, $9)
       RETURNING id,
                 title,
                 active,
                 status,
                 priority,
                 goal_amount AS "goalAmount",
                 funded_amount AS "fundedAmount";`,
      [
        impact.title,
        impact.body,
        impact.petName,
        impact.imageUrl,
        impact.active,
        impact.goalAmount,
        impact.currency,
        impact.status,
        impact.priority,
      ]
    );
    row = inserted.rows[0];
  }

  if (shouldActivateSeed) {
    await pool.query(
      `UPDATE loop_impact_stories
          SET active = FALSE
        WHERE id <> $1
          AND title LIKE 'QA Seed:%';`,
      [row.id]
    );
  }

  return {
    ...row,
    activated: shouldActivateSeed,
    blockedByActiveCase: nonQaActive.rows[0]?.title || null,
  };
}

async function summarizeCounts() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM pawket_pals WHERE metadata->>'qaSeedKey' IN ($1, $2)) AS "qaPals",
       (SELECT COUNT(*)::int FROM pawket_pal_story_consents c
          INNER JOIN pawket_pals p ON p.id = c.pal_id
         WHERE p.metadata->>'qaSeedKey' = $1) AS "qaConsents",
       (SELECT COUNT(*)::int FROM loop_impact_stories WHERE title LIKE 'QA Seed:%') AS "qaImpactCases";`,
    [HONORARY_PAL_SEED_KEY, COMMUNITY_PAL_SEED_KEY]
  );
  return rows[0];
}

async function run() {
  assertSafeSeedEnvironment();
  pool = createPool();
  palDb = await import('../palDB.pg.js');

  const user = await ensureQaUser();
  const pet = await ensureQaPet(user.id);
  const journal = await ensureQaJournal(user.id, pet.id);
  const honoraryPal = await ensureHonoraryPal(user, pet, journal);
  const consent = await ensureGrantedConsent(honoraryPal, user.id);
  const communityPal = await ensureCommunityPreview(consent, user.id);
  const impactCase = await upsertImpactCase();
  const counts = await summarizeCounts();

  console.log('[qa-story-world] seed complete');
  console.log(`[qa-story-world] user: ${user.email}`);
  console.log(`[qa-story-world] pet: ${pet.name} (${pet.id})`);
  console.log(`[qa-story-world] honorary Pal: ${honoraryPal.heartCode}`);
  console.log(`[qa-story-world] community preview: ${communityPal.heartCode}`);
  console.log(
    `[qa-story-world] impact case: ${impactCase.title} (${impactCase.activated ? 'active' : 'inactive; existing active case preserved'})`
  );
  if (impactCase.blockedByActiveCase) {
    console.log(`[qa-story-world] preserved active case: ${impactCase.blockedByActiveCase}`);
  }
  console.log(
    `[qa-story-world] QA rows: ${counts.qaPals} Pals, ${counts.qaConsents} consent row(s), ${counts.qaImpactCases} impact case(s)`
  );
}

run()
  .catch((err) => {
    console.error('[qa-story-world] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await palDb?.closePalDbPool?.(); } catch {}
    try { await pool?.end?.(); } catch {}
  });
