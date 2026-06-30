import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import {
  getOperatorPreviewRunnerPolicy,
  runOperatorPreview,
} from './pawketAdminOperatorPreviewRunner.js';

export const SAMPLE_VAULT_HARNESS_VERSION = 'pawket-admin-sample-vault-harness-v0';

const SAMPLE_VAULT_PATH = fileURLToPath(new URL('../data/finance/security/sample-vault', import.meta.url));

const SAMPLE_REQUIRED_LABELS = Object.freeze({
  demo: true,
  production_enabled: false,
  read_only: true,
  local_only: true,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'sample_vault_non_production',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
});

const SAMPLE_RECORD_PLAN = Object.freeze([
  ['quarantine', 'quarantine/index.ndjson'],
  ['staged_source_events', 'events/staged-source-events.ndjson'],
  ['draft_finance_records', 'events/draft-finance-records.ndjson'],
  ['review_queue', 'events/review-queue.ndjson'],
  ['proposed_ledger_records', 'events/proposed-ledger-records.ndjson'],
  ['proposed_journal_entries', 'events/proposed-journal-entries.ndjson'],
  ['evidence_manifests', 'manifests/commit-evidence-manifests.ndjson'],
  ['commit_gate_evidence_integration_records', 'manifests/commit-gate-evidence-integration.ndjson'],
  ['test_only_immutable_ledger_entries', 'events/test-immutable-ledger-entries.ndjson'],
  ['report_manifests', 'manifests/report-manifests.ndjson'],
  ['export_intents', 'manifests/export-intent-records.ndjson'],
  ['preview_packages', 'manifests/report-preview-packages.ndjson'],
  ['report_review_items', 'manifests/report-review-queue.ndjson'],
  ['report_review_decisions', 'manifests/report-review-decisions.ndjson'],
  ['report_preview_supersessions', 'manifests/report-preview-supersessions.ndjson'],
  ['redaction_review_outcomes', 'manifests/redaction-review-outcomes.ndjson'],
  ['report_reviewer_notes', 'manifests/report-reviewer-notes.ndjson'],
]);

const SAMPLE_NONPRODUCTION_NOTICE = 'Fictional Pawket Admin sample-vault record for local non-production preview smoke testing.';
const SAMPLE_TIMESTAMP = '2026-05-29T18:00:00Z';

const RAW_CONTENT_FIELDS = new Set([
  'raw_content',
  'rawDocumentContent',
  'file_contents',
  'file_content',
  'content_buffer',
  'document_blob',
  'blob_content',
  'raw_blob',
  'document_body',
  'raw_document_content',
  'decrypted_document_content',
]);

const FORBIDDEN_EXPORT_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.zip']);
const FORBIDDEN_EXPORT_PATH_PATTERNS = Object.freeze([
  'official-report',
  'official-reports',
  'official-balance',
  'official-balances',
  'final-report',
  'final-export',
  'balance-report',
  'irs-export',
  'accountant-export',
  'investor-export',
  'foundation-export',
  'public-impact-export',
  'public-impact-claim',
  'production-report',
  'production-ledger',
]);

const REAL_DATA_PATTERNS = Object.freeze([
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[ -]*?){13,16}\b/,
  /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
  /\b\d+\s+(main|elm|oak|maple|pine|cedar|street|st\.|avenue|ave\.|road|rd\.)\b/i,
  /\b(john|jane|smith|doe|robert|mary|michael|william|david|susan)\b/i,
  /\b(real customer|actual donor|real donor|real vendor|bank account|routing number)\b/i,
]);

function sampleLabels() {
  return { ...SAMPLE_REQUIRED_LABELS, demo_data_notice: SAMPLE_NONPRODUCTION_NOTICE };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function hasRawContent(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasRawContent(item));
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nestedValue]) => (
    RAW_CONTENT_FIELDS.has(key) || hasRawContent(nestedValue)
  ));
}

function listFilesRecursive(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    return [rootPath];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  return fs.readdirSync(rootPath).flatMap((entry) => listFilesRecursive(path.join(rootPath, entry)));
}

