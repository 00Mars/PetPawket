import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
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
    attachAuthIfPresent: async () => false,
    listPublicListings: async () => ({ page: 1, pageSize: 12, total: 0, items: [] }),
    listPublicListingSuggestions: async () => [],
    getPublicListingBySlug: async () => null,
    getPublicListingById: async () => null,
    getInternalListingById: async () => null,
    getGeocodeCache: async () => null,
    upsertGeocodeCache: async (input) => ({
      queryKey: input.queryKey,
      queryText: input.queryText,
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
      latitude: input.latitude,
      longitude: input.longitude,
      provider: input.provider,
    }),
    geocodeUsLocation: async () => null,
    buildGeocodeKey: (query) => String(query || '').trim().toLowerCase().replace(/\s+/g, ' '),
    createLead: async () => ({ id: 'lead-1', createdAt: new Date().toISOString() }),
    updateLeadDelivery: async () => {},
    createNetworkNomination: async () => ({ id: 'nomination-1', status: 'pending' }),
    listNetworkNominations: async () => [],
    updateNetworkNomination: async () => ({ id: 'nomination-1', status: 'reviewed' }),
    prepareNetworkImportCandidate: (item, defaults = {}) => ({ ...item, source: item.source || defaults.source || 'manual', status: item.status || 'new' }),
    upsertNetworkImportCandidate: async () => ({ id: 'candidate-1', status: 'new' }),
    listNetworkImportCandidates: async () => ({ total: 0, limit: 120, offset: 0, items: [] }),
    summarizeNetworkImportCandidates: async () => ({ total: 0, by_status: [], by_source: [], by_state: [], by_category: [], readiness: {} }),
    updateNetworkImportCandidateStatus: async () => ({ id: 'candidate-1', status: 'approved' }),
    promoteNetworkImportCandidate: async () => ({ candidate: { id: 'candidate-1', status: 'promoted' }, listing: { id: 'listing-1', status: 'unclaimed' } }),
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
    getClaimProofById: async () => null,
    approveClaim: async () => ({ ok: true }),
    rejectClaim: async () => ({ ok: true }),
    updateOpsListingVerification: async () => null,
    updateOpsListingTier: async () => null,
    updateOpsListingFeatures: async () => null,
    listOpsListings: async () => [],
    upsertApprovedLaunchListing: async () => ({ id: 'listing-1' }),
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

test('accepts natural search query aliases for listings', async () => {
  const received = [];
  await withServer(
    {
      listPublicListings: async (filters) => {
        received.push(filters);
        return { page: 1, pageSize: 12, total: 0, items: [] };
      },
    },
    async (base) => {
      const searchResp = await fetch(`${base}/api/network/listings?search=dog%20grooming%20California`);
      assert.equal(searchResp.status, 200);
      const queryResp = await fetch(`${base}/api/network/listings?query=vet%20MA`);
      assert.equal(queryResp.status, 200);
      assert.equal(received[0].q, 'dog grooming California');
      assert.equal(received[1].q, 'vet MA');
    }
  );
});

