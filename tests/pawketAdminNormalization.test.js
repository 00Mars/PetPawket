import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import {
  createReviewQueueItem,
  getSupportedDraftMappings,
  listDraftFinanceRecords,
  listReviewQueueItems,
  markReviewItemDecision,
  normalizeStagedEventToDraftRecords,
  verifyNoLiveLedgerWrites,
  writeDraftFinanceRecords,
  writeReviewQueueItem,
} from '../utils/pawketAdminNormalization.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-normalization-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_normalization_vault',
    created_at: '2026-05-27T14:00:00Z',
  });
  return basePath;
}

function stagedEvent(eventType, preview = {}, overrides = {}) {
  const safeType = eventType.replace(/[^a-z0-9]+/gi, '_');
  return {
    staged_event_id: `staged_test_${safeType}_0001`,
    source_bundle_id: 'bundle_import_test_0001',
    source_event_id: `source_event_${safeType}_0001`,
    connector_id: 'connector_petpawket_website_readonly_v0',
    event_type: eventType,
    occurred_at: '2026-05-27T14:01:00Z',
    source_record_id: `${safeType}_record_0001`,
    idempotency_key: `petpawket-website:${eventType}:0001`,
    payload_hash: 'payload_hash_placeholder',
    normalized_preview: {
      currency: 'USD',
      ...preview,
    },
    validation_status: 'validated_for_staging',
    staging_status: 'staged',
    rejection_reason: null,
    created_at: '2026-05-27T14:01:00Z',
    ...overrides,
  };
}

test('supported mapping list exists for all staged event types', () => {
  const mappings = getSupportedDraftMappings();

  for (const eventType of [
    'order.created',
    'payment.received',
    'refund.issued',
    'subscription.created',
    'subscription.cancelled',
    'pawket_packet.purchased',
    'pawket_pick.selected',
    'donation.created',
    'care_credit.planned',
    'charm_pledge.created',
    'story.submitted',
    'pawket_pal.created',
  ]) {
    assert.ok(mappings[eventType], `${eventType} should be supported`);
    assert.ok(mappings[eventType].draft_types.length > 0);
  }
});

test('order.created creates expected draft records', () => {
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('order.created', {
    gross_amount: 68,
    discount_amount: 8,
    tax_amount: 3.75,
    charm_pledge_amount: 3,
    care_credit_planned_amount: 2,
    order_id: 'order_1001',
  }), { created_at: '2026-05-27T14:02:00Z' });

  assert.deepEqual(drafts.map((draft) => draft.draft_type), [
    'sales_revenue',
    'sales_tax_payable',
    'charm_pledge_hint',
    'care_credit_hint',
  ]);
  assert.equal(drafts[0].staged_event_id, 'staged_test_order_created_0001');
  assert.equal(drafts[0].source_event_id, 'source_event_order_created_0001');
  assert.equal(drafts[0].source_bundle_id, 'bundle_import_test_0001');
  assert.equal(drafts[0].idempotency_key, 'petpawket-website:order.created:0001');
  assert.equal(drafts[0].gross_amount, 68);
  assert.equal(drafts[1].risk_flags.includes('tax_mapping_needed'), true);
  assert.equal(drafts[2].risk_flags.includes('restricted_fund_review'), true);
  assert.equal(drafts[3].risk_flags.includes('care_credit_liability_review'), true);
});

test('payment.received creates expected draft record', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('payment.received', {
    amount: 68,
    payment_method: 'card_processor',
  }));

  assert.equal(draft.draft_type, 'payment_received');
  assert.equal(draft.account_hint, 'asset:cash_or_receivable');
  assert.equal(draft.net_amount, 68);
  assert.deepEqual(draft.document_requirements, ['payment_source_evidence']);
});

test('refund.issued creates reversal warning and risk flag', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('refund.issued', {
    refund_amount: 8,
  }));

  assert.equal(draft.draft_type, 'refund_reversal');
  assert.equal(draft.risk_flags.includes('refund_reversal_needed'), true);
  assert.match(draft.warnings.join('\n'), /reward, donation, Care Credit, tax, and inventory reversals/i);
});

test('donation.created creates donor and document review risk', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('donation.created', {
    amount: 25,
    fund_id: 'fund_charm_review',
  }));

  assert.equal(draft.draft_type, 'donation_received');
  assert.equal(draft.fund_id, 'fund_charm_review');
  assert.equal(draft.risk_flags.includes('donation_mapping_needed'), true);
  assert.deepEqual(draft.document_requirements, ['donor_source_evidence']);
});

test('care_credit.planned creates liability review flag', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('care_credit.planned', {
    amount: 5,
  }));

  assert.equal(draft.draft_type, 'care_credit_liability_review');
  assert.equal(draft.risk_flags.includes('care_credit_liability_review'), true);
  assert.deepEqual(draft.document_requirements, ['care_credit_rule_source_evidence']);
});

test('charm_pledge.created creates donation payable draft', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('charm_pledge.created', {
    amount: 3,
  }));

  assert.equal(draft.draft_type, 'donation_payable');
  assert.equal(draft.fund_id, 'fund_charm_review');
  assert.equal(draft.risk_flags.includes('restricted_fund_review'), true);
});

test('story.submitted creates non-financial review draft', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('story.submitted', {
    story_ref: 'story_private_0001',
  }));

  assert.equal(draft.draft_type, 'story_impact_review');
  assert.equal(draft.net_amount, 0);
  assert.equal(draft.account_hint, 'non_financial:story_review');
  assert.equal(draft.risk_flags.includes('privacy_review_needed'), true);
});

