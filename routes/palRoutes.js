// routes/palRoutes.js - private Pawket Pal identity APIs.
import express from 'express';
import { requireAuth as requireAuthDefault } from '../middleware/requireAuth.js';
import {
  approveCommunityPawketPalPublicPreview,
  archiveCommunityPawketPalPublicPreview,
  createCommunityPawketPalDraft,
  createHonoraryPawketPal,
  createPawketPalStorySubmission,
  getPublicCommunityPawketPalPreviewByHeartCode,
  getPawketPalForUser,
  listCommunityPawketPalDrafts,
  listPublicCommunityPawketPalPreviews,
  listPawketPalsForUser,
  listPawketPalReviewQueue,
  submitCommunityPawketPalReleaseGate,
  summarizePawketPalReviewQueue,
  updateCommunityPawketPalDraft,
  updatePawketPalReviewStatus,
} from '../palDB.pg.js';
import { isOpsUser } from '../networkDB.pg.js';

const router = express.Router();

let deps = {
  requireAuth: requireAuthDefault,
  approveCommunityPawketPalPublicPreview,
  archiveCommunityPawketPalPublicPreview,
  createCommunityPawketPalDraft,
  createHonoraryPawketPal,
  createPawketPalStorySubmission,
  getPublicCommunityPawketPalPreviewByHeartCode,
  getPawketPalForUser,
  listCommunityPawketPalDrafts,
  listPublicCommunityPawketPalPreviews,
  listPawketPalsForUser,
  listPawketPalReviewQueue,
  submitCommunityPawketPalReleaseGate,
  summarizePawketPalReviewQueue,
  updateCommunityPawketPalDraft,
  updatePawketPalReviewStatus,
  isOpsUser,
};

const defaultDeps = { ...deps };

export function __setPalRouteDepsForTests(partial = {}) {
  deps = { ...deps, ...(partial || {}) };
}

export function __resetPalRouteDepsForTests() {
  deps = { ...defaultDeps };
}

function palAuth(req, res, next) {
  if (deps.requireAuth.length >= 3) return deps.requireAuth(req, res, next);
  return deps.requireAuth()(req, res, next);
}

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

function requireDbUser(req, res, next) {
  if (!req.dbUser?.id) return unauthorized(res);
  return next();
}

function requireOps() {
  return async (req, res, next) => {
    const userId = req.dbUser?.id;
    if (!userId) return unauthorized(res);
    const ok = await deps.isOpsUser(userId).catch(() => false);
    if (!ok) return res.status(403).json({ ok: false, error: 'Forbidden' });
    return next();
  };
}

function routeError(res, err) {
  const status = Number.isInteger(err?.statusCode) ? err.statusCode : 500;
  const message = status >= 500 ? 'Pawket Pal request failed' : err.message;
  return res.status(status).json({
    ok: false,
    error: message,
    ...(err?.code ? { code: err.code } : {}),
    ...(err?.details ? { details: err.details } : {}),
  });
}

const VALID_REVIEW_STATUSES = new Set(['review_required', 'pending', 'granted', 'revoked']);
const VALID_REVIEW_QUEUE_STATUSES = new Set([...VALID_REVIEW_STATUSES, 'all']);

function limitFromQuery(query = {}) {
  const raw = query.limit ?? query.page_size ?? query.pageSize;
  if (raw == null || raw === '') return 24;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 48) return null;
  return parsed;
}

function reviewLimitFromQuery(query = {}) {
  const raw = query.limit ?? query.page_size ?? query.pageSize;
  if (raw == null || raw === '') return 80;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 250) return null;
  return parsed;
}

function reviewStatusFromQuery(query = {}) {
  const status = String(query.status || 'review_required').trim() || 'review_required';
  return VALID_REVIEW_QUEUE_STATUSES.has(status) ? status : null;
}

router.use(express.json({ limit: '2mb' }));

