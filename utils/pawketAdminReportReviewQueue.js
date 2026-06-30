import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import { getReportPackageGatePolicy } from './pawketAdminReportPackageGate.js';

export const REPORT_REVIEW_QUEUE_VERSION = 'pawket-admin-report-review-queue-v0';

const REPORT_PACKAGE_POLICY = getReportPackageGatePolicy();

const ALLOWED_REVIEW_STATUSES = new Set([
  'queued',
  'in_review',
  'needs_redaction_review',
  'needs_changes',
  'approved_for_preview_package',
  'rejected',
  'superseded',
  'blocked_pending_review',
  'final_export_disabled',
]);

const ALLOWED_DECISIONS = new Set([
  'approved_for_preview_package',
  'rejected',
  'needs_changes',
  'superseded',
]);

const ALLOWED_REDACTION_OUTCOMES = new Set([
  'redaction_approved',
  'redaction_required',
  'public_safe',
  'blocked_privacy',
  'rejected',
]);

const ALLOWED_SOURCE_MODES = new Set(REPORT_PACKAGE_POLICY.allowed_source_modes);
const ALLOWED_REPORT_TYPES = new Set(REPORT_PACKAGE_POLICY.allowed_preview_report_types);
const NON_PRODUCTION_STATUSES = new Set(REPORT_PACKAGE_POLICY.allowed_production_statuses);
const FINAL_EXPORT_STATUSES = new Set(REPORT_PACKAGE_POLICY.allowed_final_export_statuses);
const REQUIRED_NONPRODUCTION_LABELS = REPORT_PACKAGE_POLICY.required_nonproduction_labels;
const FORBIDDEN_EXPORT_EXTENSIONS = new Set(REPORT_PACKAGE_POLICY.forbidden_export_file_extensions);
const FORBIDDEN_EXPORT_PATHS = Object.freeze([
  ...REPORT_PACKAGE_POLICY.forbidden_export_paths,
  'official-balances',
  'official-reports',
  'final-report',
  'balance-report',
]);

const REVIEWER_ROLE_POLICY = Object.freeze({
  internal_management_preview: ['owner_root', 'finance_admin'],
  accountant_pack_preview: ['owner_root', 'finance_admin', 'accountant_export_user'],
  irs_support_preview: ['owner_root'],
  investor_summary_preview: ['owner_root', 'finance_admin'],
  foundation_pack_preview: ['owner_root', 'foundation_admin'],
  public_impact_preview: ['owner_root'],
  security_audit_preview: ['owner_root'],
});

const ALLOWED_WRITE_TARGETS = Object.freeze({
  report_review_item: 'manifests/report-review-queue.ndjson',
  report_review_decision: 'manifests/report-review-decisions.ndjson',
  report_preview_supersession: 'manifests/report-preview-supersessions.ndjson',
  redaction_review_outcome: 'manifests/redaction-review-outcomes.ndjson',
  report_reviewer_note: 'manifests/report-reviewer-notes.ndjson',
});

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
]);

const SENSITIVE_PUBLIC_PATTERNS = [
  /private/i,
  /donor/i,
  /customer/i,
  /assistance/i,
  /medical/i,
  /story/i,
  /minor/i,
  /family/i,
  /raw document/i,
];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replaceAll(' ', '_').replaceAll('-', '_');
}

function assertAllowedVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);

  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin report review queue files must not be placed under public/.');
  }

  return resolved;
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

function assertNoRawContent(record) {
  if (hasRawContent(record)) {
    throw new Error('Report review records must not include raw document content.');
  }
}

function hashWithout(record, hashField) {
  const { [hashField]: _hash, ...payload } = record;
  return sha256Hex(canonicalize(payload));
}

function readJsonLines(filePath) {
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

function appendJsonLine(filePath, record) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
}

