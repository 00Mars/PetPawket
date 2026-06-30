import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_OPERATOR_SHELL_VERSION = 'pawket-admin-desktop-operator-shell-v0';

const REQUIRED_VIEW_MODEL_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_view',
  raw_document_content_included: false,
});

const DASHBOARD_SECTIONS = Object.freeze([
  'quarantine',
  'staged_source_events',
  'draft_finance_records',
  'review_queue',
  'proposed_ledger_records',
  'proposed_journal_entries',
  'evidence',
  'commit_gate',
  'test_only_ledger',
  'reporting',
  'report_package_gate',
  'report_review_queue',
  'production_disabled_gates',
  'blockers',
  'warnings',
]);

const COLLECTION_ALIASES = Object.freeze({
  quarantine: ['quarantine', 'quarantined_bundles', 'connector_bundles'],
  staged_source_events: ['staged_source_events'],
  draft_finance_records: ['draft_finance_records'],
  review_queue: ['review_queue', 'review_queue_items'],
  proposed_ledger_records: ['proposed_ledger_records'],
  proposed_journal_entries: ['proposed_journal_entries'],
  evidence_manifests: ['evidence_manifests', 'commit_evidence_manifests'],
  commit_gate_evidence_integration_records: ['commit_gate_evidence_integration_records', 'commit_gate_integrations'],
  test_only_immutable_ledger_entries: ['test_only_immutable_ledger_entries', 'test_only_ledger_entries'],
  report_manifests: ['report_manifests'],
  export_intents: ['export_intents', 'export_intent_records'],
  preview_packages: ['preview_packages', 'report_preview_packages'],
  report_review_items: ['report_review_items', 'report_review_queue'],
  report_review_decisions: ['report_review_decisions'],
  report_preview_supersessions: ['report_preview_supersessions', 'report_supersessions'],
  redaction_review_outcomes: ['redaction_review_outcomes'],
  report_reviewer_notes: ['report_reviewer_notes', 'reviewer_notes'],
  disabled_production_commit_records: ['disabled_production_commit_records'],
});

const ID_FIELDS = Object.freeze([
  'bundle_id',
  'quarantine_id',
  'staged_event_id',
  'draft_record_id',
  'proposed_ledger_record_id',
  'proposed_journal_entry_id',
  'integration_id',
  'manifest_id',
  'evidence_manifest_id',
  'commit_evidence_manifest_id',
  'journal_entry_id',
  'test_ledger_entry_id',
  'test_commit_id',
  'report_manifest_id',
  'export_intent_id',
  'preview_package_id',
  'report_review_decision_id',
  'supersession_id',
  'redaction_review_outcome_id',
  'report_reviewer_note_id',
  'review_item_id',
  'report_review_item_id',
  'record_id',
  'event_id',
  'source_event_id',
]);

const STATUS_FIELDS = Object.freeze([
  'status',
  'import_status',
  'validation_status',
  'staging_status',
  'review_status',
  'approval_status',
  'balance_status',
  'commit_status',
  'coverage_status',
  'evidence_status',
  'production_status',
  'final_export_status',
  'decision',
  'outcome',
]);

const WARNING_FIELDS = Object.freeze([
  'warnings',
  'privacy_warnings',
  'redaction_warnings',
  'missing_evidence_warnings',
  'export_profile_warnings',
  'export_risk_flags',
  'commit_warnings',
  'refund_reversal_warnings',
  'donation_payable_warnings',
  'care_credit_liability_warnings',
  'charm_cherish_payable_warnings',
  'duplicate_idempotency_warnings',
]);

const BLOCKER_FIELDS = Object.freeze([
  'blockers',
  'commit_blockers',
  'export_profile_blockers',
]);

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

const FINAL_EXPORT_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.zip']);
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

const DESKTOP_SHELL_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-operator-shell.ndjson',
  'manifests/pipeline-status-view-model.ndjson',
  'manifests/operator-dashboard-read-model.ndjson',
  'manifests/pipeline-health-and-blockers.ndjson',
  'events/desktop-operator-shell.ndjson',
  'events/operator-dashboard-read-model.ndjson',
  'reports/desktop-operator-shell.json',
  'reports/pipeline-status-view-model.json',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
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

