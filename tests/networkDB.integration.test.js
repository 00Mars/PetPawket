import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const RUN_NETWORK_DB_TESTS = process.env.RUN_NETWORK_DB_TESTS === '1';
const TEST_DB_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || '';

if (RUN_NETWORK_DB_TESTS && process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}

let dbModPromise = null;

async function db() {
  if (!dbModPromise) dbModPromise = import('../networkDB.pg.js');
  return dbModPromise;
}

function uniqueToken(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function maybeRun(name, fn) {
  if (!RUN_NETWORK_DB_TESTS || !TEST_DB_URL) {
    return test(name, { skip: 'Set RUN_NETWORK_DB_TESTS=1 and DATABASE_URL_TEST to run DB integration tests' }, fn);
  }
  return test(name, fn);
}

async function ensureDbReady(t) {
  const mod = await db();
  const { rows } = await mod.pool.query(
    `SELECT
       to_regclass('public.users') AS users_tbl,
       to_regclass('public.network_listings') AS listings_tbl,
       to_regclass('public.network_claim_requests') AS claims_tbl`
  );
  const ok = !!(rows[0]?.users_tbl && rows[0]?.listings_tbl && rows[0]?.claims_tbl);
  if (!ok) {
    t.skip('Required tables not found. Run migrations on the test DB first.');
    return false;
  }
  return true;
}

async function createUser(email) {
  const mod = await db();
  const { rows } = await mod.pool.query(
    `INSERT INTO users (email, first_name, last_name)
     VALUES ($1, 'Test', 'User')
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [email.toLowerCase()]
  );
  return rows[0]?.id;
}

async function deleteUser(email) {
  const mod = await db();
  await mod.pool.query(`DELETE FROM users WHERE email = $1`, [email.toLowerCase()]);
}

async function deleteListing(slug) {
  const mod = await db();
  await mod.pool.query(`DELETE FROM network_listings WHERE slug = $1`, [slug]);
}

after(async () => {
  if (!dbModPromise) return;
  try {
    const mod = await dbModPromise;
    await mod.closeNetworkDbPool();
  } catch {
    // best-effort close
  }
});

maybeRun('network DB: claim approve flow promotes listing and owner membership', async (t) => {
  if (!(await ensureDbReady(t))) return;
  const mod = await db();

  const slug = uniqueToken('it-claim-approve');
  const claimantEmail = `${uniqueToken('claimant')}@example.test`;
  const reviewerEmail = `${uniqueToken('reviewer')}@example.test`;

  try {
    const claimantId = await createUser(claimantEmail);
    const reviewerId = await createUser(reviewerEmail);

    const seeded = await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Claim Listing',
      category_primary: 'vet',
      categories: ['vet'],
      location: { city: 'Boston', state: 'MA', postal_code: '02110', lat: 42.36, lng: -71.06 },
      status: 'unclaimed',
      claim_status: 'pending',
      features: { enable_lead_form: true },
    });

    const created = await mod.createClaimRequest({
      listingId: seeded.id,
      userId: claimantId,
      businessEmail: claimantEmail,
      phone: '+1 555 100 2000',
      businessIdentityDocUrl: 'https://example.test/proof.pdf',
      businessIdentityDocPath: null,
    });
    assert.equal(created.status, 'pending');

    const duplicate = await mod.createClaimRequest({
      listingId: seeded.id,
      userId: claimantId,
      businessEmail: claimantEmail,
      phone: '+1 555 100 2000',
      businessIdentityDocUrl: 'https://example.test/proof.pdf',
      businessIdentityDocPath: null,
    });
    assert.equal(duplicate.duplicate, true);

    await mod.approveClaim(created.id, reviewerId, 'integration-approved');

    const updated = await mod.getPublicListingById(seeded.id);
    assert.equal(updated.status, 'claimed');
    assert.equal(updated.claim_status, 'approved');
    assert.equal(updated.owner_user_id, claimantId);
    assert.equal(await mod.hasOwnerMembership(claimantId, seeded.id), true);
  } finally {
    await deleteListing(slug);
    await deleteUser(claimantEmail);
    await deleteUser(reviewerEmail);
  }
});

maybeRun('network DB: only one pending claim allowed per listing across users', async (t) => {
  if (!(await ensureDbReady(t))) return;
  const mod = await db();

  const slug = uniqueToken('it-claim-conflict');
  const firstEmail = `${uniqueToken('first')}@example.test`;
  const secondEmail = `${uniqueToken('second')}@example.test`;

  try {
    const firstUserId = await createUser(firstEmail);
    const secondUserId = await createUser(secondEmail);

    const seeded = await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Claim Conflict Listing',
      category_primary: 'groomer',
      categories: ['groomer'],
      location: { city: 'Worcester', state: 'MA', postal_code: '01608', lat: 42.26, lng: -71.8 },
      status: 'unclaimed',
      claim_status: 'pending',
    });

    await mod.createClaimRequest({
      listingId: seeded.id,
      userId: firstUserId,
      businessEmail: firstEmail,
      phone: '+1 555 300 4000',
      businessIdentityDocUrl: 'https://example.test/proof-a.pdf',
    });

    await assert.rejects(
      () =>
        mod.createClaimRequest({
          listingId: seeded.id,
          userId: secondUserId,
          businessEmail: secondEmail,
          phone: '+1 555 500 6000',
          businessIdentityDocUrl: 'https://example.test/proof-b.pdf',
        }),
      (err) => {
        assert.match(String(err?.code || err?.message || ''), /CLAIM_ALREADY_PENDING/);
        return true;
      }
    );
  } finally {
    await deleteListing(slug);
    await deleteUser(firstEmail);
    await deleteUser(secondEmail);
  }
});

maybeRun('network DB: partner tier requires claimed+approved and verification gate', async (t) => {
  if (!(await ensureDbReady(t))) return;
  const mod = await db();

  const slug = uniqueToken('it-tier-gate');
  const ownerEmail = `${uniqueToken('owner')}@example.test`;

  try {
    const ownerId = await createUser(ownerEmail);

    const seeded = await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Tier Listing',
      category_primary: 'trainer',
      categories: ['trainer'],
      location: { city: 'Cambridge', state: 'MA', postal_code: '02139', lat: 42.37, lng: -71.11 },
      status: 'unclaimed',
      claim_status: 'pending',
    });

    await mod.pool.query(
      `UPDATE network_listings
       SET owner_user_id = $2, status = 'claimed', claim_status = 'approved', updated_at = NOW()
       WHERE id = $1`,
      [seeded.id, ownerId]
    );

    await assert.rejects(
      () => mod.updateOpsListingTier(seeded.id, 'partner'),
      (err) => {
        assert.match(String(err?.code || err?.message || ''), /PARTNER_GATE_NOT_MET/);
        return true;
      }
    );

    await mod.updateOpsListingVerification(seeded.id, {
      email_verified: true,
      phone_verified: true,
      business_identity_verified: true,
      manual_review_passed: true,
    });

    const partnered = await mod.updateOpsListingTier(seeded.id, 'partner');
    assert.equal(partnered.status, 'partner');
    assert.equal(partnered.partner_tier, 'partner');
  } finally {
    await deleteListing(slug);
    await deleteUser(ownerEmail);
  }
});

maybeRun('network DB: seed import persists listing detail children', async (t) => {
  if (!(await ensureDbReady(t))) return;
  const mod = await db();

  const slug = uniqueToken('it-seed-children');

  try {
    await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Seed Children Listing',
      category_primary: 'groomer',
      categories: ['groomer'],
      location: { city: 'Newport', state: 'RI', postal_code: '02840', lat: 41.49, lng: -71.31 },
      status: 'partner',
      claim_status: 'approved',
      features: { enable_offers: true },
      services: [
        { name: 'Bath and Brush', price_from: 40, price_to: 75, notes: 'Calm handling' },
        { name: 'Nail Trim', price_from: 15 },
      ],
      faqs: [
        { question: 'Do you handle anxious pets?', answer: 'Yes, with slower sessions.' },
      ],
      offers: [
        { title: 'First visit welcome', code: 'CHARM10', details: 'New clients only.', is_active: true },
      ],
      photos: ['https://example.test/network-photo.jpg'],
    });

    const detail = await mod.getPublicListingBySlug(slug);
    assert.equal(detail.services.length, 2);
    assert.equal(detail.services[0].name, 'Bath and Brush');
    assert.equal(Number(detail.services[0].priceFrom), 40);
    assert.equal(detail.faqs.length, 1);
    assert.equal(detail.offers.length, 1);
    assert.equal(detail.media.length, 1);

    await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Seed Children Listing',
      category_primary: 'groomer',
      categories: ['groomer'],
      location: { city: 'Newport', state: 'RI', postal_code: '02840', lat: 41.49, lng: -71.31 },
      status: 'partner',
      claim_status: 'approved',
      features: { enable_offers: true },
      services: [{ name: 'Updated Groom', price_from: 55 }],
      faqs: [],
      offers: [],
      photos: [],
    });

    const replaced = await mod.getPublicListingBySlug(slug);
    assert.deepEqual(replaced.services.map((s) => s.name), ['Updated Groom']);
    assert.equal(replaced.faqs.length, 0);
    assert.equal(replaced.offers.length, 0);
    assert.equal(replaced.media.length, 0);
  } finally {
    await deleteListing(slug);
  }
});

maybeRun('network DB: claim creation blocked for non-unclaimed listings', async (t) => {
  if (!(await ensureDbReady(t))) return;
  const mod = await db();

  const slug = uniqueToken('it-claim-status');
  const claimantEmail = `${uniqueToken('status-user')}@example.test`;

  try {
    const claimantId = await createUser(claimantEmail);

    const seeded = await mod.upsertListingFromSeed({
      slug,
      name: 'Integration Claim Status Listing',
      category_primary: 'shelter',
      categories: ['shelter'],
      location: { city: 'Salem', state: 'MA', postal_code: '01970', lat: 42.52, lng: -70.9 },
      status: 'claimed',
      claim_status: 'approved',
    });

    await assert.rejects(
      () =>
        mod.createClaimRequest({
          listingId: seeded.id,
          userId: claimantId,
          businessEmail: claimantEmail,
          phone: '+1 555 700 8000',
          businessIdentityDocUrl: 'https://example.test/proof.pdf',
        }),
      (err) => {
        assert.match(String(err?.code || err?.message || ''), /CLAIM_NOT_ALLOWED_STATUS/);
        return true;
      }
    );
  } finally {
    await deleteListing(slug);
    await deleteUser(claimantEmail);
  }
});
