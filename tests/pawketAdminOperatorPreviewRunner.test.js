import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton } from '../utils/pawketAdminVault.js';
import { buildPipelineStatusViewModel } from '../utils/pawketAdminDesktopOperatorShell.js';
import {
  buildOperatorPreviewFromVault,
  buildOperatorPreviewFromViewModel,
  getOperatorPreviewRunnerPolicy,
  renderOperatorPreviewText,
  resolveOperatorPreviewVaultPath,
  runOperatorPreview,
  validateOperatorPreview,
  verifyNoOperatorPreviewExports,
  verifyNoOperatorPreviewPublicFiles,
  verifyOperatorPreviewReadOnly,
  verifyOperatorPreviewStdoutOnly,
} from '../utils/pawketAdminOperatorPreviewRunner.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-operator-preview-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_operator_preview_vault',
    created_at: '2026-05-29T16:00:00Z',
  });
  return basePath;
}

function appendNdjson(vaultPath, relativePath, record) {
  const filePath = path.join(vaultPath, ...relativePath.split('/'));
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
}

function seedPreviewVault() {
  const vaultPath = makeTempVault();
  appendNdjson(vaultPath, 'quarantine/index.ndjson', {
    bundle_id: 'bundle_preview_0001',
    status: 'quarantined',
    connector_id: 'website_connector_preview',
  });
  appendNdjson(vaultPath, 'events/staged-source-events.ndjson', {
    staged_event_id: 'staged_event_preview_0001',
    source_bundle_id: 'bundle_preview_0001',
    event_type: 'order.created',
    staging_status: 'staged',
  });
  appendNdjson(vaultPath, 'events/draft-finance-records.ndjson', {
    draft_record_id: 'draft_preview_0001',
    draft_type: 'sales_revenue',
    review_status: 'ready_for_review',
  });
  appendNdjson(vaultPath, 'events/review-queue.ndjson', {
    review_item_id: 'review_preview_0001',
    review_status: 'needs_documents',
    missing_documents: ['order_source'],
  });
  appendNdjson(vaultPath, 'events/proposed-ledger-records.ndjson', {
    proposed_ledger_record_id: 'proposed_preview_debit_0001',
    account_id: 'asset_payment_processor_receivable',
    approval_status: 'proposed',
    debit_amount: 25,
    credit_amount: 0,
    currency: 'USD',
  });
  appendNdjson(vaultPath, 'events/proposed-journal-entries.ndjson', {
    proposed_journal_entry_id: 'pje_preview_0001',
    source_proposed_ledger_record_ids: ['proposed_preview_debit_0001'],
    source_event_ids: ['source_event_preview_0001'],
    source_bundle_ids: ['bundle_preview_0001'],
    evidence_manifest_ids: ['commit_evidence_preview_0001'],
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    effective_period: '2026-05',
    transaction_date: '2026-05-29',
    journal_type: 'sale',
    currency: 'USD',
    total_debits: 25,
    total_credits: 25,
    balance_status: 'balanced',
    document_coverage_status: 'missing',
    approval_status: 'approved_for_commit_gate',
    commit_status: 'not_committed',
    risk_flags: ['missing_document'],
  });
  appendNdjson(vaultPath, 'manifests/commit-evidence-manifests.ndjson', {
    manifest_id: 'commit_evidence_preview_0001',
    proposed_journal_entry_id: 'pje_preview_0001',
    coverage_status: 'missing',
    missing_document_types: ['order_source'],
    privacy_warnings: ['Financial source evidence stays local.'],
  });
  appendNdjson(vaultPath, 'manifests/report-manifests.ndjson', {
    report_manifest_id: 'rmanifest_preview_0001',
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    production_status: 'non_production_preview',
    required_redaction_profile: 'owner_full_internal',
  });
  appendNdjson(vaultPath, 'manifests/export-intent-records.ndjson', {
    export_intent_id: 'export_intent_preview_0001',
    report_manifest_id: 'rmanifest_preview_0001',
    requested_report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    production_status: 'preview_only',
    final_export_status: 'disabled',
    required_redaction_profile: 'owner_full_internal',
  });
  appendNdjson(vaultPath, 'manifests/report-review-decisions.ndjson', {
    report_review_decision_id: 'decision_preview_rejected_0001',
    report_review_item_id: 'report_review_public_0001',
    report_type: 'public_impact_preview',
    source_mode: 'proposed',
    decision: 'rejected',
    reason: 'Private assistance context remains blocked.',
    production_status: 'blocked_pending_review',
    final_export_status: 'blocked',
  });
  return vaultPath;
}

function sampleViewModel() {
  return buildPipelineStatusViewModel({
    generated_at: '2026-05-29T16:05:00Z',
    generated_by: 'operator_preview_test',
    quarantine: [{ bundle_id: 'bundle_vm_0001', status: 'quarantined' }],
    evidence_manifests: [{
      manifest_id: 'commit_evidence_vm_0001',
      coverage_status: 'missing',
      missing_document_types: ['order_source'],
      risk_flags: ['missing_document'],
    }],
    report_review_decisions: [{
      report_review_decision_id: 'decision_vm_0001',
      decision: 'rejected',
      reason: 'Public preview remains blocked.',
      final_export_status: 'blocked',
    }],
  });
}

test('operator preview runner policy loads with production disabled', () => {
  const policy = getOperatorPreviewRunnerPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.stdout_only, true);
  assert.equal(policy.final_exports_enabled, false);
});

