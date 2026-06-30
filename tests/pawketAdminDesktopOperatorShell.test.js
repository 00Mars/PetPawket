import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton } from '../utils/pawketAdminVault.js';
import {
  buildEvidenceStatusSummary,
  buildOperatorDashboardReadModel,
  buildPipelineStatusViewModel,
  buildProductionDisabledStatus,
  buildReportStatusSummary,
  getDesktopOperatorShellPolicy,
  readNdjsonRecords,
  summarizePipelineBlockers,
  summarizePipelineCounts,
  summarizePipelineWarnings,
  validateDesktopShellViewModel,
  verifyDesktopShellReadOnly,
  verifyNoDesktopShellExports,
  verifyNoDesktopShellPublicFiles,
} from '../utils/pawketAdminDesktopOperatorShell.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-desktop-shell-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_desktop_operator_shell_vault',
    created_at: '2026-05-29T14:00:00Z',
  });
  return basePath;
}

function sampleInput(overrides = {}) {
  return {
    generated_at: '2026-05-29T14:05:00Z',
    generated_by: 'operator_shell_test',
    quarantine: [{
      bundle_id: 'bundle_import_0001',
      status: 'quarantined',
      created_at: '2026-05-29T13:00:00Z',
    }],
    staged_source_events: [{
      staged_event_id: 'staged_event_order_0001',
      source_bundle_id: 'bundle_import_0001',
      event_type: 'order.created',
      staging_status: 'staged',
      idempotency_key: 'idem_order_0001',
    }],
    draft_finance_records: [{
      draft_record_id: 'draft_sales_0001',
      source_event_id: 'source_event_order_0001',
      draft_type: 'sales_revenue',
      review_status: 'ready_for_review',
      risk_flags: [],
    }],
    review_queue: [{
      review_item_id: 'review_sales_0001',
      review_status: 'approved_for_ledger_later',
      warnings: [],
    }],
    proposed_ledger_records: [{
      proposed_ledger_record_id: 'proposed_sales_debit_0001',
      account_id: 'asset_payment_processor_receivable',
      approval_status: 'proposed',
      source_event_ids: ['source_event_order_0001'],
      evidence_manifest_ids: ['commit_evidence_pje_0001'],
      debit_amount: 60,
      credit_amount: 0,
      currency: 'USD',
    }, {
      proposed_ledger_record_id: 'proposed_sales_credit_0001',
      account_id: 'income_product_sales',
      approval_status: 'proposed',
      source_event_ids: ['source_event_order_0001'],
      evidence_manifest_ids: ['commit_evidence_pje_0001'],
      debit_amount: 0,
      credit_amount: 60,
      currency: 'USD',
    }],
    proposed_journal_entries: [{
      proposed_journal_entry_id: 'pje_sale_0001',
      source_proposed_ledger_record_ids: ['proposed_sales_debit_0001', 'proposed_sales_credit_0001'],
      source_review_item_ids: ['review_sales_0001'],
      source_draft_record_ids: ['draft_sales_0001'],
      source_event_ids: ['source_event_order_0001'],
      source_bundle_ids: ['bundle_import_0001'],
      evidence_manifest_ids: ['commit_evidence_pje_0001'],
      entity_id: 'ent_petpawket',
      fund_id: 'fund_operating',
      class_id: 'class_commerce',
      effective_period: '2026-05',
      transaction_date: '2026-05-29',
      journal_type: 'sale',
      currency: 'USD',
      total_debits: 60,
      total_credits: 60,
      balance_status: 'balanced',
      document_coverage_status: 'complete',
      approval_status: 'approved_for_commit_gate',
      commit_status: 'not_committed',
      risk_flags: [],
    }],
    evidence_manifests: [{
      manifest_id: 'commit_evidence_pje_0001',
      proposed_journal_entry_id: 'pje_sale_0001',
      coverage_status: 'complete',
      linked_document_ids: ['doc_order_source_0001'],
      missing_document_types: [],
      privacy_warnings: ['Order source evidence is financial_sensitive.'],
    }],
    commit_gate_evidence_integration_records: [{
      integration_id: 'commit_gate_evidence_pje_0001',
      proposed_journal_entry_id: 'pje_sale_0001',
      evidence_manifest_id: 'commit_evidence_pje_0001',
      coverage_status: 'complete',
      manifest_hash: 'c'.repeat(64),
      commit_blockers: [],
      commit_warnings: ['Privacy warnings require purpose-specific review.'],
    }],
    test_only_immutable_ledger_entries: [{
      test_ledger_entry_id: 'test_ledger_entry_0001',
      source_proposed_journal_entry_id: 'pje_sale_0001',
      evidence_manifest_id: 'commit_evidence_pje_0001',
      entity_id: 'ent_petpawket',
      fund_id: 'fund_operating',
      class_id: 'class_commerce',
      account_id: 'asset_payment_processor_receivable',
      effective_period: '2026-05',
      currency: 'USD',
      debit_amount: 60,
      credit_amount: 0,
    }],
    report_manifests: [{
      report_manifest_id: 'rmanifest_internal_0001',
      report_type: 'internal_management_preview',
      source_mode: 'proposed',
      period: '2026-05',
      production_status: 'non_production_preview',
      required_redaction_profile: 'owner_full_internal',
      evidence_manifest_ids: ['commit_evidence_pje_0001'],
      missing_evidence_warnings: [],
    }],
    export_intents: [{
      export_intent_id: 'export_intent_internal_0001',
      report_manifest_id: 'rmanifest_internal_0001',
      requested_report_type: 'internal_management_preview',
      source_mode: 'proposed',
      period: '2026-05',
      production_status: 'preview_only',
      final_export_status: 'disabled',
      required_redaction_profile: 'owner_full_internal',
      privacy_warnings: [],
    }],
    preview_packages: [{
      preview_package_id: 'preview_pkg_internal_0001',
      export_intent_id: 'export_intent_internal_0001',
      report_manifest_id: 'rmanifest_internal_0001',
      report_type: 'internal_management_preview',
      source_mode: 'proposed',
      period: '2026-05',
      production_status: 'preview_only',
      final_export_status: 'disabled',
      warnings: ['Final export remains disabled.'],
    }],
    report_review_items: [{
      report_review_item_id: 'report_review_internal_0001',
      export_intent_id: 'export_intent_internal_0001',
      preview_package_id: 'preview_pkg_internal_0001',
      report_manifest_id: 'rmanifest_internal_0001',
      report_type: 'internal_management_preview',
      source_mode: 'proposed',
      period: '2026-05',
      review_status: 'queued',
      production_status: 'preview_only',
      final_export_status: 'disabled',
    }],
    report_review_decisions: [{
      report_review_decision_id: 'decision_rejected_0001',
      report_review_item_id: 'report_review_public_0001',
      report_type: 'public_impact_preview',
      source_mode: 'proposed',
      decision: 'rejected',
      reason: 'Public evidence still contains private assistance context.',
      production_status: 'blocked_pending_review',
      final_export_status: 'blocked',
    }],
    report_preview_supersessions: [{
      supersession_id: 'report_supersession_0001',
      original_review_item_id: 'report_review_old_0001',
      superseding_review_item_id: 'report_review_internal_0001',
      report_type: 'internal_management_preview',
      source_mode: 'proposed',
      production_status: 'preview_only',
      final_export_status: 'disabled',
    }],
    redaction_review_outcomes: [{
      redaction_review_outcome_id: 'redaction_outcome_0001',
      target_id: 'report_review_public_0001',
      report_type: 'public_impact_preview',
      source_mode: 'proposed',
      outcome: 'blocked_privacy',
      reason: 'Private assistance story context cannot enter public impact preview.',
      privacy_warnings: ['Private assistance context must stay internal.'],
      redaction_warnings: ['Public-safe redaction is required.'],
      production_status: 'blocked_pending_review',
      final_export_status: 'disabled',
    }],
    report_reviewer_notes: [{
      report_reviewer_note_id: 'report_note_0001',
      report_review_item_id: 'report_review_internal_0001',
      note_text: 'No final export produced.',
      production_status: 'preview_only',
      final_export_status: 'disabled',
    }],
    ...overrides,
  };
}

