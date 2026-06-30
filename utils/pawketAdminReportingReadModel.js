import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import { getBaselineChartOfAccounts } from './pawketAdminLedgerApproval.js';

export const REPORTING_READ_MODEL_VERSION = 'pawket-admin-reporting-read-model-v0';

const ALLOWED_SOURCE_MODES = new Set(['proposed', 'test_only']);
const ALLOWED_REPORT_MANIFEST_TYPES = new Set([
  'internal_management_preview',
  'accountant_pack_preview',
  'irs_support_preview',
  'investor_summary_preview',
  'foundation_pack_preview',
  'public_impact_preview',
  'security_audit_preview',
]);
const NON_PRODUCTION_STATUSES = new Set([
  'proposed_only',
  'test_only',
  'non_production_preview',
  'blocked_pending_review',
  'production_disabled',
]);
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

const FORBIDDEN_OFFICIAL_REPORT_PATHS = Object.freeze([
  'events/journal-entries.ndjson',
  'events/live-ledger.ndjson',
  'events/final-ledger.ndjson',
  'events/balances.ndjson',
  'events/official-balances.ndjson',
  'ledger/journal-entries.ndjson',
  'ledger/live-ledger.ndjson',
  'ledger/final-ledger.ndjson',
  'ledger/balances.ndjson',
  'reports/accountant-pack',
  'reports/irs-support',
  'reports/investor',
  'reports/foundation',
  'reports/public-impact',
  'exports/accountant-pack',
  'exports/irs-support',
  'exports/investor',
  'exports/foundation',
  'exports/public-impact',
]);

const FINAL_EXPORT_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.zip']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function asNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundMoney(value) {
  return Math.round(asNumber(value) * 100) / 100;
}

function assertAllowedVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);

  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin reporting read-model files must not be placed under public/.');
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

function reportManifestsPath(vaultPath) {
  return path.join(vaultPath, 'manifests', 'report-manifests.ndjson');
}

function sourceRecordIds(record) {
  return unique([
    record.proposed_journal_entry_id,
    record.proposed_ledger_record_id,
    record.journal_entry_id,
    record.test_ledger_entry_id,
    record.test_commit_id,
    record.record_id,
  ]);
}

function sourceIds(record, field) {
  return unique(record[field] || []);
}

function evidenceManifestIds(record) {
  return unique([
    record.evidence_manifest_id,
    record.commit_evidence_manifest_id,
    ...(record.evidence_manifest_ids || []),
  ]);
}

function groupKey(parts) {
  return parts.map((part) => part || 'unassigned').join('|');
}

function accountMap(chartOfAccounts = getBaselineChartOfAccounts()) {
  const accounts = Array.isArray(chartOfAccounts) ? chartOfAccounts : Object.values(chartOfAccounts || {});
  return new Map(accounts.map((account) => [account.account_id, account]));
}

function manifestHashPayload(manifest) {
  const { manifest_hash: _hash, ...payload } = manifest;
  return payload;
}

function computeReportManifestHash(manifest) {
  return sha256Hex(canonicalize(manifestHashPayload(manifest)));
}

function assertSourceMode(sourceMode) {
  if (!ALLOWED_SOURCE_MODES.has(sourceMode)) {
    throw new Error(`source_mode must be proposed or test_only. Received: ${sourceMode || 'missing'}.`);
  }
}

function recordAmount(record) {
  if (record.net_amount !== undefined) return asNumber(record.net_amount);
  if (record.gross_amount !== undefined) return asNumber(record.gross_amount);
  if (record.amount !== undefined) return asNumber(record.amount);

  const debit = Math.abs(asNumber(record.debit_amount));
  const credit = Math.abs(asNumber(record.credit_amount));
  if (debit || credit) return Math.max(debit, credit);

  const totalDebits = Math.abs(asNumber(record.total_debits));
  const totalCredits = Math.abs(asNumber(record.total_credits));
  return Math.max(totalDebits, totalCredits);
}

function eventAmount(event) {
  return recordAmount(event.payload && isPlainObject(event.payload) ? {
    ...event.payload,
    ...event,
  } : event);
}