function recordPath(vaultPath, recordType) {
  const target = ALLOWED_WRITE_TARGETS[recordType];
  if (!target) {
    throw new Error(`Unsupported report review record_type: ${recordType || 'missing'}.`);
  }
  return path.join(vaultPath, ...target.split('/'));
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

function ensureNoFinalExportPath(record) {
  for (const field of ['export_path', 'final_export_path', 'output_path', 'file_path', 'package_path']) {
    if (record?.[field]) {
      throw new Error(`Report review records must not include final export paths. Found ${field}.`);
    }
  }
}

function hasSensitivePublicWarning(record) {
  const haystack = [
    ...(record?.privacy_warnings || []),
    ...(record?.redaction_warnings || []),
    ...(record?.missing_evidence_warnings || []),
    ...(record?.export_risk_flags || []),
    ...(record?.included_privacy_classes || []),
    record?.notes || '',
    record?.reason || '',
  ].join(' ');

  return SENSITIVE_PUBLIC_PATTERNS.some((pattern) => pattern.test(haystack));
}

function checkReviewerRole(reportType, role, policy) {
  const normalizedRole = normalizeRole(role);
  const allowedRoles = policy.reviewer_role_policy[reportType] || [];
  return {
    allowed: Boolean(normalizedRole && allowedRoles.includes(normalizedRole)),
    normalized_role: normalizedRole,
    allowed_roles: allowedRoles,
  };
}

function validateSharedReportFields(record, policy, errors) {
  if (record.report_type && !policy.allowed_preview_report_types.includes(record.report_type)) {
    errors.push(`report_type ${record.report_type} is not allowed.`);
  }
  if (record.source_mode && !policy.allowed_source_modes.includes(record.source_mode)) {
    errors.push(`source_mode ${record.source_mode} is not allowed.`);
  }
  if (record.production_status && !policy.allowed_production_statuses.includes(record.production_status)) {
    errors.push('production_status must be non-production.');
  }
  if (record.final_export_status && !policy.allowed_final_export_statuses.includes(record.final_export_status)) {
    errors.push('final_export_status is not allowed.');
  }
  if (record.final_export_created === true) {
    errors.push('Final exports must not be created from the report review queue.');
  }
  if (record.official_balance_created === true) {
    errors.push('Official balances must not be created from the report review queue.');
  }
  if (record.raw_document_content_included === true || hasRawContent(record)) {
    errors.push('Raw document content is not allowed in report review records.');
  }
  for (const label of policy.required_nonproduction_labels) {
    if (!(record.required_nonproduction_labels || []).includes(label)) {
      errors.push(`Missing required non-production label: ${label}.`);
    }
  }
  try {
    ensureNoFinalExportPath(record);
  } catch (error) {
    errors.push(error.message);
  }
}

function redactionSafetyErrors(record) {
  const errors = [];
  if (record.report_type === 'public_impact_preview') {
    if (record.required_redaction_profile && record.required_redaction_profile !== 'public_impact_report') {
      errors.push('Public impact review requires the public_impact_report redaction profile.');
    }
    if (hasSensitivePublicWarning(record)) {
      errors.push('Public impact review cannot approve private donor/customer/assistance/story/medical-adjacent data.');
    }
  }
  if (record.report_type === 'investor_summary_preview') {
    if (record.required_redaction_profile && record.required_redaction_profile !== 'investor_summary') {
      errors.push('Investor review requires the investor_summary redaction profile.');
    }
    if (hasSensitivePublicWarning(record)) {
      errors.push('Investor review cannot approve private donor/customer/assistance/story/medical-adjacent data.');
    }
  }
  return errors;
}

function filterRecords(records, filters) {
  let result = records;
  for (const [field, value] of Object.entries(filters || {})) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    result = result.filter((record) => record[field] === value);
  }
  return result;
}

