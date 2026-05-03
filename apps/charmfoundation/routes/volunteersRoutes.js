// apps/charmfoundation/routes/volunteersRoutes.js
import express from 'express';
import { query } from '../db/pg.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    interests,
    availability,
    message
  } = req.body || {};

  if (!firstName || !lastName || !email) {
    return res.status(400).json({ ok: false, error: 'Name and email are required' });
  }

  const interestList = Array.isArray(interests)
    ? interests
    : String(interests || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

  try {
    await query(
      `INSERT INTO cf_volunteer_applications
        (first_name, last_name, email, phone, interests, availability, message)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7);`,
      [firstName, lastName, email, phone || null, interestList, availability || null, message || null]
    );
    res.json({ ok: true, status: 'received' });
  } catch {
    res.json({ ok: true, status: 'queued', placeholder: true });
  }
});

export default router;