test('public listing list responses strip internal owner and lead routing fields', async () => {
  await withServer(
    {
      listPublicListings: async () => ({
        page: 1,
        pageSize: 12,
        total: 1,
        items: [{
          id: 'listing-1',
          slug: 'happy-vet',
          name: 'Happy Vet',
          category_primary: 'vet',
          categories: ['vet'],
          location: { city: 'Spencer', state: 'MA' },
          contact: { phone: '+1 555 555 5555', website_url: 'https://example.com' },
          status: 'partner',
          owner_user_id: 'owner-1',
          claim_status: 'approved',
          verification: { email_verified: true },
          features: {
            enable_lead_form: true,
            enable_offers: true,
            enable_priority_rank: true,
            enable_featured_slots: true,
          },
          lead_destination: 'both',
          lead_email: 'owner@example.com',
          lead_webhook_url: 'https://hooks.example.com/leads',
          featured_rank: 1,
          distance_mi: 2.5,
        }],
      }),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      const item = body.items[0];
      assert.equal(item.id, 'listing-1');
      assert.equal(item.features.enable_lead_form, true);
      assert.equal(item.features.enable_offers, true);
      assert.equal(item.distance_mi, 2.5);
      for (const key of ['owner_user_id', 'claim_status', 'verification', 'lead_destination', 'lead_email', 'lead_webhook_url', 'featured_rank']) {
        assert.equal(Object.prototype.hasOwnProperty.call(item, key), false);
      }
      assert.equal(Object.prototype.hasOwnProperty.call(item.features, 'enable_priority_rank'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(item.features, 'enable_featured_slots'), false);
    }
  );
});

test('public listing detail responses strip internal owner and lead routing fields', async () => {
  await withServer(
    {
      getPublicListingBySlug: async () => ({
        id: 'listing-1',
        slug: 'happy-vet',
        name: 'Happy Vet',
        category_primary: 'vet',
        categories: ['vet'],
        status: 'partner',
        owner_user_id: 'owner-1',
        claim_status: 'approved',
        verification: { email_verified: true },
        features: {
          enable_lead_form: true,
          enable_offers: false,
          enable_priority_rank: true,
          enable_featured_slots: true,
        },
        lead_destination: 'webhook',
        lead_email: 'owner@example.com',
        lead_webhook_url: 'https://hooks.example.com/leads',
        media: [],
        services: [],
        faqs: [],
        offers: [],
        badges: { pawket_partner: true },
      }),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/happy-vet`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      const item = body.listing;
      assert.equal(item.id, 'listing-1');
      assert.deepEqual(item.badges, { pawket_partner: true });
      for (const key of ['owner_user_id', 'claim_status', 'verification', 'lead_destination', 'lead_email', 'lead_webhook_url']) {
        assert.equal(Object.prototype.hasOwnProperty.call(item, key), false);
      }
      assert.deepEqual(item.features, { enable_lead_form: true, enable_offers: false });
    }
  );
});

test('returns public listing suggestions without requiring auth', async () => {
  let received = null;
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
      listPublicListingSuggestions: async (filters) => {
        received = filters;
        return [
          { type: 'area', label: 'Boston, MA', value: 'Boston, MA', detail: '8 listings' },
          { type: 'address', label: '123 Pawket Ave, Boston, MA 02115', value: '123 Pawket Ave, Boston, MA 02115', detail: 'Example Veterinary' },
        ];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/suggestions?q=Bos&limit=5`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.deepEqual(received, { q: 'Bos', limit: 5 });
      assert.equal(body.suggestions.length, 2);
      assert.equal(body.suggestions[0].type, 'area');
      assert.equal(body.suggestions[1].type, 'address');
    }
  );
});

test('rejects invalid listing suggestion limit before DB call', async () => {
  let called = false;
  await withServer(
    {
      listPublicListingSuggestions: async () => {
        called = true;
        return [];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/suggestions?q=Boston&limit=99`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid suggestion limit/i);
      assert.equal(called, false);
    }
  );
});

test('returns geocoded town locations with normalized state codes', async () => {
  let requestedQuery = null;
  await withServer(
    {
      getGeocodeCache: async () => null,
      geocodeUsLocation: async (query) => {
        requestedQuery = query;
        return {
          queryText: `${query}, USA`,
          latitude: 42.448411,
          longitude: -71.8768079,
          city: 'Princeton',
          state: 'Massachusetts',
          postalCode: '01541',
          provider: 'test',
          rawResponse: {},
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Princeton, MA' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(requestedQuery, 'Princeton, MA');
      assert.equal(body.location.city, 'Princeton');
      assert.equal(body.location.state, 'MA');
      assert.equal(body.location.postal_code, '01541');
      assert.equal(body.location.lat, 42.448411);
      assert.equal(body.location.lng, -71.8768079);
    }
  );
});

test('returns cached geocoded locations with normalized state codes', async () => {
  await withServer(
    {
      getGeocodeCache: async (key) => ({
        queryKey: key,
        queryText: 'Spencer, MA, USA',
        city: 'Spencer',
        state: 'Massachusetts',
        postalCode: '01562',
        latitude: 42.243981,
        longitude: -71.992297,
        provider: 'test',
      }),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Spencer, MA' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.cached, true);
      assert.equal(body.location.city, 'Spencer');
      assert.equal(body.location.state, 'MA');
    }
  );
});

test('public rate limiter ignores spoofed x-forwarded-for by default', async () => {
  let geocodeCalls = 0;
  await withServer(
    {
      geocodeUsLocation: async () => {
        geocodeCalls += 1;
        return null;
      },
    },
    async (base) => {
      let last = null;
      for (let i = 0; i < 16; i += 1) {
        last = await fetch(`${base}/api/network/geocode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': `198.51.100.${i + 1}`,
          },
          body: JSON.stringify({ query: 'Nowhere, MA' }),
        });
      }
      const body = await last.json();
      assert.equal(last.status, 429);
      assert.equal(body.ok, false);
      assert.match(body.error, /Too many requests/i);
      assert.equal(geocodeCalls, 15);
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
      getInternalListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
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
      getInternalListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
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
      getInternalListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
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
      getInternalListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
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

test('rejects local or private owner lead webhook URLs before saving integration', async () => {
  let called = false;
  await withServer(
    {
      getInternalListingById: async () => ({ id: 'listing-1', status: 'claimed' }),
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
        body: JSON.stringify({ lead_destination: 'webhook', lead_webhook_url: 'https://127.0.0.1/leads' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /public hostname/i);
      assert.equal(called, false);
    }
  );
});

test('validates claim proof requirements before creating claim', async () => {
  let called = false;
  await withServer(
    {
      getInternalListingById: async () => ({ id: 'listing-1', status: 'unclaimed', features: { enable_lead_form: true } }),
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
      getInternalListingById: async () => ({
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
      attachAuthIfPresent: async (req) => {
        req.dbUser = { id: 'signed-in-user' };
        return true;
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
      assert.equal(createdLead?.userId, 'signed-in-user');
      assert.deepEqual(deliveryUpdate, {
        id: 'lead-1',
        status: 'queued',
        errorText: 'TEST_MODE_DELIVERY_NOT_SENT',
      });
    }
  );
});

test('live lead webhook delivery blocks private webhook targets before fetch', async () => {
  const previousMode = process.env.LEAD_DELIVERY_MODE;
  process.env.LEAD_DELIVERY_MODE = 'live';
  let deliveryUpdate = null;
  try {
    await withServer(
      {
        getInternalListingById: async () => ({
          id: 'listing-1',
          slug: 'happy-vet',
          lead_destination: 'webhook',
          lead_webhook_url: 'https://127.0.0.1/leads',
          features: { enable_lead_form: true },
        }),
        createLead: async () => ({ id: 'lead-1', createdAt: '2026-05-01T00:00:00.000Z' }),
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
        assert.equal(body.deliveryStatus, 'failed');
        assert.equal(body.deliveryMode, 'live');
        assert.deepEqual(deliveryUpdate, {
          id: 'lead-1',
          status: 'failed',
          errorText: 'WEBHOOK_TARGET_BLOCKED; DELIVERY_NOT_CONFIGURED',
        });
      }
    );
  } finally {
    if (previousMode === undefined) delete process.env.LEAD_DELIVERY_MODE;
    else process.env.LEAD_DELIVERY_MODE = previousMode;
  }
});

test('outbound click stores signed-in context when optional auth is present', async () => {
  let activity = null;
  await withServer(
    {
      attachAuthIfPresent: async (req) => {
        req.dbUser = { id: 'signed-in-clicker' };
        return true;
      },
      getInternalListingById: async () => ({ id: 'listing-1', status: 'partner', features: {} }),
      createActivityEvent: async (input) => {
        activity = input;
        return { id: 'activity-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/listings/listing-1/outbound-click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ href: 'https://provider.example.com', source: 'detail_cta' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(activity?.userId, 'signed-in-clicker');
      assert.equal(activity?.eventType, 'outbound_click');
    }
  );
});

test('failed uploaded claim removes private stored proof file', async () => {
  let uploadedPrivatePath = null;
  await withServer(
    {
      getInternalListingById: async () => ({ id: 'listing-1', status: 'unclaimed', features: { enable_lead_form: true } }),
      createClaimRequest: async (input) => {
        uploadedPrivatePath = input.businessIdentityDocPath;
        const err = new Error('CLAIM_ALREADY_PENDING');
        err.code = 'CLAIM_ALREADY_PENDING';
        throw err;
      },
    },
    async (base) => {
      const form = new FormData();
      form.set('business_email', 'owner@example.com');
      form.set('phone', '+1 555 555 5555');
      form.set('business_identity_doc', new Blob(['%PDF-1.4 proof'], { type: 'application/pdf' }), 'proof.pdf');

      const resp = await fetch(`${base}/api/network/listings/listing-1/claim`, {
        method: 'POST',
        body: form,
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.match(body.error, /pending claim already exists/i);
      assert.ok(uploadedPrivatePath);
      assert.match(uploadedPrivatePath, /^network\/claims\//);
      assert.equal(uploadedPrivatePath.includes('/uploads/'), false);

      const diskPath = path.join(process.cwd(), 'private_uploads', uploadedPrivatePath);
      for (let i = 0; i < 20 && fs.existsSync(diskPath); i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(fs.existsSync(diskPath), false);
    }
  );
});

test('partners-ops claim queue redacts uploaded proof paths', async () => {
  await withServer(
    {
      isOpsUser: async () => true,
      listClaims: async () => ([{
        id: 'claim-1',
        status: 'pending',
        businessEmail: 'owner@example.com',
        businessIdentityDocUrl: 'https://example.com/proof.pdf',
        businessIdentityDocPath: 'network/claims/proof.pdf',
      }]),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/claims`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.claims.length, 1);
      assert.equal(Object.prototype.hasOwnProperty.call(body.claims[0], 'businessIdentityDocPath'), false);
      assert.equal(body.claims[0].businessIdentityDocAvailable, true);
      assert.equal(body.claims[0].businessIdentityDocDownloadUrl, '/api/network/partners-ops/claims/claim-1/proof');
    }
  );
});

test('partners-ops claim proof download serves private uploaded proof only to ops users', async () => {
  const fileName = `proof-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const storedPath = `network/claims/${fileName}`;
  const diskDir = path.join(process.cwd(), 'private_uploads', 'network', 'claims');
  const diskPath = path.join(diskDir, fileName);
  fs.mkdirSync(diskDir, { recursive: true });
  fs.writeFileSync(diskPath, '%PDF-1.4 private proof');

  try {
    await withServer(
      {
        isOpsUser: async () => true,
        getClaimProofById: async () => ({ id: 'claim-1', businessIdentityDocPath: storedPath }),
      },
      async (base) => {
        const resp = await fetch(`${base}/api/network/partners-ops/claims/claim-1/proof`);
        const body = await resp.text();
        assert.equal(resp.status, 200);
        assert.match(body, /private proof/);
      }
    );
  } finally {
    fs.rmSync(diskPath, { force: true });
  }
});

test('partners-ops claim proof download is blocked for non-ops users', async () => {
  await withServer(
    {
      isOpsUser: async () => false,
      getClaimProofById: async () => {
        throw new Error('should not load proof for non-ops');
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/claims/claim-1/proof`);
      const body = await resp.json();
      assert.equal(resp.status, 403);
      assert.equal(body.ok, false);
    }
  );
});

test('maps claim pending conflict to 409', async () => {
  await withServer(
    {
      getInternalListingById: async () => ({ id: 'listing-1', status: 'unclaimed', features: { enable_lead_form: true } }),
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

test('public nominations accept provider details without collecting private stories', async () => {
  let received = null;
  await withServer(
    {
      createNetworkNomination: async (input) => {
        received = input;
        return { id: 'nomination-1', status: 'pending' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/nominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: 'Northside Pet Care',
          category_primary: 'vet',
          city: 'Seattle',
          state: 'wa',
          website_url: 'https://northside.example.test',
          nominator_email: 'friend@example.com',
          note: 'Suggested provider for future Pawket Network review.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(received.providerName, 'Northside Pet Care');
      assert.equal(received.categoryPrimary, 'vet');
      assert.equal(received.state, 'WA');
    }
  );
});

test('public nominations attach signed-in context when optional auth is present', async () => {
  let received = null;
  await withServer(
    {
      attachAuthIfPresent: async (req) => {
        req.dbUser = { id: 'signed-in-nominator' };
        return true;
      },
      createNetworkNomination: async (input) => {
        received = input;
        return { id: 'nomination-1', status: 'pending' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/nominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: 'Signed In Pet Care',
          category_primary: 'vet',
          city: 'Boston',
          state: 'ma',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(received.userId, 'signed-in-nominator');
    }
  );
});

test('public nominations accept cleaner as a Pawket Network category', async () => {
  let received = null;
  await withServer(
    {
      createNetworkNomination: async (input) => {
        received = input;
        return { id: 'nomination-1', status: 'pending' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/nominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: 'Clean Yard Pet Waste Removal',
          category_primary: 'cleaner',
          city: 'Worcester',
          state: 'ma',
          website_url: 'https://clean-yard.example.test',
          note: 'Pet waste cleanup provider for Network review.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(received.categoryPrimary, 'cleaner');
      assert.equal(received.state, 'MA');
    }
  );
});

test('public nominations reject private pet story details', async () => {
  let called = false;
  await withServer(
    {
      createNetworkNomination: async () => {
        called = true;
        return { id: 'nomination-1', status: 'pending' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/nominations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: 'Care Team',
          category_primary: 'vet',
          city: 'Denver',
          state: 'CO',
          note: 'My dog had surgery and I want to share the medical story.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /provider details only/i);
      assert.equal(called, false);
    }
  );
});

test('validates partners-ops nomination status filter', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      listNetworkNominations: async () => {
        called = true;
        return [];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/nominations?status=nope`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid nomination status filter/i);
      assert.equal(called, false);
    }
  );
});

test('launch import rejects claimed or partner status before DB write', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      upsertApprovedLaunchListing: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-launch-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            slug: 'real-care-team',
            name: 'Real Care Team',
            category_primary: 'vet',
            city: 'Austin',
            state: 'TX',
            short_description: 'Approved provider record for review.',
            website_url: 'https://real-care-team.org',
            status: 'partner',
          }],
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /must import as unclaimed/i);
      assert.equal(called, false);
    }
  );
});

test('launch import rejects placeholder provider contact values', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      upsertApprovedLaunchListing: async () => {
        called = true;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-launch-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            slug: 'placeholder-care-team',
            name: 'Placeholder Care Team',
            category_primary: 'vet',
            city: 'Austin',
            state: 'TX',
            short_description: 'Approved provider record for review.',
            website_url: 'https://placeholder.example.test',
          }],
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /placeholder contact data/i);
      assert.equal(called, false);
    }
  );
});

test('launch import accepts approved unclaimed provider records', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      upsertApprovedLaunchListing: async (item) => {
        received = item;
        return { id: 'listing-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-launch-listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            slug: 'real-grooming-team',
            name: 'Real Grooming Team',
            category_primary: 'groomer',
            city: 'Portland',
            state: 'OR',
            short_description: 'Approved grooming provider record.',
            website_url: 'https://real-grooming-team.org',
          }],
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.imported, 1);
      assert.equal(received.status, 'unclaimed');
      assert.equal(received.claim_status, 'pending');
      assert.equal(received.features.enable_lead_form, false);
    }
  );
});

