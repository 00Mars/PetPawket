import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent, GENESIS_HASH } from './pawketAdminVault.js';

export const LIVE_LEDGER_GATE_VERSION = 'pawket-admin-live-ledger-gate-v0';

const ROLE_ALIASES = new Map([
  ['Owner Root', 'owner_root'],
  ['Finance Admin', 'finance_admin'],
  ['Bookkeeper', 'bookkeeper'],
  ['Accountant Export User', 'accountant_export_user'],
  ['Foundation Admin', 'foundation_admin'],
  ['Investor Read-Only', 'investor_read_only'],
  ['Connector Node', 'connector_node'],
]);

const NEVER_COMMIT_ROLES = new Set([
  'connector_node',
  'investor_read_only',
  'bookkeeper',
  'accountant_export_user',
]);

const COMMIT_ALLOWED_ROLES = new Set([
  'owner_root',
  'finance_admin',
  'foundation_admin',
]);

const ALLOWED_APPROVAL_STATUSES = new Set([
  'approved_for_commit_gate',
  'approved_for_future_commit',
]);

const COMPLETE_OR_DEFERRED_COVERAGE = new Set([
  'complete',
  'deferred_approved',
]);

const SOFT_CLOSED_OVERRIDE_ROLES = new Set(['owner_root', 'finance_admin']);
const CORRECTION_TYPES = new Set(['correction', 'adjustment', 'reversal']);
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

const FORBIDDEN_OFFICIAL_LEDGER_FILES = Object.freeze([
  'events/journal-entries.ndjson',
  'events/live-ledger.ndjson',
  'events/final-ledger.ndjson',
  'events/balances.ndjson',
  'ledger/journal-entries.ndjson',
  'ledger/live-ledger.ndjson',
  'ledger/final-ledger.ndjson',
  'ledger/balances.ndjson',
]);

const ALLOWED_TEST_ONLY_FILES = Object.freeze([
  'events/disabled-production-commit-records.ndjson',
  'events/test-immutable-ledger-entries.ndjson',
  'events/proposed-ledger-correction-records.ndjson',
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

function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return '';
  }

  if (ROLE_ALIASES.has(role)) {
    return ROLE_ALIASES.get(role);
  }

  return role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function assertAllowedVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);

  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin live-ledger gate files must not be placed under public/.');
  }

  return resolved;
}

function safeFileId(value, fieldName) {
  if (!value || typeof value !== 'string') {
    throw new Error(`${fieldName} is required.`);
  }

  if (value.includes('/') || value.includes('\\') || value.includes('..')) {
    throw new Error(`${fieldName} cannot contain path separators or traversal.`);
  }

  return value.replace(/[^a-zA-Z0-9_.:-]/g, '_');
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

function ensureLiveLedgerGateDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'events'), { recursive: true });
}

function disabledCommitRecordsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'disabled-production-commit-records.ndjson');
}

function testImmutableLedgerEntriesPath(vaultPath) {
  return path.join(vaultPath, 'events', 'test-immutable-ledger-entries.ndjson');
}

function proposedLedgerCorrectionsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'proposed-ledger-correction-records.ndjson');
}

function isFoundationScoped(entry = {}) {
  return /foundation|charm|cherish/i.test([
    entry.entity_id,
    entry.fund_id,
    entry.class_id,
    entry.entity_scope,
    entry.fund_scope,
  ].filter(Boolean).join(' '));
}

function isNonFinancial(entry = {}) {
  return entry.is_non_financial === true ||
    entry.nonfinancial === true ||
    entry.balance_status === 'nonfinancial_not_required' ||
    ['impact_nonfinancial', 'asset_review_nonfinancial'].includes(entry.journal_type);
}

function roundMoney(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100) / 100;
}

function sourceLineageErrors(entry = {}) {
  const errors = [];
  const required = [
    'source_proposed_ledger_record_ids',
    'source_review_item_ids',
    'source_draft_record_ids',
    'source_event_ids',
    'source_bundle_ids',
  ];

  for (const field of required) {
    if (!Array.isArray(entry[field]) || entry[field].filter(Boolean).length === 0) {
      errors.push(`${field} is required for immutable source lineage.`);
    }
  }

  return errors;
}

