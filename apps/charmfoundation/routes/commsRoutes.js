// apps/charmfoundation/routes/commsRoutes.js
import express from 'express';
import { query, hasDb } from '../db/pg.js';
import { sendPrototypeOrUnavailable } from '../utils/prototypeMode.js';
import { cleanEmail, cleanString, sendValidationError } from '../utils/inputValidation.js';

const router = express.Router();

router.post('/newsletter', async (req, res) => {
  let email;
  let firstName;
  let interests;
  let frequency;
  try {
    email = cleanEmail(req.body?.email);
    firstName = cleanString(req.body?.firstName, { max: 100, label: 'First name' });
    interests = cleanString(req.body?.interests, { max: 500, label: 'Interests' });
    frequency = cleanString(req.body?.frequency, { max: 40, label: 'Frequency' });
  } catch (err) {
    return sendValidationError(res, err);
  }

  if (!hasDb()) {
    return sendPrototypeOrUnavailable(res, 'Prototype only: newsletter signup was queued locally and no live email list was updated.');
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
  let name;
  let email;
  let topic;
  let message;
  try {
    name = cleanString(req.body?.name, { max: 140, label: 'Name' });
    email = cleanEmail(req.body?.email);
    topic = cleanString(req.body?.topic, { max: 100, label: 'Topic' });
    message = cleanString(req.body?.message, { max: 2000, required: true, label: 'Message' });
  } catch (err) {
    return sendValidationError(res, err);
  }

  if (!hasDb()) {
    return sendPrototypeOrUnavailable(res, 'Prototype only: contact message was queued locally and no live inbox was updated.');
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