function readNdjson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return [];
  }

  return raw.split('\n').map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${filePath} line ${index + 1} is not valid JSON: ${error.message}`);
    }
  });
}

function flattenRecords(records = {}) {
  if (Array.isArray(records)) {
    return records;
  }
  return Object.values(records).flatMap((value) => asArray(value));
}

function recordHasRequiredLabels(record, policy) {
  return Object.entries(policy.required_sample_labels).every(([field, expected]) => record[field] === expected);
}

function pathSegments(inputPath) {
  return path.resolve(inputPath).split(path.sep).filter(Boolean).map((segment) => segment.toLowerCase());
}

function isForbiddenExportPath(filePath, rootPath, policy) {
  const relativePath = rootPath
    ? path.relative(rootPath, filePath).replaceAll(path.sep, '/').toLowerCase()
    : path.resolve(filePath).replaceAll(path.sep, '/').toLowerCase();
  const extension = path.extname(filePath).toLowerCase();
  return policy.forbidden_export_file_extensions.includes(extension) ||
    policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
}

function sampleVaultRecords() {
  const labels = sampleLabels();
  return {
    quarantine: [{
      ...labels,
      record_type: 'sample_quarantined_bundle',
      bundle_id: 'sample_bundle_demo_0001',
      status: 'quarantined',
      connector_id: 'sample_website_connector',
      schema_version: 'sample-vault-demo-v0',
      cursor_start: 'sample_cursor_0001',
      cursor_end: 'sample_cursor_0002',
      record_count: 1,
      payload_hash: 'a'.repeat(64),
      generated_at: SAMPLE_TIMESTAMP,
    }],
    staged_source_events: [{
      ...labels,
      record_type: 'sample_staged_source_event',
      staged_event_id: 'sample_staged_event_0001',
      source_bundle_id: 'sample_bundle_demo_0001',
      source_event_id: 'sample_source_event_order_0001',
      connector_id: 'sample_website_connector',
      event_type: 'order.created',
      validation_status: 'schema_validated',
      staging_status: 'staged',
      occurred_at: SAMPLE_TIMESTAMP,
      source_record_id: 'sample_order_demo_0001',
      idempotency_key: 'sample_idempotency_order_0001',
      payload_hash: 'b'.repeat(64),
      normalized_preview: {
        demo: true,
        amount_preview: 42.5,
        currency: 'USD',
      },
      created_at: SAMPLE_TIMESTAMP,
    }],
    draft_finance_records: [{
      ...labels,
      record_type: 'sample_draft_finance_record',
      draft_record_id: 'sample_draft_sales_0001',
      staged_event_id: 'sample_staged_event_0001',
      source_bundle_id: 'sample_bundle_demo_0001',
      source_event_id: 'sample_source_event_order_0001',
      connector_id: 'sample_website_connector',
      idempotency_key: 'sample_idempotency_order_0001',
      draft_type: 'sales_revenue',
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      account_hint: 'income_product_sales',
      category_hint: 'demo_product_sales',
      gross_amount: 42.5,
      discount_amount: 0,
      tax_amount: 2.5,
      fee_amount: 0,
      net_amount: 40,
      currency: 'USD',
      document_requirements: ['order_source'],
      confidence_score: 0.82,
      review_status: 'ready_for_review',
      risk_flags: [],
      created_at: SAMPLE_TIMESTAMP,
      updated_at: SAMPLE_TIMESTAMP,
    }],
    review_queue: [{
      ...labels,
      record_type: 'sample_review_queue_item',
      review_item_id: 'sample_review_item_sales_0001',
      draft_record_ids: ['sample_draft_sales_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      review_type: 'sales_revenue_review',
      review_status: 'approved_for_ledger_later',
      assigned_role: 'finance_admin',
      required_documents: ['order_source'],
      missing_documents: [],
      warnings: ['Sample review approval is preview-only and does not create live ledger truth.'],
      risk_flags: [],
      decision: 'approved_for_ledger_later',
      decided_by: 'sample_finance_admin_demo',
      decided_at: SAMPLE_TIMESTAMP,
    }],
    proposed_ledger_records: [{
      ...labels,
      record_type: 'sample_proposed_ledger_record',
      proposed_ledger_record_id: 'sample_plr_debit_receivable_0001',
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_review_item_id: 'sample_review_item_sales_0001',
      source_bundle_ids: ['sample_bundle_demo_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      account_id: 'asset_payment_processor_receivable',
      account_type: 'asset',
      debit_amount: 42.5,
      credit_amount: 0,
      currency: 'USD',
      description: 'Sample non-production order receivable proposal.',
      transaction_date: '2026-05-29',
      effective_period: '2026-05',
      document_links: [],
      calculation_rule_id: 'sample_sales_rule_v0',
      approval_status: 'proposed',
      approval_role_required: 'finance_admin',
      risk_flags: [],
      created_at: SAMPLE_TIMESTAMP,
      updated_at: SAMPLE_TIMESTAMP,
    }, {
      ...labels,
      record_type: 'sample_proposed_ledger_record',
      proposed_ledger_record_id: 'sample_plr_credit_sales_0001',
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_review_item_id: 'sample_review_item_sales_0001',
      source_bundle_ids: ['sample_bundle_demo_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      account_id: 'income_product_sales',
      account_type: 'income',
      debit_amount: 0,
      credit_amount: 40,
      currency: 'USD',
      description: 'Sample non-production product sales proposal.',
      transaction_date: '2026-05-29',
      effective_period: '2026-05',
      document_links: [],
      calculation_rule_id: 'sample_sales_rule_v0',
      approval_status: 'proposed',
      approval_role_required: 'finance_admin',
      risk_flags: [],
      created_at: SAMPLE_TIMESTAMP,
      updated_at: SAMPLE_TIMESTAMP,
    }, {
      ...labels,
      record_type: 'sample_proposed_ledger_record',
      proposed_ledger_record_id: 'sample_plr_credit_sales_tax_0001',
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_review_item_id: 'sample_review_item_sales_0001',
      source_bundle_ids: ['sample_bundle_demo_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      account_id: 'liability_sales_tax_payable',
      account_type: 'liability',
      debit_amount: 0,
      credit_amount: 2.5,
      currency: 'USD',
      description: 'Sample non-production sales tax payable proposal.',
      transaction_date: '2026-05-29',
      effective_period: '2026-05',
      document_links: [],
      calculation_rule_id: 'sample_sales_tax_rule_v0',
      approval_status: 'proposed',
      approval_role_required: 'finance_admin',
      risk_flags: [],
      created_at: SAMPLE_TIMESTAMP,
      updated_at: SAMPLE_TIMESTAMP,
    }],
    proposed_journal_entries: [{
      ...labels,
      record_type: 'sample_proposed_journal_entry',
      proposed_journal_entry_id: 'sample_pje_sale_0001',
      source_proposed_ledger_record_ids: [
        'sample_plr_debit_receivable_0001',
        'sample_plr_credit_sales_0001',
        'sample_plr_credit_sales_tax_0001',
      ],
      source_review_item_ids: ['sample_review_item_sales_0001'],
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      source_bundle_ids: ['sample_bundle_demo_0001'],
      evidence_manifest_ids: ['sample_commit_evidence_manifest_0001'],
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      effective_period: '2026-05',
      transaction_date: '2026-05-29',
      description: 'Sample balanced sale proposal with intentionally missing evidence.',
      journal_type: 'sale',
      currency: 'USD',
      total_debits: 42.5,
      total_credits: 42.5,
      balance_status: 'balanced',
      document_coverage_status: 'missing',
      approval_status: 'approved_for_commit_gate',
      commit_status: 'not_committed',
      risk_flags: ['missing_document', 'sample_unresolved_risk'],
      created_by: 'sample_finance_admin_demo',
      created_at: SAMPLE_TIMESTAMP,
      updated_at: SAMPLE_TIMESTAMP,
    }],
    evidence_manifests: [{
      ...labels,
      record_type: 'sample_commit_evidence_manifest',
      manifest_id: 'sample_commit_evidence_manifest_0001',
      proposed_journal_entry_id: 'sample_pje_sale_0001',
      source_proposed_ledger_record_ids: [
        'sample_plr_debit_receivable_0001',
        'sample_plr_credit_sales_0001',
        'sample_plr_credit_sales_tax_0001',
      ],
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      source_bundle_ids: ['sample_bundle_demo_0001'],
      required_document_types: ['order_source'],
      linked_document_ids: [],
      missing_document_types: ['order_source'],
      deferred_requirements: [],
      redaction_warnings: ['Sample public preview redaction blocker remains unresolved.'],
      privacy_warnings: ['Sample privacy blocker keeps this evidence internal-only.'],
      coverage_status: 'missing',
      risk_flags: ['missing_document'],
      manifest_hash: sha256Hex('sample_commit_evidence_manifest_0001'),
      generated_by: 'sample_finance_admin_demo',
      generated_at: SAMPLE_TIMESTAMP,
    }],
    commit_gate_evidence_integration_records: [{
      ...labels,
      record_type: 'sample_commit_gate_evidence_integration',
      integration_id: 'sample_commit_gate_evidence_integration_0001',
      proposed_journal_entry_id: 'sample_pje_sale_0001',
      evidence_manifest_id: 'sample_commit_evidence_manifest_0001',
      manifest_hash: sha256Hex('sample_commit_evidence_manifest_0001'),
      coverage_status: 'missing',
      missing_documents: ['order_source'],
      approved_deferrals: [],
      privacy_warnings: ['Sample privacy blocker is visible before any future commit.'],
      redaction_warnings: ['Sample redaction blocker is visible before any future export.'],
      commit_blockers: ['Sample missing order_source evidence blocks production commit.'],
      commit_warnings: ['Production commit remains disabled.'],
      source_event_ids: ['sample_source_event_order_0001'],
      source_bundle_ids: ['sample_bundle_demo_0001'],
      generated_by: 'sample_finance_admin_demo',
      generated_at: SAMPLE_TIMESTAMP,
    }],
    test_only_immutable_ledger_entries: [{
      ...labels,
      record_type: 'sample_test_only_immutable_ledger_entry',
      test_ledger_entry_id: 'sample_test_ledger_entry_0001',
      source_proposed_journal_entry_id: 'sample_pje_sale_0001',
      source_proposed_ledger_record_ids: [
        'sample_plr_debit_receivable_0001',
        'sample_plr_credit_sales_0001',
        'sample_plr_credit_sales_tax_0001',
      ],
      source_draft_record_ids: ['sample_draft_sales_0001'],
      source_review_item_ids: ['sample_review_item_sales_0001'],
      source_event_ids: ['sample_source_event_order_0001'],
      source_bundle_ids: ['sample_bundle_demo_0001'],
      evidence_manifest_id: 'sample_commit_evidence_manifest_0001',
      entity_id: 'sample_entity_petpawket_demo',
      fund_id: 'sample_fund_operating_demo',
      class_id: 'sample_class_commerce_demo',
      account_id: 'asset_payment_processor_receivable',
      effective_period: '2026-05',
      currency: 'USD',
      debit_amount: 42.5,
      credit_amount: 0,
      previous_ledger_hash: 'GENESIS',
      ledger_entry_hash: sha256Hex('sample_test_ledger_entry_0001'),
      immutable_status: 'test_only',
      committed_by: 'sample_owner_root_demo',
      committed_at: SAMPLE_TIMESTAMP,
    }],
    report_manifests: [{
      ...labels,
      record_type: 'sample_report_manifest',
      report_manifest_id: 'sample_report_manifest_public_0001',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      period: '2026-05',
      entity_scope: ['sample_entity_petpawket_demo'],
      fund_scope: ['sample_fund_operating_demo'],
      class_scope: ['sample_class_commerce_demo'],
      included_record_ids: ['sample_pje_sale_0001'],
      excluded_record_ids: [],
      evidence_manifest_ids: ['sample_commit_evidence_manifest_0001'],
      required_redaction_profile: 'public_impact_report',
      privacy_warnings: ['Sample public preview cannot include private evidence.'],
      redaction_warnings: ['Sample public preview requires redaction review.'],
      missing_evidence_warnings: ['order_source'],
      production_status: 'non_production_preview',
      generated_by: 'sample_owner_root_demo',
      generated_at: SAMPLE_TIMESTAMP,
      manifest_hash: sha256Hex('sample_report_manifest_public_0001'),
    }],
    export_intents: [{
      ...labels,
      record_type: 'sample_export_intent',
      export_intent_id: 'sample_export_intent_public_0001',
      report_manifest_id: 'sample_report_manifest_public_0001',
      requested_report_type: 'public_impact_preview',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      period: '2026-05',
      requested_by: 'sample_owner_root_demo',
      requested_at: SAMPLE_TIMESTAMP,
      intended_recipient_type: 'public_preview_reviewer',
      required_redaction_profile: 'public_impact_report',
      included_record_ids: ['sample_pje_sale_0001'],
      evidence_manifest_ids: ['sample_commit_evidence_manifest_0001'],
      privacy_warnings: ['Sample public preview has privacy blockers.'],
      redaction_warnings: ['Sample public preview has redaction blockers.'],
      missing_evidence_warnings: ['order_source'],
      export_risk_flags: ['privacy_review_needed'],
      approval_status: 'approval_required',
      production_status: 'preview_only',
      final_export_status: 'disabled',
      audit_event_id: 'sample_audit_export_intent_0001',
    }],
    preview_packages: [{
      ...labels,
      record_type: 'sample_preview_package',
      preview_package_id: 'sample_preview_package_public_0001',
      export_intent_id: 'sample_export_intent_public_0001',
      report_manifest_id: 'sample_report_manifest_public_0001',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      period: '2026-05',
      generated_by: 'sample_owner_root_demo',
      generated_at: SAMPLE_TIMESTAMP,
      approval_status: 'blocked_pending_review',
      production_status: 'preview_only',
      final_export_status: 'disabled',
      included_record_ids: ['sample_pje_sale_0001'],
      evidence_manifest_ids: ['sample_commit_evidence_manifest_0001'],
      redaction_profile: 'public_impact_report',
      warnings: ['Sample preview package is metadata-only.'],
      blockers: ['Sample privacy and redaction review remains blocked.'],
      package_hash: sha256Hex('sample_preview_package_public_0001'),
    }],
    report_review_items: [{
      ...labels,
      record_type: 'sample_report_review_item',
      report_review_item_id: 'sample_report_review_public_0001',
      export_intent_id: 'sample_export_intent_public_0001',
      preview_package_id: 'sample_preview_package_public_0001',
      report_manifest_id: 'sample_report_manifest_public_0001',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      period: '2026-05',
      review_status: 'needs_redaction_review',
      assigned_role: 'owner_root',
      production_status: 'preview_only',
      final_export_status: 'disabled',
      privacy_warnings: ['Sample privacy review required.'],
      redaction_warnings: ['Sample redaction review required.'],
      missing_evidence_warnings: ['order_source'],
      export_risk_flags: ['privacy_review_needed'],
      created_at: SAMPLE_TIMESTAMP,
    }],
    report_review_decisions: [{
      ...labels,
      record_type: 'sample_report_review_decision',
      report_review_decision_id: 'sample_report_review_decision_rejected_0001',
      report_review_item_id: 'sample_report_review_public_0001',
      export_intent_id: 'sample_export_intent_public_0001',
      preview_package_id: 'sample_preview_package_public_0001',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      decision: 'rejected',
      reason: 'Sample public impact preview remains blocked by privacy and redaction review.',
      decided_by: 'sample_owner_root_demo',
      decided_at: SAMPLE_TIMESTAMP,
      production_status: 'blocked_pending_review',
      final_export_status: 'disabled',
      decision_final_export_status: 'blocked',
      decision_hash: sha256Hex('sample_report_review_decision_rejected_0001'),
    }],
    report_preview_supersessions: [{
      ...labels,
      record_type: 'sample_report_preview_supersession',
      supersession_id: 'sample_report_preview_supersession_0001',
      superseded_preview_package_id: 'sample_preview_package_public_0001',
      replacement_preview_package_id: null,
      report_review_item_id: 'sample_report_review_public_0001',
      reason: 'Sample rejected public preview is preserved for lineage.',
      superseded_by: 'sample_owner_root_demo',
      superseded_at: SAMPLE_TIMESTAMP,
      production_status: 'blocked_pending_review',
      final_export_status: 'disabled',
      lineage_preserved: true,
    }],
    redaction_review_outcomes: [{
      ...labels,
      record_type: 'sample_redaction_review_outcome',
      redaction_review_outcome_id: 'sample_redaction_outcome_blocked_0001',
      target_type: 'report_review_item',
      target_id: 'sample_report_review_public_0001',
      report_type: 'public_impact_preview',
      preview_source_mode: 'proposed',
      outcome: 'blocked_privacy',
      reason: 'Sample public preview has privacy and redaction blockers.',
      privacy_warnings: ['Sample privacy blocker prevents public preview output.'],
      redaction_warnings: ['Sample redaction blocker prevents public preview output.'],
      reviewed_by: 'sample_owner_root_demo',
      reviewed_at: SAMPLE_TIMESTAMP,
      production_status: 'blocked_pending_review',
      final_export_status: 'disabled',
      outcome_hash: sha256Hex('sample_redaction_outcome_blocked_0001'),
    }],
    report_reviewer_notes: [{
      ...labels,
      record_type: 'sample_report_reviewer_note',
      report_reviewer_note_id: 'sample_report_reviewer_note_0001',
      report_review_item_id: 'sample_report_review_public_0001',
      note_text: 'Sample note: final exports remain disabled and no raw documents are included.',
      noted_by: 'sample_owner_root_demo',
      noted_at: SAMPLE_TIMESTAMP,
      audit_event_id: 'sample_audit_report_note_0001',
      production_status: 'preview_only',
      final_export_status: 'disabled',
    }],
  };
}

function readSampleVaultRecords(sampleVaultPath, policy) {
  const records = {};
  for (const item of policy.record_plan) {
    records[item.collection_key] = readNdjson(path.join(sampleVaultPath, ...item.relative_path.split('/')));
  }
  return records;
}

export function getSampleVaultHarnessPolicy() {
  const runnerPolicy = getOperatorPreviewRunnerPolicy();
  return {
    policy_version: SAMPLE_VAULT_HARNESS_VERSION,
    demo: true,
    production_enabled: false,
    read_only: true,
    local_only: true,
    stdout_only: true,
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    mutation_actions_enabled: false,
    export_actions_enabled: false,
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    source_mode: 'sample_vault_non_production',
    raw_document_content_allowed: false,
    raw_document_content_included: false,
    default_sample_vault_path: SAMPLE_VAULT_PATH,
    required_sample_labels: { ...SAMPLE_REQUIRED_LABELS },
    record_plan: getSampleVaultRecordPlan({
      record_plan: SAMPLE_RECORD_PLAN.map(([collection_key, relative_path]) => ({ collection_key, relative_path })),
    }),
    required_attention_types: [
      'missing_evidence',
      'unresolved_risk',
      'rejected_report_review',
      'privacy_blocker',
      'redaction_blocker',
      'disabled_production_gate',
    ],
    required_nonproduction_banner: runnerPolicy.required_nonproduction_banner,
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_sample_vault_path_segments: ['public'],
    blocked_production_actions: [
      ...runnerPolicy.blocked_production_actions,
      'sample_vault_production_use',
      'sample_vault_public_demo',
      'sample_vault_real_data',
    ],
  };
}

export function getSampleVaultRecordPlan(policy = {}) {
  const plan = policy.record_plan || SAMPLE_RECORD_PLAN.map(([collection_key, relative_path]) => ({
    collection_key,
    relative_path,
  }));
  return plan.map((item) => ({
    collection_key: item.collection_key,
    relative_path: item.relative_path,
    required: true,
    demo_only: true,
    read_only: true,
  }));
}

export function buildSampleVaultRecords(policy = getSampleVaultHarnessPolicy()) {
  const records = sampleVaultRecords();
  const orderedRecords = {};
  for (const item of policy.record_plan) {
    orderedRecords[item.collection_key] = records[item.collection_key] || [];
  }
  return clone(orderedRecords);
}

export function validateSampleVaultRecords(records, policy = getSampleVaultHarnessPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(records)) {
    return { ok: false, errors: ['Sample vault records must be grouped by collection.'], warnings };
  }

  for (const item of policy.record_plan) {
    const collection = records[item.collection_key];
    if (!Array.isArray(collection)) {
      errors.push(`${item.collection_key} must be an array.`);
      continue;
    }
    if (item.required && collection.length === 0) {
      errors.push(`${item.collection_key} must include at least one sample record.`);
    }
  }

  const allRecords = flattenRecords(records);
  for (const [index, record] of allRecords.entries()) {
    if (!isPlainObject(record)) {
      errors.push(`sample_records[${index}] must be an object.`);
      continue;
    }
    if (!recordHasRequiredLabels(record, policy)) {
      errors.push(`sample_records[${index}] is missing required demo/non-production labels.`);
    }
    if (hasRawContent(record)) {
      errors.push(`sample_records[${index}] includes raw document content.`);
    }
  }

  const noRealData = verifySampleVaultContainsNoRealData(records, policy);
  if (!noRealData.ok) {
    errors.push(...noRealData.errors);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function getSampleVaultPath(options = {}, policy = getSampleVaultHarnessPolicy()) {
  const candidate = options.sampleVaultPath || options.vaultPath || policy.default_sample_vault_path;
  return path.resolve(String(candidate));
}

export function verifySampleVaultPathSafe(sampleVaultPath, policy = getSampleVaultHarnessPolicy()) {
  const errors = [];
  const resolved = path.resolve(String(sampleVaultPath || ''));

  if (!sampleVaultPath) {
    errors.push('Sample vault path is required.');
  }
  const segments = pathSegments(resolved);
  for (const forbiddenSegment of policy.forbidden_sample_vault_path_segments) {
    if (segments.includes(forbiddenSegment)) {
      errors.push('Sample vault files must not be placed under public/.');
    }
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    errors.push('Sample vault path must not point at export, report, balance, or production artifact locations.');
  }
  if (!fs.existsSync(resolved)) {
    errors.push(`Sample vault path does not exist: ${resolved}`);
  } else if (!fs.statSync(resolved).isDirectory()) {
    errors.push(`Sample vault path must be a directory: ${resolved}`);
  }

  return { ok: errors.length === 0, errors, sample_vault_path: resolved };
}

export function buildSampleVaultPreviewInput(records, policy = getSampleVaultHarnessPolicy()) {
  const validation = validateSampleVaultRecords(records, policy);
  if (!validation.ok) {
    throw new Error(`Sample vault records rejected: ${validation.errors.join(' ')}`);
  }
  return {
    ...SAMPLE_REQUIRED_LABELS,
    generated_at: SAMPLE_TIMESTAMP,
    generated_by: 'pawket_admin_sample_vault_harness',
    record_plan: policy.record_plan.map((item) => item.collection_key),
    ...clone(records),
    preview_input_hash: sha256Hex(canonicalize(records)),
  };
}

export function runSampleVaultPreviewSmokeTest(options = {}, policy = getSampleVaultHarnessPolicy()) {
  const sampleVaultPath = getSampleVaultPath(options, policy);
  const pathVerification = verifySampleVaultPathSafe(sampleVaultPath, policy);
  if (!pathVerification.ok) {
    return {
      ...SAMPLE_REQUIRED_LABELS,
      ok: false,
      exit_code: 2,
      sample_vault_path: sampleVaultPath,
      errors: pathVerification.errors,
      stdout_text: '',
      stderr_text: `${pathVerification.errors.join(' ')}\n`,
      files_written: [],
    };
  }

  let records;
  try {
    records = readSampleVaultRecords(sampleVaultPath, policy);
  } catch (error) {
    return {
      ...SAMPLE_REQUIRED_LABELS,
      ok: false,
      exit_code: 1,
      sample_vault_path: sampleVaultPath,
      errors: [error.message],
      stdout_text: '',
      stderr_text: `${error.message}\n`,
      files_written: [],
    };
  }

  const recordsValidation = validateSampleVaultRecords(records, policy);
  if (!recordsValidation.ok) {
    return {
      ...SAMPLE_REQUIRED_LABELS,
      ok: false,
      exit_code: 1,
      sample_vault_path: sampleVaultPath,
      errors: recordsValidation.errors,
      stdout_text: '',
      stderr_text: `${recordsValidation.errors.join(' ')}\n`,
      files_written: [],
    };
  }

  let stdoutText = '';
  let stderrText = '';
  const runnerResult = runOperatorPreview(['--vault', sampleVaultPath], {}, {
    stdout: { write(chunk) { stdoutText += chunk; } },
    stderr: { write(chunk) { stderrText += chunk; } },
  });

  const attentionItems = runnerResult.preview?.cli_preview?.attention_items || [];
  const output = {
    ...SAMPLE_REQUIRED_LABELS,
    stdout_only: true,
    ok: runnerResult.ok === true,
    exit_code: runnerResult.exit_code,
    sample_vault_path: sampleVaultPath,
    record_count: flattenRecords(records).length,
    runner_used: runnerResult.preview?.runner_version || null,
    stdout_text: stdoutText,
    stderr_text: stderrText,
    preview_text: runnerResult.preview?.preview_text || '',
    attention_types: [...new Set(attentionItems.map((item) => item.type))],
    attention_messages: attentionItems.map((item) => item.message),
    files_written: runnerResult.files_written || [],
    runner_result: runnerResult,
    preview_output_hash: sha256Hex(canonicalize({
      stdoutText,
      attentionTypes: attentionItems.map((item) => item.type),
      runnerVersion: runnerResult.preview?.runner_version || '',
    })),
  };

  const outputValidation = validateSampleVaultPreviewOutput(output, policy);
  if (!outputValidation.ok) {
    return {
      ...output,
      ok: false,
      exit_code: output.exit_code || 1,
      errors: outputValidation.errors,
    };
  }

  return output;
}

export function validateSampleVaultPreviewOutput(output, policy = getSampleVaultHarnessPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(output)) {
    return { ok: false, errors: ['Sample vault preview output is required.'], warnings };
  }

  for (const [field, expected] of Object.entries(policy.required_sample_labels)) {
    if (output[field] !== expected) {
      errors.push(`${field} must be ${JSON.stringify(expected)}.`);
    }
  }
  if (output.stdout_only !== true) {
    errors.push('stdout_only must be true.');
  }
  if (output.ok !== true) {
    errors.push('Sample vault preview smoke test must complete successfully.');
  }
  if (!String(output.stdout_text || '').includes(policy.required_nonproduction_banner)) {
    errors.push('Sample vault preview stdout must include the non-production banner.');
  }
  if (String(output.stderr_text || '').trim()) {
    errors.push('Successful sample vault preview must not write stderr.');
  }
  if (asArray(output.files_written).length > 0) {
    errors.push('Sample vault preview must not write files.');
  }
  if (hasRawContent(output)) {
    errors.push('Sample vault preview output must not include raw document content.');
  }

  const attentionTypes = new Set(asArray(output.attention_types));
  for (const requiredType of policy.required_attention_types) {
    if (!attentionTypes.has(requiredType)) {
      errors.push(`Sample vault preview must surface ${requiredType}.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifySampleVaultContainsNoRealData(records, policy = getSampleVaultHarnessPolicy()) {
  const errors = [];
  const recordsText = canonicalize(records);

  if (hasRawContent(records)) {
    errors.push('Sample vault records must not include raw document content.');
  }
  for (const pattern of REAL_DATA_PATTERNS) {
    if (pattern.test(recordsText)) {
      errors.push(`Sample vault records appear to include realistic private data matching ${pattern}.`);
    }
  }
  for (const record of flattenRecords(records)) {
    if (!recordHasRequiredLabels(record, policy)) {
      errors.push('Every sample vault record must be clearly labeled demo/non-production/read-only/local-only.');
      break;
    }
  }

  return { ok: errors.length === 0, errors };
}

