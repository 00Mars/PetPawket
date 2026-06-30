// routes/loopRoutes.js - Pawket Pass API backed by existing loop tables

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, softSession } from '../middleware/requireAuth.js';
import {
  createLoopToken,
  getLoopTokenByCode,
  getLoopSummary,
  markLoopTokenSeen,
  listLoopTokens,
  clearLoopTokensForUser,
  getLoopLeaderboard,
  getRandomImpactStory,
  getImpactStories,
  addImpactStory,
  getActiveImpactCase,
  getImpactSummaryForUser,
  getRecentFundedImpactCase,
  listImpactCases,
  updateImpactCase,
  activateImpactCase,
  ensureUser,
  awardMonthlyLeaderboard
} from '../userDB.pg.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PLACEHOLDER_PATH = path.join(__dirname, '..', 'public', 'data', 'charm-placeholders.json');
let PLACEHOLDER_STORY = {
  title: 'Protected memorial origin',
  body: 'CHARM honors the love behind Pet Pawket while public rescue stories, medical updates, and memorial submissions stay consent-aware and carefully reviewed.',
  petName: '',
  imageUrl: ''
};

try {
  const raw = fs.readFileSync(PLACEHOLDER_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  if (parsed?.storyPlaceholder) {
    PLACEHOLDER_STORY = { ...PLACEHOLDER_STORY, ...parsed.storyPlaceholder };
  }
} catch {}

// Lightweight health check (DB reachable + loop tables)
router.get('/health', async (_req, res) => {
  try {
    await getActiveImpactCase();
    return res.json({ ok: true });
  } catch (e) {
    console.error('[loop] health error:', e);
    return res.status(503).json({ ok: false, error: 'Pawket Pass service unavailable' });
  }
});

function isAdmin(req) {
  const email = String(req.dbUser?.email || '').toLowerCase();
  const raw = String(process.env.ADMIN_EMAILS || '').toLowerCase();
  const list = raw.split(',').map(s => s.trim()).filter(Boolean);
  return !!(email && list.includes(email));
}

function loopDebugEnabled() {
  return process.env.NODE_ENV !== 'production'
    && String(process.env.LOOP_DEBUG_ENDPOINTS_ENABLED || '').toLowerCase() === 'true';
}

function requireLoopDebugAccess(req, res, next) {
  if (!loopDebugEnabled()) return res.status(404).json({ ok: false, error: 'Not found' });
  return requireAuth()(req, res, next);
}

function isMissingRelation(err) {
  if (err?.code === '42P01') return true;
  return /relation .* does not exist/i.test(String(err?.message || ''));
}

function exampleStory() {
  return PLACEHOLDER_STORY;
}

function containsProtectedCharmName(story = {}) {
  const text = `${story?.title || ''} ${story?.body || ''} ${story?.petName || ''}`;
  return /\bCharm\b/.test(text);
}

function publicImpactStory(story) {
  if (!story) return null;
  return containsProtectedCharmName(story) ? exampleStory() : story;
}

function publicImpactCase(story) {
  if (!story) return null;
  return containsProtectedCharmName(story) ? null : story;
}

function publicImpactSummary(summary = {}) {
  return {
    ...summary,
    activeCase: publicImpactCase(summary.activeCase),
    recentlyFunded: publicImpactCase(summary.recentlyFunded),
  };
}

function generateTokenCode(len = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

async function resolveDebugUser(req) {
  if (req?.dbUser) return req.dbUser;
  let payload = null;
  try {
    const resShim = { json: (x) => { payload = x; return x; } };
    await softSession(req, resShim);
  } catch {}
  const email =
    (payload?.email || payload?.customer?.email || req?.body?.email || '').toString().trim().toLowerCase();
  if (!email) return null;
  const firstName = payload?.firstName || payload?.customer?.firstName || '';
  const lastName = payload?.lastName || payload?.customer?.lastName || '';
  try {
    return await ensureUser(email, firstName, lastName);
  } catch {
    return null;
  }
}

async function createUniqueToken(userId, orderId = null) {
  let lastErr = null;
  for (let i = 0; i < 5; i++) {
    const code = generateTokenCode();
    try {
      return await createLoopToken(userId, orderId, code);
    } catch (e) {
      lastErr = e;
      if (String(e?.message || '').includes('duplicate') || e?.code === '23505') {
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('Unable to generate unique pass');
}

// Public pass lookup (landing page)
router.get('/token/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: 'Pass code required' });

  try {
    const token = await getLoopTokenByCode(code);
    if (!token || token.status !== 'active') {
      return res.status(404).json({ ok: false, error: 'Pass not found' });
    }

    const firstName = token.creatorFirstName || '';
    const lastName = token.creatorLastName || '';
    const senderName = firstName || lastName
      ? `${firstName} ${lastName}`.trim()
      : 'A Pet Pawket friend';

    res.json({
      ok: true,
      code: token.code,
      chainLength: token.chainLength || 1,
      nextPosition: (token.chainLength || 1) + 1,
      senderName,
      createdAt: token.createdAt,
    });
  } catch (e) {
    console.error('[loop] token lookup error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load pass' });
  }
});

// Authenticated summary
router.get('/me', requireAuth(), async (req, res) => {
  const userId = req.dbUser?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const summary = await getLoopSummary(userId);
    res.json({ ok: true, ...summary, impact: publicImpactSummary(summary.impact || {}) });
  } catch (e) {
    console.error('[loop] summary error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load summary' });
  }
});

// Public leaderboard
router.get('/leaderboard', async (_req, res) => {
  try {
    const data = await getLoopLeaderboard(5);
    res.json({ ok: true, ...data });
  } catch (e) {
    console.error('[loop] leaderboard error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load leaderboard' });
  }
});

