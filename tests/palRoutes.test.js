import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import palRouter, { __resetPalRouteDepsForTests, __setPalRouteDepsForTests } from '../routes/palRoutes.js';

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';

function authedRequireAuth(userId = TEST_USER_ID) {
  return () => (req, _res, next) => {
    req.dbUser = { id: userId, email: 'pal-owner@example.com' };
    req.user = { id: userId, email: 'pal-owner@example.com' };
    next();
  };
}

function unauthorizedRequireAuth() {
  return () => (_req, res) => res.status(401).json({ ok: false, error: 'Unauthorized' });
}

async function withServer(depOverrides, run) {
  __resetPalRouteDepsForTests();
  __setPalRouteDepsForTests({
    requireAuth: authedRequireAuth(),
    listPawketPalsForUser: async () => [],
    getPawketPalForUser: async () => null,
    getPublicCommunityPawketPalPreviewByHeartCode: async () => null,
    isOpsUser: async () => false,
    listCommunityPawketPalDrafts: async () => [],
    listPublicCommunityPawketPalPreviews: async () => [],
    createCommunityPawketPalDraft: async () => null,
    updateCommunityPawketPalDraft: async () => null,
    submitCommunityPawketPalReleaseGate: async () => null,
    approveCommunityPawketPalPublicPreview: async () => null,
    archiveCommunityPawketPalPublicPreview: async () => null,
    listPawketPalReviewQueue: async () => [],
    summarizePawketPalReviewQueue: async () => ({ total: 0, byStatus: [], requestedRights: {} }),
    updatePawketPalReviewStatus: async () => null,
    createPawketPalStorySubmission: async (input) => ({
      id: '44444444-4444-4444-8444-444444444444',
      heartCode: 'PAL-HON-2026-F1E2D3C4B5',
      name: input.name || `${input.storyTitle} Pal`,
      palClass: 'honorary',
      privacyState: 'private',
      consentState: 'review_required',
      releaseState: 'draft',
      originType: 'story_submission',
      ownerUserId: input.ownerUserId,
    }),
    createHonoraryPawketPal: async (input) => ({
      id: '22222222-2222-4222-8222-222222222222',
      heartCode: 'PAL-HON-2026-A1B2C3D4E5',
      name: input.name,
      palClass: 'honorary',
      privacyState: 'private',
      consentState: 'granted',
      releaseState: 'draft',
      ownerUserId: input.ownerUserId,
    }),
    ...(depOverrides || {}),
  });

  const app = express();
  app.use(express.json());
  app.use('/api/pals', palRouter);
  const server = app.listen(0);
  await once(server, 'listening');
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    __resetPalRouteDepsForTests();
  }
}

test('lists private Pawket Pals for the authenticated account', async () => {
  let received = null;
  await withServer(
    {
      listPawketPalsForUser: async (ownerUserId, options) => {
        received = { ownerUserId, options };
        return [{ id: 'pal-1', heartCode: 'PAL-HON-2026-A1B2C3D4E5', name: 'Sunny' }];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals?limit=12`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.pals.length, 1);
      assert.deepEqual(received, { ownerUserId: TEST_USER_ID, options: { limit: 12 } });
    }
  );
});

test('rejects invalid list limits before calling the data layer', async () => {
  let called = false;
  await withServer(
    {
      listPawketPalsForUser: async () => {
        called = true;
        return [];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals?limit=99`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid limit/i);
      assert.equal(called, false);
    }
  );
});