function assertAllowedPath(inputPath, label = 'Pawket Admin desktop operator shell path') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error(`${label} is required.`);
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);
  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin desktop operator shell files must not be placed under public/.');
  }
  return resolved;
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

function recordsFor(input = {}, key) {
  const aliases = COLLECTION_ALIASES[key] || [key];
  return aliases.flatMap((alias) => asArray(input[alias])).filter((record) => record !== undefined && record !== null);
}

function allRecords(input = {}) {
  return unique(Object.keys(COLLECTION_ALIASES)).flatMap((key) => recordsFor(input, key));
}

function recordId(record, fallbackPrefix = 'record') {
  if (!isPlainObject(record)) {
    return '';
  }
  for (const field of ID_FIELDS) {
    if (record[field]) {
      return String(record[field]);
    }
  }
  return `${fallbackPrefix}_${sha256Hex(canonicalize(record)).slice(0, 16)}`;
}

function recordTimestamp(record) {
  if (!isPlainObject(record)) {
    return '';
  }
  return record.updated_at ||
    record.created_at ||
    record.generated_at ||
    record.decided_at ||
    record.reviewed_at ||
    record.timestamp ||
    record.received_at ||
    record.occurred_at ||
    '';
}

function countByStatus(records) {
  const counts = {};
  for (const record of records) {
    if (!isPlainObject(record)) {
      continue;
    }
    for (const field of STATUS_FIELDS) {
      const value = record[field];
      if (!value) continue;
      const key = `${field}:${value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function sectionSummary(records, fallbackPrefix) {
  const list = records.filter(isPlainObject);
  const latestTimestamp = list
    .map(recordTimestamp)
    .filter(Boolean)
    .sort()
    .at(-1) || '';

  return {
    total: list.length,
    ids: unique(list.map((record) => recordId(record, fallbackPrefix))),
    statuses: countByStatus(list),
    latest_timestamp: latestTimestamp,
  };
}

function collectStrings(record, fields) {
  return fields.flatMap((field) => asArray(record?.[field]).map((value) => String(value)));
}

function blockerRecord(source, record, message, type = 'record_blocker') {
  return {
    source,
    record_id: recordId(record, source),
    type,
    message: String(message),
  };
}

function warningRecord(source, record, message, type = 'record_warning') {
  return {
    source,
    record_id: recordId(record, source),
    type,
    message: String(message),
  };
}

function statusLooksBlocked(value) {
  return /blocked|rejected|failed|missing|needs_|incomplete|privacy_blocked|redaction_required|final_export_disabled/i.test(String(value || ''));
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

function baseViewModelFields() {
  return { ...REQUIRED_VIEW_MODEL_FIELDS };
}

function hashViewPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

export function getDesktopOperatorShellPolicy() {
  return {
    policy_version: DESKTOP_OPERATOR_SHELL_VERSION,
    production_enabled: false,
    read_only: true,
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    source_mode: 'local_non_production_view',
    raw_document_content_allowed: false,
    raw_document_content_included: false,
    allowed_source_modes: ['local_non_production_view'],
    dashboard_sections: [...DASHBOARD_SECTIONS],
    required_view_model_fields: { ...REQUIRED_VIEW_MODEL_FIELDS },
    forbidden_export_file_extensions: [...FINAL_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_desktop_shell_write_targets: [...DESKTOP_SHELL_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: [
      'live_ledger_commit',
      'production_live_ledger_write',
      'official_balances',
      'official_reports',
      'final_exports',
      'pdf_export',
      'csv_export',
      'xlsx_export',
      'zip_export',
      'public_impact_claims',
      'raw_document_content',
      'production_source_mode',
    ],
  };
}

export function readNdjsonRecords(filePath, options = {}) {
  const resolvedPath = assertAllowedPath(filePath, 'NDJSON file path');
  if (!fs.existsSync(resolvedPath)) {
    if (options.allowMissing === false) {
      throw new Error(`NDJSON file does not exist: ${resolvedPath}`);
    }
    return [];
  }

  const raw = fs.readFileSync(resolvedPath, 'utf8').trim();
  if (!raw) {
    return [];
  }

  return raw.split('\n').filter(Boolean).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${resolvedPath} line ${index + 1} is not valid JSON: ${error.message}`);
    }
  });
}

