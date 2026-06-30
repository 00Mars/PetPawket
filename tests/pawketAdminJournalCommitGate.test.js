import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import { mapDraftRecordsToProposedLedgerRecords } from '../utils/pawketAdminLedgerApproval.js';
import {
  createProposedCorrectionOrAdjustment,
  createTestOnlyLedgerCommit,
  groupProposedLedgerRecordsIntoJournalEntries,
  listProposedJournalEntries,
  markProposedJournalEntryDecision,
  validateCorrectionOrAdjustmentRequest,
  validateFinalCommitGate,
  validateProposedJournalEntry,
  verifyNoOfficialLiveLedgerWrites,
  writeProposedJournalEntries,
} from '../utils/pawketAdminJournalCommitGate.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-journal-commit-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_journal_commit_gate_vault',
    created_at: '2026-05-28T10:00:00Z',
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
    gross_amount: 68,
    discount_amount: 8,
    tax_amount: 0,
    fee_amount: 0,
    net_amount: 60,
    currency: 'USD',
    calculation_rule_hint: 'net_product_sales',
    document_requirements: ['order_source_evidence'],
    review_status: 'unreviewed',
    risk_flags: [],
    created_at: '2026-05-28T09:30:00Z',
    updated_at: '2026-05-28T09:30:00Z',
    ...overrides,
  };
}

function proposedRecords(options = {}) {
  return mapDraftRecordsToProposedLedgerRecords([draftRecord(options.draftOverrides || {})], {
    source_review_item_id: options.source_review_item_id || 'review_order_sales_0001',
    effective_period: options.effective_period || '2026-05',
    transaction_date: options.transaction_date || '2026-05-28',
    documentLinks: options.documentLinks === undefined ? ['doc_order_1001'] : options.documentLinks,
  });
}

function proposedJournalEntry(options = {}) {
  const entry = groupProposedLedgerRecordsIntoJournalEntries(options.proposedRecords || proposedRecords(options), {
    created_by: 'finance_admin_example',
    created_at: '2026-05-28T10:05:00Z',
    ...options.groupOptions,
  })[0];

  return {
    ...entry,
    ...(options.entryOverrides || {}),
  };
}

function commitReadyJournalEntry(options = {}) {
  return proposedJournalEntry({
    ...options,
    entryOverrides: {
      ...(options.entryOverrides || {}),
      approval_status: 'approved_for_commit_gate',
    },
  });
}

function validGateContext(overrides = {}) {
  return {
    actor: {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
    },
    period: {
      period_id: '2026-05',
      status: 'open',
    },
    audit_context: {
      reason: 'Final commit gate validation for test-only artifact.',
    },
    ...overrides,
  };
}

test('proposed ledger records group into a proposed journal entry', () => {
  const entries = groupProposedLedgerRecordsIntoJournalEntries(proposedRecords(), {
    created_by: 'finance_admin_example',
  });

  assert.equal(entries.length, 1);
  assert.equal(entries[0].approval_status, 'proposed');
  assert.equal(entries[0].commit_status, 'not_committed');
  assert.equal(entries[0].journal_type, 'sale');
});

test('proposed journal entries preserve source IDs', () => {
  const entry = commitReadyJournalEntry();

  assert.deepEqual(entry.source_proposed_ledger_record_ids.sort(), proposedRecords().map((record) => record.proposed_ledger_record_id).sort());
  assert.deepEqual(entry.source_review_item_ids, ['review_order_sales_0001']);
  assert.deepEqual(entry.source_draft_record_ids, ['draft_order_sales_0001']);
  assert.deepEqual(entry.source_event_ids, ['source_event_order_created_0001']);
  assert.deepEqual(entry.source_bundle_ids, ['bundle_import_test_0001']);
});

test('financial journal totals calculate correctly', () => {
  const entry = proposedJournalEntry();

  assert.equal(entry.total_debits, 60);
  assert.equal(entry.total_credits, 60);
  assert.equal(entry.balance_status, 'balanced');
  assert.equal(entry.document_coverage_status, 'complete');
});

test('balanced financial journal validates', () => {
  const validation = validateProposedJournalEntry(proposedJournalEntry());

  assert.equal(validation.ok, true, validation.errors.join('\n'));
});

