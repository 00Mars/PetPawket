// apps/charmfoundation/routes/volunteersRoutes.js
import express from 'express';
import { query } from '../db/pg.js';
import { sendPrototypeOrUnavailable } from '../utils/prototypeMode.js';
import {
  cleanEmail,
  cleanList,
  cleanPhone,
  cleanString,
  sendValidationError,
} from '../utils/inputValidation.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  let firstName;
  let lastName;
  let email;
  let phone;
  let interestList;
  let availability;
  let message;
  try {
    firstName = cleanString(req.body?.firstName, { max: 100, required: true, label: 'First name' });
    lastName = cleanString(req.body?.lastName, { max: 100, required: true, label: 'Last name' });
    email = cleanEmail(req.body?.email);
    phone = cleanPhone(req.body?.phone, { required: false });
    interestList = cleanList(req.body?.interests, { maxItems: 10, maxLength: 80, label: 'Interests' });
    availability = cleanString(req.body?.availability, { max: 500, label: 'Availability' });
    message = cleanString(req.body?.message, { max: 1500, label: 'Message' });
  } catch (err) {
    return sendValidationError(res, err);
  }

  try {
    await query(
      `INSERT INTO cf_volunteer_applications
        (first_name, last_name, email, phone, interests, availability, message)
       VALUES ($1, $2, $3, $4, $5::text[], $6, $7);`,
      [firstName, lastName, email, phone || null, interestList, availability || null, message || null]
    );
    res.json({ ok: true, status: 'received' });
  } catch {
    return sendPrototypeOrUnavailable(res, 'Prototype only: volunteer signup was queued locally and no live volunteer queue was updated.');
  }
});

export default router;
