import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256Hex } from '../utils/pawketAdminSecurity.js';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import {
  createDisabledProductionCommitRecord,
  createProposedLedgerCorrectionRecord,
  createTestOnlyImmutableLedgerEntry,
  getLiveLedgerCommitPolicy,
  validateCommitAuthorization,
  validateLedgerBalanceIntegrity,
  validateLedgerPeriodForCommit,
  validateLiveLedgerCommitReadiness,
  verifyNoOfficialLiveLedgerWrites,
  verifyTestImmutableLedgerChain,
} from '../utils/pawketAdminLiveLedgerGate.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-live-ledger-gate-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_live_ledger_gate_vault',
    created_at: '2026-05-29T10:00:00Z',
  });
  return basePath;
}

function actor(overrides = {}) {
  return {
    actor_id: 'owner_root_example',
    role: 'owner_root',
    timestamp: '2026-05-29T10:05:00Z',
    ...overrides,
  };
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
    approval_status: 'approved_for_commit_gate',
    commit_status: 'not_committed',
    risk_flags: [],
    created_by: 'finance_admin_example',
    created_at: '2026-05-29T10:00:00Z',
    updated_at: '2026-05-29T10:00:00Z',
    ...overrides,
  };
}

function evidenceManifest(overrides = {}) {
  const base = {
    manifest_id: 'cem_pje_sale_0001',
    proposed_journal_entry_id: 'pje_sale_0001',
    source_proposed_ledger_record_ids: ['proposed_sales_debit_0001', 'proposed_sales_credit_0001'],
    source_draft_record_ids: ['draft_order_sales_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    source_bundle_ids: ['bundle_import_test_0001'],
    required_document_types: ['order_source'],
    linked_document_ids: ['doc_order_1001'],
    missing_document_types: [],
    deferred_requirements: [],
    redaction_warnings: [],
    privacy_warnings: [],
    coverage_status: 'complete',
    generated_by: 'finance_admin_example',
    generated_at: '2026-05-29T10:03:00Z',
  };
  const merged = { ...base, ...overrides };
  return {
    ...merged,
    manifest_hash: overrides.manifest_hash || sha256Hex(JSON.stringify(merged)),
  };
}

function readyContext(overrides = {}) {
  return {
    actor: actor(),
    period: {
      period_id: '2026-05',
      status: 'open',
    },
    evidenceManifest: evidenceManifest(),
    audit_context: {
      reason: 'Validate final live-ledger commit gate.',
    },
    ...overrides,
  };
}

test('live ledger policy loads with production disabled', () => {
  const policy = getLiveLedgerCommitPolicy();

  assert.equal(policy.production_commit_enabled, false);
  assert.equal(policy.test_commit_allowed_by_default, false);
  assert.equal(policy.allowed_test_commit_flag, 'enableTestCommit');
  assert.ok(policy.forbidden_official_ledger_files.includes('events/live-ledger.ndjson'));
});

test('Connector Node cannot commit', () => {
  const authorization = validateCommitAuthorization(actor({ role: 'connector_node' }), proposedJournalEntry());

  assert.equal(authorization.authorized, false);
  assert.match(authorization.blockers.join('\n'), /connector_node.*may not commit/i);
});

test('Investor Read-Only cannot commit', () => {
  const authorization = validateCommitAuthorization(actor({ role: 'investor_read_only' }), proposedJournalEntry());

  assert.equal(authorization.authorized, false);
  assert.match(authorization.blockers.join('\n'), /investor_read_only.*may not commit/i);
});

test('Bookkeeper cannot final commit', () => {
  const authorization = validateCommitAuthorization(actor({ role: 'bookkeeper' }), proposedJournalEntry());

  assert.equal(authorization.authorized, false);
  assert.match(authorization.blockers.join('\n'), /bookkeeper.*may not commit/i);
});

test('Owner Root authorization passes but production remains disabled', () => {
  const authorization = validateCommitAuthorization(actor({ role: 'Owner Root' }), proposedJournalEntry());
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry(), readyContext({
    actor: actor({ role: 'Owner Root' }),
  }));

  assert.equal(authorization.authorized, true, authorization.blockers.join('\n'));
  assert.equal(readiness.ready, true, readiness.blockers.join('\n'));
  assert.equal(readiness.production_commit_allowed, false);
  assert.equal(readiness.status, 'eligible_but_production_disabled');
});