export function verifySampleVaultCreatesNoExports(sampleVaultPath, policy = getSampleVaultHarnessPolicy()) {
  const pathSafety = verifySampleVaultPathSafe(sampleVaultPath, policy);
  if (!pathSafety.ok) {
    return { ok: false, present_paths: [], errors: pathSafety.errors };
  }

  const files = listFilesRecursive(pathSafety.sample_vault_path);
  const presentPaths = files.filter((filePath) => isForbiddenExportPath(filePath, pathSafety.sample_vault_path, policy));
  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifySampleVaultCreatesNoPublicFiles(sampleVaultPath, policy = getSampleVaultHarnessPolicy()) {
  const resolved = path.resolve(String(sampleVaultPath || ''));
  const errors = [];

  if (!sampleVaultPath) {
    errors.push('Sample vault path is required.');
  }
  if (pathSegments(resolved).includes('public')) {
    errors.push('Sample vault files must not be placed under public/.');
  }
  const publicMatches = fs.existsSync(resolved)
    ? listFilesRecursive(resolved).filter((filePath) => path.relative(resolved, filePath).split(path.sep).includes('public'))
    : [];

  return {
    ok: errors.length === 0 && publicMatches.length === 0,
    errors,
    present_paths: publicMatches,
    public_path_rejection: true,
  };
}