export function summarizePipelineCounts(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const counts = {
    production_enabled: policy.production_enabled,
    read_only: policy.read_only,
    totals: {},
    total_records: 0,
  };

  const collectionKeys = [
    'quarantine',
    'staged_source_events',
    'draft_finance_records',
    'review_queue',
    'proposed_ledger_records',
    'proposed_journal_entries',
    'evidence_manifests',
    'commit_gate_evidence_integration_records',
    'test_only_immutable_ledger_entries',
    'report_manifests',
    'export_intents',
    'preview_packages',
    'report_review_items',
    'report_review_decisions',
    'report_preview_supersessions',
    'redaction_review_outcomes',
    'report_reviewer_notes',
    'disabled_production_commit_records',
  ];

  for (const key of collectionKeys) {
    const summary = sectionSummary(recordsFor(input, key), key);
    counts[key] = summary;
    counts.totals[key] = summary.total;
    counts.total_records += summary.total;
  }

  counts.evidence = {
    total: counts.evidence_manifests.total + counts.commit_gate_evidence_integration_records.total,
    evidence_manifests: counts.evidence_manifests.total,
    commit_gate_integrations: counts.commit_gate_evidence_integration_records.total,
  };
  counts.reporting = {
    total: counts.report_manifests.total,
    report_manifests: counts.report_manifests.total,
  };
  counts.report_package_gate = {
    total: counts.export_intents.total + counts.preview_packages.total,
    export_intents: counts.export_intents.total,
    preview_packages: counts.preview_packages.total,
  };
  counts.report_review_queue = {
    total: counts.report_review_items.total +
      counts.report_review_decisions.total +
      counts.report_preview_supersessions.total +
      counts.redaction_review_outcomes.total +
      counts.report_reviewer_notes.total,
    report_review_items: counts.report_review_items.total,
    report_review_decisions: counts.report_review_decisions.total,
    report_preview_supersessions: counts.report_preview_supersessions.total,
    redaction_review_outcomes: counts.redaction_review_outcomes.total,
    report_reviewer_notes: counts.report_reviewer_notes.total,
  };

  return counts;
}

export function summarizePipelineBlockers(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const recordBlockers = [];
  const missingEvidence = [];
  const unresolvedRisks = [];
  const rejectedReviewOutcomes = [];
  const statusBlockers = [];

  for (const record of allRecords(input)) {
    if (!isPlainObject(record)) {
      continue;
    }
    const source = record.record_type || record.report_type || record.event_type || 'pipeline_record';

    for (const blocker of collectStrings(record, BLOCKER_FIELDS)) {
      recordBlockers.push(blockerRecord(source, record, blocker));
    }

    for (const missing of collectStrings(record, ['missing_document_types', 'missing_documents', 'missing_evidence_warnings'])) {
      missingEvidence.push(blockerRecord(source, record, missing, 'missing_evidence'));
    }

    const resolvedRiskFlags = new Set(asArray(record.resolved_risk_flags));
    for (const riskFlag of collectStrings(record, ['risk_flags', 'export_risk_flags'])) {
      if (!resolvedRiskFlags.has(riskFlag)) {
        unresolvedRisks.push(blockerRecord(source, record, riskFlag, 'unresolved_risk'));
      }
    }

    if (record.decision === 'rejected' || record.outcome === 'rejected' || record.outcome === 'blocked_privacy') {
      rejectedReviewOutcomes.push(blockerRecord(source, record, record.reason || record.outcome || record.decision, 'rejected_review_outcome'));
    }

    for (const field of STATUS_FIELDS) {
      if (statusLooksBlocked(record[field])) {
        statusBlockers.push(blockerRecord(source, record, `${field}:${record[field]}`, 'blocked_status'));
      }
    }
  }

  const disabledProductionGates = policy.blocked_production_actions.map((action) => ({
    source: 'desktop_operator_shell_policy',
    record_id: action,
    type: 'disabled_production_gate',
    message: `${action} is disabled in the desktop operator shell.`,
  }));

  const allBlockers = [
    ...disabledProductionGates,
    ...recordBlockers,
    ...missingEvidence,
    ...unresolvedRisks,
    ...rejectedReviewOutcomes,
    ...statusBlockers,
  ];

  return {
    total: allBlockers.length,
    disabled_production_gates: disabledProductionGates,
    record_blockers: recordBlockers,
    missing_evidence: missingEvidence,
    unresolved_risks: unresolvedRisks,
    rejected_review_outcomes: rejectedReviewOutcomes,
    blocked_statuses: statusBlockers,
    all_blockers: allBlockers,
  };
}