test('unbalanced financial journal rejects commit eligibility', () => {
  const records = proposedRecords();
  records[1].credit_amount = 59;
  const entry = commitReadyJournalEntry({ proposedRecords: records });

  assert.equal(validateProposedJournalEntry(entry).ok, false);

  const gate = validateFinalCommitGate(entry, validGateContext());
  assert.equal(gate.eligible, false);
  assert.match(gate.blockers.join('\n'), /balanced|unbalanced/i);
});

test('non-financial story and Pawket Pal records are not forced into debit credit balance', () => {
  const storyRecords = mapDraftRecordsToProposedLedgerRecords([
    draftRecord({
      draft_record_id: 'draft_story_0001',
      draft_type: 'story_impact_review',
      source_event_id: 'source_event_story_0001',
      calculation_rule_hint: 'privacy consent review',
      gross_amount: 0,
      net_amount: 0,
    }),
    draftRecord({
      draft_record_id: 'draft_pal_0001',
      draft_type: 'pawket_pal_asset_review',
      source_event_id: 'source_event_pal_0001',
      calculation_rule_hint: 'asset rights review',
      gross_amount: 0,
      net_amount: 0,
    }),
  ], {
    source_review_item_id: 'review_nonfinancial_0001',
    effective_period: '2026-05',
    transaction_date: '2026-05-28',
    documentLinks: ['doc_story_consent_0001'],
  });
  const entry = proposedJournalEntry({ proposedRecords: storyRecords });

  assert.equal(entry.is_non_financial, true);
  assert.equal(entry.balance_status, 'nonfinancial_not_required');
  assert.equal(validateProposedJournalEntry(entry).ok, true);
});

test('final commit gate rejects unauthorized role', () => {
  const gate = validateFinalCommitGate(commitReadyJournalEntry(), validGateContext({
    actor: {
      actor_id: 'bookkeeper_example',
      role: 'bookkeeper',
    },
  }));

  assert.equal(gate.eligible, false);
  assert.match(gate.blockers.join('\n'), /not allowed to commit/i);
});

test('final commit gate rejects closed period', () => {
  const gate = validateFinalCommitGate(commitReadyJournalEntry(), validGateContext({
    period: {
      period_id: '2026-04',
      status: 'closed',
    },
  }));

  assert.equal(gate.eligible, false);
  assert.match(gate.blockers.join('\n'), /period must be open/i);
});

test('final commit gate rejects incomplete document coverage', () => {
  const entry = commitReadyJournalEntry({ documentLinks: [] });
  const gate = validateFinalCommitGate(entry, validGateContext());

  assert.equal(entry.document_coverage_status, 'incomplete');
  assert.equal(gate.eligible, false);
  assert.match(gate.blockers.join('\n'), /document coverage/i);
});

test('final commit gate rejects proposed journal entries not approved for commit gate', () => {
  const gate = validateFinalCommitGate(proposedJournalEntry(), validGateContext());

  assert.equal(gate.eligible, false);
  assert.match(gate.blockers.join('\n'), /approval_status must be approved_for_commit_gate/i);
});

test('final commit gate can validate eligible entry while commit mode remains disabled', () => {
  const gate = validateFinalCommitGate(commitReadyJournalEntry(), validGateContext());

  assert.equal(gate.eligible, true, gate.blockers.join('\n'));
  assert.equal(gate.can_commit, false);
  assert.equal(gate.commit_mode, 'validation_only_live_commit_disabled');
});

test('test-only commit requires enableTestCommit', () => {
  const vaultPath = makeTempVault();

  assert.throws(
    () => createTestOnlyLedgerCommit(vaultPath, commitReadyJournalEntry(), {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
    }, validGateContext()),
    /enableTestCommit/
  );
});

test('test-only commit writes only to test-ledger-commits', () => {
  const vaultPath = makeTempVault();
  const result = createTestOnlyLedgerCommit(vaultPath, commitReadyJournalEntry(), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T10:10:00Z',
  }, validGateContext({
    enableTestCommit: true,
  }));

  assert.equal(result.test_commit.commit_mode, 'test_only_not_live_ledger');
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'test-ledger-commits.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'journal-entries.ndjson')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'live-ledger.ndjson')), false);
  assert.equal(verifyNoOfficialLiveLedgerWrites(vaultPath).ok, true);
});