test('vault path resolves from argv', () => {
  const vaultPath = makeTempVault();
  const resolved = resolveOperatorPreviewVaultPath(['--vault', vaultPath], {});

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'argv');
  assert.equal(resolved.vault_path, path.resolve(vaultPath));
});

test('vault path resolves from environment', () => {
  const vaultPath = makeTempVault();
  const resolved = resolveOperatorPreviewVaultPath([], { PAWKET_ADMIN_VAULT_PATH: vaultPath });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'env');
  assert.equal(resolved.vault_path, path.resolve(vaultPath));
});

test('missing vault path returns safe usage error', () => {
  const resolved = resolveOperatorPreviewVaultPath([], {});

  assert.equal(resolved.ok, false);
  assert.equal(resolved.exit_code, 2);
  assert.match(resolved.error, /vault path is required/i);
  assert.match(resolved.usage, /Usage:/);
});

test('help mode is safe and does not read or write the vault', () => {
  const result = runOperatorPreview(['--help'], {}, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, true);
  assert.equal(result.help, true);
  assert.equal(result.exit_code, 0);
  assert.match(result.stdout_text, /Usage:/);
  assert.deepEqual(result.files_written, []);
});

test('buildOperatorPreviewFromViewModel preserves read-only local-only non-production labels', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview(preview);

  assert.equal(validation.ok, true);
  assert.equal(preview.production_enabled, false);
  assert.equal(preview.read_only, true);
  assert.equal(preview.local_only, true);
  assert.equal(preview.stdout_only, true);
  assert.equal(preview.mutation_actions_enabled, false);
  assert.equal(preview.export_actions_enabled, false);
});

test('buildOperatorPreviewFromVault uses operator shell and UI adapter output', () => {
  const vaultPath = seedPreviewVault();
  const preview = buildOperatorPreviewFromVault(vaultPath);

  assert.equal(preview.view_model_type, 'pipeline_status');
  assert.ok(preview.view_model_hash);
  assert.ok(preview.ui_state_hash);
  assert.ok(preview.cli_preview_hash);
  assert.equal(preview.ui_state.source_view_model_type, 'pipeline_status');
  assert.match(preview.preview_text, /Overview:/);
});

test('rendered preview includes the required non-production banner', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const text = renderOperatorPreviewText(preview);

  assert.match(text, /PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION/);
});

test('rendered preview does not include raw document content', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const text = renderOperatorPreviewText(preview);

  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
  assert.throws(
    () => buildOperatorPreviewFromViewModel({
      ...sampleViewModel(),
      raw_content: 'PRIVATE DOCUMENT BODY',
    }),
    /raw document content/i
  );
});

test('runOperatorPreview writes preview to stdout only', () => {
  const vaultPath = seedPreviewVault();
  let stdout = '';
  let stderr = '';
  const result = runOperatorPreview(['--vault', vaultPath], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(stderr, '');
  assert.equal(result.stderr_text, '');
  assert.match(stdout, /PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION/);
  assert.equal(verifyOperatorPreviewStdoutOnly(result).ok, true);
});

test('validation rejects production enabled state', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview({ ...preview, production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('validation rejects read-only false state', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview({ ...preview, read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('validation rejects local-only false state', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview({ ...preview, local_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /local_only/i);
});

test('validation rejects stdout-only false state', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview({ ...preview, stdout_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /stdout_only/i);
});

test('validation rejects mutation or export actions enabled', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const mutationValidation = validateOperatorPreview({ ...preview, mutation_actions_enabled: true });
  const exportValidation = validateOperatorPreview({ ...preview, export_actions_enabled: true });

  assert.equal(mutationValidation.ok, false);
  assert.match(mutationValidation.errors.join(' '), /mutation_actions_enabled/i);
  assert.equal(exportValidation.ok, false);
  assert.match(exportValidation.errors.join(' '), /export_actions_enabled/i);
});

test('validation rejects official balance report or final export enabled states', () => {
  const preview = buildOperatorPreviewFromViewModel(sampleViewModel());
  const validation = validateOperatorPreview({
    ...preview,
    official_balance_status: 'enabled',
    official_report_status: 'enabled',
    final_export_status: 'enabled',
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /must remain disabled/i);
});

test('malformed local records produce a safe nonzero result', () => {
  const vaultPath = makeTempVault();
  const stagedPath = path.join(vaultPath, 'events', 'staged-source-events.ndjson');
  fs.mkdirSync(path.dirname(stagedPath), { recursive: true });
  fs.writeFileSync(stagedPath, '{"ok": true}\n{bad json}\n');
  let stdout = '';
  let stderr = '';
  const result = runOperatorPreview(['--vault', vaultPath], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /line 2 is not valid JSON/i);
});

test('public path usage is rejected', () => {
  const vaultPath = path.join(os.tmpdir(), 'public', 'pawket-admin-operator-preview');

  assert.throws(
    () => verifyNoOperatorPreviewPublicFiles(vaultPath),
    /must not be placed under public/i
  );
});

test('export artifacts are rejected', () => {
  const vaultPath = makeTempVault();
  const exportPath = path.join(vaultPath, 'reports', 'official-report.pdf');
  fs.mkdirSync(path.dirname(exportPath), { recursive: true });
  fs.writeFileSync(exportPath, 'not a real export');

  const verification = verifyNoOperatorPreviewExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('read-only verifier confirms no mutation or write targets are created', () => {
  const vaultPath = seedPreviewVault();
  buildOperatorPreviewFromVault(vaultPath);
  const verification = verifyOperatorPreviewReadOnly(vaultPath);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
});
