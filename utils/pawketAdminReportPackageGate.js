import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';

export const REPORT_PACKAGE_GATE_VERSION = 'pawket-admin-report-package-gate-v0';

const ALLOWED_PREVIEW_REPORT_TYPES = new Set([
  'internal_management_preview',
  'accountant_pack_preview',
  'irs_support_preview',
  'investor_summary_preview',
  'foundation_pack_preview',
  'public_impact_preview',
  'security_audit_preview',
]);

const ALLOWED_SOURCE_MODES = new Set(['proposed', 'test_only']);

const NON_PRODUCTION_STATUSES = new Set([
  'preview_only',
  'non_production',
  'blocked_pending_review',
  'production_disabled',
]);

const FINAL_EXPORT_STATUSES = new Set([
  'not_generated',
  'disabled',
  'blocked',
  'future_review_required',
]);

const PACKAGE_STATUSES = new Set([
  'requested',
  'manifest_validated',
  'redaction_profile_validated',
  'evidence_checked',
  'privacy_checked',
  'approval_required',
  'approved_for_preview_package',
  'blocked_pending_review',
  'final_export_disabled',
  'rejected',
  'superseded',
]);

const FORBIDDEN_EXPORT_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.zip']);

const FORBIDDEN_EXPORT_PATHS = Object.freeze([
  'official-report',
  'irs-export',
  'accountant-export',
  'investor-export',
  'public-impact-export',
  'foundation-export',
  'reports/official',
  'reports/irs',
  'reports/accountant',
  'reports/investor',
  'reports/foundation',
  'reports/public-impact',
  'exports/official',
  'exports/irs',
  'exports/accountant',
  'exports/investor',
  'exports/foundation',
  'exports/public-impact',
]);

const REPORT_REDACTION_PROFILE = Object.freeze({
  internal_management_preview: 'owner_full_internal',
  accountant_pack_preview: 'accountant_pack',
  irs_support_preview: 'irs_support_pack',
  investor_summary_preview: 'investor_summary',
  foundation_pack_preview: 'foundation_board_pack',
  public_impact_preview: 'public_impact_report',
  security_audit_preview: 'security_audit_pack',
});

const APPROVAL_ROLE_POLICY = Object.freeze({
  internal_management_preview: ['owner_root', 'finance_admin'],
  accountant_pack_preview: ['owner_root', 'finance_admin'],
  irs_support_preview: ['owner_root'],
  investor_summary_preview: ['owner_root', 'finance_admin'],
  foundation_pack_preview: ['owner_root', 'foundation_admin'],
  public_impact_preview: ['owner_root'],
  security_audit_preview: ['owner_root'],
});