function duplicateIdempotencyWarnings(events) {
  const seen = new Map();
  const warnings = [];

  for (const event of events || []) {
    const key = event.idempotency_key || event.idempotencyKey;
    if (!key) continue;
    const eventId = event.event_id || event.source_event_id || event.source_record_id || 'unknown_event';
    if (seen.has(key)) {
      warnings.push(`Duplicate idempotency key ${key} appears on ${seen.get(key)} and ${eventId}.`);
    } else {
      seen.set(key, eventId);
    }
  }

  return warnings;
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

export function getReportingReadModelPolicy() {
  return {
    policy_version: REPORTING_READ_MODEL_VERSION,
    production_reports_enabled: false,
    official_balances_enabled: false,
    final_exports_enabled: false,
    allowed_source_modes: [...ALLOWED_SOURCE_MODES],
    allowed_report_manifest_types: [...ALLOWED_REPORT_MANIFEST_TYPES],
    required_nonproduction_labels: [
      'non_production_preview',
      'not_official_accounting',
      'not_for_tax_filing',
      'not_for_investor_reliance',
    ],
    forbidden_official_export_filenames_or_paths: [...FORBIDDEN_OFFICIAL_REPORT_PATHS],
    privacy_redaction_guardrails: [
      'Public impact previews require public-safe or redacted evidence.',
      'Accountant and IRS previews may reference sensitive financial metadata but do not create final exports.',
      'Investor summaries must remain aggregate or sanitized until reviewed.',
      'Connector debug previews must not include raw or decrypted document content.',
    ],
  };
}

export function buildProposedJournalReadModel(proposedJournalEntries, options = {}) {
  const entries = Array.isArray(proposedJournalEntries) ? proposedJournalEntries : [proposedJournalEntries].filter(Boolean);
  const generatedAt = options.generated_at || nowIso();
  const groups = new Map();

  for (const entry of entries) {
    if (!isPlainObject(entry)) {
      throw new Error('Proposed journal entries must be objects.');
    }

    const key = groupKey([
      entry.entity_id,
      entry.fund_id,
      entry.class_id,
      entry.effective_period,
      entry.currency,
      entry.journal_type,
      entry.balance_status,
    ]);

    if (!groups.has(key)) {
      groups.set(key, {
        read_model_id: `pjrm_${sha256Hex(key).slice(0, 16)}`,
        source_mode: 'proposed',
        production_status: 'proposed_only',
        nonproduction_label: 'non_production_preview',
        entity_id: entry.entity_id,
        fund_id: entry.fund_id,
        class_id: entry.class_id,
        effective_period: entry.effective_period,
        currency: entry.currency,
        journal_type: entry.journal_type,
        balance_status: entry.balance_status,
        proposed_journal_entry_ids: [],
        source_proposed_ledger_record_ids: [],
        source_review_item_ids: [],
        source_draft_record_ids: [],
        source_event_ids: [],
        source_bundle_ids: [],
        evidence_manifest_ids: [],
        risk_flags: [],
        total_debits: 0,
        total_credits: 0,
        generated_at: generatedAt,
        generated_by: options.generated_by || 'system',
        reporting_read_model_version: REPORTING_READ_MODEL_VERSION,
      });
    }

    const group = groups.get(key);
    group.proposed_journal_entry_ids = unique([...group.proposed_journal_entry_ids, entry.proposed_journal_entry_id]);
    group.source_proposed_ledger_record_ids = unique([...group.source_proposed_ledger_record_ids, ...sourceIds(entry, 'source_proposed_ledger_record_ids')]);
    group.source_review_item_ids = unique([...group.source_review_item_ids, ...sourceIds(entry, 'source_review_item_ids')]);
    group.source_draft_record_ids = unique([...group.source_draft_record_ids, ...sourceIds(entry, 'source_draft_record_ids')]);
    group.source_event_ids = unique([...group.source_event_ids, ...sourceIds(entry, 'source_event_ids')]);
    group.source_bundle_ids = unique([...group.source_bundle_ids, ...sourceIds(entry, 'source_bundle_ids')]);
    group.evidence_manifest_ids = unique([...group.evidence_manifest_ids, ...evidenceManifestIds(entry)]);
    group.risk_flags = unique([...group.risk_flags, ...(entry.risk_flags || [])]);
    group.total_debits = roundMoney(group.total_debits + asNumber(entry.total_debits));
    group.total_credits = roundMoney(group.total_credits + asNumber(entry.total_credits));
  }

  return [...groups.values()];
}

export function buildTestOnlyLedgerReadModel(testImmutableLedgerEntries, options = {}) {
  const entries = Array.isArray(testImmutableLedgerEntries) ? testImmutableLedgerEntries : [testImmutableLedgerEntries].filter(Boolean);
  const generatedAt = options.generated_at || nowIso();
  const groups = new Map();

  for (const entry of entries) {
    if (!isPlainObject(entry)) {
      throw new Error('Test-only immutable ledger entries must be objects.');
    }

    const accountId = entry.account_id || 'test_only_entry_summary';
    const key = groupKey([
      entry.entity_id,
      entry.fund_id,
      entry.class_id,
      entry.effective_period,
      entry.currency,
      accountId,
      entry.journal_type,
    ]);

    if (!groups.has(key)) {
      groups.set(key, {
        read_model_id: `tlrm_${sha256Hex(key).slice(0, 16)}`,
        source_mode: 'test_only',
        production_status: 'test_only',
        nonproduction_label: 'test_only_non_production_preview',
        entity_id: entry.entity_id,
        fund_id: entry.fund_id,
        class_id: entry.class_id,
        effective_period: entry.effective_period,
        currency: entry.currency,
        account_id: accountId,
        journal_type: entry.journal_type,
        test_immutable_ledger_entry_ids: [],
        source_proposed_journal_entry_ids: [],
        source_proposed_ledger_record_ids: [],
        source_review_item_ids: [],
        source_draft_record_ids: [],
        source_event_ids: [],
        source_bundle_ids: [],
        evidence_manifest_ids: [],
        total_debits: 0,
        total_credits: 0,
        generated_at: generatedAt,
        generated_by: options.generated_by || 'system',
        reporting_read_model_version: REPORTING_READ_MODEL_VERSION,
      });
    }

    const group = groups.get(key);
    group.test_immutable_ledger_entry_ids = unique([...group.test_immutable_ledger_entry_ids, entry.journal_entry_id || entry.test_ledger_entry_id]);
    group.source_proposed_journal_entry_ids = unique([...group.source_proposed_journal_entry_ids, entry.source_proposed_journal_entry_id]);
    group.source_proposed_ledger_record_ids = unique([...group.source_proposed_ledger_record_ids, ...sourceIds(entry, 'source_proposed_ledger_record_ids')]);
    group.source_review_item_ids = unique([...group.source_review_item_ids, ...sourceIds(entry, 'source_review_item_ids')]);
    group.source_draft_record_ids = unique([...group.source_draft_record_ids, ...sourceIds(entry, 'source_draft_record_ids')]);
    group.source_event_ids = unique([...group.source_event_ids, ...sourceIds(entry, 'source_event_ids')]);
    group.source_bundle_ids = unique([...group.source_bundle_ids, ...sourceIds(entry, 'source_bundle_ids')]);
    group.evidence_manifest_ids = unique([...group.evidence_manifest_ids, ...evidenceManifestIds(entry)]);
    group.total_debits = roundMoney(group.total_debits + asNumber(entry.debit_amount ?? entry.total_debits));
    group.total_credits = roundMoney(group.total_credits + asNumber(entry.credit_amount ?? entry.total_credits));
  }

  return [...groups.values()];
}

export function calculateSimulatedBalances(records, chartOfAccounts = getBaselineChartOfAccounts(), options = {}) {
  const sourceMode = options.source_mode || options.sourceMode;
  assertSourceMode(sourceMode);

  const entries = Array.isArray(records) ? records : [records].filter(Boolean);
  const accounts = accountMap(chartOfAccounts);
  const generatedAt = options.generated_at || nowIso();
  const generatedBy = options.generated_by || 'system';
  const groups = new Map();

  for (const record of entries) {
    if (!isPlainObject(record)) {
      throw new Error('Simulated balance records must be objects.');
    }

    const accountId = record.account_id || options.account_id || 'simulated_unmapped_account';
    const account = accounts.get(accountId) || {
      account_id: accountId,
      account_type: record.account_type || 'unmapped',
      normal_balance: record.normal_balance || 'debit',
    };
    const period = record.effective_period || record.period || options.period || 'period_unassigned';
    const currency = record.currency || options.currency || 'USD';
    const key = groupKey([
      record.entity_id,
      record.fund_id,
      record.class_id,
      accountId,
      period,
      currency,
    ]);

    if (!groups.has(key)) {
      groups.set(key, {
        simulated_balance_id: `simb_${sha256Hex(key).slice(0, 16)}`,
        source_mode: sourceMode,
        production_status: 'non_production_preview',
        nonproduction_label: 'simulated_not_official_accounting',
        official_balance: false,
        entity_id: record.entity_id,
        fund_id: record.fund_id,
        class_id: record.class_id,
        account_id: accountId,
        account_type: account.account_type,
        normal_balance: account.normal_balance,
        period,
        currency,
        debit_total: 0,
        credit_total: 0,
        simulated_balance: 0,
        source_record_ids: [],
        evidence_manifest_ids: [],
        warnings: [
          'Simulated balance only. Not official accounting truth.',
          'Do not use for tax filing, investor reliance, or public reporting.',
        ],
        generated_at: generatedAt,
        generated_by: generatedBy,
        reporting_read_model_version: REPORTING_READ_MODEL_VERSION,
      });
    }

    const group = groups.get(key);
    group.debit_total = roundMoney(group.debit_total + asNumber(record.debit_amount ?? record.total_debits));
    group.credit_total = roundMoney(group.credit_total + asNumber(record.credit_amount ?? record.total_credits));
    group.source_record_ids = unique([...group.source_record_ids, ...sourceRecordIds(record)]);
    group.evidence_manifest_ids = unique([...group.evidence_manifest_ids, ...evidenceManifestIds(record)]);
  }

  for (const group of groups.values()) {
    group.simulated_balance = group.normal_balance === 'credit'
      ? roundMoney(group.credit_total - group.debit_total)
      : roundMoney(group.debit_total - group.credit_total);
  }

  return [...groups.values()];
}

export function buildReconciliationPreview(sourceEvents = [], proposedOrTestRecords = [], options = {}) {
  const sourceList = Array.isArray(sourceEvents) ? sourceEvents : [sourceEvents].filter(Boolean);
  const recordList = Array.isArray(proposedOrTestRecords) ? proposedOrTestRecords : [proposedOrTestRecords].filter(Boolean);
  const sourceMode = options.source_mode || options.sourceMode || 'proposed';
  assertSourceMode(sourceMode);

  const sourceTotal = roundMoney(sourceList.reduce((sum, event) => sum + eventAmount(event), 0));
  const ledgerPreviewTotal = roundMoney(recordList.reduce((sum, record) => sum + recordAmount(record), 0));
  const sourceEventIds = new Set(sourceList.map((event) => event.event_id || event.source_event_id || event.source_record_id).filter(Boolean));
  const linkedSourceEventIds = new Set(recordList.flatMap((record) => record.source_event_ids || [record.source_event_id]).filter(Boolean));
  const unreconciledSourceEventIds = [...sourceEventIds].filter((id) => !linkedSourceEventIds.has(id));
  const unreconciledRecordIds = recordList
    .filter((record) => !(record.source_event_ids || [record.source_event_id]).some((id) => sourceEventIds.has(id)))
    .flatMap((record) => sourceRecordIds(record));

  const riskText = recordList.map((record) => `${record.event_type || ''} ${(record.risk_flags || []).join(' ')} ${record.journal_type || ''}`).join(' ').toLowerCase();
  const sourceText = sourceList.map((event) => `${event.event_type || ''} ${event.category || ''}`).join(' ').toLowerCase();

  return {
    reconciliation_preview_id: options.reconciliation_preview_id || `recprev_${sha256Hex(canonicalize({
      sourceMode,
      sourceEventIds: [...sourceEventIds],
      recordIds: recordList.flatMap((record) => sourceRecordIds(record)),
    })).slice(0, 16)}`,
    source_mode: sourceMode,
    production_status: 'non_production_preview',
    nonproduction_label: 'reconciliation_preview_not_official',
    source_total: sourceTotal,
    ledger_preview_total: ledgerPreviewTotal,
    variance: roundMoney(sourceTotal - ledgerPreviewTotal),
    unreconciled_source_event_ids: unreconciledSourceEventIds,
    unreconciled_record_ids: unique(unreconciledRecordIds),
    duplicate_idempotency_warnings: duplicateIdempotencyWarnings(sourceList),
    refund_reversal_warnings: /refund|reversal/.test(`${riskText} ${sourceText}`) ? ['Refund and reward/donation/tax reversal handling needs review.'] : [],
    donation_payable_warnings: /donation/.test(`${riskText} ${sourceText}`) ? ['Donation payable preview must be reconciled against pledge and transfer evidence.'] : [],
    care_credit_liability_warnings: /care_credit/.test(`${riskText} ${sourceText}`) ? ['Care Credit liability preview must be reviewed before any balance is treated as real.'] : [],
    charm_cherish_payable_warnings: /charm|cherish/.test(`${riskText} ${sourceText}`) ? ['CHARM/CHERISH payable preview must be reviewed against restricted fund rules.'] : [],
    generated_at: options.generated_at || nowIso(),
    generated_by: options.generated_by || 'system',
    reporting_read_model_version: REPORTING_READ_MODEL_VERSION,
  };
}

export function createReportManifest(input, policy = getReportingReadModelPolicy()) {
  if (!isPlainObject(input)) {
    throw new Error('Report manifest input is required.');
  }

  const errors = [];
  if (!input.report_type) errors.push('report_type is required.');
  if (!input.source_mode) errors.push('source_mode is required.');
  if (!input.period) errors.push('period is required.');
  if (!input.generated_by) errors.push('generated_by is required.');
  if (!input.required_redaction_profile) errors.push('required_redaction_profile is required.');
  if (errors.length) {
    throw new Error(`Report manifest rejected: ${errors.join(' ')}`);
  }

  if (!policy.allowed_report_manifest_types.includes(input.report_type)) {
    throw new Error(`Invalid report_type: ${input.report_type}.`);
  }
  if (!policy.allowed_source_modes.includes(input.source_mode)) {
    throw new Error(`Invalid source_mode: ${input.source_mode}.`);
  }
  for (const field of ['export_path', 'final_export_path', 'output_path', 'file_path']) {
    if (input[field]) {
      throw new Error(`Report manifests must not include final export paths. Found ${field}.`);
    }
  }

  const generatedAt = input.generated_at || nowIso();
  const productionStatus = input.production_status || 'non_production_preview';
  const manifest = {
    report_manifest_id: input.report_manifest_id || `rmanifest_${sha256Hex(canonicalize({
      report_type: input.report_type,
      source_mode: input.source_mode,
      period: input.period,
      included_record_ids: input.included_record_ids || [],
      generated_by: input.generated_by,
      generated_at: generatedAt,
    })).slice(0, 16)}`,
    report_type: input.report_type,
    source_mode: input.source_mode,
    period: input.period,
    entity_scope: input.entity_scope || [],
    fund_scope: input.fund_scope || [],
    class_scope: input.class_scope || [],
    included_record_ids: input.included_record_ids || [],
    excluded_record_ids: input.excluded_record_ids || [],
    evidence_manifest_ids: input.evidence_manifest_ids || [],
    required_redaction_profile: input.required_redaction_profile,
    privacy_warnings: input.privacy_warnings || [],
    missing_evidence_warnings: input.missing_evidence_warnings || [],
    required_nonproduction_labels: policy.required_nonproduction_labels,
    production_status: productionStatus,
    final_export_created: false,
    generated_by: input.generated_by,
    generated_at: generatedAt,
    reporting_read_model_version: REPORTING_READ_MODEL_VERSION,
  };

  return {
    ...manifest,
    manifest_hash: computeReportManifestHash(manifest),
  };
}

export function validateReportManifest(manifest, policy = getReportingReadModelPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(manifest)) {
    return { ok: false, errors: ['Report manifest is required.'], warnings };
  }

  for (const field of ['report_manifest_id', 'report_type', 'source_mode', 'period', 'required_redaction_profile', 'generated_by', 'generated_at', 'manifest_hash']) {
    if (!manifest[field]) {
      errors.push(`${field} is required.`);
    }
  }

  if (manifest.report_type && !policy.allowed_report_manifest_types.includes(manifest.report_type)) {
    errors.push(`report_type ${manifest.report_type} is not allowed.`);
  }
  if (manifest.source_mode && !policy.allowed_source_modes.includes(manifest.source_mode)) {
    errors.push(`source_mode ${manifest.source_mode} is not allowed.`);
  }
  if (!NON_PRODUCTION_STATUSES.has(manifest.production_status)) {
    errors.push('production_status must be non-production.');
  }
  if (manifest.final_export_created === true) {
    errors.push('Report manifests cannot create final exports.');
  }
  for (const field of ['export_path', 'final_export_path', 'output_path', 'file_path']) {
    if (manifest[field]) {
      errors.push(`Report manifests must not include final export paths. Found ${field}.`);
    }
  }
  const labels = manifest.required_nonproduction_labels || [];
  for (const label of policy.required_nonproduction_labels) {
    if (!labels.includes(label)) {
      errors.push(`Missing required non-production label: ${label}.`);
    }
  }
  if (!SHA256_HEX_RE.test(String(manifest.manifest_hash || ''))) {
    errors.push('manifest_hash must be a sha256 hex string.');
  } else if (manifest.manifest_hash !== computeReportManifestHash(manifest)) {
    errors.push('manifest_hash does not match canonical report manifest content.');
  }

  if ((manifest.privacy_warnings || []).length) {
    warnings.push('Privacy warnings must be reviewed before any future export.');
  }
  if ((manifest.missing_evidence_warnings || []).length) {
    warnings.push('Missing evidence warnings must be resolved or deferred before production reporting.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function writeReportManifest(vaultPathInput, manifest, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const validation = validateReportManifest(manifest);
  if (!validation.ok) {
    throw new Error(`Report manifest rejected: ${validation.errors.join(' ')}`);
  }

  appendJsonLine(reportManifestsPath(vaultPath), manifest);

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'report_manifest_written',
    target_type: 'report_manifest',
    target_id: manifest.report_manifest_id,
    reason: actor.reason || 'Non-production report manifest written; no final export created.',
    metadata: {
      report_type: manifest.report_type,
      source_mode: manifest.source_mode,
      production_status: manifest.production_status,
      final_export_created: false,
      official_balance_created: false,
    },
  });

  return {
    report_manifest: manifest,
    audit_event: auditEvent,
    validation,
  };
}

