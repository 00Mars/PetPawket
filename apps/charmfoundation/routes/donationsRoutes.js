// apps/charmfoundation/routes/donationsRoutes.js
import express from 'express';
import { query } from '../db/pg.js';
import { sendPrototypeOrUnavailable } from '../utils/prototypeMode.js';
import {
  cleanAmount,
  cleanCurrency,
  cleanEmail,
  cleanPhone,
  cleanPositiveInt,
  cleanString,
  sendValidationError,
} from '../utils/inputValidation.js';

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
      return res.json({ ok: true, funds: DEFAULT_FUNDS, placeholder: true, prototype: true });
    }
    res.json({ ok: true, funds: rows });
  } catch {
    res.json({ ok: true, funds: DEFAULT_FUNDS, placeholder: true, prototype: true });
  }
});

router.post('/', async (req, res) => {
  let amount;
  let currency;
  let fundCode;
  let fundId;
  let donorName;
  let donorEmail;
  let donorPhone;
  let note;

  try {
    amount = cleanAmount(req.body?.amount);
    currency = cleanCurrency(req.body?.currency);
    fundCode = cleanString(req.body?.fundCode, { max: 80, label: 'Fund code' });
    fundId = cleanPositiveInt(req.body?.fundId, { max: 1_000_000, label: 'Fund id' });
    donorName = cleanString(req.body?.donorName, { max: 140, label: 'Donor name' });
    donorEmail = cleanEmail(req.body?.donorEmail);
    donorPhone = cleanPhone(req.body?.donorPhone, { required: false });
    note = cleanString(req.body?.note, { max: 1000, label: 'Note' });
  } catch (err) {
    return sendValidationError(res, err);
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
        amount,
        currency,
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
    return sendPrototypeOrUnavailable(
      res,
      'Prototype only: donation pledge was queued locally. No payment was processed.'
    );
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
        placeholder: true,
        prototype: true
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
      placeholder: true,
      prototype: true
    });
  }
});

export default router;