export function getReportReviewQueuePolicy() {
  return {
    policy_version: REPORT_REVIEW_QUEUE_VERSION,
    production_reports_enabled: false,
    final_exports_enabled: false,
    official_balances_enabled: false,
    allowed_preview_report_types: [...ALLOWED_REPORT_TYPES],
    allowed_source_modes: [...ALLOWED_SOURCE_MODES],
    allowed_review_statuses: [...ALLOWED_REVIEW_STATUSES],
    allowed_decisions: [...ALLOWED_DECISIONS],
    allowed_redaction_outcomes: [...ALLOWED_REDACTION_OUTCOMES],
    allowed_production_statuses: [...NON_PRODUCTION_STATUSES],
    allowed_final_export_statuses: [...FINAL_EXPORT_STATUSES],
    reviewer_role_policy: Object.fromEntries(
      Object.entries(REVIEWER_ROLE_POLICY).map(([reportType, roles]) => [reportType, [...roles]])
    ),
    required_nonproduction_labels: [...REQUIRED_NONPRODUCTION_LABELS],
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATHS],
    allowed_write_targets: { ...ALLOWED_WRITE_TARGETS },
    raw_document_content_allowed: false,
  };
}

export function createReportReviewItem(input, policy = getReportReviewQueuePolicy()) {
  if (!isPlainObject(input)) {
    throw new Error('Report review item input is required.');
  }
  assertNoRawContent(input);
  ensureNoFinalExportPath(input);

  const createdAt = input.created_at || nowIso();
  const reportType = input.report_type || input.requested_report_type;
  const reviewStatus = input.review_status || 'queued';
  const baseItem = {
    record_type: 'report_review_item',
    report_review_item_id: input.report_review_item_id || `report_review_${sha256Hex(canonicalize({
      export_intent_id: input.export_intent_id,
      preview_package_id: input.preview_package_id || '',
      report_manifest_id: input.report_manifest_id,
      report_type: reportType,
      created_at: createdAt,
    })).slice(0, 16)}`,
    export_intent_id: input.export_intent_id,
    preview_package_id: input.preview_package_id || '',
    report_manifest_id: input.report_manifest_id,
    report_type: reportType,
    source_mode: input.source_mode,
    period: input.period,
    intended_recipient_type: input.intended_recipient_type || '',
    required_redaction_profile: input.required_redaction_profile,
    assigned_role: input.assigned_role || '',
    review_status: reviewStatus,
    production_status: input.production_status || 'preview_only',
    final_export_status: input.final_export_status || 'disabled',
    included_record_ids: input.included_record_ids || [],
    evidence_manifest_ids: input.evidence_manifest_ids || [],
    privacy_warnings: input.privacy_warnings || [],
    redaction_warnings: input.redaction_warnings || [],
    missing_evidence_warnings: input.missing_evidence_warnings || [],
    export_risk_flags: input.export_risk_flags || [],
    included_privacy_classes: input.included_privacy_classes || [],
    required_nonproduction_labels: input.required_nonproduction_labels || policy.required_nonproduction_labels,
    final_export_created: false,
    official_balance_created: false,
    raw_document_content_included: false,
    created_by: input.created_by || 'system',
    created_at: createdAt,
    updated_at: input.updated_at || createdAt,
    report_review_queue_version: REPORT_REVIEW_QUEUE_VERSION,
  };

  const item = {
    ...baseItem,
    review_item_hash: hashWithout(baseItem, 'review_item_hash'),
  };
  const validation = validateReportReviewItem(item, policy);
  if (!validation.ok) {
    throw new Error(`Report review item rejected: ${validation.errors.join(' ')}`);
  }
  return item;
}