function getPeriodStatus(periodOrContext = {}) {
  if (typeof periodOrContext === 'string') {
    return periodOrContext;
  }
  return periodOrContext.status ||
    periodOrContext.period_status ||
    periodOrContext.period?.status ||
    (periodOrContext.periodOpen === true ? 'open' : '');
}

function getCommitType(context = {}) {
  return context.commit_type || context.commitType || context.request_type || context.requestType || '';
}

function getEvidenceManifest(context = {}, entry = {}) {
  return context.evidenceManifest ||
    context.evidence_manifest ||
    context.commitEvidenceManifest ||
    context.commit_evidence_manifest ||
    entry.evidence_manifest ||
    null;
}

function getEvidenceIntegration(context = {}) {
  return context.commitGateEvidenceIntegration ||
    context.commit_gate_evidence_integration ||
    context.evidenceIntegration ||
    context.evidence_integration ||
    null;
}

function getCoverageStatus(context = {}, entry = {}) {
  const manifest = getEvidenceManifest(context, entry);
  const integration = getEvidenceIntegration(context);
  return integration?.coverage_status ||
    manifest?.coverage_status ||
    entry.evidence_coverage_status ||
    entry.document_coverage_status ||
    '';
}

function evidenceManifestId(context = {}, entry = {}) {
  const manifest = getEvidenceManifest(context, entry);
  return manifest?.manifest_id ||
    entry.evidence_manifest_id ||
    entry.commit_evidence_manifest_id ||
    context.evidence_manifest_id ||
    '';
}

function evidenceManifestHash(context = {}, entry = {}) {
  const manifest = getEvidenceManifest(context, entry);
  return manifest?.manifest_hash ||
    entry.evidence_manifest_hash ||
    context.evidence_manifest_hash ||
    '';
}

function unresolvedRiskFlags(entry = {}, context = {}) {
  const resolved = new Set(context.resolvedRiskFlags || context.resolved_risk_flags || []);
  return (entry.risk_flags || []).filter((flag) => !resolved.has(flag));
}

function computeTestImmutableLedgerHash(entry) {
  const { ledger_entry_hash: _hash, ...payload } = entry;
  return sha256Hex(canonicalize(payload));
}

export function getLiveLedgerCommitPolicy() {
  return {
    policy_version: LIVE_LEDGER_GATE_VERSION,
    production_commit_enabled: false,
    test_commit_allowed_by_default: false,
    allowed_test_commit_flag: 'enableTestCommit',
    forbidden_official_ledger_files: [...FORBIDDEN_OFFICIAL_LEDGER_FILES],
    allowed_test_only_files: [...ALLOWED_TEST_ONLY_FILES],
    commit_gate_statuses: [
      'not_requested',
      'validation_failed',
      'eligible_but_production_disabled',
      'test_commit_allowed',
      'test_committed',
      'production_commit_blocked',
      'production_commit_future_review_required',
      'rejected',
      'superseded',
    ],
    role_policy: {
      owner_root: {
        future_commit_authority: 'all_scopes_after_review',
        current_production_commit_allowed: false,
      },
      finance_admin: {
        future_commit_authority: 'operating_scope_after_review',
        current_production_commit_allowed: false,
      },
      foundation_admin: {
        future_commit_authority: 'foundation_scope_only_after_review',
        current_production_commit_allowed: false,
      },
      bookkeeper: {
        future_commit_authority: 'prepare_only',
        current_production_commit_allowed: false,
      },
      accountant_export_user: {
        future_commit_authority: 'review_export_only',
        current_production_commit_allowed: false,
      },
      investor_read_only: {
        future_commit_authority: 'never',
        current_production_commit_allowed: false,
      },
      connector_node: {
        future_commit_authority: 'never',
        current_production_commit_allowed: false,
      },
    },
    required_evidence_manifest_policy: {
      manifest_required: true,
      manifest_hash_required: true,
      allowed_coverage_statuses: [...COMPLETE_OR_DEFERRED_COVERAGE],
      missing_documents_require_approved_deferral: true,
    },
    required_period_policy: {
      normal_commit_status: 'open',
      soft_closed_requires_override: true,
      closed_rejects_normal_commit: true,
      locked_rejects_all_current_commits: true,
    },
    required_balance_policy: {
      financial_entries_must_balance: true,
      nonfinancial_entries_require_nonfinancial_marker: true,
      currency_consistency_required: true,
    },
    required_source_lineage_policy: {
      source_proposed_ledger_record_ids: true,
      source_review_item_ids: true,
      source_draft_record_ids: true,
      source_event_ids: true,
      source_bundle_ids: true,
    },
  };
}

