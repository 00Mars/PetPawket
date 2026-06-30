import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import {
  appendReportReviewerNote,
  createReportReviewItem,
  getReportReviewQueuePolicy,
  listReportReviewRecords,
  recordRedactionReviewOutcome,
  recordReportReviewDecision,
  supersedeReportReviewItem,
  validateReportReviewDecision,
  validateReportReviewItem,
  verifyNoFinalExportsFromReviewQueue,
  writeReportReviewRecord,
} from '../utils/pawketAdminReportReviewQueue.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-report-review-queue-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_report_review_queue_vault',
    created_at: '2026-05-29T13:00:00Z',
  });
  return basePath;
}

function ownerRoot(overrides = {}) {
  return {
    actor_id: 'owner_root_example',
    role: 'owner_root',
    timestamp: '2026-05-29T13:10:00Z',
    ...overrides,
  };
}

function reviewItemInput(overrides = {}) {
  return {
    export_intent_id: 'export_intent_internal_0001',
    preview_package_id: 'preview_pkg_internal_0001',
    report_manifest_id: 'rmanifest_internal_0001',
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    intended_recipient_type: 'internal_management',
    required_redaction_profile: 'owner_full_internal',
    assigned_role: 'finance_admin',
    included_record_ids: ['pje_sale_0001'],
    evidence_manifest_ids: ['cem_pje_sale_0001'],
    created_by: 'finance_admin_example',
    created_at: '2026-05-29T13:00:00Z',
    ...overrides,
  };
}

function decisionInput(overrides = {}) {
  return {
    report_review_item_id: 'report_review_internal_0001',
    export_intent_id: 'export_intent_internal_0001',
    preview_package_id: 'preview_pkg_internal_0001',
    report_manifest_id: 'rmanifest_internal_0001',
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    decision: 'approved_for_preview_package',
    previous_review_status: 'queued',
    decided_by: 'finance_admin_example',
    decider_role: 'finance_admin',
    decided_at: '2026-05-29T13:05:00Z',
    reason: 'Preview package metadata can proceed; final export remains disabled.',
    ...overrides,
  };
}

test('report review queue policy loads with production disabled', () => {
  const policy = getReportReviewQueuePolicy();

  assert.equal(policy.production_reports_enabled, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.equal(policy.official_balances_enabled, false);
  assert.ok(policy.allowed_write_targets.report_review_item.endsWith('report-review-queue.ndjson'));
  assert.ok(policy.forbidden_export_file_extensions.includes('.pdf'));
});

test('review item links to export intent and preview package', () => {
  const item = createReportReviewItem(reviewItemInput());

  assert.equal(item.export_intent_id, 'export_intent_internal_0001');
  assert.equal(item.preview_package_id, 'preview_pkg_internal_0001');
  assert.equal(item.report_manifest_id, 'rmanifest_internal_0001');
  assert.equal(item.final_export_status, 'disabled');
  assert.equal(validateReportReviewItem(item).ok, true);
});

test('reviewer role restrictions are enforced', () => {
  assert.throws(
    () => createReportReviewItem(reviewItemInput({
      report_type: 'public_impact_preview',
      required_redaction_profile: 'public_impact_report',
      assigned_role: 'finance_admin',
    })),
    /Role finance_admin is not allowed to review public_impact_preview/i
  );
});

test('approve reject and needs changes decisions are recorded', () => {
  const vaultPath = makeTempVault();
  const approved = recordReportReviewDecision(decisionInput());
  const rejected = recordReportReviewDecision(decisionInput({
    report_review_decision_id: 'decision_rejected_0001',
    decision: 'rejected',
    decided_at: '2026-05-29T13:06:00Z',
    reason: 'Missing support evidence for preview.',
  }));
  const needsChanges = recordReportReviewDecision(decisionInput({
    report_review_decision_id: 'decision_needs_changes_0001',
    decision: 'needs_changes',
    decided_at: '2026-05-29T13:07:00Z',
    reason: 'Redaction warnings need clearer labels.',
  }));

  writeReportReviewRecord(vaultPath, approved, ownerRoot({ role: 'finance_admin' }));
  writeReportReviewRecord(vaultPath, rejected, ownerRoot({ role: 'finance_admin' }));
  writeReportReviewRecord(vaultPath, needsChanges, ownerRoot({ role: 'finance_admin' }));

  const records = listReportReviewRecords(vaultPath, { record_type: 'report_review_decision' });
  assert.equal(records.length, 3);
  assert.equal(validateReportReviewDecision(approved).ok, true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 3);
});

test('rejection history is preserved', () => {
  const rejected = recordReportReviewDecision(decisionInput({
    decision: 'rejected',
    reason: 'Public evidence is incomplete.',
  }));

  assert.equal(rejected.rejection_history.length, 1);
  assert.equal(rejected.rejection_history[0].reason, 'Public evidence is incomplete.');
  assert.equal(rejected.final_export_status, 'blocked');
});

test('supersession preserves old preview lineage', () => {
  const supersession = supersedeReportReviewItem({
    original_review_item_id: 'report_review_old_0001',
    superseding_review_item_id: 'report_review_new_0001',
    original_export_intent_id: 'export_intent_old_0001',
    superseding_export_intent_id: 'export_intent_new_0001',
    original_preview_package_id: 'preview_pkg_old_0001',
    superseding_preview_package_id: 'preview_pkg_new_0001',
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    superseded_by: 'finance_admin_example',
    superseder_role: 'finance_admin',
    superseded_at: '2026-05-29T13:08:00Z',
    reason: 'New manifest includes corrected evidence warnings.',
  });

  assert.equal(supersession.old_preview_lineage.export_intent_id, 'export_intent_old_0001');
  assert.equal(supersession.new_preview_lineage.export_intent_id, 'export_intent_new_0001');
  assert.equal(supersession.final_export_status, 'disabled');
});

test('redaction review blocks unsafe public and investor profiles', () => {
  assert.throws(
    () => recordRedactionReviewOutcome({
      target_type: 'report_review_item',
      target_id: 'report_review_public_0001',
      report_type: 'public_impact_preview',
      source_mode: 'proposed',
      required_redaction_profile: 'owner_full_internal',
      outcome: 'public_safe',
      reviewed_by: 'owner_root_example',
      reviewer_role: 'owner_root',
      reason: 'Unsafe public profile should not pass.',
    }),
    /Public impact review requires the public_impact_report redaction profile/i
  );

  assert.throws(
    () => recordRedactionReviewOutcome({
      target_type: 'report_review_item',
      target_id: 'report_review_investor_0001',
      report_type: 'investor_summary_preview',
      source_mode: 'proposed',
      required_redaction_profile: 'owner_full_internal',
      outcome: 'redaction_approved',
      reviewed_by: 'finance_admin_example',
      reviewer_role: 'finance_admin',
      reason: 'Unsafe investor profile should not pass.',
    }),
    /Investor review requires the investor_summary redaction profile/i
  );
});

test('reviewer notes are audit linked', () => {
  const vaultPath = makeTempVault();
  const result = appendReportReviewerNote(vaultPath, {
    report_review_item_id: 'report_review_internal_0001',
    export_intent_id: 'export_intent_internal_0001',
    preview_package_id: 'preview_pkg_internal_0001',
    note_text: 'Confirm missing evidence warning stays visible.',
    created_at: '2026-05-29T13:11:00Z',
  }, ownerRoot({ role: 'finance_admin' }));

  assert.equal(result.reviewer_note.audit_event_id, result.audit_event.audit_event_id);
  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'report-reviewer-notes.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('review item and decision hashes are deterministic', () => {
  const firstItem = createReportReviewItem(reviewItemInput());
  const secondItem = createReportReviewItem(reviewItemInput());
  const firstDecision = recordReportReviewDecision(decisionInput());
  const secondDecision = recordReportReviewDecision(decisionInput());

  assert.equal(firstItem.review_item_hash, secondItem.review_item_hash);
  assert.equal(firstDecision.decision_hash, secondDecision.decision_hash);
});

test('public paths are rejected', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-report-review-public-test', 'public', 'finance');
  const item = createReportReviewItem(reviewItemInput());

  assert.throws(
    () => writeReportReviewRecord(publicPath, item, ownerRoot({ role: 'finance_admin' })),
    /must not be placed under public/i
  );
  assert.throws(
    () => verifyNoFinalExportsFromReviewQueue(publicPath),
    /must not be placed under public/i
  );
});

