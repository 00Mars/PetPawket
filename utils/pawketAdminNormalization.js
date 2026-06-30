import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import { verifyNoLiveLedgerWrites as verifyImportNoLiveLedgerWrites } from './pawketAdminImportState.js';

export const NORMALIZATION_VERSION = 'pawket-admin-normalization-v0';

const SUPPORTED_EVENT_TYPES = [
  'order.created',
  'payment.received',
  'refund.issued',
  'subscription.created',
  'subscription.cancelled',
  'pawket_packet.purchased',
  'pawket_pick.selected',
  'donation.created',
  'care_credit.planned',
  'charm_pledge.created',
  'story.submitted',
  'pawket_pal.created',
];

const ALLOWED_REVIEW_DECISIONS = new Set([
  'needs_mapping',
  'needs_documents',
  'ready_for_review',
  'approved_for_ledger_later',
  'rejected',
  'superseded',
]);

const DRAFT_MAPPINGS = Object.freeze({
  'order.created': {
    draft_types: ['sales_revenue', 'sales_tax_payable', 'charm_pledge_hint', 'care_credit_hint'],
    document_requirements: ['order_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'commerce_finance_review',
  },
  'payment.received': {
    draft_types: ['payment_received'],
    document_requirements: ['payment_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'payment_review',
  },
  'refund.issued': {
    draft_types: ['refund_reversal'],
    document_requirements: ['refund_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'refund_review',
    risk_flags: ['refund_reversal_needed'],
  },
  'subscription.created': {
    draft_types: ['subscription_created'],
    document_requirements: ['subscription_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'subscription_review',
  },
  'subscription.cancelled': {
    draft_types: ['subscription_cancelled'],
    document_requirements: ['subscription_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'subscription_review',
  },
  'pawket_packet.purchased': {
    draft_types: ['packet_revenue'],
    document_requirements: ['order_source_evidence'],
    assigned_role: 'bookkeeper',
    review_type: 'commerce_finance_review',
  },
  'pawket_pick.selected': {
    draft_types: ['pawket_pick_reward_cost'],
    document_requirements: ['order_source_evidence', 'reward_source_evidence'],
    assigned_role: 'finance_admin',
    review_type: 'rewards_review',
  },
  'donation.created': {
    draft_types: ['donation_received'],
    document_requirements: ['donor_source_evidence'],
    assigned_role: 'foundation_admin',
    review_type: 'mission_finance_review',
    risk_flags: ['donation_mapping_needed'],
  },
  'care_credit.planned': {
    draft_types: ['care_credit_liability_review'],
    document_requirements: ['care_credit_rule_source_evidence'],
    assigned_role: 'finance_admin',
    review_type: 'care_credit_review',
    risk_flags: ['care_credit_liability_review'],
  },
  'charm_pledge.created': {
    draft_types: ['donation_payable'],
    document_requirements: ['pledge_rule_source_evidence'],
    assigned_role: 'foundation_admin',
    review_type: 'mission_finance_review',
    risk_flags: ['donation_mapping_needed', 'restricted_fund_review'],
  },
  'story.submitted': {
    draft_types: ['story_impact_review'],
    document_requirements: ['consent_privacy_review_reference'],
    assigned_role: 'foundation_admin',
    review_type: 'impact_story_review',
    risk_flags: ['privacy_review_needed'],
  },
  'pawket_pal.created': {
    draft_types: ['pawket_pal_asset_review'],
    document_requirements: ['story_asset_heartcode_source_reference'],
    assigned_role: 'finance_admin',
    review_type: 'pawket_pal_value_review',
    risk_flags: ['privacy_review_needed'],
  },
});

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
    throw new Error('Pawket Admin normalization files must not be placed under public/.');
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

function draftRecordsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'draft-finance-records.ndjson');
}

function reviewQueuePath(vaultPath) {
  return path.join(vaultPath, 'events', 'review-queue.ndjson');
}

function ensureNormalizationDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'events'), { recursive: true });
}

function asNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function previewFor(stagedEvent) {
  if (isPlainObject(stagedEvent.normalized_preview)) {
    return stagedEvent.normalized_preview;
  }
  if (isPlainObject(stagedEvent.payload_preview)) {
    return stagedEvent.payload_preview;
  }
  if (isPlainObject(stagedEvent.payload)) {
    return stagedEvent.payload;
  }
  return {};
}

