import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import {
  getBaselineChartOfAccounts,
  getDocumentCoverageRules,
  listProposedLedgerRecords,
  mapDraftRecordsToProposedLedgerRecords,
  markProposedLedgerDecision,
  validateChartOfAccounts,
  validateDocumentCoverage,
  validateLedgerApprovalBoundary,
  validateProposedLedgerBalance,
  verifyNoLiveLedgerWrites,
  writeProposedLedgerRecords,
} from '../utils/pawketAdminLedgerApproval.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-ledger-approval-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_ledger_approval_vault',
    created_at: '2026-05-27T15:00:00Z',
  });
  return basePath;
}

function draftRecord(overrides = {}) {
  return {
    draft_record_id: 'draft_order_sales_0001',
    staged_event_id: 'staged_test_order_created_0001',
    source_bundle_id: 'bundle_import_test_0001',
    source_event_id: 'source_event_order_created_0001',
    connector_id: 'connector_petpawket_website_readonly_v0',
    idempotency_key: 'petpawket-website:order.created:0001',
    draft_type: 'sales_revenue',
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    account_hint: 'revenue:sales',
    category_hint: 'commerce_revenue',
    subcategory_hint: 'product_sales',
    gross_amount: 68,
    discount_amount: 8,
    tax_amount: 0,
    fee_amount: 0,
    net_amount: 60,
    currency: 'USD',
    customer_ref: null,
    vendor_ref: null,
    order_ref: 'order_1001',
    product_refs: [],
    calculation_rule_hint: 'net_product_sales',
    document_requirements: ['order_source_evidence'],
    confidence_score: 0.78,
    review_status: 'unreviewed',
    risk_flags: [],
    warnings: [],
    rejection_reason: null,
    created_at: '2026-05-27T14:02:00Z',
    updated_at: '2026-05-27T14:02:00Z',
    ...overrides,
  };
}

function reviewItem(overrides = {}) {
  return {
    review_item_id: 'review_order_sales_0001',
    draft_record_ids: ['draft_order_sales_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    review_type: 'commerce_finance_review',
    review_status: 'approved_for_ledger_later',
    assigned_role: 'bookkeeper',
    required_documents: ['order_source_evidence'],
    missing_documents: [],
    warnings: [],
    risk_flags: [],
    reviewer_notes: '',
    decision: 'approved_for_ledger_later',
    decided_by: {
      actor_id: 'bookkeeper_example',
      role: 'bookkeeper',
    },
    decided_at: '2026-05-27T15:00:00Z',
    audit_event_id: 'audit_review_decision_0001',
    ...overrides,
  };
}

test('baseline chart of accounts loads', () => {
  const accounts = getBaselineChartOfAccounts();

  assert.ok(accounts.length > 40);
  assert.ok(accounts.find((account) => account.account_id === 'asset_cash'));
  assert.ok(accounts.find((account) => account.account_id === 'liability_pawket_care_credit'));
  assert.ok(accounts.find((account) => account.account_id === 'program_charm_emergency_assistance'));
});

test('chart validates', () => {
  const result = validateChartOfAccounts(getBaselineChartOfAccounts());

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.deepEqual(result.errors, []);
});

test('duplicate account is rejected', () => {
  const accounts = getBaselineChartOfAccounts();
  const result = validateChartOfAccounts([...accounts, { ...accounts[0] }]);

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /duplicate account_id: asset_cash/i);
});

test('document coverage can be complete or incomplete', () => {
  const complete = validateDocumentCoverage(draftRecord(), ['order_source_evidence']);
  assert.equal(complete.coverage_status, 'complete');
  assert.deepEqual(complete.missing_documents, []);

  const incomplete = validateDocumentCoverage(draftRecord(), []);
  assert.equal(incomplete.coverage_status, 'incomplete');
  assert.deepEqual(incomplete.missing_documents, ['order_source_evidence']);
  assert.equal(incomplete.risk_flags.includes('missing_document'), true);
});

test('approval boundary rejects non-approved review item', () => {
  const result = validateLedgerApprovalBoundary(reviewItem({
    review_status: 'ready_for_review',
  }), [draftRecord()], {
    actor: { actor_id: 'bookkeeper_example', role: 'bookkeeper' },
    period: { period_id: '2026-05', status: 'open' },
    documentRefs: ['order_source_evidence'],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /approved_for_ledger_later/i);
});

test('approval boundary rejects closed period', () => {
  const result = validateLedgerApprovalBoundary(reviewItem(), [draftRecord()], {
    actor: { actor_id: 'bookkeeper_example', role: 'bookkeeper' },
    period: { period_id: '2026-04', status: 'closed' },
    documentRefs: ['order_source_evidence'],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /period must be open/i);
});

test('approval boundary rejects missing account mapping', () => {
  const result = validateLedgerApprovalBoundary(reviewItem(), [draftRecord()], {
    actor: { actor_id: 'bookkeeper_example', role: 'bookkeeper' },
    period: { period_id: '2026-05', status: 'open' },
    documentRefs: ['order_source_evidence'],
    accountMappings: {
      sales_revenue: {
        debit: 'asset_missing',
        credit: 'income_product_sales',
      },
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /requires account mapping/i);
});

test('approval boundary allows approved review item with required mappings', () => {
  const result = validateLedgerApprovalBoundary(reviewItem(), [draftRecord()], {
    actor: { actor_id: 'bookkeeper_example', role: 'bookkeeper' },
    period: { period_id: '2026-05', status: 'open' },
    documentRefs: ['order_source_evidence'],
  });

  assert.equal(result.ok, true, result.errors.join('\n'));
  assert.equal(result.live_ledger_write_enabled, false);
});

test('draft records map to proposed ledger records', () => {
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
    effective_period: '2026-05',
    documentLinks: ['doc_order_1001'],
  });

  assert.equal(proposed.length, 2);
  assert.equal(proposed[0].approval_status, 'proposed');
  assert.equal(proposed[0].account_id, 'asset_payment_processor_receivable');
  assert.equal(proposed[1].account_id, 'income_product_sales');
});

test('proposed ledger records preserve source IDs', () => {
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
    effective_period: '2026-05',
  });

  assert.deepEqual(proposed[0].source_draft_record_ids, ['draft_order_sales_0001']);
  assert.deepEqual(proposed[0].source_bundle_ids, ['bundle_import_test_0001']);
  assert.deepEqual(proposed[0].source_event_ids, ['source_event_order_created_0001']);
  assert.equal(proposed[0].source_review_item_id, 'review_order_sales_0001');
});

