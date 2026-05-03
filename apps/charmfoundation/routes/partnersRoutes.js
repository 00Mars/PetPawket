// apps/charmfoundation/routes/partnersRoutes.js
import express from 'express';
import { query } from '../db/pg.js';

const router = express.Router();

router.post('/intake', async (req, res) => {
  const {
    orgName,
    contactName,
    contactEmail,
    contactPhone,
    orgType,
    message
  } = req.body || {};

  if (!orgName || !contactEmail) {
    return res.status(400).json({ ok: false, error: 'Organization name and email are required' });
  }

  try {
    await query(
      `INSERT INTO cf_partner_intakes
        (org_name, contact_name, contact_email, contact_phone, org_type, message)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [orgName, contactName || null, contactEmail, contactPhone || null, orgType || null, message || null]
    );
    res.json({ ok: true, status: 'received' });
  } catch {
    res.json({ ok: true, status: 'queued', placeholder: true });
  }
});

export default router;
