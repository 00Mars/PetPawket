// apps/charmfoundation/routes/casesRoutes.js
import express from 'express';
import { query } from '../db/pg.js';

const router = express.Router();

const PLACEHOLDER_CASES = [
  {
    id: 1,
    title: 'Sunny\'s Recovery Fund',
    summary: 'Emergency treatment and follow-up care for a senior rescue pup.',
    status: 'active',
    goalAmount: 2500,
    fundedAmount: 1260,
    currency: 'USD'
  },
  {
    id: 2,
    title: 'Pip\'s Foster Bridge',
    summary: 'Short-term foster care and supplies while Pip heals.',
    status: 'active',
    goalAmount: 1800,
    fundedAmount: 540,
    currency: 'USD'
  }
];

router.get('/', async (_req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, title, summary, status,
              goal_amount AS "goalAmount",
              funded_amount AS "fundedAmount",
              currency
         FROM cf_cases
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 12;`
    );
    if (!rows.length) {
      return res.json({ ok: true, cases: PLACEHOLDER_CASES, placeholder: true });
    }
    res.json({ ok: true, cases: rows });
  } catch {
    res.json({ ok: true, cases: PLACEHOLDER_CASES, placeholder: true });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ ok: false, error: 'Invalid case id' });
  try {
    const { rows } = await query(
      `SELECT id, title, summary, description, status,
              goal_amount AS "goalAmount",
              funded_amount AS "fundedAmount",
              currency
         FROM cf_cases
        WHERE id = $1
        LIMIT 1;`,
      [id]
    );
    const base = rows[0];
    if (!base) return res.status(404).json({ ok: false, error: 'Case not found' });

    const { rows: updates } = await query(
      `SELECT id, title, body, created_at AS "createdAt"
         FROM cf_case_updates
        WHERE case_id = $1
        ORDER BY created_at DESC
        LIMIT 12;`,
      [id]
    );

    const { rows: docs } = await query(
      `SELECT id, doc_type AS "docType", url, label
         FROM cf_case_documents
        WHERE case_id = $1
        ORDER BY created_at DESC;`,
      [id]
    );

    res.json({ ok: true, case: base, updates, documents: docs });
  } catch {
    const fallback = PLACEHOLDER_CASES.find(c => c.id === id);
    if (!fallback) return res.status(404).json({ ok: false, error: 'Case not found' });
    res.json({
      ok: true,
      case: {
        ...fallback,
        description: 'Example case description. Official updates will appear here once published.'
      },
      updates: [],
      documents: [],
      placeholder: true
    });
  }
});

export default router;