// Public impact story
router.get('/impact/random', async (_req, res) => {
  try {
    const story = await getRandomImpactStory();
    if (!story) {
      return res.json({
        ok: true,
        story: exampleStory()
      });
    }
    res.json({ ok: true, story: publicImpactStory(story) || exampleStory() });
  } catch (e) {
    console.error('[loop] impact error:', e);
    if (isMissingRelation(e)) {
      return res.json({ ok: true, story: exampleStory() });
    }
    res.status(500).json({ ok: false, error: 'Failed to load story' });
  }
});

// Public impact story list
router.get('/impact', async (req, res) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.limit || '3', 10)));
    const stories = await getImpactStories(limit);
    if (!stories.length) {
      return res.json({ ok: true, stories: [] });
    }
    const publicStories = stories.map(publicImpactStory).filter(Boolean);
    res.json({ ok: true, stories: publicStories });
  } catch (e) {
    console.error('[loop] impact list error:', e);
    if (isMissingRelation(e)) {
      return res.json({ ok: true, stories: [] });
    }
    res.status(500).json({ ok: false, error: 'Failed to load stories' });
  }
});

// Public active impact case
router.get('/impact/active', async (_req, res) => {
  try {
    const active = await getActiveImpactCase();
    const recent = await getRecentFundedImpactCase(72);
    const recentPayload = recent
      ? { ...recent, progressPct: 100 }
      : null;
    if (!active) {
      return res.json({ ok: true, activeCase: null, recentlyFunded: publicImpactCase(recentPayload) });
    }
    const goal = Number(active.goalAmount || 0);
    const funded = Number(active.fundedAmount || 0);
    const progressPct = goal > 0 ? Math.min(100, Math.round((funded / goal) * 100)) : 0;
    res.json({
      ok: true,
      activeCase: publicImpactCase({ ...active, progressPct }),
      recentlyFunded: publicImpactCase(recentPayload),
    });
  } catch (e) {
    console.error('[loop] impact active error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load active impact case' });
  }
});

// Authenticated impact summary
router.get('/impact/summary', requireAuth(), async (req, res) => {
  const userId = req.dbUser?.id;
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const summary = await getImpactSummaryForUser(userId);
    res.json({ ok: true, ...publicImpactSummary(summary) });
  } catch (e) {
    console.error('[loop] impact summary error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load impact summary' });
  }
});

// Mark pass modal as shown
router.post('/seen', requireAuth(), async (req, res) => {
  const userId = req.dbUser?.id;
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  if (!code) return res.status(400).json({ ok: false, error: 'Pass code required' });

  try {
    const token = await markLoopTokenSeen(userId, code);
    res.json({ ok: true, token });
  } catch (e) {
    console.error('[loop] seen error:', e);
    res.status(500).json({ ok: false, error: 'Failed to update pass' });
  }
});