export function validateCommitAuthorization(actor, proposedJournalEntry, policy = getLiveLedgerCommitPolicy(), options = {}) {
  const blockers = [];
  const warnings = [];

  if (!isPlainObject(actor)) {
    blockers.push('Commit actor is required.');
  }

  if (!isPlainObject(proposedJournalEntry)) {
    blockers.push('Proposed journal entry is required for authorization.');
  }

  const role = normalizeRole(actor?.role);
  const scopeIsFoundation = isFoundationScoped(proposedJournalEntry || {});
  const requiredRole = scopeIsFoundation ? 'owner_root_or_foundation_admin' : 'owner_root_or_finance_admin';

  if (!role) {
    blockers.push('Commit actor role is required.');
  } else if (NEVER_COMMIT_ROLES.has(role)) {
    blockers.push(`Role ${role} may not commit live ledger entries.`);
  } else if (!COMMIT_ALLOWED_ROLES.has(role)) {
    blockers.push(`Role ${role} is not configured for live ledger commit authority.`);
  } else if (role === 'finance_admin' && scopeIsFoundation && options.allowFinanceAdminFoundationCommit !== true) {
    blockers.push('Finance Admin may not commit foundation-scoped entries without a future reviewed policy.');
  } else if (role === 'foundation_admin' && !scopeIsFoundation) {
    blockers.push('Foundation Admin may commit only foundation-scoped entries under the future policy.');
  }

  if (role === 'owner_root') {
    warnings.push('Owner Root authorization can pass validation, but production live commit remains disabled.');
  }
  if (role === 'finance_admin' && !scopeIsFoundation) {
    warnings.push('Finance Admin operating-scope authorization can pass validation, but production live commit remains disabled.');
  }
  if (role === 'foundation_admin' && scopeIsFoundation) {
    warnings.push('Foundation Admin foundation-scope authorization can pass validation, but production live commit remains disabled.');
  }
  if (policy.production_commit_enabled !== true) {
    warnings.push('Production live ledger commit is disabled by policy.');
  }

  return {
    authorized: blockers.length === 0,
    blockers,
    warnings: unique(warnings),
    required_role: requiredRole,
    role,
  };
}

export function validateLedgerPeriodForCommit(period, context = {}) {
  const status = getPeriodStatus(period);
  const blockers = [];
  const warnings = [];
  const commitType = getCommitType(context);
  const role = normalizeRole(context.actor?.role || context.role);

  if (!status) {
    blockers.push('Ledger period status is required.');
  } else if (status === 'open') {
    // Open periods are the only normal commit path.
  } else if (status === 'soft_closed') {
    if (context.allowSoftClosedOverride === true && SOFT_CLOSED_OVERRIDE_ROLES.has(role)) {
      warnings.push('Soft-closed period override used; production policy requires review before enabling.');
    } else {
      blockers.push('Soft-closed periods require an explicit override by an authorized role.');
    }
  } else if (status === 'closed') {
    blockers.push('Closed periods reject normal live ledger commits; use a future reviewed adjustment flow.');
  } else if (status === 'locked') {
    blockers.push('Locked periods reject current commits; only a future documented correction model may apply.');
  } else if (status === 'correction_period') {
    if (!CORRECTION_TYPES.has(commitType)) {
      blockers.push('Correction periods require correction, adjustment, or reversal commit type.');
    } else {
      warnings.push('Correction-period request validated as proposed-only; production correction commit remains disabled.');
    }
  } else {
    blockers.push(`Unsupported ledger period status: ${status}.`);
  }

  return {
    allowed: blockers.length === 0,
    status,
    blockers,
    warnings,
  };
}