test('creates only an authenticated private Honorary Pal record', async () => {
  let received = null;
  await withServer(
    {
      createHonoraryPawketPal: async (input) => {
        received = input;
        return {
          id: '22222222-2222-4222-8222-222222222222',
          heartCode: 'PAL-HON-2026-A1B2C3D4E5',
          name: input.name,
          palClass: 'honorary',
          privacyState: 'private',
          consentState: 'granted',
          releaseState: 'draft',
          ownerUserId: input.ownerUserId,
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/honorary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sunny',
          consent: { allowPrivatePal: true },
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.pal.palClass, 'honorary');
      assert.equal(body.pal.privacyState, 'private');
      assert.equal(received.ownerUserId, TEST_USER_ID);
      assert.equal(received.name, 'Sunny');
    }
  );
});

test('surfaces Honorary Pal validation failures without publishing a Pal', async () => {
  const validationError = new Error('publicStorySummary requires public story or community Pal consent for review');
  validationError.statusCode = 400;
  validationError.code = 'PUBLIC_STORY_CONSENT_REQUIRED';

  await withServer(
    {
      createHonoraryPawketPal: async () => {
        throw validationError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/honorary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sunny', publicStorySummary: 'Share this story.' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'PUBLIC_STORY_CONSENT_REQUIRED');
    }
  );
});

test('submits a Pawket Pal story intake item for review without publishing it', async () => {
  let received = null;
  await withServer(
    {
      createPawketPalStorySubmission: async (input) => {
        received = input;
        return {
          id: '44444444-4444-4444-8444-444444444444',
          heartCode: 'PAL-HON-2026-F1E2D3C4B5',
          name: 'Sunny Story Pal',
          palClass: 'honorary',
          privacyState: 'private',
          consentState: 'review_required',
          releaseState: 'draft',
          originType: 'story_submission',
          ownerUserId: input.ownerUserId,
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/story-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: 'Sunny finds a new home',
          storyType: 'adoption',
          storyText: 'Sunny was nervous at first, then settled into a safe routine with patient care.',
          publicStorySummary: 'Sunny can be reviewed as a consent-safe adoption story.',
          consent: {
            allowPublicStory: true,
            allowCommunityPal: true,
          },
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.pal.originType, 'story_submission');
      assert.equal(body.pal.privacyState, 'private');
      assert.equal(body.pal.consentState, 'review_required');
      assert.equal(body.pal.releaseState, 'draft');
      assert.equal(received.ownerUserId, TEST_USER_ID);
      assert.equal(received.storyType, 'adoption');
    }
  );
});

test('surfaces Pawket Pal story intake validation without creating a public Pal', async () => {
  const validationError = new Error('publicStorySummary must be at least 20 characters');
  validationError.statusCode = 400;
  validationError.code = 'PUBLIC_SUMMARY_REQUIRED';

  await withServer(
    {
      createPawketPalStorySubmission: async () => {
        throw validationError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/story-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyTitle: 'Sunny',
          storyText: 'Sunny has a submitted story long enough for intake.',
          publicStorySummary: 'Too short',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'PUBLIC_SUMMARY_REQUIRED');
    }
  );
});

test('returns a private Pal by HeartCode only for the authenticated owner', async () => {
  let received = null;
  await withServer(
    {
      getPawketPalForUser: async (identifier, ownerUserId) => {
        received = { identifier, ownerUserId };
        return {
          id: '22222222-2222-4222-8222-222222222222',
          heartCode: 'PAL-HON-2026-A1B2C3D4E5',
          name: 'Sunny',
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/PAL-HON-2026-A1B2C3D4E5`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.pal.name, 'Sunny');
      assert.deepEqual(received, {
        identifier: 'PAL-HON-2026-A1B2C3D4E5',
        ownerUserId: TEST_USER_ID,
      });
    }
  );
});

test('requires authentication for private Pawket Pal APIs', async () => {
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals`);
      const body = await resp.json();
      assert.equal(resp.status, 401);
      assert.equal(body.ok, false);
    }
  );
});

test('lists redacted Community Pal previews without requiring authentication', async () => {
  let received = null;
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
      listPublicCommunityPawketPalPreviews: async (options) => {
        received = options;
        return [{
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          name: 'Sunny Community Pal',
          palClass: 'community',
          previewState: 'release_review_ready',
          releaseState: 'review',
          publicStorySummary: 'A consent-safe Community Pal preview.',
          inspiredBy: 'Consent-safe adoption story',
          traits: { primaryTrait: 'gentle', kindnessAffinity: 'comfort', questAbility: 'safe-space boost' },
          boundaries: {
            privateStoryRedacted: true,
            ownerRedacted: true,
            sourceHeartCodeRedacted: true,
            marketEnabled: false,
            transferLocked: true,
            publicPreviewApproved: false,
            publicSurfaceApproved: false,
            publicRelease: false,
            publicDrop: false,
          },
        }];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/community-previews?limit=6`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.previews.length, 1);
      assert.equal(body.previews[0].palClass, 'community');
      assert.equal(body.previews[0].boundaries.privateStoryRedacted, true);
      assert.equal(body.previews[0].boundaries.ownerRedacted, true);
      assert.equal(body.previews[0].boundaries.publicPreviewApproved, false);
      assert.equal(body.previews[0].boundaries.publicRelease, false);
      assert.equal(body.previews[0].boundaries.publicDrop, false);
      assert.deepEqual(received, { limit: 6 });
    }
  );
});

test('lists approved public Community Pal previews as redacted preview records', async () => {
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
      listPublicCommunityPawketPalPreviews: async () => [{
        heartCode: 'PAL-COM-2026-B1C2D3E4F5',
        name: 'River Community Pal',
        palClass: 'community',
        previewState: 'public_preview_approved',
        releaseState: 'active',
        publicStorySummary: 'A public-safe Community Pal preview.',
        inspiredBy: 'Consent-safe community story',
        traits: { primaryTrait: 'brave' },
        boundaries: {
          privateStoryRedacted: true,
          ownerRedacted: true,
          sourceHeartCodeRedacted: true,
          marketEnabled: false,
          transferLocked: true,
          publicPreviewApproved: true,
          publicSurfaceApproved: true,
          publicRelease: true,
          publicDrop: false,
          charmClaimEnabled: false,
          cherishClaimEnabled: false,
        },
      }],
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/community-previews`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.previews[0].previewState, 'public_preview_approved');
      assert.equal(body.previews[0].releaseState, 'active');
      assert.equal(body.previews[0].boundaries.publicPreviewApproved, true);
      assert.equal(body.previews[0].boundaries.marketEnabled, false);
      assert.equal(body.previews[0].boundaries.transferLocked, true);
      assert.equal(body.previews[0].boundaries.publicDrop, false);
    }
  );
});

test('returns a redacted approved Community Pal detail by HeartCode without authentication', async () => {
  let received = null;
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
      getPublicCommunityPawketPalPreviewByHeartCode: async (heartCode) => {
        received = heartCode;
        return {
          heartCode,
          name: 'River Community Pal',
          palClass: 'community',
          previewState: 'public_preview_approved',
          releaseState: 'active',
          publicStorySummary: 'A public-safe Community Pal preview.',
          inspiredBy: 'Consent-safe community story',
          traits: { primaryTrait: 'brave' },
          boundaries: {
            privateStoryRedacted: true,
            ownerRedacted: true,
            sourceHeartCodeRedacted: true,
            marketEnabled: false,
            transferLocked: true,
            publicPreviewApproved: true,
            publicDrop: false,
            charmClaimEnabled: false,
            cherishClaimEnabled: false,
          },
          detailSections: {
            identity: { heartCode, publicStatus: 'Approved public preview' },
            story: { summary: 'A public-safe Community Pal preview.', privacyNote: 'Private source story is redacted.' },
            safeguards: [{ label: 'Private story', value: 'Redacted' }],
            futureHooks: [{ label: 'Share Studio', status: 'Planned', body: 'Can become cards later.' }],
          },
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/community-previews/PAL-COM-2026-B1C2D3E4F5`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.preview.heartCode, 'PAL-COM-2026-B1C2D3E4F5');
      assert.equal(body.preview.boundaries.ownerRedacted, true);
      assert.equal(body.preview.boundaries.sourceHeartCodeRedacted, true);
      assert.equal(body.preview.boundaries.publicDrop, false);
      assert.equal(body.preview.detailSections.identity.publicStatus, 'Approved public preview');
      assert.equal(received, 'PAL-COM-2026-B1C2D3E4F5');
    }
  );
});

test('returns 404 for Community Pal detail records that are not public-approved', async () => {
  await withServer(
    {
      requireAuth: unauthorizedRequireAuth(),
      getPublicCommunityPawketPalPreviewByHeartCode: async () => null,
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/community-previews/PAL-COM-2026-NOTPUBLIC`);
      const body = await resp.json();
      assert.equal(resp.status, 404);
      assert.equal(body.ok, false);
      assert.match(body.error, /not found/i);
    }
  );
});

test('returns 403 for Pawket Pal review ops routes for non-ops users', async () => {
  await withServer(
    {
      isOpsUser: async () => false,
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/review-queue`);
      const body = await resp.json();
      assert.equal(resp.status, 403);
      assert.equal(body.ok, false);
    }
  );
});

test('lists Pawket Pal story review rows for ops users', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      listPawketPalReviewQueue: async (options) => {
        received = options;
        return [{
          id: '33333333-3333-4333-8333-333333333333',
          palId: '22222222-2222-4222-8222-222222222222',
          heartCode: 'PAL-HON-2026-A1B2C3D4E5',
          palName: 'Sunny',
          status: 'pending',
          allowPublicStory: true,
        }];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/review-queue?status=pending&limit=12`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.items.length, 1);
      assert.deepEqual(received, { status: 'pending', limit: 12 });
    }
  );
});