test('test-only commit appends an audit event', () => {
  const vaultPath = makeTempVault();
  createTestOnlyLedgerCommit(vaultPath, commitReadyJournalEntry(), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T10:10:00Z',
  }, validGateContext({
    enableTestCommit: true,
  }));

  const audit = verifyAuditChain(vaultPath);
  assert.equal(audit.ok, true, audit.errors.join('\n'));
  assert.equal(audit.events_count, 1);
});

test('correction request requires reason', () => {
  const validation = validateCorrectionOrAdjustmentRequest({
    request_type: 'correction',
    target_entry_id: 'pje_example',
    source_event_ids: ['source_event_order_created_0001'],
  }, validGateContext());

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /reason is required/i);
});

test('proposed correction does not edit original record', () => {
  const vaultPath = makeTempVault();
  const entry = proposedJournalEntry();
  writeProposedJournalEntries(vaultPath, entry, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  const correction = createProposedCorrectionOrAdjustment(vaultPath, {
    request_type: 'correction',
    target_entry_id: entry.proposed_journal_entry_id,
    source_proposed_journal_entry_id: entry.proposed_journal_entry_id,
    source_event_ids: entry.source_event_ids,
    source_bundle_ids: entry.source_bundle_ids,
    document_links: ['doc_order_1001'],
    reason: 'Correct proposed memo before any final commit.',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }, validGateContext());

  assert.equal(correction.proposed_correction_adjustment.status, 'proposed');
  assert.equal(listProposedJournalEntries(vaultPath).length, 1);
  assert.equal(listProposedJournalEntries(vaultPath)[0].approval_status, 'proposed');
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-corrections-adjustments.ndjson')), true);
});

test('invalid journal decision is rejected', () => {
  const vaultPath = makeTempVault();
  const entry = proposedJournalEntry();
  writeProposedJournalEntries(vaultPath, entry);

  assert.throws(
    () => markProposedJournalEntryDecision(vaultPath, entry.proposed_journal_entry_id, 'commit_live_ledger', {
      actor_id: 'owner',
      role: 'owner_root',
    }, 'No.'),
    /invalid proposed journal entry decision/i
  );
});

test('proposed journal decision appends audit event', () => {
  const vaultPath = makeTempVault();
  const entry = proposedJournalEntry();
  writeProposedJournalEntries(vaultPath, entry, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  const decision = markProposedJournalEntryDecision(vaultPath, entry.proposed_journal_entry_id, 'approved_for_commit_gate', {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }, 'Ready for final commit gate validation.');

  assert.equal(decision.updated_entry.approval_status, 'approved_for_commit_gate');
  assert.equal(listProposedJournalEntries(vaultPath, { approval_status: 'approved_for_commit_gate' }).length, 1);
  assert.equal(verifyAuditChain(vaultPath).events_count, 2);
});

test('no official live ledger writes are created by journal gate operations', () => {
  const vaultPath = makeTempVault();
  const entry = commitReadyJournalEntry();
  writeProposedJournalEntries(vaultPath, entry);
  createTestOnlyLedgerCommit(vaultPath, entry, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }, validGateContext({
    enableTestCommit: true,
  }));
  createProposedCorrectionOrAdjustment(vaultPath, {
    request_type: 'adjustment',
    target_entry_id: entry.proposed_journal_entry_id,
    source_event_ids: entry.source_event_ids,
    document_links: ['doc_adjustment_support_0001'],
    reason: 'Prepare a proposed adjustment without editing original records.',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }, validGateContext());

  const result = verifyNoOfficialLiveLedgerWrites(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-journal-entries.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'test-ledger-commits.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'proposed-corrections-adjustments.ndjson')), true);
});

test('Pawket Admin journal commit-gate files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-journal-public-test', 'public', 'finance');

  assert.throws(
    () => listProposedJournalEntries(publicPath),
    /must not be placed under public/i
  );
});