export function validateLedgerBalanceIntegrity(entryOrJournal, options = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(entryOrJournal)) {
    return { ok: false, errors: ['Ledger entry or proposed journal entry is required.'], warnings };
  }

  const entry = entryOrJournal;
  const nonFinancial = isNonFinancial(entry);

  errors.push(...sourceLineageErrors(entry));

  if (!entry.currency || typeof entry.currency !== 'string') {
    errors.push('currency is required.');
  }

  if (nonFinancial) {
    if (entry.balance_status && entry.balance_status !== 'nonfinancial_not_required') {
      errors.push('Nonfinancial entries must use balance_status nonfinancial_not_required.');
    }
  } else {
    if (entry.balance_status && entry.balance_status !== 'balanced') {
      errors.push('Financial entries must have balance_status balanced.');
    }

    if (roundMoney(entry.total_debits) !== roundMoney(entry.total_credits)) {
      errors.push(`Financial entry is unbalanced: debits ${entry.total_debits}, credits ${entry.total_credits}.`);
    }
  }

  const lines = Array.isArray(entry.lines) ? entry.lines : [];
  if (lines.length) {
    const currencies = unique(lines.map((line) => line.currency || entry.currency));
    if (currencies.length > 1) {
      errors.push(`Journal lines must use one currency. Found: ${currencies.join(', ')}.`);
    }

    for (const [index, line] of lines.entries()) {
      if (!isPlainObject(line)) {
        errors.push(`lines[${index}] must be an object.`);
        continue;
      }
      if (!nonFinancial && !line.account_id) {
        errors.push(`lines[${index}].account_id is required for financial entries.`);
      }
      if (line.journal_entry_id && entry.journal_entry_id && line.journal_entry_id !== entry.journal_entry_id) {
        errors.push(`lines[${index}] is orphaned from journal_entry_id ${entry.journal_entry_id}.`);
      }
      if (line.proposed_journal_entry_id && entry.proposed_journal_entry_id && line.proposed_journal_entry_id !== entry.proposed_journal_entry_id) {
        errors.push(`lines[${index}] is orphaned from proposed_journal_entry_id ${entry.proposed_journal_entry_id}.`);
      }
    }
  } else if (!nonFinancial && options.requireAccountLines === true) {
    errors.push('Financial entries require account line detail when requireAccountLines is true.');
  } else if (!nonFinancial) {
    warnings.push('Account line integrity is deferred to source proposed ledger records in this skeleton.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: unique(warnings),
  };
}

