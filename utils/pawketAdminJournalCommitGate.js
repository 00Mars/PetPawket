import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';

export const JOURNAL_COMMIT_GATE_VERSION = 'pawket-admin-journal-commit-gate-v0';

const ALLOWED_JOURNAL_DECISIONS = new Set([
  'needs_revision',
  'approved_for_commit_gate',
  'rejected',
  'superseded',
]);

const ALLOWED_CORRECTION_REQUEST_TYPES = new Set(['correction', 'adjustment', 'reversal']);
const OWNER_COMMIT_ROLES = new Set(['owner_root', 'finance_admin']);
const NEVER_COMMIT_ROLES = new Set(['connector_node', 'investor_read_only', 'bookkeeper', 'accountant_export_user']);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function assertAllowedVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);

  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin journal commit-gate files must not be placed under public/.');
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

function ensureJournalDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'events'), { recursive: true });
}

function proposedJournalEntriesPath(vaultPath) {
  return path.join(vaultPath, 'events', 'proposed-journal-entries.ndjson');
}

function testLedgerCommitsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'test-ledger-commits.ndjson');
}

function proposedCorrectionsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'proposed-corrections-adjustments.ndjson');
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

function latestById(records, idField) {
  const latest = new Map();
  for (const record of records) {
    latest.set(record[idField], record);
  }
  return [...latest.values()];
}

function hasValues(values) {
  return Array.isArray(values) && values.some(Boolean);
}

function sourceIdsFrom(records, field) {
  return unique(records.flatMap((record) => record[field] || []));
}

function getRecordGroupKey(record, options = {}) {
  if (typeof options.groupKey === 'function') {
    return String(options.groupKey(record));
  }
  if (typeof options.groupKey === 'string') {
    return options.groupKey;
  }

  const sourceReviewItemId = record.source_review_item_id || 'review_unassigned';
  const financialState = record.is_non_financial === true ? 'nonfinancial' : 'financial';
  return [
    financialState,
    record.entity_id || 'entity_unmapped',
    record.fund_id || 'fund_unmapped',
    record.class_id || 'class_unmapped',
    record.currency || 'USD',
    record.effective_period || 'period_unassigned',
    sourceReviewItemId,
  ].join('|');
}

function inferJournalType(records, options = {}) {
  if (options.journal_type) {
    return options.journal_type;
  }

  const joined = records.map((record) => `${record.account_id || ''} ${record.description || ''}`).join(' ').toLowerCase();
  const nonFinancial = records.every((record) => record.is_non_financial === true);

  if (nonFinancial && joined.includes('pawket_pal')) return 'asset_review_nonfinancial';
  if (nonFinancial) return 'impact_nonfinancial';
  if (joined.includes('income_pawket_packet_revenue') || joined.includes('packet')) return 'packet_sale';
  if (joined.includes('income_pawket_pack_revenue') || joined.includes('pack')) return 'pack_sale';
  if (joined.includes('income_product_sales') || joined.includes('sales_revenue')) return 'sale';
  if (joined.includes('payment_received') || (joined.includes('asset_cash') && joined.includes('asset_payment_processor_receivable'))) return 'payment';
  if (joined.includes('refund') || joined.includes('chargeback')) return 'refund';
  if (joined.includes('income_donation_foundation') || joined.includes('donation_received')) return 'donation';
  if (joined.includes('donation_payable') || joined.includes('charm_pledge')) return 'pledge';
  if (joined.includes('pawket_care_credit') || joined.includes('care_credit')) return 'care_credit_liability';
  if (joined.includes('pawket_pick') || joined.includes('reward')) return 'reward_cost';
  if (joined.includes('deferred_subscription') || joined.includes('subscription')) return 'subscription';
  return 'adjustment';
}

function documentCoverageStatus(records, options = {}) {
  if (options.document_coverage_status) {
    return options.document_coverage_status;
  }

  const statuses = records.map((record) => record.document_coverage_status).filter(Boolean);
  if (statuses.includes('incomplete')) return 'incomplete';
  if (statuses.includes('deferred')) return 'deferred';
  if (statuses.includes('complete')) return 'complete';

  const documentLinks = sourceIdsFrom(records, 'document_links');
  return documentLinks.length ? 'complete' : 'incomplete';
}