test('Foundation Admin is limited to foundation scope', () => {
  const foundationEntry = proposedJournalEntry({
    entity_id: 'ent_charm_foundation',
    fund_id: 'fund_charm_restricted',
    class_id: 'class_charm_program',
  });
  const foundationAuthorization = validateCommitAuthorization(actor({ role: 'foundation_admin' }), foundationEntry);
  const operatingAuthorization = validateCommitAuthorization(actor({ role: 'foundation_admin' }), proposedJournalEntry());

  assert.equal(foundationAuthorization.authorized, true, foundationAuthorization.blockers.join('\n'));
  assert.equal(operatingAuthorization.authorized, false);
  assert.match(operatingAuthorization.blockers.join('\n'), /foundation-scoped/i);
});

test('closed period blocks commit', () => {
  const period = validateLedgerPeriodForCommit({ status: 'closed' }, {
    actor: actor(),
  });
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry(), readyContext({
    period: {
      period_id: '2026-04',
      status: 'closed',
    },
  }));

  assert.equal(period.allowed, false);
  assert.match(period.blockers.join('\n'), /closed periods reject/i);
  assert.equal(readiness.ready, false);
  assert.match(readiness.blockers.join('\n'), /closed periods reject/i);
});

test('soft closed period requires override', () => {
  const rejected = validateLedgerPeriodForCommit({ status: 'soft_closed' }, {
    actor: actor({ role: 'finance_admin' }),
  });
  const allowed = validateLedgerPeriodForCommit({ status: 'soft_closed' }, {
    actor: actor({ role: 'finance_admin' }),
    allowSoftClosedOverride: true,
  });

  assert.equal(rejected.allowed, false);
  assert.match(rejected.blockers.join('\n'), /explicit override/i);
  assert.equal(allowed.allowed, true, allowed.blockers.join('\n'));
  assert.match(allowed.warnings.join('\n'), /Soft-closed period override/i);
});

test('balanced proposed journal passes integrity', () => {
  const integrity = validateLedgerBalanceIntegrity(proposedJournalEntry());

  assert.equal(integrity.ok, true, integrity.errors.join('\n'));
});

test('unbalanced financial journal fails integrity', () => {
  const integrity = validateLedgerBalanceIntegrity(proposedJournalEntry({
    total_credits: 59,
    balance_status: 'unbalanced',
  }));

  assert.equal(integrity.ok, false);
  assert.match(integrity.errors.join('\n'), /unbalanced/i);
});

test('nonfinancial journal exemption works', () => {
  const integrity = validateLedgerBalanceIntegrity(proposedJournalEntry({
    journal_type: 'impact_nonfinancial',
    is_non_financial: true,
    total_debits: 0,
    total_credits: 0,
    balance_status: 'nonfinancial_not_required',
    calculation_rule_ids: [],
    document_links: [],
  }));

  assert.equal(integrity.ok, true, integrity.errors.join('\n'));
});

test('missing evidence manifest blocks readiness', () => {
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry(), readyContext({
    evidenceManifest: null,
  }));

  assert.equal(readiness.ready, false);
  assert.match(readiness.blockers.join('\n'), /Evidence manifest is required/i);
});

test('complete evidence manifest allows readiness except production disabled', () => {
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry(), readyContext());

  assert.equal(readiness.ready, true, readiness.blockers.join('\n'));
  assert.equal(readiness.production_commit_allowed, false);
  assert.equal(readiness.test_commit_allowed, false);
  assert.equal(readiness.status, 'eligible_but_production_disabled');
});

test('disabled production commit record writes and appends audit event', () => {
  const vaultPath = makeTempVault();
  const result = createDisabledProductionCommitRecord(vaultPath, proposedJournalEntry(), actor(), readyContext({
    requestProductionCommit: true,
  }));

  assert.equal(result.disabled_commit_record.production_live_ledger_write, false);
  assert.equal(result.disabled_commit_record.commit_gate_status, 'production_commit_blocked');
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'disabled-production-commit-records.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).ok, true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('test-only immutable ledger entry requires enableTestCommit', () => {
  const vaultPath = makeTempVault();

  assert.throws(
    () => createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor(), readyContext()),
    /enableTestCommit/
  );
});

test('test-only immutable ledger entry writes only allowed test file', () => {
  const vaultPath = makeTempVault();
  const result = createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor(), readyContext({
    enableTestCommit: true,
  }));

  assert.equal(result.test_immutable_ledger_entry.commit_mode, 'test_only_not_production');
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'test-immutable-ledger-entries.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'journal-entries.ndjson')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'ledger', 'journal-entries.ndjson')), false);
  assert.equal(verifyNoOfficialLiveLedgerWrites(vaultPath).ok, true);
});