export function validateLiveLedgerCommitReadiness(proposedJournalEntry, context = {}) {
  const policy = context.policy || getLiveLedgerCommitPolicy();
  const blockers = [];
  const warnings = [];

  if (!isPlainObject(proposedJournalEntry)) {
    return {
      ready: false,
      production_commit_allowed: false,
      test_commit_allowed: false,
      status: 'validation_failed',
      blockers: ['Proposed journal entry is required.'],
      warnings,
    };
  }

  if (!proposedJournalEntry.proposed_journal_entry_id) {
    blockers.push('proposed_journal_entry_id is required.');
  }

  if (!ALLOWED_APPROVAL_STATUSES.has(proposedJournalEntry.approval_status)) {
    blockers.push('Proposed journal entry approval_status must be approved_for_commit_gate or approved_for_future_commit.');
  }

  if (proposedJournalEntry.commit_status && proposedJournalEntry.commit_status !== 'not_committed') {
    blockers.push('Proposed journal entry commit_status must be not_committed.');
  }

  const balance = validateLedgerBalanceIntegrity(proposedJournalEntry, context.balanceOptions || {});
  blockers.push(...balance.errors);
  warnings.push(...balance.warnings);

  const period = validateLedgerPeriodForCommit(context.period || proposedJournalEntry.period || {
    status: context.period_status || context.periodStatus,
  }, {
    ...context,
    actor: context.actor,
  });
  blockers.push(...period.blockers);
  warnings.push(...period.warnings);

  const evidenceManifest = getEvidenceManifest(context, proposedJournalEntry);
  const integration = getEvidenceIntegration(context);
  const manifestId = evidenceManifestId(context, proposedJournalEntry);
  const manifestHash = evidenceManifestHash(context, proposedJournalEntry);
  const coverageStatus = getCoverageStatus(context, proposedJournalEntry);

  if (!evidenceManifest && !manifestId) {
    blockers.push('Evidence manifest is required before live ledger commit readiness.');
  }
  if (!manifestHash) {
    blockers.push('Evidence manifest hash is required before live ledger commit readiness.');
  }
  if (coverageStatus && !COMPLETE_OR_DEFERRED_COVERAGE.has(coverageStatus)) {
    blockers.push(`Evidence coverage must be complete or deferred_approved. Current status: ${coverageStatus}.`);
  } else if (!coverageStatus) {
    blockers.push('Evidence coverage status is required.');
  }

  const missingDocuments = unique([
    ...(evidenceManifest?.missing_document_types || []),
    ...(integration?.missing_document_types || []),
  ]);
  const deferredRequirements = unique([
    ...(evidenceManifest?.deferred_requirements || []),
    ...(integration?.approved_deferrals || []),
    ...(integration?.deferred_requirements || []),
  ]);
  if (missingDocuments.length && coverageStatus !== 'deferred_approved' && !deferredRequirements.length) {
    blockers.push(`Missing evidence must be resolved or explicitly deferred: ${missingDocuments.join(', ')}.`);
  }

  if (!isNonFinancial(proposedJournalEntry)) {
    const documentLinks = unique([
      ...(proposedJournalEntry.document_links || []),
      ...(evidenceManifest?.linked_document_ids || []),
      ...(integration?.linked_document_ids || []),
    ]);
    if (!documentLinks.length && coverageStatus !== 'deferred_approved') {
      blockers.push('Document links or approved evidence deferrals are required for financial commit readiness.');
    }
  }

  const calculationRules = unique(proposedJournalEntry.calculation_rule_ids || proposedJournalEntry.calculation_rules || []);
  if (!isNonFinancial(proposedJournalEntry) && !calculationRules.length && context.allowMissingCalculationRules !== true) {
    blockers.push('Calculation rule references are required for financial commit readiness.');
  }

  const unresolvedRisks = unresolvedRiskFlags(proposedJournalEntry, context);
  if (unresolvedRisks.length && context.allowHighRiskOverride !== true) {
    blockers.push(`Unresolved high-risk flags remain: ${unresolvedRisks.join(', ')}.`);
  } else if (unresolvedRisks.length) {
    warnings.push(`High-risk override used for: ${unresolvedRisks.join(', ')}.`);
  }

  if (Array.isArray(integration?.commit_blockers) && integration.commit_blockers.length) {
    blockers.push(...integration.commit_blockers);
  }
  if (Array.isArray(integration?.commit_warnings)) {
    warnings.push(...integration.commit_warnings);
  }
  if ((evidenceManifest?.privacy_warnings || []).length) {
    warnings.push(...evidenceManifest.privacy_warnings);
  }
  if ((evidenceManifest?.redaction_warnings || []).length && context.allowEvidenceWarningOverride !== true) {
    blockers.push(`Unresolved redaction warnings remain: ${evidenceManifest.redaction_warnings.join(', ')}.`);
  }

  const auditContext = context.audit_context || context.auditContext || context.audit || null;
  if (!isPlainObject(auditContext) || !auditContext.reason) {
    blockers.push('Commit audit context with a reason is required.');
  }

  const authorization = validateCommitAuthorization(context.actor, proposedJournalEntry, policy, context.authorizationOptions || {});
  blockers.push(...authorization.blockers);
  warnings.push(...authorization.warnings);

  const structurallyReady = blockers.length === 0;
  const productionCommitAllowed = structurallyReady &&
    policy.production_commit_enabled === true &&
    context.enableProductionCommit === true;
  const testCommitAllowed = structurallyReady && context.enableTestCommit === true;

  let status = 'validation_failed';
  if (structurallyReady && testCommitAllowed) {
    status = 'test_commit_allowed';
  } else if (structurallyReady && !productionCommitAllowed) {
    status = context.requestProductionCommit === true
      ? 'production_commit_blocked'
      : 'eligible_but_production_disabled';
  } else if (structurallyReady && productionCommitAllowed) {
    status = 'production_commit_future_review_required';
  }

  return {
    ready: structurallyReady,
    production_commit_allowed: productionCommitAllowed,
    test_commit_allowed: testCommitAllowed,
    status,
    blockers: unique(blockers),
    warnings: unique(warnings),
    required_role: authorization.required_role,
    authorization,
    evidence_manifest_id: manifestId,
    evidence_manifest_hash: manifestHash,
    live_ledger_gate_version: LIVE_LEDGER_GATE_VERSION,
  };
}