test('validates Pawket Pal review queue status before calling the data layer', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      listPawketPalReviewQueue: async () => {
        called = true;
        return [];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/review-queue?status=public`);
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid Pawket Pal review status/i);
      assert.equal(called, false);
    }
  );
});

test('updates Pawket Pal story review status without publishing a Pal', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      updatePawketPalReviewStatus: async (id, reviewerUserId, patch) => {
        received = { id, reviewerUserId, patch };
        return {
          id,
          palId: '22222222-2222-4222-8222-222222222222',
          heartCode: 'PAL-HON-2026-A1B2C3D4E5',
          palName: 'Sunny',
          status: patch.status,
          privacyState: 'private',
          releaseState: 'draft',
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/review-queue/33333333-3333-4333-8333-333333333333`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'granted', reviewNotes: 'Consent checked; release still blocked.' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.item.status, 'granted');
      assert.equal(body.item.privacyState, 'private');
      assert.equal(body.item.releaseState, 'draft');
      assert.deepEqual(received, {
        id: '33333333-3333-4333-8333-333333333333',
        reviewerUserId: TEST_USER_ID,
        patch: { status: 'granted', reviewNotes: 'Consent checked; release still blocked.' },
      });
    }
  );
});

test('validates Pawket Pal review patch status before calling the data layer', async () => {
  let called = false;
  await withServer(
    {
      isOpsUser: async () => true,
      updatePawketPalReviewStatus: async () => {
        called = true;
        return null;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/review-queue/33333333-3333-4333-8333-333333333333`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'public' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 400);
      assert.equal(body.ok, false);
      assert.match(body.error, /Invalid Pawket Pal review status/i);
      assert.equal(called, false);
    }
  );
});

test('lists internal Community Pal drafts for ops users only', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      listCommunityPawketPalDrafts: async (options) => {
        received = options;
        return [{
          id: '55555555-5555-4555-8555-555555555555',
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          name: 'Sunny Community Pal',
          palClass: 'community',
          privacyState: 'private',
          releaseState: 'draft',
          sourceHeartCode: 'PAL-HON-2026-A1B2C3D4E5',
        }];
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts?limit=10`);
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.drafts.length, 1);
      assert.equal(body.drafts[0].privacyState, 'private');
      assert.equal(body.drafts[0].releaseState, 'draft');
      assert.deepEqual(received, { limit: 10 });
    }
  );
});