export function summarizePipelineWarnings(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const warningsByType = {};
  const allWarnings = [];

  for (const record of allRecords(input)) {
    if (!isPlainObject(record)) {
      continue;
    }
    const source = record.record_type || record.report_type || record.event_type || 'pipeline_record';

    for (const field of WARNING_FIELDS) {
      for (const warning of asArray(record[field])) {
        const item = warningRecord(source, record, warning, field);
        allWarnings.push(item);
        if (!warningsByType[field]) {
          warningsByType[field] = [];
        }
        warningsByType[field].push(item);
      }
    }
  }

  return {
    total: allWarnings.length,
    by_type: warningsByType,
    all_warnings: allWarnings,
    production_warning: policy.production_enabled
      ? 'Unexpected production-enabled policy.'
      : 'Operator shell output is non-production and read-only.',
  };
}

export function buildEvidenceStatusSummary(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const evidenceManifests = recordsFor(input, 'evidence_manifests').filter(isPlainObject);
  const integrations = recordsFor(input, 'commit_gate_evidence_integration_records').filter(isPlainObject);
  const sourceDocuments = recordsFor(input, 'source_documents').filter(isPlainObject);
  const evidenceDeferrals = recordsFor(input, 'evidence_deferrals').filter(isPlainObject);
  const records = [...evidenceManifests, ...integrations, ...sourceDocuments, ...evidenceDeferrals];

  return {
    production_enabled: false,
    read_only: true,
    evidence_manifest_ids: unique(evidenceManifests.map((record) => (
      record.manifest_id || record.evidence_manifest_id || record.commit_evidence_manifest_id
    ))),
    commit_gate_evidence_integration_ids: unique(integrations.map((record) => (
      record.integration_id || record.commit_gate_evidence_integration_id || record.record_id
    ))),
    linked_document_ids: unique(records.flatMap((record) => asArray(record.linked_document_ids || record.document_ids || record.linked_record_ids))),
    missing_document_types: unique(records.flatMap((record) => asArray(record.missing_document_types || record.missing_documents))),
    deferred_requirements: unique(records.flatMap((record) => asArray(record.deferred_requirements || record.approved_deferrals))),
    coverage_status_counts: countByStatus(records),
    privacy_warnings: unique(records.flatMap((record) => asArray(record.privacy_warnings))),
    redaction_warnings: unique(records.flatMap((record) => asArray(record.redaction_warnings))),
    risk_flags: unique(records.flatMap((record) => asArray(record.risk_flags))),
    raw_document_content_included: false,
  };
}