test('candidate import stages source rows without publishing listings', async () => {
  const received = [];
  await withServer(
    {
      isOpsUser: async () => true,
      prepareNetworkImportCandidate: (item, defaults = {}) => ({ ...item, source: item.source || defaults.source, status: 'new' }),
      upsertNetworkImportCandidate: async (item) => {
        received.push(item);
        return { id: `candidate-${received.length}`, status: item.status };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'overture',
          items: [{
            name: 'Real Veterinary Group',
            category_primary: 'vet',
            city: 'Boston',
            state: 'MA',
            website_url: 'https://real-vet-group.org',
          }],
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.imported, 1);
      assert.equal(received[0].source, 'overture');
      assert.equal(received[0].status, 'new');
    }
  );
});

test('candidate import rejects pre-approved source statuses', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      upsertNetworkImportCandidate: async () => {
        called = true;
        return { id: 'candidate-1' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'overture',
          items: [{
            name: 'Real Veterinary Group',
            category_primary: 'vet',
            city: 'Boston',
            state: 'MA',
            status: 'approved',
          }],
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /can only start as new or needs_review/i);
      assert.equal(called, false);
    }
  );
});

test('validates import candidate queue filters', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      listNetworkImportCandidates: async () => {
        called = true;
        return { total: 0, limit: 120, offset: 0, items: [] };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates?status=not-real`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid candidate status filter/i);
      assert.equal(called, false);
    }
  );
});

test('passes import candidate readiness filters to ops queue', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      listNetworkImportCandidates: async (filters) => {
        received = filters;
        return { total: 0, limit: filters.limit, offset: filters.offset, items: [] };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates?status=all&readiness=promotable&source=osm&state=ma`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(received.status, 'all');
      assert.equal(received.readiness, 'promotable');
      assert.equal(received.source, 'osm');
      assert.equal(received.state, 'MA');
    }
  );
});