test('creates an internal Community Pal draft from granted review consent without publishing it', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      createCommunityPawketPalDraft: async (input) => {
        received = input;
        return {
          id: '55555555-5555-4555-8555-555555555555',
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          name: input.name || 'Sunny Community Pal',
          palClass: 'community',
          privacyState: 'private',
          consentState: 'granted',
          releaseState: 'draft',
          marketEnabled: false,
          transferLocked: true,
          sourceConsentId: input.consentId,
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId: '33333333-3333-4333-8333-333333333333',
          name: 'Sunny Community Pal',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 201);
      assert.equal(body.ok, true);
      assert.equal(body.draft.palClass, 'community');
      assert.equal(body.draft.privacyState, 'private');
      assert.equal(body.draft.releaseState, 'draft');
      assert.equal(body.draft.marketEnabled, false);
      assert.equal(body.draft.transferLocked, true);
      assert.deepEqual(received, {
        consentId: '33333333-3333-4333-8333-333333333333',
        name: 'Sunny Community Pal',
        actorUserId: TEST_USER_ID,
      });
    }
  );
});

test('maps Community Pal draft consent gate failures without creating a public Pal', async () => {
  const gateError = new Error('Community Pal drafts require granted story review consent');
  gateError.statusCode = 409;
  gateError.code = 'COMMUNITY_DRAFT_REVIEW_REQUIRED';

  await withServer(
    {
      isOpsUser: async () => true,
      createCommunityPawketPalDraft: async () => {
        throw gateError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: '33333333-3333-4333-8333-333333333333' }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'COMMUNITY_DRAFT_REVIEW_REQUIRED');
    }
  );
});