async function handleDebugSeed(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Disabled in production' });
  }
  const user = req.dbUser || await resolveDebugUser(req);
  if (!user?.id) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  try {
    const orderId = req.body?.orderId || req.query?.orderId || null;
    const token = await createUniqueToken(user.id, orderId);
    return res.json({ ok: true, token });
  } catch (e) {
    console.error('[loop] seed error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to seed pass' });
  }
}

async function handleDebugClear(req, res) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ ok: false, error: 'Disabled in production' });
  }
  const user = req.dbUser || await resolveDebugUser(req);
  if (!user?.id) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  try {
    const result = await clearLoopTokensForUser(user.id);
    return res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[loop] clear error:', e);
    return res.status(500).json({ ok: false, error: 'Failed to clear passes' });
  }
}

// Debug seed (non-prod) — accept GET/POST
router.post('/debug/seed', requireLoopDebugAccess, handleDebugSeed);
router.get('/debug/seed', requireLoopDebugAccess, handleDebugSeed);

// Debug: clear tokens (non-prod) — accept GET/POST
router.post('/debug/clear', requireLoopDebugAccess, handleDebugClear);
router.get('/debug/clear', requireLoopDebugAccess, handleDebugClear);

// Admin: list tokens
router.get('/admin/tokens', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '100', 10)));
  try {
    const tokens = await listLoopTokens(limit);
    res.json({ ok: true, tokens });
  } catch (e) {
    console.error('[loop] admin tokens error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load tokens' });
  }
});

// Admin: add impact story
router.post('/admin/impact', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const { title, body, petName, imageUrl, goalAmount, currency, status, priority, active } = req.body || {};
  if (!title || !body) return res.status(400).json({ ok: false, error: 'Title and body required' });
  try {
    const story = await addImpactStory({
      title,
      body,
      petName,
      imageUrl,
      goalAmount,
      currency,
      status,
      priority,
      active,
    });
    if (active && story?.id) {
      const activated = await activateImpactCase(story.id);
      res.json({ ok: true, story: activated || story });
    } else {
      res.json({ ok: true, story });
    }
  } catch (e) {
    console.error('[loop] admin impact error:', e);
    res.status(500).json({ ok: false, error: 'Failed to add story' });
  }
});

// Admin: list impact cases
router.get('/admin/impact/cases', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  try {
    const cases = await listImpactCases(limit);
    res.json({ ok: true, cases });
  } catch (e) {
    console.error('[loop] admin impact cases error:', e);
    res.status(500).json({ ok: false, error: 'Failed to load impact cases' });
  }
});

// Admin: update impact case fields
router.post('/admin/impact/update', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const { id, title, body, petName, imageUrl, goalAmount, currency, status, priority } = req.body || {};
  const caseId = Number(id || 0);
  if (!caseId) return res.status(400).json({ ok: false, error: 'id required' });
  try {
    const updated = await updateImpactCase({
      id: caseId,
      title,
      body,
      petName,
      imageUrl,
      goalAmount,
      currency,
      status,
      priority,
    });
    if (!updated) return res.status(404).json({ ok: false, error: 'Case not found' });
    res.json({ ok: true, case: updated });
  } catch (e) {
    console.error('[loop] admin impact update error:', e);
    res.status(500).json({ ok: false, error: 'Failed to update case' });
  }
});

// Admin: activate impact case
router.post('/admin/impact/activate', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  const caseId = Number(req.body?.caseId || 0);
  if (!caseId) return res.status(400).json({ ok: false, error: 'caseId required' });
  try {
    const active = await activateImpactCase(caseId);
    if (!active) return res.status(404).json({ ok: false, error: 'Case not found or not activatable' });
    res.json({ ok: true, active });
  } catch (e) {
    console.error('[loop] admin impact activate error:', e);
    res.status(500).json({ ok: false, error: 'Failed to activate case' });
  }
});

// Admin: award monthly leaderboard rewards
router.post('/admin/award-monthly', requireAuth(), async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: 'Forbidden' });
  try {
    const month = req.body?.month || null;
    const result = await awardMonthlyLeaderboard(month);
    res.json({ ok: true, result });
  } catch (e) {
    console.error('[loop] admin award error:', e);
    res.status(500).json({ ok: false, error: 'Failed to award monthly rewards' });
  }
});

export default router;