const REQUIRED_NONPRODUCTION_LABELS = Object.freeze([
  'non_production_preview',
  'not_official_report',
  'not_final_export',
  'not_for_tax_filing',
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
    throw new Error('Pawket Admin report package gate files must not be placed under public/.');
  }

  return resolved;
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

function exportIntentRecordsPath(vaultPath) {
  return path.join(vaultPath, 'manifests', 'export-intent-records.ndjson');
}

function previewPackageRecordsPath(vaultPath) {
  return path.join(vaultPath, 'manifests', 'report-preview-packages.ndjson');
}

function hashWithout(record, hashField) {
  const { [hashField]: _hash, ...payload } = record;
  return sha256Hex(canonicalize(payload));
}

function ensureNoFinalExportPath(record) {
  for (const field of ['export_path', 'final_export_path', 'output_path', 'file_path', 'package_path']) {
    if (record?.[field]) {
      throw new Error(`Report package gate records must not include final export paths. Found ${field}.`);
    }
  }
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

function hasSensitivePublicWarning(intent) {
  const haystack = [
    ...(intent.privacy_warnings || []),
    ...(intent.redaction_warnings || []),
    ...(intent.missing_evidence_warnings || []),
    ...(intent.export_risk_flags || []),
    ...(intent.included_privacy_classes || []),
  ].join(' ');

  return SENSITIVE_PUBLIC_PATTERNS.some((pattern) => pattern.test(haystack));
}

function isFoundationScoped(intent) {
  const scopeText = [
    ...(intent.entity_scope || []),
    ...(intent.fund_scope || []),
    ...(intent.class_scope || []),
  ].join(' ').toLowerCase();

  return /foundation|charm|cherish/.test(scopeText);
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

export function getReportPackageGatePolicy() {
  return {
    policy_version: REPORT_PACKAGE_GATE_VERSION,
    final_exports_enabled: false,
    production_reports_enabled: false,
    allowed_preview_report_types: [...ALLOWED_PREVIEW_REPORT_TYPES],
    allowed_source_modes: [...ALLOWED_SOURCE_MODES],
    required_nonproduction_labels: [...REQUIRED_NONPRODUCTION_LABELS],
    allowed_statuses: [...PACKAGE_STATUSES],
    allowed_production_statuses: [...NON_PRODUCTION_STATUSES],
    allowed_final_export_statuses: [...FINAL_EXPORT_STATUSES],
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATHS],
    approval_role_policy: Object.fromEntries(
      Object.entries(APPROVAL_ROLE_POLICY).map(([reportType, roles]) => [reportType, [...roles]])
    ),
    redaction_profile_requirements: { ...REPORT_REDACTION_PROFILE },
  };
}

export function createExportIntentRecord(reportManifest, request = {}, policy = getReportPackageGatePolicy()) {
  if (!isPlainObject(reportManifest)) {
    throw new Error('Report manifest is required.');
  }
  if (!isPlainObject(request)) {
    throw new Error('Export intent request is required.');
  }

  const requestedReportType = request.requested_report_type || reportManifest.report_type;
  const sourceMode = request.source_mode || reportManifest.source_mode;
  const period = request.period || reportManifest.period;
  const requestedAt = request.requested_at || nowIso();
  const requiredRedactionProfile = request.required_redaction_profile || reportManifest.required_redaction_profile;
  const privacyWarnings = unique([...(reportManifest.privacy_warnings || []), ...(request.privacy_warnings || [])]);
  const redactionWarnings = unique([...(reportManifest.redaction_warnings || []), ...(request.redaction_warnings || [])]);
  const missingEvidenceWarnings = unique([...(reportManifest.missing_evidence_warnings || []), ...(request.missing_evidence_warnings || [])]);
  const exportRiskFlags = unique([...(request.export_risk_flags || []), ...(reportManifest.export_risk_flags || [])]);
  const errors = [];

  if (!reportManifest.report_manifest_id) errors.push('report_manifest_id is required.');
  if (!requestedReportType) errors.push('requested_report_type is required.');
  if (!sourceMode) errors.push('source_mode is required.');
  if (!period) errors.push('period is required.');
  if (!request.requested_by) errors.push('requested_by is required.');
  if (!request.intended_recipient_type) errors.push('intended_recipient_type is required.');
  if (!requiredRedactionProfile) errors.push('required_redaction_profile is required.');
  if (errors.length) {
    throw new Error(`Export intent rejected: ${errors.join(' ')}`);
  }

  ensureNoFinalExportPath(request);
  ensureNoFinalExportPath(reportManifest);

  const hasWarnings = privacyWarnings.length || redactionWarnings.length || missingEvidenceWarnings.length || exportRiskFlags.length;
  const productionStatus = request.production_status || (hasWarnings ? 'blocked_pending_review' : 'preview_only');
  const finalExportStatus = request.final_export_status || 'disabled';
  const baseIntent = {
    export_intent_id: request.export_intent_id || `export_intent_${sha256Hex(canonicalize({
      report_manifest_id: reportManifest.report_manifest_id,
      requested_report_type: requestedReportType,
      source_mode: sourceMode,
      period,
      requested_by: request.requested_by,
      requested_at: requestedAt,
    })).slice(0, 16)}`,
    report_manifest_id: reportManifest.report_manifest_id,
    requested_report_type: requestedReportType,
    source_mode: sourceMode,
    period,
    entity_scope: request.entity_scope || reportManifest.entity_scope || [],
    fund_scope: request.fund_scope || reportManifest.fund_scope || [],
    class_scope: request.class_scope || reportManifest.class_scope || [],
    requested_by: request.requested_by,
    requested_at: requestedAt,
    intended_recipient_type: request.intended_recipient_type,
    required_redaction_profile: requiredRedactionProfile,
    included_record_ids: request.included_record_ids || reportManifest.included_record_ids || [],
    evidence_manifest_ids: request.evidence_manifest_ids || reportManifest.evidence_manifest_ids || [],
    privacy_warnings: privacyWarnings,
    redaction_warnings: redactionWarnings,
    missing_evidence_warnings: missingEvidenceWarnings,
    export_risk_flags: exportRiskFlags,
    included_privacy_classes: request.included_privacy_classes || reportManifest.included_privacy_classes || [],
    approval_status: request.approval_status || 'approval_required',
    production_status: productionStatus,
    final_export_status: finalExportStatus,
    required_nonproduction_labels: request.required_nonproduction_labels || policy.required_nonproduction_labels,
    final_export_created: false,
    audit_event_id: request.audit_event_id || '',
    report_package_gate_version: REPORT_PACKAGE_GATE_VERSION,
  };

  const intent = {
    ...baseIntent,
    intent_hash: hashWithout(baseIntent, 'intent_hash'),
  };
  const validation = validateExportIntentRecord(intent, policy);
  if (!validation.ok) {
    throw new Error(`Export intent rejected: ${validation.errors.join(' ')}`);
  }

  return intent;
}

export function validateExportIntentRecord(intent, policy = getReportPackageGatePolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(intent)) {
    return { ok: false, errors: ['Export intent record is required.'], warnings };
  }

  for (const field of [
    'export_intent_id',
    'report_manifest_id',
    'requested_report_type',
    'source_mode',
    'period',
    'requested_by',
    'requested_at',
    'intended_recipient_type',
    'required_redaction_profile',
    'approval_status',
    'production_status',
    'final_export_status',
  ]) {
    if (!intent[field]) {
      errors.push(`${field} is required.`);
    }
  }

  if (intent.requested_report_type && !policy.allowed_preview_report_types.includes(intent.requested_report_type)) {
    errors.push(`requested_report_type ${intent.requested_report_type} is not allowed.`);
  }
  if (intent.source_mode && !policy.allowed_source_modes.includes(intent.source_mode)) {
    errors.push(`source_mode ${intent.source_mode} is not allowed.`);
  }
  if (!policy.allowed_production_statuses.includes(intent.production_status)) {
    errors.push('production_status must be non-production.');
  }
  if (!policy.allowed_final_export_statuses.includes(intent.final_export_status)) {
    errors.push('final_export_status is not allowed.');
  }
  if (intent.final_export_created === true) {
    errors.push('Final exports must not be created by export intent records.');
  }

  const requiredProfile = policy.redaction_profile_requirements[intent.requested_report_type];
  if (requiredProfile && intent.required_redaction_profile !== requiredProfile) {
    errors.push(`${intent.requested_report_type} requires redaction profile ${requiredProfile}.`);
  }

  for (const label of policy.required_nonproduction_labels) {
    if (!(intent.required_nonproduction_labels || []).includes(label)) {
      errors.push(`Missing required non-production label: ${label}.`);
    }
  }

  try {
    ensureNoFinalExportPath(intent);
  } catch (error) {
    errors.push(error.message);
  }

  if (intent.requested_report_type === 'public_impact_preview' && hasSensitivePublicWarning(intent)) {
    errors.push('Public impact preview cannot include private donor/customer/assistance/story/medical-adjacent data.');
  }

  if (intent.requested_report_type === 'investor_summary_preview' && intent.required_redaction_profile !== 'investor_summary') {
    errors.push('Investor preview requires the investor_summary redaction profile.');
  }

  if (intent.requested_report_type === 'accountant_pack_preview' && intent.required_redaction_profile !== 'accountant_pack') {
    errors.push('Accountant preview requires the accountant_pack redaction profile.');
  }

  if (intent.intent_hash && intent.intent_hash !== hashWithout(intent, 'intent_hash')) {
    errors.push('intent_hash does not match canonical export intent content.');
  }

  if ((intent.privacy_warnings || []).length) {
    warnings.push('Privacy warnings must be reviewed before package approval.');
  }
  if ((intent.missing_evidence_warnings || []).length) {
    warnings.push('Missing evidence warnings must be resolved, deferred, or clearly labeled.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateReportPackageApproval(intent, actor = {}, policy = getReportPackageGatePolicy(), options = {}) {
  const blockers = [];
  const warnings = [];
  const validation = validateExportIntentRecord(intent, policy);

  if (!validation.ok) {
    blockers.push(...validation.errors);
  }
  warnings.push(...validation.warnings);

  const actorRole = normalizeRole(actor.role);
  const allowedRoles = policy.approval_role_policy[intent?.requested_report_type] || [];
  if (!actorRole || !allowedRoles.includes(actorRole)) {
    blockers.push(`Role ${actor.role || 'missing'} is not allowed to approve ${intent?.requested_report_type || 'this report type'}.`);
  }

  if (actorRole === 'foundation_admin' && !isFoundationScoped(intent)) {
    blockers.push('Foundation Admin approval is limited to foundation-scoped report package previews.');
  }

  if (intent?.requested_report_type === 'public_impact_preview') {
    if (intent.required_redaction_profile !== 'public_impact_report') {
      blockers.push('Public impact preview requires the public_impact_report redaction profile.');
    }
    if (hasSensitivePublicWarning(intent)) {
      blockers.push('Public impact preview must be public-safe or redacted and cannot include private donor/customer/assistance/story/medical-adjacent data.');
    }
  }

  if (intent?.requested_report_type === 'investor_summary_preview') {
    if (intent.required_redaction_profile !== 'investor_summary') {
      blockers.push('Investor preview requires aggregate or sanitized investor_summary redaction profile.');
    }
    if (hasSensitivePublicWarning(intent)) {
      blockers.push('Investor preview cannot include private donor/customer/assistance/story/medical-adjacent data.');
    }
  }

  if (intent?.requested_report_type === 'irs_support_preview' && (intent.missing_evidence_warnings || []).length && !options.allowMissingEvidenceOverride) {
    blockers.push('IRS support preview has missing evidence warnings that require explicit review before preview package approval.');
  }

  const highRiskText = [
    ...(intent?.privacy_warnings || []),
    ...(intent?.redaction_warnings || []),
    ...(intent?.export_risk_flags || []),
  ].join(' ');
  if (/high[-_ ]risk|privacy_blocker|raw_document|medical|minor|private_story/i.test(highRiskText) && !options.allowHighRiskOverride) {
    blockers.push('Unresolved high-risk export warnings block preview package approval.');
  }

  return {
    approved_for_preview_package: blockers.length === 0,
    blockers: unique(blockers),
    warnings: unique([
      ...warnings,
      'Final export remains disabled; approval can create preview metadata only.',
    ]),
    final_export_status: 'disabled',
    production_status: blockers.length ? 'blocked_pending_review' : 'preview_only',
    approval_status: blockers.length ? 'approval_required' : 'approved_for_preview_package',
    required_role: allowedRoles,
  };
}

export function createPreviewPackageRecord(intent, approvalResult, actor = {}) {
  if (!isPlainObject(intent)) {
    throw new Error('Export intent record is required.');
  }
  if (!isPlainObject(approvalResult)) {
    throw new Error('Approval result is required.');
  }
  ensureNoFinalExportPath(intent);

  const generatedAt = actor.generated_at || actor.timestamp || nowIso();
  const baseRecord = {
    preview_package_id: `preview_pkg_${sha256Hex(canonicalize({
      export_intent_id: intent.export_intent_id,
      generated_by: actor.actor_id || 'system',
      generated_at: generatedAt,
    })).slice(0, 16)}`,
    export_intent_id: intent.export_intent_id,
    report_manifest_id: intent.report_manifest_id,
    report_type: intent.requested_report_type,
    source_mode: intent.source_mode,
    period: intent.period,
    generated_by: actor.actor_id || 'system',
    generated_at: generatedAt,
    approval_status: approvalResult.approval_status || (approvalResult.approved_for_preview_package ? 'approved_for_preview_package' : 'approval_required'),
    production_status: approvalResult.production_status || 'preview_only',
    final_export_status: 'disabled',
    included_record_ids: intent.included_record_ids || [],
    evidence_manifest_ids: intent.evidence_manifest_ids || [],
    redaction_profile: intent.required_redaction_profile,
    required_nonproduction_labels: intent.required_nonproduction_labels || [...REQUIRED_NONPRODUCTION_LABELS],
    warnings: approvalResult.warnings || [],
    blockers: approvalResult.blockers || [],
    final_export_created: false,
    raw_document_content_included: false,
    files_created: [],
    report_package_gate_version: REPORT_PACKAGE_GATE_VERSION,
  };

  return {
    ...baseRecord,
    package_hash: hashWithout(baseRecord, 'package_hash'),
  };
}

export function writeExportIntentRecord(vaultPathInput, intent, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const validation = validateExportIntentRecord(intent);
  if (!validation.ok) {
    throw new Error(`Export intent rejected: ${validation.errors.join(' ')}`);
  }

  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
  appendJsonLine(exportIntentRecordsPath(vaultPath), intent);

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'export_intent_record_written',
    target_type: 'export_intent',
    target_id: intent.export_intent_id,
    reason: actor.reason || 'Export intent recorded; final export disabled.',
    metadata: {
      report_manifest_id: intent.report_manifest_id,
      requested_report_type: intent.requested_report_type,
      source_mode: intent.source_mode,
      production_status: intent.production_status,
      final_export_status: intent.final_export_status,
      final_export_created: false,
    },
  });

  return {
    export_intent: intent,
    audit_event: auditEvent,
    validation,
  };
}

export function writePreviewPackageRecord(vaultPathInput, packageRecord, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  if (!isPlainObject(packageRecord)) {
    throw new Error('Preview package record is required.');
  }
  ensureNoFinalExportPath(packageRecord);
  if (packageRecord.final_export_created === true || (packageRecord.files_created || []).length) {
    throw new Error('Preview package records must not create final export files.');
  }

  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
  appendJsonLine(previewPackageRecordsPath(vaultPath), packageRecord);

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'report_preview_package_record_written',
    target_type: 'report_preview_package',
    target_id: packageRecord.preview_package_id,
    reason: actor.reason || 'Preview package metadata written; no final export created.',
    metadata: {
      export_intent_id: packageRecord.export_intent_id,
      report_manifest_id: packageRecord.report_manifest_id,
      report_type: packageRecord.report_type,
      production_status: packageRecord.production_status,
      final_export_status: packageRecord.final_export_status,
      final_export_created: false,
    },
  });

  return {
    preview_package: packageRecord,
    audit_event: auditEvent,
  };
}

export function listExportIntentRecords(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  return filterRecords(readJsonLines(exportIntentRecordsPath(vaultPath)), filters);
}

export function listPreviewPackageRecords(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  return filterRecords(readJsonLines(previewPackageRecordsPath(vaultPath)), filters);
}

export function verifyNoFinalExportFiles(vaultPathInput) {
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
    allowed_metadata_files: [
      path.join(vaultPath, 'manifests', 'export-intent-records.ndjson'),
      path.join(vaultPath, 'manifests', 'report-preview-packages.ndjson'),
    ],
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATHS],
  };
}

export function verifyNoPublicPathUsage(vaultPathInput) {
  assertAllowedVaultPath(vaultPathInput);
  return {
    ok: true,
    public_path_rejection: true,
  };
}