test('updates an internal Community Pal draft workbench without publishing it', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      updateCommunityPawketPalDraft: async (draftId, actorUserId, input) => {
        received = { draftId, actorUserId, input };
        return {
          id: draftId,
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          name: input.name,
          palClass: 'community',
          privacyState: 'private',
          releaseState: 'draft',
          marketEnabled: false,
          transferLocked: true,
          publicStorySummary: input.characterSummary,
          traits: input.traits,
          metadata: {
            communityDraft: {
              artDirectionNotes: input.artDirectionNotes,
              releaseChecklist: input.releaseChecklist,
              publicReleaseChanged: false,
            },
          },
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sunny the Porch Pal',
          characterSummary: 'A gentle Community Pal about safe routines and patient family care.',
          artDirectionNotes: 'Warm porch light, soft teal scarf, calm companion pose.',
          traits: { primaryTrait: 'gentle', questAbility: 'comfort' },
          releaseChecklist: {
            consentAuditPassed: true,
            publicCopyReviewed: true,
          },
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.draft.privacyState, 'private');
      assert.equal(body.draft.releaseState, 'draft');
      assert.equal(body.draft.marketEnabled, false);
      assert.equal(body.draft.transferLocked, true);
      assert.equal(received.draftId, '55555555-5555-4555-8555-555555555555');
      assert.equal(received.actorUserId, TEST_USER_ID);
      assert.equal(received.input.traits.primaryTrait, 'gentle');
    }
  );
});

test('submits a Community Pal draft release gate without making it public', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      submitCommunityPawketPalReleaseGate: async (draftId, actorUserId, input) => {
        received = { draftId, actorUserId, input };
        return {
          id: draftId,
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          palClass: 'community',
          privacyState: 'private',
          releaseState: 'review',
          marketEnabled: false,
          transferLocked: true,
          metadata: {
            communityDraft: {
              releaseGate: {
                status: 'release_review_ready',
                publicReleaseChanged: false,
              },
            },
          },
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/release-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPrivateStoryProtected: true,
          releaseGateNotes: 'Ready for future public surface review.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.draft.privacyState, 'private');
      assert.equal(body.draft.releaseState, 'review');
      assert.equal(body.draft.metadata.communityDraft.releaseGate.publicReleaseChanged, false);
      assert.deepEqual(received, {
        draftId: '55555555-5555-4555-8555-555555555555',
        actorUserId: TEST_USER_ID,
        input: {
          confirmPrivateStoryProtected: true,
          releaseGateNotes: 'Ready for future public surface review.',
        },
      });
    }
  );
});

test('returns release gate missing details without publishing a Community Pal', async () => {
  const gateError = new Error('Community Pal draft is missing release gate items: consent audit');
  gateError.statusCode = 409;
  gateError.code = 'COMMUNITY_DRAFT_RELEASE_GATE_INCOMPLETE';
  gateError.details = { missing: ['consent audit'] };

  await withServer(
    {
      isOpsUser: async () => true,
      submitCommunityPawketPalReleaseGate: async () => {
        throw gateError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/release-gate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmPrivateStoryProtected: true }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'COMMUNITY_DRAFT_RELEASE_GATE_INCOMPLETE');
      assert.deepEqual(body.details, { missing: ['consent audit'] });
    }
  );
});