test('desktop operator shell policy loads with production disabled', () => {
  const policy = getDesktopOperatorShellPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.official_balances_enabled, false);
  assert.equal(policy.official_reports_enabled, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.dashboard_sections.includes('report_review_queue'));
  assert.ok(policy.forbidden_export_file_extensions.includes('.pdf'));
});

test('NDJSON reader handles missing files safely', () => {
  const vaultPath = makeTempVault();
  const records = readNdjsonRecords(path.join(vaultPath, 'events', 'missing.ndjson'));

  assert.deepEqual(records, []);
});

test('NDJSON reader rejects malformed records safely', () => {
  const vaultPath = makeTempVault();
  const filePath = path.join(vaultPath, 'events', 'bad.ndjson');
  fs.writeFileSync(filePath, '{"ok": true}\n{bad json}\n');

  assert.throws(
    () => readNdjsonRecords(filePath),
    /line 2 is not valid JSON/i
  );
});

test('pipeline status view model includes all major pipeline sections', () => {
  const viewModel = buildPipelineStatusViewModel(sampleInput());
  const validation = validateDesktopShellViewModel(viewModel);

  assert.equal(validation.ok, true);
  for (const section of getDesktopOperatorShellPolicy().dashboard_sections) {
    assert.ok(Object.hasOwn(viewModel.sections, section));
  }
  assert.equal(viewModel.production_enabled, false);
  assert.equal(viewModel.read_only, true);
});