test('pawket_pal.created creates asset and IP review draft', () => {
  const [draft] = normalizeStagedEventToDraftRecords(stagedEvent('pawket_pal.created', {
    pal_class: 'honorary',
    heartcode_ref: 'PAL-HON-TEST-0001',
  }));

  assert.equal(draft.draft_type, 'pawket_pal_asset_review');
  assert.equal(draft.account_hint, 'asset_or_ip_review:pawket_pal');
  assert.deepEqual(draft.document_requirements, ['story_asset_heartcode_source_reference']);
});

test('review queue item groups draft records', () => {
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('payment.received', {
    amount: 68,
  }));
  const item = createReviewQueueItem(drafts, {
    availableDocuments: ['payment_source_evidence'],
    created_at: '2026-05-27T14:03:00Z',
  });

  assert.equal(item.draft_record_ids.length, 1);
  assert.deepEqual(item.source_event_ids, ['source_event_payment_received_0001']);
  assert.equal(item.review_type, 'payment_review');
  assert.equal(item.review_status, 'ready_for_review');
  assert.equal(item.assigned_role, 'bookkeeper');
});

test('missing document requirements produce needs_documents status', () => {
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('order.created', {
    gross_amount: 68,
  }));
  const item = createReviewQueueItem(drafts);

  assert.equal(item.review_status, 'needs_documents');
  assert.deepEqual(item.missing_documents, ['order_source_evidence']);
  assert.equal(item.risk_flags.includes('missing_document'), true);
});

test('decision update appends audit event', () => {
  const vaultPath = makeTempVault();
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('payment.received', {
    amount: 68,
  }));
  writeDraftFinanceRecords(vaultPath, drafts, {
    actor: { actor_id: 'finance_admin_example', role: 'finance_admin' },
    timestamp: '2026-05-27T14:04:00Z',
  });
  const item = createReviewQueueItem(drafts, {
    availableDocuments: ['payment_source_evidence'],
    created_at: '2026-05-27T14:05:00Z',
  });
  const written = writeReviewQueueItem(vaultPath, item, {
    actor: { actor_id: 'finance_admin_example', role: 'finance_admin' },
    timestamp: '2026-05-27T14:06:00Z',
  });
  const decided = markReviewItemDecision(
    vaultPath,
    written.review_item_id,
    'approved_for_ledger_later',
    {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
      timestamp: '2026-05-27T14:07:00Z',
    },
    'Ready for future ledger approval after separate approval gate.'
  );

  assert.equal(decided.review_status, 'approved_for_ledger_later');
  assert.equal(decided.previous_review_status, 'ready_for_review');
  assert.equal(verifyAuditChain(vaultPath).ok, true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 3);

  const history = listReviewQueueItems(vaultPath, { includeHistory: true });
  assert.equal(history.length, 2);
});

test('invalid review decision is rejected', () => {
  const vaultPath = makeTempVault();
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('payment.received', {
    amount: 68,
  }));
  const item = createReviewQueueItem(drafts, {
    availableDocuments: ['payment_source_evidence'],
  });
  writeReviewQueueItem(vaultPath, item);

  assert.throws(
    () => markReviewItemDecision(vaultPath, item.review_item_id, 'write_live_ledger', { actor_id: 'owner', role: 'owner_root' }, 'No.'),
    /invalid review decision/i
  );
});

test('normalization writes draft records only', () => {
  const vaultPath = makeTempVault();
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('order.created', {
    gross_amount: 68,
    tax_amount: 3.75,
  }));
  const result = writeDraftFinanceRecords(vaultPath, drafts);

  assert.equal(result.draft_record_count, 2);
  assert.equal(listDraftFinanceRecords(vaultPath).length, 2);
  assert.equal(listDraftFinanceRecords(vaultPath, { risk_flag: 'tax_mapping_needed' }).length, 2);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'draft-finance-records.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'live-ledger.ndjson')), false);
  assert.equal(verifyNoLiveLedgerWrites(vaultPath).ok, true);
});

test('review queue writes review items only', () => {
  const vaultPath = makeTempVault();
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('donation.created', {
    amount: 25,
  }));
  const item = createReviewQueueItem(drafts, {
    availableDocuments: ['donor_source_evidence'],
  });
  const written = writeReviewQueueItem(vaultPath, item);

  assert.equal(written.review_status, 'ready_for_review');
  assert.equal(listReviewQueueItems(vaultPath).length, 1);
  assert.equal(listReviewQueueItems(vaultPath, { risk_flag: 'donation_mapping_needed' }).length, 1);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'review-queue.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'journal-entries.ndjson')), false);
  assert.equal(verifyNoLiveLedgerWrites(vaultPath).ok, true);
});

test('no live ledger writes are created by draft or review operations', () => {
  const vaultPath = makeTempVault();
  const drafts = normalizeStagedEventToDraftRecords(stagedEvent('pawket_pick.selected', {
    amount: 4,
  }));
  writeDraftFinanceRecords(vaultPath, drafts);
  writeReviewQueueItem(vaultPath, createReviewQueueItem(drafts));

  const liveLedgerCheck = verifyNoLiveLedgerWrites(vaultPath);
  assert.equal(liveLedgerCheck.ok, true);
  assert.deepEqual(liveLedgerCheck.present_paths, []);
  assert.equal(fs.existsSync(path.join(vaultPath, 'ledger')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'journal')), false);
});

test('Pawket Admin normalization files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-normalization-public-test', 'public', 'finance');

  assert.throws(
    () => listDraftFinanceRecords(publicPath),
    /must not be placed under public/i
  );
});