function amountSummary(stagedEvent) {
  const preview = previewFor(stagedEvent);
  const grossAmount = asNumber(preview.gross_amount ?? preview.amount ?? preview.net_amount, 0);
  const discountAmount = asNumber(preview.discount_amount, 0);
  const taxAmount = asNumber(preview.tax_amount, 0);
  const feeAmount = asNumber(preview.fee_amount, 0);
  const netAmount = asNumber(preview.net_amount, grossAmount - discountAmount - feeAmount);

  return {
    preview,
    gross_amount: grossAmount,
    discount_amount: discountAmount,
    tax_amount: taxAmount,
    fee_amount: feeAmount,
    net_amount: netAmount,
    currency: preview.currency || 'USD',
  };
}

function baseDraft(stagedEvent, draftType, options, overrides = {}) {
  const mapping = DRAFT_MAPPINGS[stagedEvent.event_type];
  const createdAt = options.created_at || nowIso();
  const safeStagedId = safeFileId(stagedEvent.staged_event_id, 'staged_event_id');
  const sequence = String(options.sequence ?? 1).padStart(2, '0');
  const amounts = amountSummary(stagedEvent);
  const preview = amounts.preview;
  const documentRequirements = unique(overrides.document_requirements || mapping.document_requirements);
  const riskFlags = unique([...(mapping.risk_flags || []), ...(overrides.risk_flags || [])]);

  return {
    draft_record_id: overrides.draft_record_id || `draft_${safeStagedId}_${safeFileId(draftType, 'draft_type')}_${sequence}`,
    staged_event_id: stagedEvent.staged_event_id,
    source_bundle_id: stagedEvent.source_bundle_id,
    source_event_id: stagedEvent.source_event_id,
    connector_id: stagedEvent.connector_id,
    idempotency_key: stagedEvent.idempotency_key,
    draft_type: draftType,
    entity_id: options.entity_id || preview.entity_id || 'ent_petpawket',
    fund_id: overrides.fund_id || options.fund_id || preview.fund_id || 'fund_operating',
    class_id: overrides.class_id || options.class_id || preview.class_id || 'class_unmapped',
    account_hint: overrides.account_hint || '',
    category_hint: overrides.category_hint || '',
    subcategory_hint: overrides.subcategory_hint || '',
    gross_amount: overrides.gross_amount ?? amounts.gross_amount,
    discount_amount: overrides.discount_amount ?? amounts.discount_amount,
    tax_amount: overrides.tax_amount ?? amounts.tax_amount,
    fee_amount: overrides.fee_amount ?? amounts.fee_amount,
    net_amount: overrides.net_amount ?? amounts.net_amount,
    currency: overrides.currency || amounts.currency,
    customer_ref: preview.customer_ref || preview.customer_id || null,
    vendor_ref: preview.vendor_ref || preview.vendor_id || null,
    order_ref: preview.order_ref || preview.order_id || stagedEvent.source_record_id || null,
    product_refs: Array.isArray(preview.product_refs) ? preview.product_refs : [],
    calculation_rule_hint: overrides.calculation_rule_hint || '',
    document_requirements: documentRequirements,
    confidence_score: overrides.confidence_score ?? mapping.confidence_score ?? 0.72,
    review_status: overrides.review_status || 'unreviewed',
    risk_flags: riskFlags,
    warnings: unique(overrides.warnings || []),
    rejection_reason: null,
    created_at: createdAt,
    updated_at: createdAt,
    normalization_version: NORMALIZATION_VERSION,
  };
}

function requireStagedEvent(stagedEvent) {
  if (!isPlainObject(stagedEvent)) {
    throw new Error('Staged source event must be an object.');
  }

  for (const field of ['staged_event_id', 'source_bundle_id', 'source_event_id', 'connector_id', 'event_type', 'idempotency_key']) {
    if (!stagedEvent[field] || typeof stagedEvent[field] !== 'string') {
      throw new Error(`Staged source event ${field} is required.`);
    }
  }

  if (!DRAFT_MAPPINGS[stagedEvent.event_type]) {
    throw new Error(`Unsupported staged event type for normalization: ${stagedEvent.event_type}.`);
  }
}