export function listReportManifests(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let manifests = readJsonLines(reportManifestsPath(vaultPath));

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (field === 'privacy_warning') {
      manifests = manifests.filter((manifest) => (manifest.privacy_warnings || []).includes(value));
    } else if (['entity_scope', 'fund_scope', 'class_scope'].includes(field)) {
      manifests = manifests.filter((manifest) => (manifest[field] || []).includes(value));
    } else {
      manifests = manifests.filter((manifest) => manifest[field] === value);
    }
  }

  return manifests;
}

export function verifyNoOfficialReportsOrBalances(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const forbiddenConfiguredPaths = FORBIDDEN_OFFICIAL_REPORT_PATHS
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));

  const exportFiles = listFilesRecursive(path.join(vaultPath, 'exports'))
    .filter((filePath) => FINAL_EXPORT_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  const reportFiles = listFilesRecursive(path.join(vaultPath, 'reports'))
    .filter((filePath) => FINAL_EXPORT_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  const presentPaths = unique([...forbiddenConfiguredPaths, ...exportFiles, ...reportFiles]);

  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
    allowed_nonproduction_files: [
      path.join(vaultPath, 'manifests', 'report-manifests.ndjson'),
    ],
    forbidden_official_export_filenames_or_paths: [...FORBIDDEN_OFFICIAL_REPORT_PATHS],
  };
}