export function validateReportReviewItem(item, policy = getReportReviewQueuePolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(item)) {
    return { ok: false, errors: ['Report review item is required.'], warnings };
  }

  for (const field of [
    'record_type',
    'report_review_item_id',
    'export_intent_id',
    'report_manifest_id',
    'report_type',
    'source_mode',
    'period',
    'required_redaction_profile',
    'review_status',
    'production_status',
    'final_export_status',
    'created_by',
    'created_at',
  ]) {
    if (!item[field]) {
      errors.push(`${field} is required.`);
    }
  }

  if (item.record_type && item.record_type !== 'report_review_item') {
    errors.push('record_type must be report_review_item.');
  }
  if (item.review_status && !policy.allowed_review_statuses.includes(item.review_status)) {
    errors.push(`review_status ${item.review_status} is not allowed.`);
  }
  if (item.assigned_role) {
    const roleCheck = checkReviewerRole(item.report_type, item.assigned_role, policy);
    if (!roleCheck.allowed) {
      errors.push(`Role ${item.assigned_role} is not allowed to review ${item.report_type}.`);
    }
  }

  validateSharedReportFields(item, policy, errors);

  if (item.review_item_hash && item.review_item_hash !== hashWithout(item, 'review_item_hash')) {
    errors.push('review_item_hash does not match canonical review item content.');
  }

  if ((item.privacy_warnings || []).length) {
    warnings.push('Privacy warnings must remain visible through review.');
  }
  if ((item.missing_evidence_warnings || []).length) {
    warnings.push('Missing evidence warnings require decision handling.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function recordReportReviewDecision(input, policy = getReportReviewQueuePolicy()) {
  if (!isPlainObject(input)) {
    throw new Error('Report review decision input is required.');
  }
  assertNoRawContent(input);
  ensureNoFinalExportPath(input);

  const decidedAt = input.decided_at || nowIso();
  const decision = input.decision;
  const finalExportStatus = decision === 'rejected' ? 'blocked' : 'disabled';
  const productionStatus = decision === 'rejected' || decision === 'needs_changes' ? 'blocked_pending_review' : 'preview_only';
  const baseDecision = {
    record_type: 'report_review_decision',
    report_review_decision_id: input.report_review_decision_id || `report_review_decision_${sha256Hex(canonicalize({
      report_review_item_id: input.report_review_item_id,
      decision,
      decided_by: input.decided_by,
      decided_at: decidedAt,
    })).slice(0, 16)}`,
    report_review_item_id: input.report_review_item_id,
    export_intent_id: input.export_intent_id || '',
    preview_package_id: input.preview_package_id || '',
    report_manifest_id: input.report_manifest_id || '',
    report_type: input.report_type,
    source_mode: input.source_mode,
    period: input.period || '',
    decision,
    previous_review_status: input.previous_review_status || '',
    resulting_review_status: input.resulting_review_status || decision,
    decided_by: input.decided_by,
    decider_role: input.decider_role,
    decided_at: decidedAt,
    reason: input.reason,
    blockers: input.blockers || [],
    warnings: input.warnings || [],
    rejection_history: input.rejection_history || (decision === 'rejected' ? [{
      reason: input.reason,
      rejected_by: input.decided_by,
      rejected_at: decidedAt,
    }] : []),
    required_nonproduction_labels: input.required_nonproduction_labels || policy.required_nonproduction_labels,
    production_status: input.production_status || productionStatus,
    final_export_status: input.final_export_status || finalExportStatus,
    final_export_created: false,
    official_balance_created: false,
    raw_document_content_included: false,
    report_review_queue_version: REPORT_REVIEW_QUEUE_VERSION,
  };

  const reviewDecision = {
    ...baseDecision,
    decision_hash: hashWithout(baseDecision, 'decision_hash'),
  };
  const validation = validateReportReviewDecision(reviewDecision, policy);
  if (!validation.ok) {
    throw new Error(`Report review decision rejected: ${validation.errors.join(' ')}`);
  }
  return reviewDecision;
}

export function validateReportReviewDecision(decision, policy = getReportReviewQueuePolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(decision)) {
    return { ok: false, errors: ['Report review decision is required.'], warnings };
  }

  for (const field of [
    'record_type',
    'report_review_decision_id',
    'report_review_item_id',
    'report_type',
    'source_mode',
    'decision',
    'resulting_review_status',
    'decided_by',
    'decider_role',
    'decided_at',
    'reason',
    'production_status',
    'final_export_status',
  ]) {
    if (!decision[field]) {
      errors.push(`${field} is required.`);
    }
  }

  if (decision.record_type && decision.record_type !== 'report_review_decision') {
    errors.push('record_type must be report_review_decision.');
  }
  if (decision.decision && !policy.allowed_decisions.includes(decision.decision)) {
    errors.push(`decision ${decision.decision} is not allowed.`);
  }
  if (decision.resulting_review_status && !policy.allowed_review_statuses.includes(decision.resulting_review_status)) {
    errors.push(`resulting_review_status ${decision.resulting_review_status} is not allowed.`);
  }

  const roleCheck = checkReviewerRole(decision.report_type, decision.decider_role, policy);
  if (!roleCheck.allowed) {
    errors.push(`Role ${decision.decider_role || 'missing'} is not allowed to decide ${decision.report_type}.`);
  }

  validateSharedReportFields(decision, policy, errors);
  if (decision.decision_hash && decision.decision_hash !== hashWithout(decision, 'decision_hash')) {
    errors.push('decision_hash does not match canonical review decision content.');
  }

  if (decision.decision === 'approved_for_preview_package') {
    errors.push(...redactionSafetyErrors(decision));
  }

  if (decision.decision === 'rejected') {
    warnings.push('Rejection is append-only and must preserve prior preview lineage.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function supersedeReportReviewItem(input, policy = getReportReviewQueuePolicy()) {
  if (!isPlainObject(input)) {
    throw new Error('Report review supersession input is required.');
  }
  assertNoRawContent(input);
  ensureNoFinalExportPath(input);

  const supersededAt = input.superseded_at || nowIso();
  const baseSupersession = {
    record_type: 'report_preview_supersession',
    supersession_id: input.supersession_id || `report_supersession_${sha256Hex(canonicalize({
      original_review_item_id: input.original_review_item_id,
      superseding_review_item_id: input.superseding_review_item_id,
      superseded_by: input.superseded_by,
      superseded_at: supersededAt,
    })).slice(0, 16)}`,
    original_review_item_id: input.original_review_item_id,
    superseding_review_item_id: input.superseding_review_item_id,
    original_export_intent_id: input.original_export_intent_id || '',
    superseding_export_intent_id: input.superseding_export_intent_id || '',
    original_preview_package_id: input.original_preview_package_id || '',
    superseding_preview_package_id: input.superseding_preview_package_id || '',
    report_type: input.report_type,
    source_mode: input.source_mode,
    period: input.period || '',
    superseded_by: input.superseded_by,
    superseder_role: input.superseder_role,
    superseded_at: supersededAt,
    reason: input.reason,
    old_preview_lineage: input.old_preview_lineage || {
      export_intent_id: input.original_export_intent_id || '',
      preview_package_id: input.original_preview_package_id || '',
      report_review_item_id: input.original_review_item_id,
    },
    new_preview_lineage: input.new_preview_lineage || {
      export_intent_id: input.superseding_export_intent_id || '',
      preview_package_id: input.superseding_preview_package_id || '',
      report_review_item_id: input.superseding_review_item_id,
    },
    required_nonproduction_labels: input.required_nonproduction_labels || policy.required_nonproduction_labels,
    production_status: input.production_status || 'preview_only',
    final_export_status: input.final_export_status || 'disabled',
    final_export_created: false,
    official_balance_created: false,
    raw_document_content_included: false,
    report_review_queue_version: REPORT_REVIEW_QUEUE_VERSION,
  };

  const supersession = {
    ...baseSupersession,
    supersession_hash: hashWithout(baseSupersession, 'supersession_hash'),
  };

  const errors = [];
  for (const field of ['original_review_item_id', 'superseding_review_item_id', 'report_type', 'source_mode', 'superseded_by', 'superseder_role', 'reason']) {
    if (!supersession[field]) errors.push(`${field} is required.`);
  }
  const roleCheck = checkReviewerRole(supersession.report_type, supersession.superseder_role, policy);
  if (!roleCheck.allowed) {
    errors.push(`Role ${supersession.superseder_role || 'missing'} is not allowed to supersede ${supersession.report_type}.`);
  }
  validateSharedReportFields(supersession, policy, errors);
  if (errors.length) {
    throw new Error(`Report preview supersession rejected: ${errors.join(' ')}`);
  }

  return supersession;
}

export function recordRedactionReviewOutcome(input, policy = getReportReviewQueuePolicy()) {
  if (!isPlainObject(input)) {
    throw new Error('Redaction review outcome input is required.');
  }
  assertNoRawContent(input);
  ensureNoFinalExportPath(input);

  const reviewedAt = input.reviewed_at || nowIso();
  const baseOutcome = {
    record_type: 'redaction_review_outcome',
    redaction_review_outcome_id: input.redaction_review_outcome_id || `redaction_outcome_${sha256Hex(canonicalize({
      target_type: input.target_type,
      target_id: input.target_id,
      outcome: input.outcome,
      reviewed_by: input.reviewed_by,
      reviewed_at: reviewedAt,
    })).slice(0, 16)}`,
    target_type: input.target_type,
    target_id: input.target_id,
    report_review_item_id: input.report_review_item_id || '',
    export_intent_id: input.export_intent_id || '',
    preview_package_id: input.preview_package_id || '',
    report_type: input.report_type,
    source_mode: input.source_mode,
    required_redaction_profile: input.required_redaction_profile,
    outcome: input.outcome,
    reviewed_by: input.reviewed_by,
    reviewer_role: input.reviewer_role,
    reviewed_at: reviewedAt,
    reason: input.reason,
    blockers: input.blockers || [],
    warnings: input.warnings || [],
    privacy_warnings: input.privacy_warnings || [],
    redaction_warnings: input.redaction_warnings || [],
    export_risk_flags: input.export_risk_flags || [],
    included_privacy_classes: input.included_privacy_classes || [],
    required_nonproduction_labels: input.required_nonproduction_labels || policy.required_nonproduction_labels,
    production_status: input.production_status || (['blocked_privacy', 'rejected', 'redaction_required'].includes(input.outcome) ? 'blocked_pending_review' : 'preview_only'),
    final_export_status: input.final_export_status || 'disabled',
    final_export_created: false,
    official_balance_created: false,
    raw_document_content_included: false,
    report_review_queue_version: REPORT_REVIEW_QUEUE_VERSION,
  };

  const outcome = {
    ...baseOutcome,
    outcome_hash: hashWithout(baseOutcome, 'outcome_hash'),
  };

  const errors = [];
  for (const field of ['target_type', 'target_id', 'report_type', 'source_mode', 'required_redaction_profile', 'outcome', 'reviewed_by', 'reviewer_role', 'reason']) {
    if (!outcome[field]) errors.push(`${field} is required.`);
  }
  if (outcome.outcome && !policy.allowed_redaction_outcomes.includes(outcome.outcome)) {
    errors.push(`outcome ${outcome.outcome} is not allowed.`);
  }
  const roleCheck = checkReviewerRole(outcome.report_type, outcome.reviewer_role, policy);
  if (!roleCheck.allowed) {
    errors.push(`Role ${outcome.reviewer_role || 'missing'} is not allowed to review redaction for ${outcome.report_type}.`);
  }
  validateSharedReportFields(outcome, policy, errors);
  if (['redaction_approved', 'public_safe'].includes(outcome.outcome)) {
    errors.push(...redactionSafetyErrors(outcome));
  }
  if (errors.length) {
    throw new Error(`Redaction review outcome rejected: ${errors.join(' ')}`);
  }

  return outcome;
}

export function appendReportReviewerNote(vaultPathInput, note, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  if (!isPlainObject(note)) {
    throw new Error('Report reviewer note is required.');
  }
  assertNoRawContent(note);
  ensureNoFinalExportPath(note);

  for (const field of ['report_review_item_id', 'note_text']) {
    if (!note[field]) {
      throw new Error(`Report reviewer note ${field} is required.`);
    }
  }

  const createdAt = note.created_at || actor.timestamp || nowIso();
  const baseNote = {
    record_type: 'report_reviewer_note',
    report_reviewer_note_id: note.report_reviewer_note_id || `report_note_${sha256Hex(canonicalize({
      report_review_item_id: note.report_review_item_id,
      note_text: note.note_text,
      created_by: actor.actor_id || note.created_by || 'system',
      created_at: createdAt,
    })).slice(0, 16)}`,
    report_review_item_id: note.report_review_item_id,
    export_intent_id: note.export_intent_id || '',
    preview_package_id: note.preview_package_id || '',
    note_text: note.note_text,
    note_type: note.note_type || 'review_note',
    created_by: note.created_by || actor.actor_id || 'system',
    created_role: note.created_role || actor.role || 'system',
    created_at: createdAt,
    production_status: 'preview_only',
    final_export_status: 'disabled',
    final_export_created: false,
    official_balance_created: false,
    raw_document_content_included: false,
    report_review_queue_version: REPORT_REVIEW_QUEUE_VERSION,
  };
  const reviewerNote = {
    ...baseNote,
    note_hash: hashWithout(baseNote, 'note_hash'),
  };

  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
  appendJsonLine(recordPath(vaultPath, 'report_reviewer_note'), reviewerNote);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || createdAt,
    actor_id: actor.actor_id || reviewerNote.created_by,
    role: actor.role || reviewerNote.created_role,
    action: 'report_reviewer_note_written',
    target_type: 'report_reviewer_note',
    target_id: reviewerNote.report_reviewer_note_id,
    reason: actor.reason || 'Report reviewer note appended; final export disabled.',
    metadata: {
      report_review_item_id: reviewerNote.report_review_item_id,
      final_export_created: false,
      official_balance_created: false,
    },
  });

  return {
    reviewer_note: {
      ...reviewerNote,
      audit_event_id: auditEvent.audit_event_id,
    },
    audit_event: auditEvent,
  };
}

