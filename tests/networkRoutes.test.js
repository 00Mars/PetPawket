import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import networkRouter, { __resetNetworkRouteDepsForTests, __setNetworkRouteDepsForTests } from '../routes/networkRoutes.js';

function authedRequireAuth(userId = 'user-1') {
  return () => (req, _res, next) => {
    req.dbUser = { id: userId };
    req.user = { id: userId };
    next();
  };
}

function unauthorizedRequireAuth() {
  return () => (_req, res) => res.status(401).json({ ok: false, error: 'Unauthorized' });
}

async function withServer(depOverrides, run) {
  __resetNetworkRouteDepsForTests();
  __setNetworkRouteDepsForTests({
    requireAuth: authedRequireAuth(),
    listPublicListings: async () => ({ page: 1, pageSize: 12, total: 0, items: [] }),
    getPublicListingBySlug: async () => null,
    getPublicListingById: async () => null,
    createLead: async () => ({ id: 'lead-1', createdAt: new Date().toISOString() }),
    updateLeadDelivery: async () => {},
    hasOwnerMembership: async () => false,
    getOwnerListings: async () => [],
    getOwnerListingById: async () => null,
    updateOwnerListingProfile: async () => null,
    replaceOwnerServices: async () => null,
    replaceOwnerFaqs: async () => null,
    replaceOwnerOffers: async () => null,
    updateOwnerIntegration: async () => null,
    isOpsUser: async () => false,
    listClaims: async () => [],
    approveClaim: async () => ({ ok: true }),
    rejectClaim: async () => ({ ok: true }),
    updateOpsListingVerification: async () => null,
    updateOpsListingTier: async () => null,
    updateOpsListingFeatures: async () => null,
    listOpsListings: async () => [],
    ...(depOverrides || {}),
  });

  const app = express();
  app.use(express.json());
  app.use('/api/network', networkRouter);
  const server = app.listen(0);
  await once(server, 'listening');
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    __resetNetworkRouteDepsForTests();
  }
}

test('rejects invalid listings query values', async () => {
  let called = false;
  await withServer(
    {
      listPublicListings: async () => {
        called = true;
        return { page: 1, pageSize: 12, total: 0, items: [] };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings?status=bad-status`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid status filter/i);
      assert.equal(called, false);
    }
  );
});

test('returns 401 for owner endpoint when auth fails', async () => {
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/owner/listings`);
      const body = await resp.json();
      assert.equal(resp.status, 401);
      assert.equal(body.ok, false);
    }
  );
});

test('returns 403 for owner listing endpoint when membership is missing', async () => {
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
      hasOwnerMembership: async () => false,
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/owner/listings/listing-1`);
      const body = await resp.json();
      assert.equal(resp.status, 403);
      assert.equal(body.ok, false);
      assert.equal(body.error, 'Forbidden');
    }
  );
});

test('returns 403 for partners-ops routes for non-ops users', async () => {
  await withServer(
    {
      isOpsUser: async () => false,
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/listings?limit=20`);
      const body = await resp.json();
      assert.equal(resp.status, 403);
      assert.equal(body.ok, false);
      assert.equal(body.error, 'Forbidden');
    }
  );
});

test('validates partner tier payload before DB call', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      updateOpsListingTier: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/listings/listing-1/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_tier: 'nope' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid partner tier value/i);
      assert.equal(called, false);
    }
  );
});

test('maps claim-required transition failure to 409 for tier assignment', async () => {
  await withServer(
    {
      isOpsUser: async () => true,
      updateOpsListingTier: async () => {
        const err = new Error('CLAIM_REQUIRED');
        err.code = 'CLAIM_REQUIRED';
        throw err;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/listings/listing-1/tier`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partner_tier: 'partner' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.match(body.error, /must be claimed and approved/i);
    }
  );
});

test('requires boolean feature flags in partners-ops features payload', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      updateOpsListingFeatures: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/listings/listing-1/features`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_lead_form: 'true' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /must be a boolean/i);
      assert.equal(called, false);
    }
  );
});