router.get('/community-previews', async (req, res) => {
  const limit = limitFromQuery(req.query);
  if (limit == null) {
    return res.status(400).json({ ok: false, error: 'Invalid limit value' });
  }

  try {
    const previews = await deps.listPublicCommunityPawketPalPreviews({ limit });
    return res.json({ ok: true, previews });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/community-previews/:heartCode', async (req, res) => {
  try {
    const preview = await deps.getPublicCommunityPawketPalPreviewByHeartCode(req.params.heartCode);
    if (!preview) return res.status(404).json({ ok: false, error: 'Community Pal preview not found' });
    return res.json({ ok: true, preview });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/', palAuth, requireDbUser, async (req, res) => {
  const limit = limitFromQuery(req.query);
  if (limit == null) {
    return res.status(400).json({ ok: false, error: 'Invalid limit value' });
  }

  try {
    const pals = await deps.listPawketPalsForUser(req.dbUser.id, { limit });
    return res.json({ ok: true, pals });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/honorary', palAuth, requireDbUser, async (req, res) => {
  try {
    const pal = await deps.createHonoraryPawketPal({
      ...(req.body || {}),
      ownerUserId: req.dbUser.id,
    });
    return res.status(201).json({ ok: true, pal });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/story-submissions', palAuth, requireDbUser, async (req, res) => {
  try {
    const pal = await deps.createPawketPalStorySubmission({
      ...(req.body || {}),
      ownerUserId: req.dbUser.id,
    });
    return res.status(201).json({ ok: true, pal });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/ops/review-queue/summary', palAuth, requireDbUser, requireOps(), async (_req, res) => {
  try {
    const summary = await deps.summarizePawketPalReviewQueue();
    return res.json({ ok: true, summary });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/ops/review-queue', palAuth, requireDbUser, requireOps(), async (req, res) => {
  const status = reviewStatusFromQuery(req.query);
  if (!status) {
    return res.status(400).json({ ok: false, error: 'Invalid Pawket Pal review status' });
  }
  const limit = reviewLimitFromQuery(req.query);
  if (limit == null) {
    return res.status(400).json({ ok: false, error: 'Invalid limit value' });
  }

  try {
    const items = await deps.listPawketPalReviewQueue({ status, limit });
    return res.json({ ok: true, items });
  } catch (err) {
    return routeError(res, err);
  }
});

router.patch('/ops/review-queue/:id', palAuth, requireDbUser, requireOps(), async (req, res) => {
  const body = req.body || {};
  if (body.status !== undefined && body.status !== null && body.status !== '') {
    const status = String(body.status).trim();
    if (!VALID_REVIEW_STATUSES.has(status)) {
      return res.status(400).json({ ok: false, error: 'Invalid Pawket Pal review status' });
    }
  }

  try {
    const item = await deps.updatePawketPalReviewStatus(req.params.id, req.dbUser.id, body);
    if (!item) return res.status(404).json({ ok: false, error: 'Pawket Pal review item not found' });
    return res.json({ ok: true, item });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/ops/community-drafts', palAuth, requireDbUser, requireOps(), async (req, res) => {
  const limit = reviewLimitFromQuery(req.query);
  if (limit == null) {
    return res.status(400).json({ ok: false, error: 'Invalid limit value' });
  }

  try {
    const drafts = await deps.listCommunityPawketPalDrafts({ limit });
    return res.json({ ok: true, drafts });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/ops/community-drafts', palAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const draft = await deps.createCommunityPawketPalDraft({
      ...(req.body || {}),
      actorUserId: req.dbUser.id,
    });
    if (!draft) return res.status(404).json({ ok: false, error: 'Pawket Pal review item not found' });
    return res.status(201).json({ ok: true, draft });
  } catch (err) {
    return routeError(res, err);
  }
});

router.patch('/ops/community-drafts/:id', palAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const draft = await deps.updateCommunityPawketPalDraft(req.params.id, req.dbUser.id, req.body || {});
    if (!draft) return res.status(404).json({ ok: false, error: 'Community Pal draft not found' });
    return res.json({ ok: true, draft });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/ops/community-drafts/:id/release-gate', palAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const draft = await deps.submitCommunityPawketPalReleaseGate(req.params.id, req.dbUser.id, req.body || {});
    if (!draft) return res.status(404).json({ ok: false, error: 'Community Pal draft not found' });
    return res.json({ ok: true, draft });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/ops/community-drafts/:id/public-approval', palAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const draft = await deps.approveCommunityPawketPalPublicPreview(req.params.id, req.dbUser.id, req.body || {});
    if (!draft) return res.status(404).json({ ok: false, error: 'Community Pal draft not found' });
    return res.json({ ok: true, draft });
  } catch (err) {
    return routeError(res, err);
  }
});

router.post('/ops/community-drafts/:id/public-archive', palAuth, requireDbUser, requireOps(), async (req, res) => {
  try {
    const draft = await deps.archiveCommunityPawketPalPublicPreview(req.params.id, req.dbUser.id, req.body || {});
    if (!draft) return res.status(404).json({ ok: false, error: 'Community Pal draft not found' });
    return res.json({ ok: true, draft });
  } catch (err) {
    return routeError(res, err);
  }
});

router.get('/:idOrHeartCode', palAuth, requireDbUser, async (req, res) => {
  try {
    const pal = await deps.getPawketPalForUser(req.params.idOrHeartCode, req.dbUser.id);
    if (!pal) return res.status(404).json({ ok: false, error: 'Pawket Pal not found' });
    return res.json({ ok: true, pal });
  } catch (err) {
    return routeError(res, err);
  }
});

export default router;