export function writeReportReviewRecord(vaultPathInput, record, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  if (!isPlainObject(record)) {
    throw new Error('Report review record is required.');
  }
  assertNoRawContent(record);
  ensureNoFinalExportPath(record);

  let validation = { ok: true, errors: [] };
  if (record.record_type === 'report_review_item') {
    validation = validateReportReviewItem(record);
  } else if (record.record_type === 'report_review_decision') {
    validation = validateReportReviewDecision(record);
  } else if (!['report_preview_supersession', 'redaction_review_outcome'].includes(record.record_type)) {
    throw new Error(`Unsupported report review record_type: ${record.record_type || 'missing'}.`);
  }
  if (!validation.ok) {
    throw new Error(`Report review record rejected: ${validation.errors.join(' ')}`);
  }

  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
  appendJsonLine(recordPath(vaultPath, record.record_type), record);

  const targetId = record.report_review_item_id ||
    record.report_review_decision_id ||
    record.supersession_id ||
    record.redaction_review_outcome_id;
  const actionByType = {
    report_review_item: 'report_review_item_written',
    report_review_decision: 'report_review_decision_written',
    report_preview_supersession: 'report_preview_supersession_written',
    redaction_review_outcome: 'redaction_review_outcome_written',
  };
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: actionByType[record.record_type],
    target_type: record.record_type,
    target_id: targetId,
    reason: actor.reason || 'Report review metadata written; final export disabled.',
    metadata: {
      report_type: record.report_type,
      source_mode: record.source_mode,
      production_status: record.production_status,
      final_export_status: record.final_export_status,
      final_export_created: false,
      official_balance_created: false,
    },
  });

  return {
    record,
    audit_event: auditEvent,
    validation,
  };
}

export function listReportReviewRecords(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const requestedType = filters.record_type;
  const recordTypes = requestedType ? [requestedType] : Object.keys(ALLOWED_WRITE_TARGETS);
  const records = recordTypes.flatMap((recordType) => (
    readJsonLines(recordPath(vaultPath, recordType)).map((record) => ({ ...record, record_type: record.record_type || recordType }))
  ));
  const { record_type: _recordType, ...remainingFilters } = filters;
  return filterRecords(records, remainingFilters);
}

export function verifyNoFinalExportsFromReviewQueue(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const files = listFilesRecursive(vaultPath);
  const forbiddenMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    const extension = path.extname(filePath).toLowerCase();
    return FORBIDDEN_EXPORT_EXTENSIONS.has(extension) || FORBIDDEN_EXPORT_PATHS.some((forbiddenPath) => relativePath.includes(forbiddenPath));
  });

  return {
    ok: forbiddenMatches.length === 0,
    present_paths: forbiddenMatches,
    allowed_metadata_files: Object.values(ALLOWED_WRITE_TARGETS).map((target) => path.join(vaultPath, ...target.split('/'))),
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATHS],
  };
}