export function createDisabledProductionCommitRecord(vaultPathInput, proposedJournalEntry, actor = {}, context = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureLiveLedgerGateDirs(vaultPath);

  const evaluatedAt = actor.timestamp || context.timestamp || nowIso();
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry, {
    ...context,
    actor,
    requestProductionCommit: context.requestProductionCommit !== false,
    enableTestCommit: false,
    audit_context: context.audit_context || context.auditContext || context.audit || {
      reason: context.reason || actor.reason || 'Production commit gate reached; production live ledger commit remains disabled.',
    },
  });

  const record = {
    disabled_commit_record_id: `disabled_commit_${safeFileId(proposedJournalEntry.proposed_journal_entry_id, 'proposed_journal_entry_id')}_${sha256Hex(evaluatedAt).slice(0, 10)}`,
    proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
    source_proposed_ledger_record_ids: proposedJournalEntry.source_proposed_ledger_record_ids || [],
    source_review_item_ids: proposedJournalEntry.source_review_item_ids || [],
    source_draft_record_ids: proposedJournalEntry.source_draft_record_ids || [],
    source_event_ids: proposedJournalEntry.source_event_ids || [],
    source_bundle_ids: proposedJournalEntry.source_bundle_ids || [],
    evidence_manifest_id: readiness.evidence_manifest_id,
    evidence_manifest_hash: readiness.evidence_manifest_hash,
    commit_gate_status: readiness.status,
    production_commit_enabled: false,
    production_live_ledger_write: false,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
    created_by: {
      actor_id: actor.actor_id || 'system',
      role: normalizeRole(actor.role) || actor.role || 'system',
    },
    created_at: evaluatedAt,
    live_ledger_gate_version: LIVE_LEDGER_GATE_VERSION,
  };

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: evaluatedAt,
    actor_id: actor.actor_id || 'system',
    role: normalizeRole(actor.role) || actor.role || 'system',
    action: 'disabled_production_commit_record_created',
    target_type: 'disabled_production_commit_record',
    target_id: record.disabled_commit_record_id,
    reason: context.reason || actor.reason || 'Production live ledger commit remains disabled.',
    metadata: {
      proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
      commit_gate_status: readiness.status,
      production_live_ledger_write: false,
    },
  });

  const finalRecord = {
    ...record,
    audit_event_id: auditEvent.audit_event_id,
  };
  appendJsonLine(disabledCommitRecordsPath(vaultPath), finalRecord);

  return {
    disabled_commit_record: finalRecord,
    readiness,
    audit_event: auditEvent,
  };
}