test('final export artifacts are rejected', () => {
  const vaultPath = makeTempVault();
  const officialPath = path.join(vaultPath, 'reports', 'official-reports', 'final.pdf');
  fs.mkdirSync(path.dirname(officialPath), { recursive: true });
  fs.writeFileSync(officialPath, 'not allowed\n');

  const result = verifyNoFinalExportsFromReviewQueue(vaultPath);
  assert.equal(result.ok, false);
  assert.equal(result.present_paths.length, 1);
});

test('no official reports or balances are created by review queue records', () => {
  const vaultPath = makeTempVault();
  const item = createReportReviewItem(reviewItemInput());
  const decision = recordReportReviewDecision(decisionInput());
  const supersession = supersedeReportReviewItem({
    original_review_item_id: 'report_review_old_0001',
    superseding_review_item_id: item.report_review_item_id,
    original_export_intent_id: 'export_intent_old_0001',
    superseding_export_intent_id: item.export_intent_id,
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    superseded_by: 'finance_admin_example',
    superseder_role: 'finance_admin',
    reason: 'Replace prior preview metadata.',
  });
  const redactionOutcome = recordRedactionReviewOutcome({
    target_type: 'report_review_item',
    target_id: item.report_review_item_id,
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    required_redaction_profile: 'owner_full_internal',
    outcome: 'redaction_approved',
    reviewed_by: 'finance_admin_example',
    reviewer_role: 'finance_admin',
    reason: 'Internal profile accepted for preview metadata.',
  });

  writeReportReviewRecord(vaultPath, item, ownerRoot({ role: 'finance_admin' }));
  writeReportReviewRecord(vaultPath, decision, ownerRoot({ role: 'finance_admin' }));
  writeReportReviewRecord(vaultPath, supersession, ownerRoot({ role: 'finance_admin' }));
  writeReportReviewRecord(vaultPath, redactionOutcome, ownerRoot({ role: 'finance_admin' }));
  appendReportReviewerNote(vaultPath, {
    report_review_item_id: item.report_review_item_id,
    note_text: 'No final export produced.',
  }, ownerRoot({ role: 'finance_admin' }));

  const result = verifyNoFinalExportsFromReviewQueue(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
  assert.equal(listReportReviewRecords(vaultPath, { record_type: 'report_review_item' }).length, 1);
  assert.equal(verifyAuditChain(vaultPath).events_count, 5);
});
