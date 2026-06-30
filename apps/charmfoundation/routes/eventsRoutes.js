// apps/charmfoundation/routes/eventsRoutes.js
import express from 'express';
import { query } from '../db/pg.js';
import { sendPrototypeOrUnavailable } from '../utils/prototypeMode.js';
import {
  cleanEmail,
  cleanPhone,
  cleanPositiveInt,
  cleanString,
  sendValidationError,
} from '../utils/inputValidation.js';

const router = express.Router();

const PLACEHOLDER_EVENTS = [
  {
    id: 1,
    title: 'Community Rescue Day',
    description: 'Meet rescue partners and learn how to help locally.',
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'Sunny Park Pavilion'
  },
  {
    id: 2,
    title: 'Volunteer Orientation',
    description: 'Onboarding session for new CHARM volunteers.',
    startsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    location: 'CHARM Community Room'
  }
];

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, description,
              starts_at AS "startsAt",
              location
         FROM cf_events
        WHERE status = 'scheduled'
        ORDER BY starts_at ASC
        LIMIT 12;`
    );
    if (!rows.length) {
      return res.json({ ok: true, events: PLACEHOLDER_EVENTS, placeholder: true, prototype: true });
    }
    res.json({ ok: true, events: rows });
  } catch {
    res.json({ ok: true, events: PLACEHOLDER_EVENTS, placeholder: true, prototype: true });
  }
});

router.post('/:id/rsvp', async (req, res) => {
  let eventId;
  let name;
  let email;
  let phone;
  let attendeeCount;
  try {
    eventId = cleanPositiveInt(req.params.id, { max: 1_000_000, required: true, label: 'Event id' });
    name = cleanString(req.body?.name, { max: 140, required: true, label: 'Name' });
    email = cleanEmail(req.body?.email);
    phone = cleanPhone(req.body?.phone, { required: false });
    attendeeCount = cleanPositiveInt(req.body?.attendees || 1, { max: 10, required: true, label: 'Attendees' });
  } catch (err) {
    return sendValidationError(res, err);
  }

  try {
    await query(
      `INSERT INTO cf_event_rsvps
        (event_id, name, email, phone, attendees)
       VALUES ($1, $2, $3, $4, $5);`,
      [eventId, name, email, phone || null, attendeeCount]
    );
    res.json({ ok: true, status: 'confirmed' });
  } catch {
    return sendPrototypeOrUnavailable(res, 'Prototype only: RSVP was queued locally and no live event roster was updated.');
  }
});

export default router;