test('operator dashboard read model is read only and non-production', () => {
  const dashboard = buildOperatorDashboardReadModel(sampleInput());
  const validation = validateDesktopShellViewModel(dashboard);

  assert.equal(validation.ok, true);
  assert.equal(dashboard.view_model_type, 'operator_dashboard');
  assert.equal(dashboard.read_only, true);
  assert.equal(dashboard.source_mode, 'local_non_production_view');
  assert.equal(dashboard.raw_document_content_included, false);
});

test('counts summarize quarantine staged draft review proposed evidence report and review states', () => {
  const counts = summarizePipelineCounts(sampleInput());

  assert.equal(counts.quarantine.total, 1);
  assert.equal(counts.staged_source_events.total, 1);
  assert.equal(counts.draft_finance_records.total, 1);
  assert.equal(counts.review_queue.total, 1);
  assert.equal(counts.proposed_ledger_records.total, 2);
  assert.equal(counts.proposed_journal_entries.total, 1);
  assert.equal(counts.evidence.total, 2);
  assert.equal(counts.report_package_gate.total, 2);
  assert.equal(counts.report_review_queue.total, 5);
});

test('blockers summarize missing evidence unresolved risks disabled gates and rejected review outcomes', () => {
  const blockers = summarizePipelineBlockers(sampleInput({
    evidence_manifests: [{
      manifest_id: 'commit_evidence_public_0001',
      coverage_status: 'missing',
      missing_document_types: ['public_impact_proof'],
      risk_flags: ['privacy_review_needed'],
    }],
  }));

  assert.ok(blockers.disabled_production_gates.length >= 4);
  assert.equal(blockers.missing_evidence.some((item) => item.message === 'public_impact_proof'), true);
  assert.equal(blockers.unresolved_risks.some((item) => item.message === 'privacy_review_needed'), true);
  assert.equal(blockers.rejected_review_outcomes.some((item) => item.record_id === 'decision_rejected_0001'), true);
});

test('warnings summarize privacy redaction report and package warnings', () => {
  const warnings = summarizePipelineWarnings(sampleInput());

  assert.equal(warnings.by_type.privacy_warnings.some((item) => /financial_sensitive/.test(item.message)), true);
  assert.equal(warnings.by_type.redaction_warnings.some((item) => /Public-safe redaction/.test(item.message)), true);
  assert.equal(warnings.by_type.warnings.some((item) => /Final export remains disabled/.test(item.message)), true);
});

test('evidence status summary preserves evidence manifest IDs', () => {
  const summary = buildEvidenceStatusSummary(sampleInput());

  assert.deepEqual(summary.evidence_manifest_ids, ['commit_evidence_pje_0001']);
  assert.deepEqual(summary.commit_gate_evidence_integration_ids, ['commit_gate_evidence_pje_0001']);
  assert.equal(summary.linked_document_ids.includes('doc_order_source_0001'), true);
  assert.equal(summary.raw_document_content_included, false);
});

