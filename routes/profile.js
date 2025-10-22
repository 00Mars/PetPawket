// routes/profile.js — Canonical Profile endpoints using userDB.pg.js
// Mounted under /api in server.js, so paths are:
//   GET  /api/account/profile
//   POST /api/account/profile/update-info

import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  getUserByEmail,
  ensureUserByEmail,
  updateUser,
} from '../userDB.pg.js';

const router = express.Router();

// All routes require a valid Shopify session
router.use(requireAuth);

// Small helper to normalize and lowercase email
function normEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

// GET /api/account/profile
router.get('/account/profile', async (req, res) => {
  try {
    const emailRaw = req.customer?.email;
    if (!emailRaw) return res.status(401).json({ error: 'No session' });
    const email = normEmail(emailRaw);

    // Ensure a row exists; seed with Shopify names if needed
    const first = req.customer?.firstName || req.customer?.first_name || '';
    const last  = req.customer?.lastName  || req.customer?.last_name  || '';
    await ensureUserByEmail(email, first, last); // positional args

    const user = await getUserByEmail(email);

    // Never cache dynamic profile responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Minimal shape
    return res.json({
      email: user?.email || email,
      firstName: user?.firstName || '',
      lastName : user?.lastName  || '',
    });
  } catch (err) {
    console.error('[profile:get]', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/account/profile/update-info
router.post('/account/profile/update-info', async (req, res) => {
  try {
    const emailRaw = req.customer?.email;
    if (!emailRaw) return res.status(401).json({ error: 'No session' });
    const email = normEmail(emailRaw);

    const firstName = (req.body?.firstName ?? '').toString().trim();
    const lastName  = (req.body?.lastName  ?? '').toString().trim();

    // Ensure row exists, then update by id
    let user = await getUserByEmail(email);
    if (!user?.id) {
      await ensureUserByEmail(email, firstName, lastName); // positional args
      user = await getUserByEmail(email);
    }
    const updated = await updateUser(user.id, { firstName, lastName });

    // Never cache dynamic profile responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Minimal shape for the profile form
    return res.json({
      email: updated?.email || email,
      firstName: updated?.firstName || '',
      lastName : updated?.lastName  || '',
    });
  } catch (err) {
    console.error('[profile:update-info]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;