test('rejects invalid import candidate readiness filters', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      listNetworkImportCandidates: async () => {
        called = true;
        return { total: 0, limit: 120, offset: 0, items: [] };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates?readiness=verified`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid candidate readiness filter/i);
      assert.equal(called, false);
    }
  );
});

test('bulk updates selected import candidates without publishing listings', async () => {
  const calls = [];
  await withServer(
    {
      isOpsUser: async () => true,
      updateNetworkImportCandidateStatus: async (id, reviewerId, patch) => {
        calls.push({ id, reviewerId, patch });
        return { id, status: patch.status || 'needs_review', review_notes: patch.review_notes || null };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: ['candidate-a', 'candidate-b', 'candidate-a'],
          status: 'approved',
          review_notes: 'Reviewed source and basics; still not public until promoted.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.updated, 2);
      assert.deepEqual(body.missing, []);
      assert.equal(calls.length, 2);
      assert.deepEqual(calls.map((call) => call.id), ['candidate-a', 'candidate-b']);
      assert.equal(calls[0].patch.status, 'approved');
      assert.match(calls[0].patch.review_notes, /not public until promoted/i);
    }
  );
});

test('bulk import candidate update cannot set promoted status', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      updateNetworkImportCandidateStatus: async () => {
        called = true;
        return { id: 'candidate-1', status: 'promoted' };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['candidate-a'], status: 'promoted' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Use promote action/i);
      assert.equal(called, false);
    }
  );
});

test('returns import candidate summary for ops review dashboard', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      summarizeNetworkImportCandidates: async (filters) => {
        received = filters;
        return {
          total: 7,
          average_confidence: 74.5,
          readiness: { with_contact: 5, missing_contact: 2, with_location: 7, missing_location: 0, promotable: 4 },
          by_status: [{ key: 'new', count: 5 }, { key: 'needs_review', count: 2 }],
          by_source: [{ key: 'irs_eo_bmf', count: 7 }],
          by_state: [{ key: 'MA', count: 7 }],
          by_category: [{ key: 'rescue', count: 4 }, { key: 'shelter', count: 3 }],
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates/summary?source=irs_eo_bmf&state=ma&readiness=needs_contact`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.summary.total, 7);
      assert.equal(body.summary.readiness.promotable, 4);
      assert.equal(received.source, 'irs_eo_bmf');
      assert.equal(received.state, 'MA');
      assert.equal(received.status, 'all');
      assert.equal(received.readiness, 'needs_contact');
    }
  );
});

test('candidate promotion uses launch-safe listing gate', async () => {
  let promoted = null;
  await withServer(
    {
      isOpsUser: async () => true,
      promoteNetworkImportCandidate: async (_id, _reviewerId, options) => {
        promoted = options;
        return { candidate: { id: 'candidate-1', status: 'promoted' }, listing: { id: 'listing-1', status: 'unclaimed' } };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/network/partners-ops/import-candidates/candidate-1/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url: 'https://real-vet-group.org',
          short_description: 'Real source row promoted as an unclaimed Network Listing.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.listing.status, 'unclaimed');
      assert.equal(promoted.website_url, 'https://real-vet-group.org');
    }
  );
});