test('rejects owner profile patch with unknown fields', async () => {
  let called = false;
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
      hasOwnerMembership: async () => true,
      updateOwnerListingProfile: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/owner/listings/listing-1/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ not_real: 'x' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Unknown profile fields/i);
      assert.equal(called, false);
    }
  );
});

test('accepts valid owner profile patch and normalizes values', async () => {
  let receivedPatch = null;
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
      hasOwnerMembership: async () => true,
      updateOwnerListingProfile: async (_userId, _listingId, patch) => {
        receivedPatch = patch;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/owner/listings/listing-1/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_primary: 'VET',
          categories: ['VET', 'groomer'],
          state: 'ma',
          lat: '42.1',
          lng: '-71.9',
          website_url: 'https://example.com',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.deepEqual(receivedPatch?.categories, ['vet', 'groomer']);
      assert.equal(receivedPatch?.category_primary, 'vet');
      assert.equal(receivedPatch?.state, 'MA');
      assert.equal(receivedPatch?.lat, 42.1);
      assert.equal(receivedPatch?.lng, -71.9);
    }
  );
});

test('requires external_site_url when owner integration uses external mode', async () => {
  let called = false;
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
      hasOwnerMembership: async () => true,
      updateOwnerIntegration: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/owner/listings/listing-1/integration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portal_mode: 'external_site' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /external_site_url is required/i);
      assert.equal(called, false);
    }
  );
});

test('validates claim proof requirements before creating claim', async () => {
  let called = false;
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'unclaimed', features: { enable_lead_form: true } }),
      createClaimRequest: async () => {
        called = true;
        return { id: 'claim-1', status: 'pending' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/listing-1/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_email: 'owner@example.com',
          phone: '+1 555 555 5555',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Provide a proof file or business_identity_doc_url/i);
      assert.equal(called, false);
    }
  );
});

test('lead form stores queued leads in test delivery mode', async () => {
  let createdLead = null;
  let deliveryUpdate = null;
  await withServer(
    {
      getPublicListingById: async () => ({
        id: 'listing-1',
        slug: 'happy-vet',
        lead_destination: 'email',
        lead_email: 'frontdesk@example.com',
        features: { enable_lead_form: true },
      }),
      createLead: async (input) => {
        createdLead = input;
        return { id: 'lead-1', createdAt: '2026-05-01T00:00:00.000Z' };
      },
      updateLeadDelivery: async (id, status, errorText) => {
        deliveryUpdate = { id, status, errorText };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/listing-1/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pawket Friend',
          email: 'friend@example.com',
          message: 'Can I schedule an appointment?',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.deliveryStatus, 'queued');
      assert.equal(body.deliveryMode, 'test');
      assert.equal(createdLead?.email, 'friend@example.com');
      assert.deepEqual(deliveryUpdate, {
        id: 'lead-1',
        status: 'queued',
        errorText: 'TEST_MODE_DELIVERY_NOT_SENT',
      });
    }
  );
});

test('maps claim pending conflict to 409', async () => {
  await withServer(
    {
      getPublicListingById: async () => ({ id: 'listing-1', status: 'unclaimed', features: { enable_lead_form: true } }),
      createClaimRequest: async () => {
        const err = new Error('CLAIM_ALREADY_PENDING');
        err.code = 'CLAIM_ALREADY_PENDING';
        throw err;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/listing-1/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_email: 'owner@example.com',
          phone: '+1 555 555 5555',
          business_identity_doc_url: 'https://example.com/proof.pdf',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.match(body.error, /pending claim already exists/i);
    }
  );
});

test('validates partners-ops claim queue status filter', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      listClaims: async () => {
        called = true;
        return [];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/claims?status=not-real`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid claim status filter/i);
      assert.equal(called, false);
    }
  );
});
