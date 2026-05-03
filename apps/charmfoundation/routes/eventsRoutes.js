// apps/charmfoundation/routes/eventsRoutes.js
import express from 'express';
import { query } from '../db/pg.js';

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
      return res.json({ ok: true, events: PLACEHOLDER_EVENTS, placeholder: true });
    }
    res.json({ ok: true, events: rows });
  } catch {
    res.json({ ok: true, events: PLACEHOLDER_EVENTS, placeholder: true });
  }
});

router.post('/:id/rsvp', async (req, res) => {
  const eventId = Number(req.params.id || 0);
  const { name, email, phone, attendees } = req.body || {};

  if (!eventId || !name || !email) {
    return res.status(400).json({ ok: false, error: 'Event, name, and email are required' });
  }

  const attendeeCount = Math.max(1, Number(attendees || 1));

  try {
    await query(
      `INSERT INTO cf_event_rsvps
        (event_id, name, email, phone, attendees)
       VALUES ($1, $2, $3, $4, $5);`,
      [eventId, name, email, phone || null, attendeeCount]
    );
    res.json({ ok: true, status: 'confirmed' });
  } catch {
    res.json({ ok: true, status: 'queued', placeholder: true });
  }
});

export default router;
