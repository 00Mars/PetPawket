// apps/charmfoundation/routes/partnersRoutes.js
import express from 'express';
import { query } from '../db/pg.js';
import { sendPrototypeOrUnavailable } from '../utils/prototypeMode.js';
import {
  cleanEmail,
  cleanPhone,
  cleanString,
  sendValidationError,
} from '../utils/inputValidation.js';

const router = express.Router();

router.post('/intake', async (req, res) => {
  let orgName;
  let contactName;
  let contactEmail;
  let contactPhone;
  let orgType;
  let message;
  try {
    orgName = cleanString(req.body?.orgName, { max: 180, required: true, label: 'Organization name' });
    contactName = cleanString(req.body?.contactName, { max: 140, label: 'Contact name' });
    contactEmail = cleanEmail(req.body?.contactEmail);
    contactPhone = cleanPhone(req.body?.contactPhone, { required: false });
    orgType = cleanString(req.body?.orgType, { max: 80, label: 'Organization type' });
    message = cleanString(req.body?.message, { max: 1500, label: 'Message' });
  } catch (err) {
    return sendValidationError(res, err);
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
    return sendPrototypeOrUnavailable(res, 'Prototype only: partner intake was queued locally and no live partner queue was updated.');
  }
});

export default router;
