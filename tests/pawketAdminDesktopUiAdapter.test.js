import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton } from '../utils/pawketAdminVault.js';
import { buildPipelineStatusViewModel } from '../utils/pawketAdminDesktopOperatorShell.js';
import {
  buildOperatorAttentionQueue,
  buildOperatorCliPreview,
  buildOperatorNavigationModel,
  buildOperatorPanelSummaries,
  buildOperatorStatusBadges,
  buildOperatorUiState,
  getDesktopUiAdapterPolicy,
  renderOperatorCliPreviewText,
  validateOperatorNavigationModel,
  validateOperatorUiState,
  verifyNoUiAdapterExports,
  verifyNoUiAdapterPublicFiles,
  verifyUiAdapterReadOnly,
} from '../utils/pawketAdminDesktopUiAdapter.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-desktop-ui-adapter-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_desktop_ui_adapter_vault',
    created_at: '2026-05-29T15:00:00Z',
  });
  return basePath;
}

function sampleInput(overrides = {}) {
  return {
    generated_at: '2026-05-29T15:05:00Z',
    generated_by: 'desktop_ui_adapter_test',
    quarantine: [{
      bundle_id: 'bundle_import_0001',
      status: 'quarantined',
    }],
    staged_source_events: [{
      staged_event_id: 'staged_event_order_0001',
      source_bundle_id: 'bundle_import_0001',
      event_type: 'order.created',
      staging_status: 'staged',
    }],
    draft_finance_records: [{
      draft_record_id: 'draft_sales_0001',
      draft_type: 'sales_revenue',
      review_status: 'ready_for_review',
    }],
    review_queue: [{
      review_item_id: 'review_sales_0001',
      review_status: 'approved_for_ledger_later',
    }],
    proposed_ledger_records: [{
      proposed_ledger_record_id: 'proposed_sales_debit_0001',
      account_id: 'asset_payment_processor_receivable',
      approval_status: 'proposed',
      debit_amount: 60,
      credit_amount: 0,
      currency: 'USD',
    }, {
      proposed_ledger_record_id: 'proposed_sales_credit_0001',
      account_id: 'income_product_sales',
      approval_status: 'proposed',
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
    }],
    evidence_manifests: [{
      manifest_id: 'commit_evidence_pje_0001',
      proposed_journal_entry_id: 'pje_sale_0001',
      coverage_status: 'missing',
      linked_document_ids: [],
      missing_document_types: ['order_source'],
      privacy_warnings: ['Order evidence is financial_sensitive.'],
      risk_flags: ['missing_document'],
    }],
    commit_gate_evidence_integration_records: [{
      integration_id: 'commit_gate_evidence_pje_0001',
      proposed_journal_entry_id: 'pje_sale_0001',
      evidence_manifest_id: 'commit_evidence_pje_0001',
      coverage_status: 'missing',
      manifest_hash: 'c'.repeat(64),
      commit_blockers: ['missing order source evidence'],
      redaction_warnings: ['Redaction review required before public impact preview.'],
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
      missing_evidence_warnings: ['order_source missing'],
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
      privacy_warnings: ['Financial metadata stays local.'],
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

function sampleViewModel(overrides = {}) {
  const viewModel = buildPipelineStatusViewModel(sampleInput(overrides));
  return viewModel;
}

test('desktop UI adapter policy loads with production disabled', () => {
  const policy = getDesktopUiAdapterPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.safe_panels.some((panel) => panel.panel_id === 'report_review'));
  assert.ok(policy.forbidden_export_file_extensions.includes('.pdf'));
});

test('UI state preserves read-only local-only non-production labels', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState(uiState);

  assert.equal(validation.ok, true);
  assert.equal(uiState.production_enabled, false);
  assert.equal(uiState.read_only, true);
  assert.equal(uiState.local_only, true);
  assert.equal(uiState.mutation_actions_enabled, false);
  assert.equal(uiState.export_actions_enabled, false);
});

test('UI state validation rejects production enabled state', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState({ ...uiState, production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('UI state validation rejects read-only false state', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState({ ...uiState, read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only must be true/i);
});

test('UI state validation rejects mutation actions enabled', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState({ ...uiState, mutation_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /mutation_actions_enabled must be false/i);
});

test('UI state validation rejects export actions enabled', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState({ ...uiState, export_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /export_actions_enabled must be false/i);
});

test('navigation model includes expected safe panels', () => {
  const navigation = buildOperatorNavigationModel(sampleViewModel());
  const validation = validateOperatorNavigationModel(navigation);
  const panelIds = navigation.navigation_items.map((item) => item.panel_id);

  assert.equal(validation.ok, true);
  for (const panelId of ['overview', 'pipeline', 'evidence', 'report_packages', 'report_review', 'audit_notes']) {
    assert.ok(panelIds.includes(panelId));
  }
});

test('panel summaries include counts without raw document content', () => {
  const viewModel = sampleViewModel();
  viewModel.sections.evidence.raw_content = 'PRIVATE DOCUMENT BODY';
  const summaries = buildOperatorPanelSummaries(viewModel);

  assert.equal(summaries.pipeline.count, 7);
  assert.equal(summaries.evidence.raw_document_content_included, false);
  assert.doesNotMatch(JSON.stringify(summaries), /PRIVATE DOCUMENT BODY/);
});

test('status badges include disabled production gates', () => {
  const badges = buildOperatorStatusBadges(sampleViewModel());
  const disabledGateBadge = badges.find((badge) => badge.badge_id === 'disabled_production_gates');

  assert.equal(disabledGateBadge.status, 'blocked');
  assert.equal(disabledGateBadge.severity, 'blocker');
});

test('attention queue surfaces missing evidence and unresolved risks', () => {
  const queue = buildOperatorAttentionQueue(sampleViewModel());
  const types = queue.items.map((item) => item.type);

  assert.ok(types.includes('missing_evidence'));
  assert.ok(types.includes('unresolved_risk'));
});

test('attention queue surfaces report review rejections and redaction privacy blockers', () => {
  const queue = buildOperatorAttentionQueue(sampleViewModel());
  const types = queue.items.map((item) => item.type);

  assert.ok(types.includes('rejected_report_review'));
  assert.ok(types.includes('privacy_blocker'));
  assert.ok(types.includes('redaction_blocker'));
});

test('CLI preview includes the non-production read-only banner', () => {
  const preview = buildOperatorCliPreview(sampleViewModel());
  const text = renderOperatorCliPreviewText(preview);

  assert.match(text, /PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION/);
  assert.match(text, /Read only: true \| Local only: true/);
});

test('CLI preview does not include raw document content', () => {
  const viewModel = sampleViewModel();
  viewModel.sections.evidence.raw_content = 'PRIVATE DOCUMENT BODY';
  const preview = buildOperatorCliPreview(viewModel);
  const text = renderOperatorCliPreviewText(preview);

  assert.doesNotMatch(JSON.stringify(preview), /PRIVATE DOCUMENT BODY/);
  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
});

test('validation rejects official balance report or final export enabled states', () => {
  const uiState = buildOperatorUiState(sampleViewModel());
  const validation = validateOperatorUiState({
    ...uiState,
    official_balance_status: 'enabled',
    official_report_status: 'enabled',
    final_export_status: 'enabled',
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /must remain disabled/i);
});

test('read-only verifier confirms no UI adapter write targets are created', () => {
  const vaultPath = makeTempVault();
  const verification = verifyUiAdapterReadOnly(vaultPath);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
});

test('public path usage is rejected', () => {
  const vaultPath = path.join(os.tmpdir(), 'public', 'pawket-admin-desktop-ui-adapter');

  assert.throws(
    () => verifyNoUiAdapterPublicFiles(vaultPath),
    /must not be placed under public/i
  );
});

test('export artifacts are rejected', () => {
  const vaultPath = makeTempVault();
  const reportPath = path.join(vaultPath, 'reports', 'official-report.pdf');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, 'not a real export');

  const verification = verifyNoUiAdapterExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('navigation validation rejects unsafe panels', () => {
  const navigation = buildOperatorNavigationModel(sampleViewModel());
  navigation.navigation_items.push({
    panel_id: 'export_generator',
    label: 'Export Generator',
    enabled: true,
    read_only: false,
    local_only: true,
  });

  const validation = validateOperatorNavigationModel(navigation);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /Unsafe navigation panel/i);
});