export function buildReportStatusSummary(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const reportManifests = recordsFor(input, 'report_manifests').filter(isPlainObject);
  const exportIntents = recordsFor(input, 'export_intents').filter(isPlainObject);
  const previewPackages = recordsFor(input, 'preview_packages').filter(isPlainObject);
  const reviewItems = recordsFor(input, 'report_review_items').filter(isPlainObject);
  const reviewDecisions = recordsFor(input, 'report_review_decisions').filter(isPlainObject);
  const supersessions = recordsFor(input, 'report_preview_supersessions').filter(isPlainObject);
  const redactionOutcomes = recordsFor(input, 'redaction_review_outcomes').filter(isPlainObject);
  const reviewerNotes = recordsFor(input, 'report_reviewer_notes').filter(isPlainObject);
  const records = [
    ...reportManifests,
    ...exportIntents,
    ...previewPackages,
    ...reviewItems,
    ...reviewDecisions,
    ...supersessions,
    ...redactionOutcomes,
    ...reviewerNotes,
  ];

  return {
    production_enabled: false,
    read_only: true,
    final_export_status: 'disabled',
    report_manifest_ids: unique(reportManifests.map((record) => record.report_manifest_id)),
    export_intent_ids: unique(exportIntents.map((record) => record.export_intent_id)),
    preview_package_ids: unique(previewPackages.map((record) => record.preview_package_id)),
    report_review_item_ids: unique(reviewItems.map((record) => record.report_review_item_id)),
    report_review_decision_ids: unique(reviewDecisions.map((record) => record.report_review_decision_id)),
    report_preview_supersession_ids: unique(supersessions.map((record) => record.supersession_id)),
    redaction_review_outcome_ids: unique(redactionOutcomes.map((record) => record.redaction_review_outcome_id)),
    report_reviewer_note_ids: unique(reviewerNotes.map((record) => record.report_reviewer_note_id)),
    status_counts: countByStatus(records),
    privacy_warnings: unique(records.flatMap((record) => asArray(record.privacy_warnings))),
    redaction_warnings: unique(records.flatMap((record) => asArray(record.redaction_warnings))),
    missing_evidence_warnings: unique(records.flatMap((record) => asArray(record.missing_evidence_warnings))),
    export_risk_flags: unique(records.flatMap((record) => asArray(record.export_risk_flags))),
    raw_document_content_included: false,
  };
}

export function buildProductionDisabledStatus(policy = getDesktopOperatorShellPolicy()) {
  return {
    production_enabled: false,
    read_only: true,
    live_ledger_commit_status: 'disabled',
    production_live_ledger_write_status: 'disabled',
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    production_source_mode_status: 'disabled',
    raw_document_content_status: 'blocked',
    public_path_status: 'blocked',
    blocked_actions: [...policy.blocked_production_actions],
  };
}

export function buildPipelineStatusViewModel(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const generatedAt = input.generated_at || nowIso();
  const counts = summarizePipelineCounts(input, policy);
  const blockers = summarizePipelineBlockers(input, policy);
  const warnings = summarizePipelineWarnings(input, policy);
  const evidenceStatus = buildEvidenceStatusSummary(input, policy);
  const reportStatus = buildReportStatusSummary(input, policy);
  const productionDisabled = buildProductionDisabledStatus(policy);

  const sections = {
    quarantine: counts.quarantine,
    staged_source_events: counts.staged_source_events,
    draft_finance_records: counts.draft_finance_records,
    review_queue: counts.review_queue,
    proposed_ledger_records: counts.proposed_ledger_records,
    proposed_journal_entries: counts.proposed_journal_entries,
    evidence: evidenceStatus,
    commit_gate: {
      ...counts.commit_gate_evidence_integration_records,
      disabled_production_commit_records: counts.disabled_production_commit_records.total,
    },
    test_only_ledger: counts.test_only_immutable_ledger_entries,
    reporting: {
      ...counts.reporting,
      report_manifest_ids: reportStatus.report_manifest_ids,
    },
    report_package_gate: {
      ...counts.report_package_gate,
      export_intent_ids: reportStatus.export_intent_ids,
      preview_package_ids: reportStatus.preview_package_ids,
    },
    report_review_queue: {
      ...counts.report_review_queue,
      report_review_item_ids: reportStatus.report_review_item_ids,
      report_review_decision_ids: reportStatus.report_review_decision_ids,
    },
    production_disabled_gates: productionDisabled,
    blockers,
    warnings,
  };

  const viewModel = {
    ...baseViewModelFields(),
    view_model_type: 'pipeline_status',
    policy_version: policy.policy_version,
    generated_at: generatedAt,
    generated_by: input.generated_by || 'system',
    counts,
    sections,
    evidence_status: evidenceStatus,
    report_status: reportStatus,
    production_disabled_gates: productionDisabled,
    blockers,
    warnings,
    desktop_operator_shell_version: DESKTOP_OPERATOR_SHELL_VERSION,
  };

  return {
    ...viewModel,
    view_model_hash: hashViewPayload(viewModel),
  };
}

