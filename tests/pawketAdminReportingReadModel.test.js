import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import { getBaselineChartOfAccounts } from '../utils/pawketAdminLedgerApproval.js';
import {
  buildProposedJournalReadModel,
  buildReconciliationPreview,
  buildTestOnlyLedgerReadModel,
  calculateSimulatedBalances,
  createReportManifest,
  getReportingReadModelPolicy,
  listReportManifests,
  validateReportManifest,
  verifyNoOfficialReportsOrBalances,
  writeReportManifest,
} from '../utils/pawketAdminReportingReadModel.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-reporting-read-model-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_reporting_read_model_vault',
    created_at: '2026-05-29T11:00:00Z',
  });
  return basePath;
}

function proposedJournalEntry(overrides = {}) {
  return {
    proposed_journal_entry_id: 'pje_sale_0001',
    source_proposed_ledger_record_ids: ['proposed_sales_debit_0001', 'proposed_sales_credit_0001'],
    source_review_item_ids: ['review_order_sales_0001'],
    source_draft_record_ids: ['draft_order_sales_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    source_bundle_ids: ['bundle_import_test_0001'],
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    effective_period: '2026-05',
    transaction_date: '2026-05-29',
    description: 'Approved proposed sale journal entry.',
    journal_type: 'sale',
    currency: 'USD',
    total_debits: 60,
    total_credits: 60,
    balance_status: 'balanced',
    document_coverage_status: 'complete',
    document_links: ['doc_order_1001'],
    calculation_rule_ids: ['net_product_sales_v1'],
    evidence_manifest_id: 'cem_pje_sale_0001',
    approval_status: 'approved_for_commit_gate',
    commit_status: 'not_committed',
    risk_flags: [],
    created_at: '2026-05-29T11:00:00Z',
    updated_at: '2026-05-29T11:00:00Z',
    ...overrides,
  };
}

function testLedgerEntry(overrides = {}) {
  return {
    journal_entry_id: 'test_ledger_pje_sale_0001_000001',
    source_proposed_journal_entry_id: 'pje_sale_0001',
    source_proposed_ledger_record_ids: ['proposed_sales_debit_0001', 'proposed_sales_credit_0001'],
    source_review_item_ids: ['review_order_sales_0001'],
    source_draft_record_ids: ['draft_order_sales_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    source_bundle_ids: ['bundle_import_test_0001'],
    evidence_manifest_id: 'cem_pje_sale_0001',
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    account_id: 'income_product_sales',
    journal_type: 'sale',
    currency: 'USD',
    credit_amount: 60,
    debit_amount: 0,
    total_debits: 0,
    total_credits: 60,
    effective_period: '2026-05',
    transaction_date: '2026-05-29',
    commit_mode: 'test_only_not_production',
    ...overrides,
  };
}

function proposedLedgerRecord(overrides = {}) {
  return {
    proposed_ledger_record_id: 'proposed_sales_credit_0001',
    source_draft_record_ids: ['draft_order_sales_0001'],
    source_review_item_id: 'review_order_sales_0001',
    source_bundle_ids: ['bundle_import_test_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    account_id: 'income_product_sales',
    account_type: 'income',
    debit_amount: 0,
    credit_amount: 60,
    currency: 'USD',
    effective_period: '2026-05',
    document_links: ['doc_order_1001'],
    calculation_rule_id: 'net_product_sales_v1',
    evidence_manifest_id: 'cem_pje_sale_0001',
    approval_status: 'proposed',
    risk_flags: [],
    ...overrides,
  };
}

function reportManifestInput(overrides = {}) {
  return {
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    entity_scope: ['ent_petpawket'],
    fund_scope: ['fund_operating'],
    class_scope: ['class_commerce'],
    included_record_ids: ['pje_sale_0001'],
    excluded_record_ids: [],
    evidence_manifest_ids: ['cem_pje_sale_0001'],
    required_redaction_profile: 'owner_full_internal',
    privacy_warnings: [],
    missing_evidence_warnings: [],
    generated_by: 'finance_admin_example',
    generated_at: '2026-05-29T11:10:00Z',
    ...overrides,
  };
}

test('reporting policy loads with production disabled', () => {
  const policy = getReportingReadModelPolicy();

  assert.equal(policy.production_reports_enabled, false);
  assert.equal(policy.official_balances_enabled, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.allowed_source_modes.includes('proposed'));
  assert.ok(policy.allowed_report_manifest_types.includes('internal_management_preview'));
});

test('proposed journal read model preserves source IDs', () => {
  const readModel = buildProposedJournalReadModel([proposedJournalEntry()], {
    generated_at: '2026-05-29T11:05:00Z',
    generated_by: 'finance_admin_example',
  });

  assert.equal(readModel.length, 1);
  assert.equal(readModel[0].source_mode, 'proposed');
  assert.deepEqual(readModel[0].proposed_journal_entry_ids, ['pje_sale_0001']);
  assert.deepEqual(readModel[0].source_event_ids, ['source_event_order_created_0001']);
  assert.deepEqual(readModel[0].evidence_manifest_ids, ['cem_pje_sale_0001']);
});

test('test-only ledger read model preserves source IDs', () => {
  const readModel = buildTestOnlyLedgerReadModel([testLedgerEntry()], {
    generated_at: '2026-05-29T11:05:00Z',
    generated_by: 'finance_admin_example',
  });

  assert.equal(readModel.length, 1);
  assert.equal(readModel[0].source_mode, 'test_only');
  assert.deepEqual(readModel[0].test_immutable_ledger_entry_ids, ['test_ledger_pje_sale_0001_000001']);
  assert.deepEqual(readModel[0].source_event_ids, ['source_event_order_created_0001']);
  assert.deepEqual(readModel[0].evidence_manifest_ids, ['cem_pje_sale_0001']);
});

test('simulated balance calculation labels non-production', () => {
  const balances = calculateSimulatedBalances([proposedLedgerRecord()], getBaselineChartOfAccounts(), {
    source_mode: 'proposed',
    generated_at: '2026-05-29T11:15:00Z',
    generated_by: 'finance_admin_example',
  });

  assert.equal(balances[0].production_status, 'non_production_preview');
  assert.equal(balances[0].official_balance, false);
  assert.match(balances[0].warnings.join('\n'), /not official accounting/i);
});

test('simulated balance rejects production source mode', () => {
  assert.throws(
    () => calculateSimulatedBalances([proposedLedgerRecord()], getBaselineChartOfAccounts(), { source_mode: 'production' }),
    /source_mode must be proposed or test_only/i
  );
});

test('simulated balances group by entity fund class account period and currency', () => {
  const balances = calculateSimulatedBalances([
    proposedLedgerRecord({ proposed_ledger_record_id: 'proposed_sales_credit_0001', credit_amount: 60 }),
    proposedLedgerRecord({ proposed_ledger_record_id: 'proposed_sales_credit_0002', credit_amount: 40 }),
    proposedLedgerRecord({
      proposed_ledger_record_id: 'proposed_receivable_debit_0001',
      account_id: 'asset_payment_processor_receivable',
      account_type: 'asset',
      debit_amount: 100,
      credit_amount: 0,
    }),
  ], getBaselineChartOfAccounts(), {
    source_mode: 'proposed',
    generated_at: '2026-05-29T11:15:00Z',
  });

  const income = balances.find((balance) => balance.account_id === 'income_product_sales');
  const receivable = balances.find((balance) => balance.account_id === 'asset_payment_processor_receivable');

  assert.equal(balances.length, 2);
  assert.equal(income.credit_total, 100);
  assert.equal(income.simulated_balance, 100);
  assert.equal(receivable.debit_total, 100);
  assert.equal(receivable.simulated_balance, 100);
});

test('reconciliation preview computes variance', () => {
  const preview = buildReconciliationPreview([
    {
      event_id: 'source_event_order_created_0001',
      event_type: 'order.created',
      net_amount: 60,
    },
  ], [
    proposedLedgerRecord({ credit_amount: 55 }),
  ], {
    source_mode: 'proposed',
    generated_at: '2026-05-29T11:20:00Z',
  });

  assert.equal(preview.production_status, 'non_production_preview');
  assert.equal(preview.source_total, 60);
  assert.equal(preview.ledger_preview_total, 55);
  assert.equal(preview.variance, 5);
});

test('reconciliation preview flags unreconciled source events', () => {
  const preview = buildReconciliationPreview([
    {
      event_id: 'source_event_order_created_0001',
      event_type: 'order.created',
      net_amount: 60,
      idempotency_key: 'order:1',
    },
    {
      event_id: 'source_event_refund_0001',
      event_type: 'refund.issued',
      net_amount: 15,
      idempotency_key: 'refund:1',
    },
    {
      event_id: 'source_event_refund_duplicate',
      event_type: 'refund.issued',
      net_amount: 15,
      idempotency_key: 'refund:1',
    },
  ], [
    proposedLedgerRecord(),
  ], {
    source_mode: 'proposed',
  });

  assert.deepEqual(preview.unreconciled_source_event_ids.sort(), ['source_event_refund_0001', 'source_event_refund_duplicate'].sort());
  assert.equal(preview.duplicate_idempotency_warnings.length, 1);
  assert.equal(preview.refund_reversal_warnings.length, 1);
});

test('report manifest requires report type source mode period and redaction profile', () => {
  assert.throws(
    () => createReportManifest({
      generated_by: 'finance_admin_example',
    }),
    /report_type is required.*source_mode is required.*period is required.*required_redaction_profile is required/i
  );
});

test('report manifest hash is deterministic', () => {
  const first = createReportManifest(reportManifestInput());
  const second = createReportManifest(reportManifestInput());

  assert.equal(first.manifest_hash, second.manifest_hash);
  assert.equal(validateReportManifest(first).ok, true);
});

test('invalid report type is rejected', () => {
  assert.throws(
    () => createReportManifest(reportManifestInput({ report_type: 'irs_final_export' })),
    /invalid report_type/i
  );
});

test('final export path is rejected', () => {
  assert.throws(
    () => createReportManifest(reportManifestInput({ final_export_path: 'exports/irs/final.csv' })),
    /must not include final export paths/i
  );
});

test('write report manifest appends audit event', () => {
  const vaultPath = makeTempVault();
  const manifest = createReportManifest(reportManifestInput());
  const result = writeReportManifest(vaultPath, manifest, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-29T11:30:00Z',
  });

  assert.equal(result.report_manifest.report_manifest_id, manifest.report_manifest_id);
  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'report-manifests.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
  assert.equal(listReportManifests(vaultPath, { report_type: 'internal_management_preview' }).length, 1);
});

test('no official reports or balances are created', () => {
  const vaultPath = makeTempVault();
  writeReportManifest(vaultPath, createReportManifest(reportManifestInput()), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  const result = verifyNoOfficialReportsOrBalances(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
});

test('Pawket Admin reporting read-model files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-reporting-public-test', 'public', 'finance');

  assert.throws(
    () => writeReportManifest(publicPath, createReportManifest(reportManifestInput())),
    /must not be placed under public/i
  );
});