test('test immutable ledger hash chain verifies', () => {
  const vaultPath = makeTempVault();

  createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor(), readyContext({
    enableTestCommit: true,
  }));
  createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry({
    proposed_journal_entry_id: 'pje_sale_0002',
    source_proposed_ledger_record_ids: ['proposed_sales_debit_0002', 'proposed_sales_credit_0002'],
  }), actor({ timestamp: '2026-05-29T10:06:00Z' }), readyContext({
    enableTestCommit: true,
    evidenceManifest: evidenceManifest({
      manifest_id: 'cem_pje_sale_0002',
      proposed_journal_entry_id: 'pje_sale_0002',
    }),
  }));

  const chain = verifyTestImmutableLedgerChain(vaultPath);
  assert.equal(chain.ok, true, chain.errors.join('\n'));
  assert.equal(chain.entries_count, 2);
});

test('tampered test immutable ledger chain fails', () => {
  const vaultPath = makeTempVault();
  createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor(), readyContext({
    enableTestCommit: true,
  }));

  const filePath = path.join(vaultPath, 'events', 'test-immutable-ledger-entries.ndjson');
  const [record] = fs.readFileSync(filePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  record.total_credits = 61;
  fs.writeFileSync(filePath, `${JSON.stringify(record)}\n`);

  const chain = verifyTestImmutableLedgerChain(vaultPath);
  assert.equal(chain.ok, false);
  assert.match(chain.errors.join('\n'), /does not match canonical/i);
});

test('proposed correction requires reason and target', () => {
  const vaultPath = makeTempVault();

  assert.throws(
    () => createProposedLedgerCorrectionRecord(vaultPath, {
      request_type: 'correction',
      source_event_ids: ['source_event_order_created_0001'],
    }, actor(), readyContext()),
    /target_entry_id is required.*reason is required/i
  );
});

test('proposed correction does not edit original entry', () => {
  const vaultPath = makeTempVault();
  createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor(), readyContext({
    enableTestCommit: true,
  }));
  const ledgerPath = path.join(vaultPath, 'events', 'test-immutable-ledger-entries.ndjson');
  const before = fs.readFileSync(ledgerPath, 'utf8');

  const result = createProposedLedgerCorrectionRecord(vaultPath, {
    request_type: 'correction',
    target_entry_id: 'test_ledger_pje_sale_0001_000001',
    source_proposed_journal_entry_id: 'pje_sale_0001',
    source_event_ids: ['source_event_order_created_0001'],
    document_links: ['doc_order_1001'],
    reason: 'Propose correction without editing the original test-only entry.',
  }, actor({ timestamp: '2026-05-29T10:07:00Z' }), readyContext());
  const after = fs.readFileSync(ledgerPath, 'utf8');

  assert.equal(result.proposed_ledger_correction_record.original_entry_modified, false);
  assert.equal(before, after);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-ledger-correction-records.ndjson')), true);
});

test('no official live ledger writes are created', () => {
  const vaultPath = makeTempVault();

  createDisabledProductionCommitRecord(vaultPath, proposedJournalEntry(), actor(), readyContext({
    requestProductionCommit: true,
  }));
  createTestOnlyImmutableLedgerEntry(vaultPath, proposedJournalEntry(), actor({
    timestamp: '2026-05-29T10:08:00Z',
  }), readyContext({
    enableTestCommit: true,
  }));
  createProposedLedgerCorrectionRecord(vaultPath, {
    request_type: 'adjustment',
    target_entry_id: 'test_ledger_pje_sale_0001_000001',
    source_event_ids: ['source_event_order_created_0001'],
    document_links: ['doc_adjustment_support_0001'],
    reason: 'Prepare proposed adjustment without writing official ledger truth.',
  }, actor({ timestamp: '2026-05-29T10:09:00Z' }), readyContext());

  const result = verifyNoOfficialLiveLedgerWrites(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'disabled-production-commit-records.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'test-immutable-ledger-entries.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-ledger-correction-records.ndjson')), true);
});

test('Pawket Admin live-ledger gate files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-live-ledger-public-test', 'public', 'finance');

  assert.throws(
    () => verifyNoOfficialLiveLedgerWrites(publicPath),
    /must not be placed under public/i
  );
});