function buildOrderDrafts(stagedEvent, options) {
  const amounts = amountSummary(stagedEvent);
  const preview = amounts.preview;
  const drafts = [
    baseDraft(stagedEvent, 'sales_revenue', { ...options, sequence: 1 }, {
      account_hint: 'revenue:sales',
      category_hint: preview.category_hint || 'commerce_revenue',
      subcategory_hint: preview.subcategory_hint || 'product_sales',
      tax_amount: 0,
      calculation_rule_hint: 'net_product_sales',
      confidence_score: 0.78,
      risk_flags: amounts.tax_amount > 0 ? ['tax_mapping_needed'] : [],
    }),
  ];

  if (amounts.tax_amount > 0) {
    drafts.push(baseDraft(stagedEvent, 'sales_tax_payable', { ...options, sequence: drafts.length + 1 }, {
      account_hint: 'liability:sales_tax_payable',
      category_hint: 'tax_liability',
      subcategory_hint: 'sales_tax_collected',
      gross_amount: amounts.tax_amount,
      discount_amount: 0,
      tax_amount: amounts.tax_amount,
      fee_amount: 0,
      net_amount: amounts.tax_amount,
      calculation_rule_hint: 'tax_collected',
      confidence_score: 0.66,
      risk_flags: ['tax_mapping_needed'],
    }));
  }

  const pledgeAmount = asNumber(preview.charm_pledge_amount ?? preview.donation_pledge_amount, 0);
  if (pledgeAmount > 0) {
    drafts.push(baseDraft(stagedEvent, 'charm_pledge_hint', { ...options, sequence: drafts.length + 1 }, {
      account_hint: 'liability:donation_payable_review',
      category_hint: 'mission_pledge_review',
      subcategory_hint: 'charm_pledge_hint',
      gross_amount: pledgeAmount,
      discount_amount: 0,
      tax_amount: 0,
      fee_amount: 0,
      net_amount: pledgeAmount,
      calculation_rule_hint: 'CHARM pledge review required',
      document_requirements: ['order_source_evidence', 'pledge_rule_source_evidence'],
      confidence_score: 0.52,
      risk_flags: ['donation_mapping_needed', 'restricted_fund_review'],
    }));
  }

  const careCreditAmount = asNumber(preview.care_credit_planned_amount, 0);
  if (careCreditAmount > 0) {
    drafts.push(baseDraft(stagedEvent, 'care_credit_hint', { ...options, sequence: drafts.length + 1 }, {
      account_hint: 'liability:care_credit_review',
      category_hint: 'rewards_liability_review',
      subcategory_hint: 'care_credit_planned',
      gross_amount: careCreditAmount,
      discount_amount: 0,
      tax_amount: 0,
      fee_amount: 0,
      net_amount: careCreditAmount,
      calculation_rule_hint: 'Care Credit rule review required',
      document_requirements: ['order_source_evidence', 'care_credit_rule_source_evidence'],
      confidence_score: 0.5,
      risk_flags: ['care_credit_liability_review'],
    }));
  }

  return drafts;
}

function buildSingleDraft(stagedEvent, draftType, options, overrides = {}) {
  return [baseDraft(stagedEvent, draftType, { ...options, sequence: 1 }, overrides)];
}

export function getSupportedDraftMappings() {
  return Object.fromEntries(
    SUPPORTED_EVENT_TYPES.map((eventType) => [eventType, {
      ...DRAFT_MAPPINGS[eventType],
      draft_types: [...DRAFT_MAPPINGS[eventType].draft_types],
      document_requirements: [...DRAFT_MAPPINGS[eventType].document_requirements],
      risk_flags: [...(DRAFT_MAPPINGS[eventType].risk_flags || [])],
    }])
  );
}