function proposedJournalEntryId(records, groupKey, options = {}) {
  if (options.proposed_journal_entry_id) {
    return safeFileId(options.proposed_journal_entry_id, 'proposed_journal_entry_id');
  }

  const hash = sha256Hex(canonicalize({
    groupKey,
    proposedLedgerRecordIds: records.map((record) => record.proposed_ledger_record_id),
  })).slice(0, 16);
  return `pje_${hash}`;
}

function requireProposedRecords(proposedRecords) {
  if (!Array.isArray(proposedRecords) || proposedRecords.length === 0) {
    throw new Error('At least one proposed ledger record is required.');
  }

  for (const [index, record] of proposedRecords.entries()) {
    if (!isPlainObject(record) || !record.proposed_ledger_record_id) {
      throw new Error(`proposedRecords[${index}].proposed_ledger_record_id is required.`);
    }
  }
}

function actorRole(actorOrContext = {}) {
  return actorOrContext.role || actorOrContext.actor?.role || actorOrContext.actor_role;
}

function isFoundationScoped(entry) {
  return /foundation|charm|cherish/i.test(`${entry.entity_id || ''} ${entry.fund_id || ''} ${entry.class_id || ''}`);
}

function roleCanCommit(role, entry, context = {}) {
  if (!role || NEVER_COMMIT_ROLES.has(role)) {
    return false;
  }
  if (OWNER_COMMIT_ROLES.has(role)) {
    return true;
  }
  return role === 'foundation_admin' && context.allowFoundationAdminCommit === true && isFoundationScoped(entry);
}

function entryIsNonFinancial(entry) {
  return entry.is_non_financial === true ||
    ['impact_nonfinancial', 'asset_review_nonfinancial'].includes(entry.journal_type);
}

function getPeriodStatus(context = {}) {
  return context.period?.status || (context.periodOpen === true ? 'open' : undefined);
}

function getAuditContext(context = {}) {
  return context.audit_context || context.auditContext || context.audit || null;
}

function validateSourceTraceability(entry) {
  const errors = [];

  if (!hasValues(entry.source_proposed_ledger_record_ids)) errors.push('Source proposed ledger record ids are required.');
  if (!hasValues(entry.source_review_item_ids)) errors.push('Source review item ids are required.');
  if (!hasValues(entry.source_draft_record_ids)) errors.push('Source draft record ids are required.');
  if (!hasValues(entry.source_event_ids)) errors.push('Source event ids are required.');
  if (!hasValues(entry.source_bundle_ids)) errors.push('Source bundle ids are required.');

  return errors;
}

export function groupProposedLedgerRecordsIntoJournalEntries(proposedRecords, options = {}) {
  requireProposedRecords(proposedRecords);

  const createdAt = options.created_at || nowIso();
  const groups = new Map();

  for (const record of proposedRecords) {
    const groupKey = getRecordGroupKey(record, options);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(record);
  }

  return [...groups.entries()].map(([groupKey, records]) => {
    const financialRecords = records.filter((record) => record.is_non_financial !== true);
    const nonFinancial = financialRecords.length === 0;
    const totalDebits = roundMoney(financialRecords.reduce((sum, record) => sum + asNumber(record.debit_amount), 0));
    const totalCredits = roundMoney(financialRecords.reduce((sum, record) => sum + asNumber(record.credit_amount), 0));
    const balanceStatus = nonFinancial ? 'nonfinancial_not_required' : (totalDebits === totalCredits ? 'balanced' : 'unbalanced');
    const riskFlags = unique(records.flatMap((record) => record.risk_flags || []));
    const documentLinks = sourceIdsFrom(records, 'document_links');
    const sourceReviewItemIds = unique(records.map((record) => record.source_review_item_id));
    const transactionDates = records.map((record) => record.transaction_date).filter(Boolean).sort();

    return {
      proposed_journal_entry_id: proposedJournalEntryId(records, groupKey, options),
      source_proposed_ledger_record_ids: unique(records.map((record) => record.proposed_ledger_record_id)),
      source_review_item_ids: sourceReviewItemIds,
      source_draft_record_ids: sourceIdsFrom(records, 'source_draft_record_ids'),
      source_event_ids: sourceIdsFrom(records, 'source_event_ids'),
      source_bundle_ids: sourceIdsFrom(records, 'source_bundle_ids'),
      entity_id: options.entity_id || records[0].entity_id,
      fund_id: options.fund_id || records[0].fund_id,
      class_id: options.class_id || records[0].class_id,
      effective_period: options.effective_period || records[0].effective_period,
      transaction_date: options.transaction_date || transactionDates[0] || createdAt,
      description: options.description || `Proposed ${inferJournalType(records, options)} journal entry`,
      journal_type: inferJournalType(records, options),
      currency: options.currency || records[0].currency || 'USD',
      total_debits: totalDebits,
      total_credits: totalCredits,
      balance_status: balanceStatus,
      document_coverage_status: documentCoverageStatus(records, options),
      document_links: documentLinks,
      calculation_rule_ids: unique(records.map((record) => record.calculation_rule_id)),
      approval_status: 'proposed',
      commit_status: 'not_committed',
      risk_flags: riskFlags,
      is_non_financial: nonFinancial,
      created_by: options.created_by || options.actor?.actor_id || 'system',
      created_at: createdAt,
      updated_at: createdAt,
      proposed_line_count: records.length,
      journal_commit_gate_version: JOURNAL_COMMIT_GATE_VERSION,
    };
  });
}