test('approves a Community Pal public preview only after guarded confirmations', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      approveCommunityPawketPalPublicPreview: async (draftId, actorUserId, input) => {
        received = { draftId, actorUserId, input };
        return {
          id: draftId,
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          palClass: 'community',
          privacyState: 'public',
          releaseState: 'active',
          marketEnabled: false,
          transferLocked: true,
          charmEnabled: false,
          cherishEnabled: false,
          metadata: {
            communityDraft: {
              publicApproval: {
                status: 'public_preview_approved',
                noMarketOrTrading: true,
                noCharmCherishClaims: true,
                privateStoryRedacted: true,
                publicDrop: false,
              },
            },
          },
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/public-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPublicPreviewReady: true,
          confirmPrivateStoryRedacted: true,
          confirmNoMarketOrTrading: true,
          confirmNoCharmCherishClaims: true,
          publicApprovalNotes: 'Approved for redacted preview only.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.draft.privacyState, 'public');
      assert.equal(body.draft.releaseState, 'active');
      assert.equal(body.draft.marketEnabled, false);
      assert.equal(body.draft.transferLocked, true);
      assert.equal(body.draft.charmEnabled, false);
      assert.equal(body.draft.cherishEnabled, false);
      assert.equal(body.draft.metadata.communityDraft.publicApproval.status, 'public_preview_approved');
      assert.deepEqual(received, {
        draftId: '55555555-5555-4555-8555-555555555555',
        actorUserId: TEST_USER_ID,
        input: {
          confirmPublicPreviewReady: true,
          confirmPrivateStoryRedacted: true,
          confirmNoMarketOrTrading: true,
          confirmNoCharmCherishClaims: true,
          publicApprovalNotes: 'Approved for redacted preview only.',
        },
      });
    }
  );
});

test('returns public preview approval missing details without enabling market or claims', async () => {
  const approvalError = new Error('Community Pal public preview approval is missing items: release gate ready status');
  approvalError.statusCode = 409;
  approvalError.code = 'COMMUNITY_PUBLIC_APPROVAL_INCOMPLETE';
  approvalError.details = { missing: ['release gate ready status'] };

  await withServer(
    {
      isOpsUser: async () => true,
      approveCommunityPawketPalPublicPreview: async () => {
        throw approvalError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/public-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmPublicPreviewReady: true,
          confirmPrivateStoryRedacted: true,
          confirmNoMarketOrTrading: true,
          confirmNoCharmCherishClaims: true,
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'COMMUNITY_PUBLIC_APPROVAL_INCOMPLETE');
      assert.deepEqual(body.details, { missing: ['release gate ready status'] });
    }
  );
});

test('archives an approved Community Pal public preview without enabling market or claims', async () => {
  let received = null;
  await withServer(
    {
      isOpsUser: async () => true,
      archiveCommunityPawketPalPublicPreview: async (draftId, actorUserId, input) => {
        received = { draftId, actorUserId, input };
        return {
          id: draftId,
          heartCode: 'PAL-COM-2026-A1B2C3D4E5',
          palClass: 'community',
          privacyState: 'private',
          releaseState: 'archived',
          marketEnabled: false,
          transferLocked: true,
          charmEnabled: false,
          cherishEnabled: false,
          metadata: {
            communityDraft: {
              publicArchive: {
                status: 'public_preview_archived',
                removedFromPublicPreview: true,
                noMarketOrTrading: true,
                noCharmCherishClaims: true,
              },
            },
          },
        };
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/public-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmRemovePublicPreview: true,
          archiveNotes: 'Takedown requested after public review.',
        }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.draft.privacyState, 'private');
      assert.equal(body.draft.releaseState, 'archived');
      assert.equal(body.draft.marketEnabled, false);
      assert.equal(body.draft.transferLocked, true);
      assert.equal(body.draft.metadata.communityDraft.publicArchive.status, 'public_preview_archived');
      assert.deepEqual(received, {
        draftId: '55555555-5555-4555-8555-555555555555',
        actorUserId: TEST_USER_ID,
        input: {
          confirmRemovePublicPreview: true,
          archiveNotes: 'Takedown requested after public review.',
        },
      });
    }
  );
});

test('returns archive gate details without removing inactive Community Pal records', async () => {
  const archiveError = new Error('Only active approved public Community Pal previews can be archived from this action');
  archiveError.statusCode = 409;
  archiveError.code = 'COMMUNITY_PUBLIC_ARCHIVE_NOT_ACTIVE';
  archiveError.details = { missing: ['active approved public preview state'] };

  await withServer(
    {
      isOpsUser: async () => true,
      archiveCommunityPawketPalPublicPreview: async () => {
        throw archiveError;
      },
    },
    async (base) => {
      const resp = await fetch(`${base}/api/pals/ops/community-drafts/55555555-5555-4555-8555-555555555555/public-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmRemovePublicPreview: true }),
      });
      const body = await resp.json();
      assert.equal(resp.status, 409);
      assert.equal(body.ok, false);
      assert.equal(body.code, 'COMMUNITY_PUBLIC_ARCHIVE_NOT_ACTIVE');
      assert.deepEqual(body.details, { missing: ['active approved public preview state'] });
    }
  );
});