export function normalizeStagedEventToDraftRecords(stagedEvent, options = {}) {
  requireStagedEvent(stagedEvent);

  const amounts = amountSummary(stagedEvent);
  const preview = amounts.preview;

  switch (stagedEvent.event_type) {
    case 'order.created':
      return buildOrderDrafts(stagedEvent, options);
    case 'payment.received':
      return buildSingleDraft(stagedEvent, 'payment_received', options, {
        account_hint: 'asset:cash_or_receivable',
        category_hint: 'payment',
        subcategory_hint: preview.payment_method || 'payment_received',
        calculation_rule_hint: 'payment_source_reconciliation',
        confidence_score: 0.74,
      });
    case 'refund.issued':
      return buildSingleDraft(stagedEvent, 'refund_reversal', options, {
        account_hint: 'contra_revenue:refunds',
        category_hint: 'refund',
        subcategory_hint: 'refund_reversal_review',
        gross_amount: asNumber(preview.refund_amount ?? preview.amount, amounts.gross_amount),
        net_amount: asNumber(preview.refund_amount ?? preview.amount, amounts.net_amount),
        calculation_rule_hint: 'refunds',
        confidence_score: 0.68,
        risk_flags: ['refund_reversal_needed', amounts.gross_amount === 0 ? 'amount_mismatch' : null],
        warnings: ['Review reward, donation, Care Credit, tax, and inventory reversals before ledger approval.'],
      });
    case 'donation.created':
      return buildSingleDraft(stagedEvent, 'donation_received', options, {
        account_hint: 'income:donations_review',
        category_hint: 'mission_donation',
        subcategory_hint: preview.restriction || 'unrestricted_or_pending_review',
        fund_id: preview.fund_id || 'fund_mission_review',
        calculation_rule_hint: 'donation_received_review',
        confidence_score: 0.62,
        risk_flags: ['donation_mapping_needed'],
        warnings: ['Review donor acknowledgment requirements before reporting.'],
      });
    case 'care_credit.planned':
      return buildSingleDraft(stagedEvent, 'care_credit_liability_review', options, {
        account_hint: 'liability:care_credit_review',
        category_hint: 'rewards_liability_review',
        subcategory_hint: 'care_credit_planned',
        calculation_rule_hint: 'Care Credit liability review required',
        confidence_score: 0.48,
        risk_flags: ['care_credit_liability_review'],
      });
    case 'charm_pledge.created':
      return buildSingleDraft(stagedEvent, 'donation_payable', options, {
        account_hint: 'liability:donation_payable_review',
        category_hint: 'mission_pledge_review',
        subcategory_hint: 'charm_pledge',
        fund_id: preview.fund_id || 'fund_charm_review',
        calculation_rule_hint: 'CHARM pledge rule review required',
        confidence_score: 0.5,
        risk_flags: ['donation_mapping_needed', 'restricted_fund_review'],
      });
    case 'pawket_packet.purchased':
      return buildSingleDraft(stagedEvent, 'packet_revenue', options, {
        account_hint: 'revenue:pawket_packets',
        category_hint: 'commerce_revenue',
        subcategory_hint: 'pawket_packet',
        calculation_rule_hint: 'Pawket Packet revenue review',
        confidence_score: 0.74,
      });
    case 'pawket_pick.selected':
      return buildSingleDraft(stagedEvent, 'pawket_pick_reward_cost', options, {
        account_hint: 'expense:reward_cost_review',
        category_hint: 'reward_cost_review',
        subcategory_hint: 'pawket_pick',
        calculation_rule_hint: 'Pawket Pick cost review',
        confidence_score: 0.55,
      });
    case 'subscription.created':
      return buildSingleDraft(stagedEvent, 'subscription_created', options, {
        account_hint: 'revenue:subscription_review',
        category_hint: 'subscription',
        subcategory_hint: 'subscription_created',
        calculation_rule_hint: 'subscription_conversion_review',
        confidence_score: 0.7,
      });
    case 'subscription.cancelled':
      return buildSingleDraft(stagedEvent, 'subscription_cancelled', options, {
        account_hint: 'metric:subscription_churn_review',
        category_hint: 'subscription',
        subcategory_hint: 'subscription_cancelled',
        gross_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        fee_amount: 0,
        net_amount: 0,
        calculation_rule_hint: 'churn_review',
        confidence_score: 0.7,
      });
    case 'story.submitted':
      return buildSingleDraft(stagedEvent, 'story_impact_review', options, {
        account_hint: 'non_financial:story_review',
        category_hint: 'impact_story_review',
        subcategory_hint: 'consent_privacy_review',
        gross_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        fee_amount: 0,
        net_amount: 0,
        calculation_rule_hint: 'privacy and consent review required',
        confidence_score: 0.58,
        risk_flags: ['privacy_review_needed'],
      });
    case 'pawket_pal.created':
      return buildSingleDraft(stagedEvent, 'pawket_pal_asset_review', options, {
        account_hint: 'asset_or_ip_review:pawket_pal',
        category_hint: 'pawket_pal_value_review',
        subcategory_hint: preview.pal_class || 'pal_created',
        gross_amount: 0,
        discount_amount: 0,
        tax_amount: 0,
        fee_amount: 0,
        net_amount: 0,
        calculation_rule_hint: 'Pawket Pal value review required',
        confidence_score: 0.5,
        risk_flags: ['privacy_review_needed'],
      });
    default:
      throw new Error(`Unsupported staged event type for normalization: ${stagedEvent.event_type}.`);
  }
}