export function createTestOnlyImmutableLedgerEntry(vaultPathInput, proposedJournalEntry, actor = {}, context = {}) {
  if (context.enableTestCommit !== true) {
    throw new Error('Test-only immutable ledger entry requires context.enableTestCommit === true.');
  }

  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureLiveLedgerGateDirs(vaultPath);

  const committedAt = actor.timestamp || context.timestamp || nowIso();
  const readiness = validateLiveLedgerCommitReadiness(proposedJournalEntry, {
    ...context,
    actor,
    enableTestCommit: true,
    audit_context: context.audit_context || context.auditContext || context.audit || {
      reason: context.reason || actor.reason || 'Test-only immutable ledger entry validation.',
    },
  });

  if (!readiness.test_commit_allowed) {
    throw new Error(`Test-only immutable ledger entry rejected: ${readiness.blockers.join(' ')}`);
  }

  const existingEntries = readJsonLines(testImmutableLedgerEntriesPath(vaultPath));
  const previousLedgerHash = existingEntries.length
    ? existingEntries[existingEntries.length - 1].ledger_entry_hash
    : GENESIS_HASH;
  const journalEntryId = `test_ledger_${safeFileId(proposedJournalEntry.proposed_journal_entry_id, 'proposed_journal_entry_id')}_${String(existingEntries.length + 1).padStart(6, '0')}`;

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: committedAt,
    actor_id: actor.actor_id || 'system',
    role: normalizeRole(actor.role) || actor.role || 'system',
    action: 'test_only_immutable_ledger_entry_created',
    target_type: 'test_immutable_ledger_entry',
    target_id: journalEntryId,
    reason: context.reason || actor.reason || 'Test-only immutable ledger entry created; no production live ledger write.',
    metadata: {
      proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
      production_live_ledger_write: false,
      test_only: true,
    },
  });

  const record = {
    journal_entry_id: journalEntryId,
    source_proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
    source_proposed_ledger_record_ids: proposedJournalEntry.source_proposed_ledger_record_ids || [],
    source_review_item_ids: proposedJournalEntry.source_review_item_ids || [],
    source_draft_record_ids: proposedJournalEntry.source_draft_record_ids || [],
    source_event_ids: proposedJournalEntry.source_event_ids || [],
    source_bundle_ids: proposedJournalEntry.source_bundle_ids || [],
    evidence_manifest_id: readiness.evidence_manifest_id,
    evidence_manifest_hash: readiness.evidence_manifest_hash,
    commit_gate_record_id: context.commit_gate_record_id || context.commitGateRecordId || '',
    entity_id: proposedJournalEntry.entity_id,
    fund_id: proposedJournalEntry.fund_id,
    class_id: proposedJournalEntry.class_id,
    currency: proposedJournalEntry.currency,
    transaction_date: proposedJournalEntry.transaction_date,
    effective_period: proposedJournalEntry.effective_period,
    description: proposedJournalEntry.description,
    journal_type: proposedJournalEntry.journal_type,
    total_debits: proposedJournalEntry.total_debits,
    total_credits: proposedJournalEntry.total_credits,
    document_links: proposedJournalEntry.document_links || [],
    calculation_rule_ids: proposedJournalEntry.calculation_rule_ids || [],
    committed_by: {
      actor_id: actor.actor_id || 'system',
      role: normalizeRole(actor.role) || actor.role || 'system',
    },
    committed_at: committedAt,
    audit_event_id: auditEvent.audit_event_id,
    previous_ledger_hash: previousLedgerHash,
    immutable_status: 'committed',
    commit_mode: 'test_only_not_production',
    production_live_ledger_write: false,
    live_ledger_gate_version: LIVE_LEDGER_GATE_VERSION,
  };

  const finalRecord = {
    ...record,
    ledger_entry_hash: computeTestImmutableLedgerHash(record),
  };
  appendJsonLine(testImmutableLedgerEntriesPath(vaultPath), finalRecord);

  return {
    test_immutable_ledger_entry: finalRecord,
    readiness,
    audit_event: auditEvent,
  };
}