export function buildOperatorDashboardReadModel(input = {}, policy = getDesktopOperatorShellPolicy()) {
  const pipelineStatus = buildPipelineStatusViewModel(input, policy);
  const dashboard = {
    ...baseViewModelFields(),
    view_model_type: 'operator_dashboard',
    policy_version: policy.policy_version,
    generated_at: input.generated_at || pipelineStatus.generated_at,
    generated_by: input.generated_by || 'system',
    sections: {
      quarantine: pipelineStatus.sections.quarantine,
      staged_source_events: pipelineStatus.sections.staged_source_events,
      draft_finance_records: pipelineStatus.sections.draft_finance_records,
      review_queue: pipelineStatus.sections.review_queue,
      proposed_ledger_records: pipelineStatus.sections.proposed_ledger_records,
      proposed_journal_entries: pipelineStatus.sections.proposed_journal_entries,
      evidence: pipelineStatus.sections.evidence,
      commit_gate: pipelineStatus.sections.commit_gate,
      test_only_ledger: pipelineStatus.sections.test_only_ledger,
      reporting: pipelineStatus.sections.reporting,
      report_package_gate: pipelineStatus.sections.report_package_gate,
      report_review_queue: pipelineStatus.sections.report_review_queue,
      production_disabled_gates: pipelineStatus.sections.production_disabled_gates,
      blockers: pipelineStatus.sections.blockers,
      warnings: pipelineStatus.sections.warnings,
    },
    counts: pipelineStatus.counts,
    desktop_operator_shell_version: DESKTOP_OPERATOR_SHELL_VERSION,
  };

  return {
    ...dashboard,
    view_model_hash: hashViewPayload(dashboard),
  };
}

export function validateDesktopShellViewModel(viewModel, policy = getDesktopOperatorShellPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(viewModel)) {
    return { ok: false, errors: ['Desktop shell view model is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_view_model_fields)) {
    if (viewModel[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }

  if (hasRawContent(viewModel)) {
    errors.push('Desktop shell view models must not include raw document content.');
  }
  if (viewModel.final_export_created === true) {
    errors.push('Desktop shell view models must not create final exports.');
  }
  if (viewModel.official_balance_created === true) {
    errors.push('Desktop shell view models must not create official balances.');
  }
  if (viewModel.official_report_created === true) {
    errors.push('Desktop shell view models must not create official reports.');
  }
  if (viewModel.sections) {
    for (const section of policy.dashboard_sections) {
      if (!Object.hasOwn(viewModel.sections, section)) {
        errors.push(`Missing dashboard section: ${section}.`);
      }
    }
  } else {
    warnings.push('View model has no sections object.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function verifyDesktopShellReadOnly(vaultPathInput, policy = getDesktopOperatorShellPolicy()) {
  const vaultPath = assertAllowedPath(vaultPathInput, 'Vault path');
  const presentPaths = policy.forbidden_desktop_shell_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    present_paths: presentPaths,
    forbidden_desktop_shell_write_targets: [...policy.forbidden_desktop_shell_write_targets],
  };
}

export function verifyNoDesktopShellPublicFiles(vaultPathInput) {
  const vaultPath = assertAllowedPath(vaultPathInput, 'Vault path');
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));

  return {
    ok: publicMatches.length === 0,
    public_path_rejection: true,
    present_paths: publicMatches,
  };
}

export function verifyNoDesktopShellExports(vaultPathInput, policy = getDesktopOperatorShellPolicy()) {
  const vaultPath = assertAllowedPath(vaultPathInput, 'Vault path');
  const files = listFilesRecursive(vaultPath);
  const forbiddenMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    const extension = path.extname(filePath).toLowerCase();
    return FINAL_EXPORT_EXTENSIONS.has(extension) ||
      policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
  });

  return {
    ok: forbiddenMatches.length === 0,
    present_paths: forbiddenMatches,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}
