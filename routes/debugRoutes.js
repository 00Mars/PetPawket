import express from 'express';
import { softSession } from '../middleware/requireAuth.js';

const router = express.Router();

router.get('/whoami', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }

  try {
    const cookieHeader = req.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map(s => s.trim().split('='))
        .filter(p => p[0])
        .map(([k, v]) => [decodeURIComponent(k), decodeURIComponent(v || '')])
    );

    // Probe softSession without writing to the real response
    let soft = { signedIn: false };
    try {
      let payload = null;
      const resShim = { json: (x) => { payload = x; return x; } };
      await softSession(req, resShim);
      soft = payload || { signedIn: false };
    } catch {}

    res.set('Cache-Control', 'no-store');
    return res.json({
      ok: true,
      cookiesSeen: Object.keys(cookies),
      hasShopifyToken: !!cookies.shopify_token,
      softSession: soft,
    });
  } catch (e) {
    console.error('[debug/whoami] error:', e);
    return res.status(500).json({ ok: false, error: 'debug whoami error' });
  }
});

export default router;
