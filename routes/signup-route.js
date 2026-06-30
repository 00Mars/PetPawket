// routes/signup-route.js
//
// Legacy signup router kept only as a fail-closed compatibility stub. The
// active signup implementation lives in server.js and sets HttpOnly cookies
// without returning auth tokens in JSON.

import express from 'express';

const router = express.Router();

function legacySignupDisabled(_req, res) {
  return res.status(410).json({
    ok: false,
    error: 'Legacy signup route disabled. Use the active /api/auth/signup route.',
  });
}

router.post('/api/auth/signup', legacySignupDisabled);
router.post('/signup', legacySignupDisabled);

export default router;
