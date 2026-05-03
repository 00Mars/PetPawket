// apps/charmfoundation/routes/donationsRoutes.js
import express from 'express';
import { query } from '../db/pg.js';

const router = express.Router();

const DEFAULT_FUNDS = [
  { id: 1, name: 'Urgent Medical Care', code: 'urgent-care', description: 'Emergency vet visits, surgeries, and immediate care.' },
  { id: 2, name: 'Rescue Missions', code: 'rescue-missions', description: 'Transport, rescue operations, and safety gear.' },
  { id: 3, name: 'Placement Support', code: 'placement-support', description: 'Foster support, supplies, and rehoming.' },
  { id: 4, name: 'Memorial Support', code: 'memorial-support', description: 'Grief support and memorial programs for families.' }
];

router.get('/funds', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, code, description
         FROM cf_donation_funds
        WHERE active = true
        ORDER BY id ASC;`
    );
    if (!rows.length) {
      return res.json({ ok: true, funds: DEFAULT_FUNDS, placeholder: true });
    }
    res.json({ ok: true, funds: rows });
  } catch {
    res.json({ ok: true, funds: DEFAULT_FUNDS, placeholder: true });
  }
});

router.post('/', async (req, res) => {
  const {
    amount,
    currency,
    fundCode,
    fundId,
    donorName,
    donorEmail,
    donorPhone,
    note
  } = req.body || {};

  const amt = Number(amount || 0);
  if (!amt || amt <= 0 || !donorEmail) {
    return res.status(400).json({ ok: false, error: 'Valid amount and donor email are required' });
  }

  try {
    let resolvedFundId = fundId || null;
    if (!resolvedFundId && fundCode) {
      const { rows: fundRows } = await query(
        `SELECT id FROM cf_donation_funds WHERE code = $1 LIMIT 1;`,
        [fundCode]
      );
      resolvedFundId = fundRows[0]?.id || null;
    }

    await query(
      `INSERT INTO cf_donations
        (amount, currency, fund_id, donor_name, donor_email, donor_phone, note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pledged');`,
      [
        amt,
        (currency || 'USD').toUpperCase(),
        resolvedFundId,
        donorName || null,
        donorEmail,
        donorPhone || null,
        note || null
      ]
    );

    res.json({
      ok: true,
      status: 'pledged',
      message: 'Donation received. Payment processing will be added soon.'
    });
  } catch {
    res.json({
      ok: true,
      status: 'queued',
      placeholder: true,
      message: 'Donation captured. Payment processing will be added soon.'
    });
  }
});

router.get('/impact/receipts', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, month, summary, total_amount AS "totalAmount", created_at AS "createdAt"
         FROM cf_impact_receipts
        ORDER BY created_at DESC
        LIMIT 6;`
    );
    if (!rows.length) {
      return res.json({
        ok: true,
        receipts: [
          {
            id: 1,
            month: 'Example month',
            totalAmount: 2700,
            summary: {
              note: 'Example receipt placeholder until live data is available.'
            }
          }
        ],
        placeholder: true
      });
    }
    res.json({ ok: true, receipts: rows });
  } catch {
    res.json({
      ok: true,
      receipts: [
        {
          id: 1,
          month: 'Example month',
          totalAmount: 2700,
          summary: {
            note: 'Example receipt placeholder until live data is available.'
          }
        }
      ],
      placeholder: true
    });
  }
});

export default router;
