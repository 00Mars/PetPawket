// apps/charmfoundation/routes/commsRoutes.js
import express from 'express';
import { query, hasDb } from '../db/pg.js';

const router = express.Router();

router.post('/newsletter', async (req, res) => {
  const { email, firstName, interests, frequency } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, message: 'Email is required.' });

  if (!hasDb()) {
    return res.json({ ok: true, message: 'Thanks for joining! We saved your signup (placeholder).' });
  }

  try {
    await query(
      `INSERT INTO cf_newsletter_signups (email, first_name, interests, frequency)
       VALUES ($1, $2, $3, $4);`,
      [email, firstName || null, interests || null, frequency || null]
    );
    res.json({ ok: true, message: 'Thanks for joining! We will send gentle updates.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Unable to save signup right now.' });
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, topic, message } = req.body || {};
  if (!email || !message) return res.status(400).json({ ok: false, message: 'Email and message are required.' });

  if (!hasDb()) {
    return res.json({ ok: true, message: 'Thanks! Your message was captured (placeholder).' });
  }

  try {
    await query(
      `INSERT INTO cf_contact_messages (name, email, topic, message)
       VALUES ($1, $2, $3, $4);`,
      [name || null, email, topic || null, message]
    );
    res.json({ ok: true, message: 'Thanks! We will be in touch soon.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Unable to send message right now.' });
  }
});

export default router;