function inferReviewType(draftRecords) {
  const draftTypes = new Set(draftRecords.map((record) => record.draft_type));
  const riskFlags = new Set(draftRecords.flatMap((record) => record.risk_flags || []));

  if (riskFlags.has('care_credit_liability_review')) {
    return 'care_credit_review';
  }
  if (riskFlags.has('restricted_fund_review') || draftTypes.has('donation_received') || draftTypes.has('donation_payable')) {
    return 'mission_finance_review';
  }
  if (draftTypes.has('refund_reversal')) {
    return 'refund_review';
  }
  if (riskFlags.has('privacy_review_needed')) {
    return 'impact_story_review';
  }
  if (draftTypes.has('payment_received')) {
    return 'payment_review';
  }
  if (draftTypes.has('pawket_pick_reward_cost')) {
    return 'rewards_review';
  }
  return 'commerce_finance_review';
}

function inferAssignedRole(reviewType) {
  if (reviewType === 'mission_finance_review' || reviewType === 'impact_story_review') {
    return 'foundation_admin';
  }
  if (reviewType === 'care_credit_review' || reviewType === 'rewards_review') {
    return 'finance_admin';
  }
  return 'bookkeeper';
}

function latestById(records, idField) {
  const latest = new Map();
  for (const record of records) {
    latest.set(record[idField], record);
  }
  return [...latest.values()];
}

export function createReviewQueueItem(draftRecords, options = {}) {
  if (!Array.isArray(draftRecords) || draftRecords.length === 0) {
    throw new Error('At least one draft finance record is required.');
  }

  for (const [index, record] of draftRecords.entries()) {
    if (!isPlainObject(record) || !record.draft_record_id) {
      throw new Error(`draftRecords[${index}].draft_record_id is required.`);
    }
  }

  const createdAt = options.created_at || nowIso();
  const requiredDocuments = unique(draftRecords.flatMap((record) => record.document_requirements || []));
  const availableDocuments = new Set(options.availableDocuments || options.available_documents || []);
  const missingDocuments = requiredDocuments.filter((documentType) => !availableDocuments.has(documentType));
  const riskFlags = unique([
    ...draftRecords.flatMap((record) => record.risk_flags || []),
    ...(missingDocuments.length ? ['missing_document'] : []),
  ]);
  const warnings = unique([
    ...draftRecords.flatMap((record) => record.warnings || []),
    ...(missingDocuments.length ? ['Required source documents are missing.'] : []),
  ]);
  const reviewType = options.review_type || inferReviewType(draftRecords);
  const lowConfidence = draftRecords.some((record) => asNumber(record.confidence_score, 0) < 0.55);
  const reviewStatus = options.review_status || (
    missingDocuments.length
      ? 'needs_documents'
      : lowConfidence
        ? 'needs_mapping'
        : 'ready_for_review'
  );
  const draftIds = draftRecords.map((record) => record.draft_record_id).sort();

  return {
    review_item_id: options.review_item_id || `review_${sha256Hex(draftIds.join('|')).slice(0, 16)}`,
    draft_record_ids: draftIds,
    source_event_ids: unique(draftRecords.map((record) => record.source_event_id)),
    review_type: reviewType,
    review_status: reviewStatus,
    assigned_role: options.assigned_role || inferAssignedRole(reviewType),
    required_documents: requiredDocuments,
    missing_documents: missingDocuments,
    warnings,
    risk_flags: riskFlags,
    reviewer_notes: options.reviewer_notes || '',
    decision: options.decision || null,
    decided_by: options.decided_by || null,
    decided_at: options.decided_at || null,
    audit_event_id: options.audit_event_id || null,
    created_at: createdAt,
    updated_at: createdAt,
    normalization_version: NORMALIZATION_VERSION,
  };
}

export function writeDraftFinanceRecords(vaultPathInput, draftRecords, options = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureNormalizationDirs(vaultPath);

  if (!Array.isArray(draftRecords) || draftRecords.length === 0) {
    throw new Error('At least one draft finance record is required.');
  }

  for (const [index, record] of draftRecords.entries()) {
    if (!isPlainObject(record) || !record.draft_record_id) {
      throw new Error(`draftRecords[${index}].draft_record_id is required.`);
    }
    appendJsonLine(draftRecordsPath(vaultPath), record);
  }

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: options.timestamp || nowIso(),
    actor_id: options.actor?.actor_id || options.actor_id || 'system',
    role: options.actor?.role || options.role || 'system',
    action: 'draft_finance_records_written',
    target_type: 'draft_finance_records',
    target_id: options.target_id || draftRecords[0].source_bundle_id || 'draft_batch',
    reason: options.reason || 'Draft finance records written from staged source events; no live ledger write.',
    metadata: {
      draft_record_count: draftRecords.length,
      draft_record_ids: draftRecords.map((record) => record.draft_record_id),
      source_event_ids: unique(draftRecords.map((record) => record.source_event_id)),
      live_ledger_write: false,
    },
  });

  return {
    draft_record_count: draftRecords.length,
    draft_records: draftRecords,
    audit_event: auditEvent,
  };
}