test('report status summary preserves report package and review IDs', () => {
  const summary = buildReportStatusSummary(sampleInput());

  assert.deepEqual(summary.report_manifest_ids, ['rmanifest_internal_0001']);
  assert.deepEqual(summary.export_intent_ids, ['export_intent_internal_0001']);
  assert.deepEqual(summary.preview_package_ids, ['preview_pkg_internal_0001']);
  assert.deepEqual(summary.report_review_item_ids, ['report_review_internal_0001']);
  assert.deepEqual(summary.report_review_decision_ids, ['decision_rejected_0001']);
  assert.deepEqual(summary.redaction_review_outcome_ids, ['redaction_outcome_0001']);
});

test('production disabled status blocks live commits balances reports and exports', () => {
  const status = buildProductionDisabledStatus();

  assert.equal(status.live_ledger_commit_status, 'disabled');
  assert.equal(status.official_balance_status, 'disabled');
  assert.equal(status.official_report_status, 'disabled');
  assert.equal(status.final_export_status, 'disabled');
  assert.equal(status.blocked_actions.includes('live_ledger_commit'), true);
  assert.equal(status.blocked_actions.includes('final_exports'), true);
});

test('view model validation rejects production enabled models', () => {
  const viewModel = buildPipelineStatusViewModel(sampleInput());
  const validation = validateDesktopShellViewModel({
    ...viewModel,
    production_enabled: true,
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('view model validation rejects non-read-only models', () => {
  const viewModel = buildOperatorDashboardReadModel(sampleInput());
  const validation = validateDesktopShellViewModel({
    ...viewModel,
    read_only: false,
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('view model validation rejects enabled official balance report and export states', () => {
  const viewModel = buildPipelineStatusViewModel(sampleInput());
  const validation = validateDesktopShellViewModel({
    ...viewModel,
    official_balance_status: 'enabled',
    official_report_status: 'enabled',
    final_export_status: 'enabled',
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /official_balance_status/i);
  assert.match(validation.errors.join(' '), /official_report_status/i);
  assert.match(validation.errors.join(' '), /final_export_status/i);
});

test('read-only verifier confirms no mutation write targets are created', () => {
  const vaultPath = makeTempVault();
  buildPipelineStatusViewModel(sampleInput());
  buildOperatorDashboardReadModel(sampleInput());

  const result = verifyDesktopShellReadOnly(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
});

test('public path usage is rejected', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-desktop-shell-public-test', 'public', 'finance');

  assert.throws(
    () => readNdjsonRecords(path.join(publicPath, 'records.ndjson')),
    /must not be placed under public/i
  );
  assert.throws(
    () => verifyNoDesktopShellPublicFiles(publicPath),
    /must not be placed under public/i
  );
});

test('export artifacts and official report or balance markers are rejected', () => {
  const vaultPath = makeTempVault();
  const pdfPath = path.join(vaultPath, 'exports', 'preview.pdf');
  const officialReportPath = path.join(vaultPath, 'reports', 'official-report', 'metadata.txt');
  const officialBalancePath = path.join(vaultPath, 'reports', 'official-balances', 'metadata.txt');
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  fs.mkdirSync(path.dirname(officialReportPath), { recursive: true });
  fs.mkdirSync(path.dirname(officialBalancePath), { recursive: true });
  fs.writeFileSync(pdfPath, 'not allowed\n');
  fs.writeFileSync(officialReportPath, 'not allowed\n');
  fs.writeFileSync(officialBalancePath, 'not allowed\n');

  const result = verifyNoDesktopShellExports(vaultPath);
  assert.equal(result.ok, false);
  assert.equal(result.present_paths.length, 3);
});

test('desktop shell view model hashes are deterministic for stable input', () => {
  const first = buildOperatorDashboardReadModel(sampleInput());
  const second = buildOperatorDashboardReadModel(sampleInput());

  assert.equal(first.view_model_hash, second.view_model_hash);
});