test('proposed ledger records balance where required', () => {
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  const balance = validateProposedLedgerBalance(proposed);

  assert.equal(balance.ok, true, balance.errors.join('\n'));
  assert.equal(balance.balance_status, 'balanced');
  assert.equal(balance.total_debits, 60);
  assert.equal(balance.total_credits, 60);
});

test('unbalanced proposed records are rejected', () => {
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  proposed[1].credit_amount = 59;

  const balance = validateProposedLedgerBalance(proposed);
  assert.equal(balance.ok, false);
  assert.match(balance.errors.join('\n'), /unbalanced/i);
});

test('non-financial story and Pawket Pal records do not become balanced journal entries', () => {
  const storyProposed = mapDraftRecordsToProposedLedgerRecords([
    draftRecord({
      draft_record_id: 'draft_story_0001',
      draft_type: 'story_impact_review',
      source_event_id: 'source_event_story_0001',
      calculation_rule_hint: 'privacy and consent review required',
      document_requirements: ['consent_privacy_review_reference'],
      gross_amount: 0,
      net_amount: 0,
    }),
    draftRecord({
      draft_record_id: 'draft_pal_0001',
      draft_type: 'pawket_pal_asset_review',
      source_event_id: 'source_event_pal_0001',
      calculation_rule_hint: 'Pawket Pal value review required',
      document_requirements: ['story_asset_heartcode_source_reference'],
      gross_amount: 0,
      net_amount: 0,
    }),
  ], {
    source_review_item_id: 'review_non_financial_0001',
  });

  assert.equal(storyProposed.length, 2);
  assert.equal(storyProposed.every((record) => record.is_non_financial === true), true);

  const balance = validateProposedLedgerBalance(storyProposed);
  assert.equal(balance.ok, true);
  assert.equal(balance.balance_status, 'not_required');
});

test('proposed records write to proposed-only file', () => {
  const vaultPath = makeTempVault();
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  const result = writeProposedLedgerRecords(vaultPath, proposed, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-27T15:05:00Z',
  });

  assert.equal(result.proposed_record_count, 2);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-ledger-records.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'journal-entries.ndjson')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'live-ledger.ndjson')), false);
  assert.equal(listProposedLedgerRecords(vaultPath).length, 2);
});

test('decision update appends audit event', () => {
  const vaultPath = makeTempVault();
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  writeProposedLedgerRecords(vaultPath, proposed, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-27T15:05:00Z',
  });

  const decision = markProposedLedgerDecision(
    vaultPath,
    proposed.map((record) => record.proposed_ledger_record_id),
    'approved_for_future_commit',
    {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
      timestamp: '2026-05-27T15:06:00Z',
    },
    'Ready for future final ledger commit gate.'
  );

  assert.equal(decision.updated_records.length, 2);
  assert.equal(decision.updated_records[0].approval_status, 'approved_for_future_commit');
  assert.equal(verifyAuditChain(vaultPath).ok, true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 2);
  assert.equal(listProposedLedgerRecords(vaultPath, { approval_status: 'approved_for_future_commit' }).length, 2);
});

test('invalid proposed ledger decision is rejected', () => {
  const vaultPath = makeTempVault();
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  writeProposedLedgerRecords(vaultPath, proposed);

  assert.throws(
    () => markProposedLedgerDecision(vaultPath, proposed[0].proposed_ledger_record_id, 'commit_live_ledger', { actor_id: 'owner', role: 'owner_root' }, 'No.'),
    /invalid proposed ledger decision/i
  );
});

test('approval and proposed ledger operations do not create live ledger writes', () => {
  const vaultPath = makeTempVault();
  const proposed = mapDraftRecordsToProposedLedgerRecords([draftRecord()], {
    source_review_item_id: 'review_order_sales_0001',
  });
  writeProposedLedgerRecords(vaultPath, proposed);
  markProposedLedgerDecision(vaultPath, proposed[0].proposed_ledger_record_id, 'needs_revision', {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }, 'Needs a cleaner account memo.');

  const liveLedgerCheck = verifyNoLiveLedgerWrites(vaultPath);
  assert.equal(liveLedgerCheck.ok, true);
  assert.deepEqual(liveLedgerCheck.present_paths, []);
  assert.equal(fs.existsSync(path.join(vaultPath, 'ledger')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'journal')), false);
});

test('Pawket Admin ledger approval files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-ledger-public-test', 'public', 'finance');

  assert.throws(
    () => listProposedLedgerRecords(publicPath),
    /must not be placed under public/i
  );
});