export function writeReviewQueueItem(vaultPathInput, reviewItem, options = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureNormalizationDirs(vaultPath);

  if (!isPlainObject(reviewItem) || !reviewItem.review_item_id) {
    throw new Error('Review queue item review_item_id is required.');
  }

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: options.timestamp || nowIso(),
    actor_id: options.actor?.actor_id || options.actor_id || 'system',
    role: options.actor?.role || options.role || 'system',
    action: 'review_queue_item_written',
    target_type: 'review_queue_item',
    target_id: reviewItem.review_item_id,
    reason: options.reason || 'Review queue item written for draft finance records; no live ledger write.',
    metadata: {
      review_status: reviewItem.review_status,
      review_type: reviewItem.review_type,
      draft_record_count: reviewItem.draft_record_ids?.length || 0,
      risk_flags: reviewItem.risk_flags || [],
      live_ledger_write: false,
    },
  });

  const record = {
    ...reviewItem,
    audit_event_id: auditEvent.audit_event_id,
    updated_at: reviewItem.updated_at || auditEvent.timestamp,
  };
  appendJsonLine(reviewQueuePath(vaultPath), record);

  return record;
}

export function listDraftFinanceRecords(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let records = readJsonLines(draftRecordsPath(vaultPath));

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (field === 'risk_flag') {
      records = records.filter((record) => (record.risk_flags || []).includes(value));
    } else {
      records = records.filter((record) => record[field] === value);
    }
  }

  return records;
}

export function listReviewQueueItems(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let records = readJsonLines(reviewQueuePath(vaultPath));

  if (filters.includeHistory !== true) {
    records = latestById(records, 'review_item_id');
  }

  for (const [field, value] of Object.entries(filters)) {
    if (field === 'includeHistory' || value === undefined || value === null || value === '') {
      continue;
    }

    if (field === 'risk_flag') {
      records = records.filter((record) => (record.risk_flags || []).includes(value));
    } else {
      records = records.filter((record) => record[field] === value);
    }
  }

  return records;
}

export function markReviewItemDecision(vaultPathInput, reviewItemIdInput, decision, actor = {}, reason = '') {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureNormalizationDirs(vaultPath);

  const reviewItemId = safeFileId(reviewItemIdInput, 'reviewItemId');
  if (!ALLOWED_REVIEW_DECISIONS.has(decision)) {
    throw new Error(`Invalid review decision: ${decision}.`);
  }
  if (!reason || typeof reason !== 'string') {
    throw new Error('Review decision reason is required.');
  }

  const existingItems = listReviewQueueItems(vaultPath, { includeHistory: true });
  const current = [...existingItems].reverse().find((item) => item.review_item_id === reviewItemIdInput);
  if (!current) {
    throw new Error(`Review queue item not found: ${reviewItemIdInput}.`);
  }

  const decidedAt = actor.timestamp || nowIso();
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: decidedAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'review_queue_item_decision_marked',
    target_type: 'review_queue_item',
    target_id: reviewItemIdInput,
    reason,
    metadata: {
      previous_review_status: current.review_status,
      decision,
      live_ledger_write: false,
    },
  });

  const updated = {
    ...current,
    review_status: decision,
    previous_review_status: current.review_status,
    decision,
    decided_by: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
    decided_at: decidedAt,
    reviewer_notes: actor.reviewer_notes || current.reviewer_notes || '',
    decision_reason: reason,
    audit_event_id: auditEvent.audit_event_id,
    updated_at: decidedAt,
    decision_history_ref: reviewItemId,
  };

  appendJsonLine(reviewQueuePath(vaultPath), updated);
  return updated;
}

export function verifyNoLiveLedgerWrites(vaultPathInput) {
  const result = verifyImportNoLiveLedgerWrites(vaultPathInput);
  return {
    ok: result.ok,
    present_paths: result.present_paths,
  };
}