export function validateProposedJournalEntry(entry, options = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(entry)) {
    return { ok: false, errors: ['Proposed journal entry is required.'], warnings };
  }

  if (!entry.proposed_journal_entry_id) errors.push('proposed_journal_entry_id is required.');
  errors.push(...validateSourceTraceability(entry));

  for (const field of ['entity_id', 'fund_id', 'class_id', 'currency', 'effective_period', 'transaction_date']) {
    if (!entry[field] || typeof entry[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (!entry.document_coverage_status) {
    errors.push('document_coverage_status is required.');
  }

  if (entry.commit_status !== 'not_committed') {
    errors.push('commit_status must be not_committed before final commit gate.');
  }

  if (entryIsNonFinancial(entry)) {
    if (entry.balance_status !== 'nonfinancial_not_required') {
      errors.push('Non-financial proposed journal entries must use balance_status nonfinancial_not_required.');
    }
  } else {
    if (entry.balance_status !== 'balanced') {
      errors.push('Financial proposed journal entries must have balance_status balanced.');
    }
    if (roundMoney(entry.total_debits) !== roundMoney(entry.total_credits)) {
      errors.push(`Financial proposed journal entry is unbalanced: debits ${entry.total_debits}, credits ${entry.total_credits}.`);
    }
  }

  const resolvedRiskFlags = new Set(options.resolvedRiskFlags || options.resolved_risk_flags || []);
  const unresolvedRiskFlags = (entry.risk_flags || []).filter((flag) => !resolvedRiskFlags.has(flag));
  if (unresolvedRiskFlags.length && options.allowUnresolvedRiskFlags === false) {
    errors.push(`Unresolved risk flags remain: ${unresolvedRiskFlags.join(', ')}.`);
  } else if (unresolvedRiskFlags.length) {
    warnings.push(`Risk flags require commit-gate handling: ${unresolvedRiskFlags.join(', ')}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateFinalCommitGate(entry, context = {}) {
  const blockers = [];
  const warnings = [];
  const requiredRole = context.required_role || context.requiredRole || (isFoundationScoped(entry || {}) ? 'foundation_admin_or_finance_admin' : 'finance_admin');
  const role = actorRole(context);

  const entryValidation = validateProposedJournalEntry(entry, {
    allowUnresolvedRiskFlags: true,
  });
  blockers.push(...entryValidation.errors);
  warnings.push(...entryValidation.warnings);

  const requiredApprovalStatus = context.requiredApprovalStatus || context.required_approval_status || 'approved_for_commit_gate';
  if (entry?.approval_status !== requiredApprovalStatus) {
    blockers.push(`Proposed journal entry approval_status must be ${requiredApprovalStatus}.`);
  }

  if (!roleCanCommit(role, entry || {}, context)) {
    blockers.push(`Role ${role || 'missing'} is not allowed to commit this proposed journal entry.`);
  }

  if (getPeriodStatus(context) !== 'open') {
    blockers.push('Effective period must be open for commit eligibility.');
  }

  if (entry && !['balanced', 'nonfinancial_not_required'].includes(entry.balance_status)) {
    blockers.push('Balance status must be balanced or nonfinancial_not_required.');
  }

  const documentStatus = entry?.document_coverage_status;
  const documentDeferralApproved = context.approvedDocumentDeferral === true ||
    context.approved_document_deferral === true ||
    entry?.document_deferral_approved === true;
  if (documentStatus !== 'complete' && !(documentStatus === 'deferred' && documentDeferralApproved)) {
    blockers.push('Document coverage must be complete or explicitly deferred with approval.');
  }

  const unresolvedRiskFlags = (entry?.risk_flags || []).filter((flag) => !(context.resolvedRiskFlags || context.resolved_risk_flags || []).includes(flag));
  if (unresolvedRiskFlags.length && context.allowUnresolvedRiskFlags !== true) {
    blockers.push(`Unresolved high-risk flags remain: ${unresolvedRiskFlags.join(', ')}.`);
  }

  if (!entryIsNonFinancial(entry || {}) && !hasValues(entry?.calculation_rule_ids)) {
    blockers.push('Calculation rule references are required for financial commit eligibility.');
  }

  const auditContext = getAuditContext(context);
  if (!isPlainObject(auditContext) || !auditContext.reason) {
    blockers.push('Audit context with a reason is required.');
  }

  const validationEligible = blockers.length === 0;
  const testCommitEnabled = context.enableTestCommit === true;
  const commitMode = testCommitEnabled ? 'test_commit_enabled' : 'validation_only_live_commit_disabled';

  if (!testCommitEnabled) {
    warnings.push('Live ledger commit remains disabled; this gate can validate eligibility only unless enableTestCommit is true.');
  }

  return {
    eligible: validationEligible,
    can_commit: validationEligible && testCommitEnabled,
    blockers,
    warnings: unique(warnings),
    required_role: requiredRole,
    commit_mode: commitMode,
  };
}

export function writeProposedJournalEntries(vaultPathInput, proposedJournalEntries, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureJournalDirs(vaultPath);

  const entries = Array.isArray(proposedJournalEntries) ? proposedJournalEntries : [proposedJournalEntries];
  if (!entries.length || entries.some((entry) => !isPlainObject(entry))) {
    throw new Error('At least one proposed journal entry is required.');
  }

  for (const entry of entries) {
    const validation = validateProposedJournalEntry(entry);
    if (!validation.ok) {
      throw new Error(`Proposed journal entry rejected: ${validation.errors.join(' ')}`);
    }
    appendJsonLine(proposedJournalEntriesPath(vaultPath), entry);
  }

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'proposed_journal_entries_written',
    target_type: 'proposed_journal_entries',
    target_id: entries.map((entry) => entry.proposed_journal_entry_id).join(','),
    reason: actor.reason || 'Proposed journal entries written; no live ledger commit.',
    metadata: {
      proposed_journal_entry_count: entries.length,
      live_ledger_write: false,
    },
  });

  return {
    proposed_journal_entry_count: entries.length,
    proposed_journal_entries: entries,
    audit_event: auditEvent,
  };
}

export function createTestOnlyLedgerCommit(vaultPathInput, proposedJournalEntry, actor = {}, context = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureJournalDirs(vaultPath);

  const gate = validateFinalCommitGate(proposedJournalEntry, {
    ...context,
    actor,
    enableTestCommit: context.enableTestCommit,
    audit_context: context.audit_context || context.auditContext || context.audit || {
      reason: context.reason || actor.reason || 'Test-only ledger commit validation.',
    },
  });

  if (!context.enableTestCommit) {
    throw new Error('Test-only ledger commit requires context.enableTestCommit === true.');
  }
  if (!gate.can_commit) {
    throw new Error(`Test-only ledger commit rejected: ${gate.blockers.join(' ')}`);
  }

  const committedAt = actor.timestamp || nowIso();
  const testCommit = {
    test_commit_id: `test_commit_${safeFileId(proposedJournalEntry.proposed_journal_entry_id, 'proposed_journal_entry_id')}`,
    source_proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
    source_proposed_ledger_record_ids: proposedJournalEntry.source_proposed_ledger_record_ids || [],
    source_review_item_ids: proposedJournalEntry.source_review_item_ids || [],
    source_draft_record_ids: proposedJournalEntry.source_draft_record_ids || [],
    source_event_ids: proposedJournalEntry.source_event_ids || [],
    source_bundle_ids: proposedJournalEntry.source_bundle_ids || [],
    entity_id: proposedJournalEntry.entity_id,
    fund_id: proposedJournalEntry.fund_id,
    class_id: proposedJournalEntry.class_id,
    currency: proposedJournalEntry.currency,
    total_debits: proposedJournalEntry.total_debits,
    total_credits: proposedJournalEntry.total_credits,
    transaction_date: proposedJournalEntry.transaction_date,
    effective_period: proposedJournalEntry.effective_period,
    committed_by: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
    committed_at: committedAt,
    commit_mode: 'test_only_not_live_ledger',
    immutable_status: 'test_only_append_only',
    live_ledger_write: false,
  };

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: committedAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'test_only_ledger_commit_created',
    target_type: 'test_ledger_commit',
    target_id: testCommit.test_commit_id,
    reason: context.reason || actor.reason || 'Test-only ledger commit artifact created; no live ledger write.',
    metadata: {
      source_proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
      live_ledger_write: false,
      commit_mode: gate.commit_mode,
    },
  });

  const record = {
    ...testCommit,
    audit_event_id: auditEvent.audit_event_id,
  };
  appendJsonLine(testLedgerCommitsPath(vaultPath), record);

  return {
    test_commit: record,
    audit_event: auditEvent,
    gate,
  };
}

export function validateCorrectionOrAdjustmentRequest(request, context = {}) {
  const errors = [];
  const warnings = [];
  const role = actorRole(context);

  if (!isPlainObject(request)) {
    return { ok: false, errors: ['Correction or adjustment request is required.'], warnings };
  }

  if (!ALLOWED_CORRECTION_REQUEST_TYPES.has(request.request_type)) {
    errors.push('request_type must be correction, adjustment, or reversal.');
  }
  if (!request.target_entry_id || typeof request.target_entry_id !== 'string') {
    errors.push('target_entry_id is required.');
  }
  if (!request.reason || typeof request.reason !== 'string') {
    errors.push('reason is required.');
  }
  if (!roleCanCommit(role, { entity_id: request.entity_id, fund_id: request.fund_id, class_id: request.class_id }, context)) {
    errors.push(`Role ${role || 'missing'} is not allowed to propose correction or adjustment records.`);
  }

  const periodStatus = getPeriodStatus(context);
  if (!periodStatus) {
    errors.push('Period status is required.');
  } else if (periodStatus === 'locked' && role !== 'owner_root') {
    errors.push('Locked period correction requests require owner_root.');
  } else if (['closed', 'locked'].includes(periodStatus) && context.correctionPeriodOpen !== true && context.allowClosedPeriodAdjustment !== true) {
    errors.push('Closed or locked period requests require an open correction period or explicit closed-period adjustment approval.');
  }

  const sourceProof = unique([
    ...(request.source_proof_ids || []),
    ...(request.source_event_ids || []),
    ...(request.document_links || []),
  ]);
  if (!sourceProof.length) {
    errors.push('Source proof is required for correction and adjustment requests.');
  }

  if (request.silent_edit === true || request.delete_original === true) {
    errors.push('Correction and adjustment requests cannot silently edit or delete original records.');
  }

  if (request.request_type === 'reversal') {
    warnings.push('Reversal requests must preserve the original source and create a separate proposed reversal record.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

export function createProposedCorrectionOrAdjustment(vaultPathInput, request, actor = {}, context = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureJournalDirs(vaultPath);

  const validation = validateCorrectionOrAdjustmentRequest(request, {
    ...context,
    actor,
  });
  if (!validation.ok) {
    throw new Error(`Proposed correction or adjustment rejected: ${validation.errors.join(' ')}`);
  }

  const createdAt = actor.timestamp || nowIso();
  const record = {
    proposed_correction_adjustment_id: request.proposed_correction_adjustment_id ||
      `pca_${sha256Hex(canonicalize({ request, createdAt })).slice(0, 16)}`,
    request_type: request.request_type,
    target_entry_id: request.target_entry_id,
    source_proposed_journal_entry_id: request.source_proposed_journal_entry_id || request.target_entry_id,
    source_proposed_ledger_record_ids: request.source_proposed_ledger_record_ids || [],
    source_event_ids: request.source_event_ids || [],
    source_bundle_ids: request.source_bundle_ids || [],
    document_links: request.document_links || [],
    reason: request.reason,
    proposed_action: request.proposed_action || 'create_new_append_only_record',
    status: 'proposed',
    created_by: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
    created_at: createdAt,
    updated_at: createdAt,
    live_ledger_write: false,
  };

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: createdAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'proposed_correction_adjustment_created',
    target_type: 'proposed_correction_adjustment',
    target_id: record.proposed_correction_adjustment_id,
    reason: request.reason,
    metadata: {
      request_type: request.request_type,
      target_entry_id: request.target_entry_id,
      live_ledger_write: false,
    },
  });

  const finalRecord = {
    ...record,
    audit_event_id: auditEvent.audit_event_id,
  };
  appendJsonLine(proposedCorrectionsPath(vaultPath), finalRecord);

  return {
    proposed_correction_adjustment: finalRecord,
    audit_event: auditEvent,
    validation,
  };
}

export function listProposedJournalEntries(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let entries = readJsonLines(proposedJournalEntriesPath(vaultPath));

  if (filters.includeHistory !== true) {
    entries = latestById(entries, 'proposed_journal_entry_id');
  }

  for (const [field, value] of Object.entries(filters)) {
    if (field === 'includeHistory' || value === undefined || value === null || value === '') {
      continue;
    }
    if (field === 'risk_flag') {
      entries = entries.filter((entry) => (entry.risk_flags || []).includes(value));
    } else if (field === 'source_review_item_id') {
      entries = entries.filter((entry) => (entry.source_review_item_ids || []).includes(value));
    } else {
      entries = entries.filter((entry) => entry[field] === value);
    }
  }

  return entries;
}

export function markProposedJournalEntryDecision(vaultPathInput, entryIdInput, decision, actor = {}, reason = '') {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureJournalDirs(vaultPath);

  if (!ALLOWED_JOURNAL_DECISIONS.has(decision)) {
    throw new Error(`Invalid proposed journal entry decision: ${decision}.`);
  }
  if (!reason || typeof reason !== 'string') {
    throw new Error('Proposed journal entry decision reason is required.');
  }

  const entryId = safeFileId(entryIdInput, 'proposed_journal_entry_id');
  const existingEntries = listProposedJournalEntries(vaultPath, { includeHistory: true });
  const latest = latestById(existingEntries, 'proposed_journal_entry_id');
  const current = latest.find((entry) => entry.proposed_journal_entry_id === entryId);
  if (!current) {
    throw new Error(`Proposed journal entry not found: ${entryId}.`);
  }

  const decidedAt = actor.timestamp || nowIso();
  const updated = {
    ...current,
    previous_approval_status: current.approval_status,
    approval_status: decision,
    decision,
    decided_by: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
    decided_at: decidedAt,
    decision_reason: reason,
    updated_at: decidedAt,
  };

  appendJsonLine(proposedJournalEntriesPath(vaultPath), updated);

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: decidedAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'proposed_journal_entry_decision_marked',
    target_type: 'proposed_journal_entry',
    target_id: entryId,
    reason,
    metadata: {
      decision,
      live_ledger_write: false,
    },
  });

  return {
    decision,
    updated_entry: updated,
    audit_event: auditEvent,
  };
}

export function verifyNoOfficialLiveLedgerWrites(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const forbiddenPaths = [
    path.join(vaultPath, 'events', 'journal-entries.ndjson'),
    path.join(vaultPath, 'events', 'live-ledger.ndjson'),
    path.join(vaultPath, 'events', 'final-ledger.ndjson'),
    path.join(vaultPath, 'events', 'finance-transactions.ndjson'),
    path.join(vaultPath, 'events', 'balances.ndjson'),
    path.join(vaultPath, 'events', 'official-balances.ndjson'),
    path.join(vaultPath, 'ledger'),
    path.join(vaultPath, 'journal'),
    path.join(vaultPath, 'balances'),
    path.join(vaultPath, 'official-ledger'),
  ];

  const presentPaths = forbiddenPaths.filter((candidatePath) => fs.existsSync(candidatePath));

  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
    allowed_test_only_paths: [
      path.join(vaultPath, 'events', 'test-ledger-commits.ndjson'),
      path.join(vaultPath, 'events', 'proposed-corrections-adjustments.ndjson'),
      path.join(vaultPath, 'events', 'proposed-journal-entries.ndjson'),
    ],
  };
}