export function verifyTestImmutableLedgerChain(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const entries = readJsonLines(testImmutableLedgerEntriesPath(vaultPath));
  const errors = [];
  const seenIds = new Set();
  let expectedPreviousHash = GENESIS_HASH;
  let lastHash = null;

  entries.forEach((entry, index) => {
    const label = `test_immutable_ledger_entries[${index}]`;

    if (!isPlainObject(entry)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (!entry.journal_entry_id) {
      errors.push(`${label}.journal_entry_id is required.`);
    } else if (seenIds.has(entry.journal_entry_id)) {
      errors.push(`${label}.journal_entry_id duplicates ${entry.journal_entry_id}.`);
    } else {
      seenIds.add(entry.journal_entry_id);
    }

    if (entry.previous_ledger_hash !== expectedPreviousHash) {
      errors.push(`${label}.previous_ledger_hash must equal ${expectedPreviousHash}.`);
    }

    if (!SHA256_HEX_RE.test(String(entry.ledger_entry_hash || ''))) {
      errors.push(`${label}.ledger_entry_hash must be a sha256 hex string.`);
    } else {
      const computedHash = computeTestImmutableLedgerHash(entry);
      if (entry.ledger_entry_hash !== computedHash) {
        errors.push(`${label}.ledger_entry_hash does not match canonical test ledger entry content.`);
      }
    }

    if (SHA256_HEX_RE.test(String(entry.ledger_entry_hash || ''))) {
      expectedPreviousHash = entry.ledger_entry_hash;
      lastHash = entry.ledger_entry_hash;
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    entries_count: entries.length,
    last_hash: lastHash,
  };
}

export function createProposedLedgerCorrectionRecord(vaultPathInput, correctionRequest, actor = {}, context = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureLiveLedgerGateDirs(vaultPath);

  const errors = [];
  if (!isPlainObject(correctionRequest)) {
    throw new Error('Proposed ledger correction request is required.');
  }

  if (!CORRECTION_TYPES.has(correctionRequest.request_type)) {
    errors.push('request_type must be correction, adjustment, or reversal.');
  }
  if (!correctionRequest.target_entry_id) {
    errors.push('target_entry_id is required.');
  }
  if (!correctionRequest.reason) {
    errors.push('reason is required.');
  }

  const sourceProof = unique([
    ...(correctionRequest.source_proof_ids || []),
    ...(correctionRequest.source_event_ids || []),
    ...(correctionRequest.document_links || []),
    correctionRequest.evidence_manifest_id,
    correctionRequest.proof_reference,
  ]);
  if (!sourceProof.length) {
    errors.push('Source or proof reference is required.');
  }

  const authorization = validateCommitAuthorization(actor, {
    entity_id: correctionRequest.entity_id || context.entity_id || 'ent_petpawket',
    fund_id: correctionRequest.fund_id || context.fund_id || 'fund_operating',
    class_id: correctionRequest.class_id || context.class_id || 'class_commerce',
  }, context.policy || getLiveLedgerCommitPolicy(), context.authorizationOptions || {});
  errors.push(...authorization.blockers);

  if (correctionRequest.silent_edit === true || correctionRequest.delete_original === true) {
    errors.push('Proposed ledger corrections cannot silently edit or delete original entries.');
  }

  if (errors.length) {
    throw new Error(`Proposed ledger correction rejected: ${errors.join(' ')}`);
  }

  const createdAt = actor.timestamp || context.timestamp || nowIso();
  const record = {
    proposed_ledger_correction_record_id: correctionRequest.proposed_ledger_correction_record_id ||
      `plc_${sha256Hex(canonicalize({ correctionRequest, createdAt })).slice(0, 16)}`,
    request_type: correctionRequest.request_type,
    target_entry_id: correctionRequest.target_entry_id,
    source_proposed_journal_entry_id: correctionRequest.source_proposed_journal_entry_id || '',
    source_event_ids: correctionRequest.source_event_ids || [],
    source_bundle_ids: correctionRequest.source_bundle_ids || [],
    document_links: correctionRequest.document_links || [],
    evidence_manifest_id: correctionRequest.evidence_manifest_id || '',
    proof_reference: correctionRequest.proof_reference || '',
    reason: correctionRequest.reason,
    status: 'proposed',
    original_entry_modified: false,
    production_live_ledger_write: false,
    created_by: {
      actor_id: actor.actor_id || 'system',
      role: normalizeRole(actor.role) || actor.role || 'system',
    },
    created_at: createdAt,
    updated_at: createdAt,
    live_ledger_gate_version: LIVE_LEDGER_GATE_VERSION,
  };

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: createdAt,
    actor_id: actor.actor_id || 'system',
    role: normalizeRole(actor.role) || actor.role || 'system',
    action: 'proposed_ledger_correction_record_created',
    target_type: 'proposed_ledger_correction_record',
    target_id: record.proposed_ledger_correction_record_id,
    reason: correctionRequest.reason,
    metadata: {
      request_type: correctionRequest.request_type,
      target_entry_id: correctionRequest.target_entry_id,
      production_live_ledger_write: false,
      original_entry_modified: false,
    },
  });

  const finalRecord = {
    ...record,
    audit_event_id: auditEvent.audit_event_id,
  };
  appendJsonLine(proposedLedgerCorrectionsPath(vaultPath), finalRecord);

  return {
    proposed_ledger_correction_record: finalRecord,
    authorization,
    audit_event: auditEvent,
  };
}

export function verifyNoOfficialLiveLedgerWrites(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const presentPaths = FORBIDDEN_OFFICIAL_LEDGER_FILES
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));

  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
    forbidden_official_ledger_files: [...FORBIDDEN_OFFICIAL_LEDGER_FILES],
    allowed_test_only_files: ALLOWED_TEST_ONLY_FILES.map((relativePath) => path.join(vaultPath, ...relativePath.split('/'))),
  };
}
