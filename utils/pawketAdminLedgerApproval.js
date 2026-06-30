import fs from 'node:fs';
import path from 'node:path';
import { sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import { verifyNoLiveLedgerWrites as verifyImportNoLiveLedgerWrites } from './pawketAdminImportState.js';

export const LEDGER_APPROVAL_VERSION = 'pawket-admin-ledger-approval-v0';

const ALLOWED_PROPOSED_DECISIONS = new Set([
  'needs_revision',
  'approved_for_future_commit',
  'rejected',
  'superseded',
]);

const REQUIRED_BASELINE_ACCOUNTS = [
  'asset_cash',
  'asset_payment_processor_receivable',
  'asset_inventory',
  'asset_prepaid_expenses',
  'liability_sales_tax_payable',
  'liability_charm_donation_payable',
  'liability_cherish_donation_payable',
  'liability_pawket_care_credit',
  'liability_gift_card_store_credit',
  'liability_accounts_payable',
  'liability_credit_card_payable',
  'liability_deferred_subscription_revenue',
  'equity_owner_contributions',
  'equity_owner_draws',
  'equity_retained_earnings',
  'income_product_sales',
  'income_pawket_pack_revenue',
  'income_pawket_packet_revenue',
  'income_pawket_pal_revenue',
  'income_digital_product_revenue',
  'income_affiliate_referral',
  'income_sponsorship',
  'income_donation_foundation',
  'income_grant_foundation',
  'cogs_product',
  'cogs_pawket_pack',
  'cogs_pawket_packet',
  'cogs_packaging',
  'cogs_inbound_freight',
  'cogs_fulfillment_materials',
  'cogs_pawket_pick',
  'expense_shipping',
  'expense_payment_processing_fees',
  'expense_advertising_marketing',
  'expense_software_hosting',
  'expense_contractors',
  'expense_legal',
  'expense_accounting',
  'expense_design_illustration',
  'expense_insurance',
  'expense_office_admin',
  'expense_bank_fees',
  'expense_refund_chargeback_losses',
  'program_charm_emergency_assistance',
  'program_charm_rescue_medicine',
  'program_charm_shelter_support',
  'program_cherish_youth_programs',
  'program_cherish_family_support',
  'program_memorial_costs',
];

function account(account_id, account_name, account_type, normal_balance, options = {}) {
  return {
    account_id,
    account_name,
    account_type,
    normal_balance,
    active: options.active !== false,
    optional_future: options.optional_future === true,
  };
}

const BASELINE_CHART_OF_ACCOUNTS = Object.freeze([
  account('asset_cash', 'Cash', 'asset', 'debit'),
  account('asset_payment_processor_receivable', 'Payment Processor Receivable', 'asset', 'debit'),
  account('asset_inventory', 'Inventory', 'asset', 'debit'),
  account('asset_prepaid_expenses', 'Prepaid Expenses', 'asset', 'debit'),
  account('asset_document_vault_assets', 'Document Vault Assets', 'asset', 'debit', { optional_future: true }),
  account('asset_pawket_pal_digital_assets', 'Pawket Pal Digital Assets', 'asset', 'debit', { optional_future: true }),

  account('liability_sales_tax_payable', 'Sales Tax Payable', 'liability', 'credit'),
  account('liability_charm_donation_payable', 'CHARM Donation Payable', 'liability', 'credit'),
  account('liability_cherish_donation_payable', 'CHERISH Donation Payable', 'liability', 'credit'),
  account('liability_pawket_care_credit', 'Pawket Care Credit Liability', 'liability', 'credit'),
  account('liability_gift_card_store_credit', 'Gift Card / Store Credit Liability', 'liability', 'credit'),
  account('liability_accounts_payable', 'Accounts Payable', 'liability', 'credit'),
  account('liability_credit_card_payable', 'Credit Card Payable', 'liability', 'credit'),
  account('liability_deferred_subscription_revenue', 'Deferred Subscription Revenue', 'liability', 'credit'),

  account('equity_owner_contributions', 'Owner Contributions', 'equity', 'credit'),
  account('equity_owner_draws', 'Owner Draws', 'equity', 'debit'),
  account('equity_retained_earnings', 'Retained Earnings', 'equity', 'credit'),

  account('income_product_sales', 'Product Sales', 'income', 'credit'),
  account('income_pawket_pack_revenue', 'Pawket Pack Revenue', 'income', 'credit'),
  account('income_pawket_packet_revenue', 'Pawket Packet Revenue', 'income', 'credit'),
  account('income_pawket_pal_revenue', 'Pawket Pal Revenue', 'income', 'credit'),
  account('income_digital_product_revenue', 'Digital Product Revenue', 'income', 'credit'),
  account('income_affiliate_referral', 'Affiliate / Referral Income', 'income', 'credit'),
  account('income_sponsorship', 'Sponsorship Income', 'income', 'credit'),
  account('income_donation_foundation', 'Donation Income, Foundation Entities Only', 'income', 'credit'),
  account('income_grant_foundation', 'Grant Income, Foundation Entities Only', 'income', 'credit'),

  account('cogs_product', 'Product COGS', 'cogs', 'debit'),
  account('cogs_pawket_pack', 'Pawket Pack COGS', 'cogs', 'debit'),
  account('cogs_pawket_packet', 'Pawket Packet COGS', 'cogs', 'debit'),
  account('cogs_packaging', 'Packaging', 'cogs', 'debit'),
  account('cogs_inbound_freight', 'Inbound Freight', 'cogs', 'debit'),
  account('cogs_fulfillment_materials', 'Fulfillment Materials', 'cogs', 'debit'),
  account('cogs_pawket_pick', 'Pawket Pick Cost', 'cogs', 'debit'),

  account('expense_shipping', 'Shipping Expense', 'expense', 'debit'),
  account('expense_payment_processing_fees', 'Payment Processing Fees', 'expense', 'debit'),
  account('expense_advertising_marketing', 'Advertising / Marketing', 'expense', 'debit'),
  account('expense_software_hosting', 'Software / Hosting', 'expense', 'debit'),
  account('expense_contractors', 'Contractors', 'expense', 'debit'),
  account('expense_legal', 'Legal', 'expense', 'debit'),
  account('expense_accounting', 'Accounting', 'expense', 'debit'),
  account('expense_design_illustration', 'Design / Illustration', 'expense', 'debit'),
  account('expense_insurance', 'Insurance', 'expense', 'debit'),
  account('expense_office_admin', 'Office / Admin', 'expense', 'debit'),
  account('expense_bank_fees', 'Bank Fees', 'expense', 'debit'),
  account('expense_refund_chargeback_losses', 'Refund / Chargeback Losses', 'expense', 'debit'),
  account('expense_care_credit_issuance', 'Care Credit Issuance Expense', 'expense', 'debit'),

  account('program_charm_emergency_assistance', 'CHARM Emergency Assistance', 'program_expense', 'debit'),
  account('program_charm_rescue_medicine', 'CHARM Rescue Medicine', 'program_expense', 'debit'),
  account('program_charm_shelter_support', 'CHARM Shelter Support', 'program_expense', 'debit'),
  account('program_cherish_youth_programs', 'CHERISH Youth Programs', 'program_expense', 'debit'),
  account('program_cherish_family_support', 'CHERISH Family Support', 'program_expense', 'debit'),
  account('program_memorial_costs', 'Memorial Program Costs', 'program_expense', 'debit'),
]);

const DOCUMENT_COVERAGE_RULES = Object.freeze({
  sales_revenue: {
    required_documents: ['order_source_evidence'],
    preferred_documents: ['payment_source_evidence'],
    warnings: ['Payment source evidence is preferred before final revenue recognition policy is chosen.'],
  },
  packet_revenue: {
    required_documents: ['order_source_evidence'],
    preferred_documents: ['payment_source_evidence'],
  },
  subscription_created: {
    required_documents: ['subscription_source_evidence'],
    preferred_documents: ['payment_source_evidence'],
  },
  payment_received: {
    required_documents: ['payment_source_evidence'],
    preferred_documents: [],
  },
  refund_reversal: {
    required_documents: ['refund_source_evidence'],
    preferred_documents: ['original_order_reference'],
    risk_flags: ['refund_reversal_needed'],
    warnings: ['Reward, donation, Care Credit, tax, and inventory reversals must be reviewed.'],
  },
  donation_received: {
    required_documents: ['donor_source_evidence'],
    preferred_documents: ['donor_acknowledgment_review'],
    risk_flags: ['donation_mapping_needed'],
  },
  donation_payable: {
    required_documents: ['pledge_rule_source_evidence'],
    preferred_documents: ['source_order_or_campaign'],
    risk_flags: ['restricted_fund_review'],
  },
  charm_pledge_hint: {
    required_documents: ['pledge_rule_source_evidence', 'order_source_evidence'],
    preferred_documents: ['transfer_status_reference'],
    risk_flags: ['restricted_fund_review'],
  },
  care_credit_hint: {
    required_documents: ['care_credit_rule_source_evidence'],
    preferred_documents: ['customer_account_reference'],
    risk_flags: ['care_credit_liability_review'],
  },
  care_credit_liability_review: {
    required_documents: ['care_credit_rule_source_evidence'],
    preferred_documents: ['customer_account_reference'],
    risk_flags: ['care_credit_liability_review'],
  },
  pawket_pick_reward_cost: {
    required_documents: ['order_source_evidence', 'reward_source_evidence'],
    preferred_documents: ['inventory_source_evidence'],
  },
  story_impact_review: {
    required_documents: ['consent_privacy_review_reference'],
    preferred_documents: [],
    risk_flags: ['privacy_review_needed'],
  },
  pawket_pal_asset_review: {
    required_documents: ['story_asset_heartcode_source_reference'],
    preferred_documents: ['ip_rights_review_reference'],
    risk_flags: ['privacy_review_needed'],
  },
  expense_future: {
    required_documents: ['receipt_or_invoice'],
    preferred_documents: [],
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
    throw new Error('Pawket Admin ledger approval files must not be placed under public/.');
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

function proposedLedgerRecordsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'proposed-ledger-records.ndjson');
}

function ensureLedgerApprovalDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'events'), { recursive: true });
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

function documentTypeFromRef(ref) {
  if (typeof ref === 'string') {
    return ref;
  }
  if (isPlainObject(ref)) {
    return ref.document_type || ref.type || ref.requirement || ref.document_id;
  }
  return null;
}

function isFoundationEntity(entityId, options = {}) {
  const foundationIds = new Set(options.foundationEntityIds || ['ent_charm_foundation', 'ent_cherish_foundation']);
  return foundationIds.has(entityId) || /foundation|charm|cherish/i.test(String(entityId || ''));
}

function accountById(accounts) {
  return new Map(accounts.map((candidate) => [candidate.account_id, candidate]));
}

function accountIdForDraft(draft, side, options = {}) {
  const accountMappings = options.accountMappings || {};
  const mapped = accountMappings[draft.draft_record_id] || accountMappings[draft.draft_type];
  if (typeof mapped === 'string') {
    return mapped;
  }
  if (isPlainObject(mapped) && mapped[side]) {
    return mapped[side];
  }

  switch (draft.draft_type) {
    case 'sales_revenue':
      return side === 'debit' ? 'asset_payment_processor_receivable' : 'income_product_sales';
    case 'packet_revenue':
      return side === 'debit' ? 'asset_payment_processor_receivable' : 'income_pawket_packet_revenue';
    case 'subscription_created':
      return side === 'debit' ? 'asset_payment_processor_receivable' : 'liability_deferred_subscription_revenue';
    case 'sales_tax_payable':
      return side === 'debit' ? 'asset_payment_processor_receivable' : 'liability_sales_tax_payable';
    case 'payment_received':
      return side === 'debit' ? 'asset_cash' : 'asset_payment_processor_receivable';
    case 'refund_reversal':
      return side === 'debit' ? 'expense_refund_chargeback_losses' : 'asset_payment_processor_receivable';
    case 'donation_received':
      if (isFoundationEntity(draft.entity_id, options)) {
        return side === 'debit' ? 'asset_cash' : 'income_donation_foundation';
      }
      return side === 'debit' ? 'asset_cash' : 'liability_charm_donation_payable';
    case 'donation_payable':
    case 'charm_pledge_hint':
      return side === 'debit' ? 'program_charm_emergency_assistance' : 'liability_charm_donation_payable';
    case 'care_credit_liability_review':
    case 'care_credit_hint':
      return side === 'debit' ? 'expense_care_credit_issuance' : 'liability_pawket_care_credit';
    case 'pawket_pick_reward_cost':
      return side === 'debit' ? 'cogs_pawket_pick' : 'asset_inventory';
    default:
      return '';
  }
}

function isNonFinancialDraft(draft) {
  return ['story_impact_review', 'pawket_pal_asset_review', 'subscription_cancelled'].includes(draft.draft_type);
}

function amountForDraft(draft) {
  return roundMoney(draft.net_amount ?? draft.gross_amount ?? 0);
}

function requireDraftRecords(draftRecords) {
  if (!Array.isArray(draftRecords) || draftRecords.length === 0) {
    throw new Error('At least one draft finance record is required.');
  }

  for (const [index, draft] of draftRecords.entries()) {
    if (!isPlainObject(draft) || !draft.draft_record_id) {
      throw new Error(`draftRecords[${index}].draft_record_id is required.`);
    }
  }
}

function proposedLine(draft, line, options, sequence) {
  const chart = accountById(options.chartOfAccounts || getBaselineChartOfAccounts());
  const account = chart.get(line.account_id) || {
    account_id: line.account_id,
    account_name: line.account_id,
    account_type: 'unmapped',
  };
  const createdAt = options.created_at || nowIso();
  const sourceReviewItemId = options.source_review_item_id || options.review_item_id || 'review_unassigned';
  const draftId = safeFileId(draft.draft_record_id, 'draft_record_id');
  const lineId = safeFileId(line.line_key, 'line_key');

  return {
    proposed_ledger_record_id: `proposed_${safeFileId(sourceReviewItemId, 'source_review_item_id')}_${draftId}_${lineId}_${String(sequence).padStart(2, '0')}`,
    source_draft_record_ids: [draft.draft_record_id],
    source_review_item_id: sourceReviewItemId,
    source_bundle_ids: unique([draft.source_bundle_id]),
    source_event_ids: unique([draft.source_event_id]),
    entity_id: options.entity_id || draft.entity_id,
    fund_id: options.fund_id || draft.fund_id,
    class_id: options.class_id || draft.class_id,
    account_id: line.account_id,
    account_type: account.account_type,
    debit_amount: roundMoney(line.debit_amount || 0),
    credit_amount: roundMoney(line.credit_amount || 0),
    currency: draft.currency || options.currency || 'USD',
    description: line.description,
    transaction_date: options.transaction_date || draft.transaction_date || draft.created_at || createdAt,
    effective_period: options.effective_period || 'period_unassigned',
    document_links: options.documentLinks || options.document_links || [],
    calculation_rule_id: options.calculationRuleRefs?.[draft.draft_record_id] ||
      options.calculationRuleRefs?.[draft.draft_type] ||
      draft.calculation_rule_id ||
      draft.calculation_rule_hint ||
      '',
    approval_status: 'proposed',
    approval_role_required: options.approval_role_required || options.approvalRole || 'finance_admin',
    risk_flags: unique([...(draft.risk_flags || []), ...(line.risk_flags || [])]),
    is_non_financial: line.is_non_financial === true,
    created_at: createdAt,
    updated_at: createdAt,
    ledger_approval_version: LEDGER_APPROVAL_VERSION,
  };
}

function financialLinesForDraft(draft, options) {
  const amount = amountForDraft(draft);
  if (amount <= 0 || isNonFinancialDraft(draft)) {
    return [{
      account_id: 'non_financial_review',
      debit_amount: 0,
      credit_amount: 0,
      line_key: 'non_financial_review',
      description: `${draft.draft_type} non-financial proposed review record`,
      is_non_financial: true,
      risk_flags: draft.risk_flags || [],
    }];
  }

  const debitAccount = accountIdForDraft(draft, 'debit', options);
  const creditAccount = accountIdForDraft(draft, 'credit', options);
  if (!debitAccount || !creditAccount) {
    throw new Error(`Account mapping is required for draft_type ${draft.draft_type}.`);
  }

  return [
    {
      account_id: debitAccount,
      debit_amount: amount,
      credit_amount: 0,
      line_key: 'debit',
      description: `${draft.draft_type} proposed debit`,
    },
    {
      account_id: creditAccount,
      debit_amount: 0,
      credit_amount: amount,
      line_key: 'credit',
      description: `${draft.draft_type} proposed credit`,
    },
  ];
}

export function getBaselineChartOfAccounts() {
  return BASELINE_CHART_OF_ACCOUNTS.map((candidate) => ({ ...candidate }));
}

export function validateChartOfAccounts(accounts) {
  const errors = [];

  if (!Array.isArray(accounts)) {
    return { ok: false, errors: ['Chart of accounts must be an array.'] };
  }

  const seenAccountIds = new Set();
  for (const [index, candidate] of accounts.entries()) {
    if (!isPlainObject(candidate)) {
      errors.push(`accounts[${index}] must be an object.`);
      continue;
    }

    for (const field of ['account_id', 'account_name', 'account_type', 'normal_balance']) {
      if (!candidate[field] || typeof candidate[field] !== 'string') {
        errors.push(`accounts[${index}].${field} is required.`);
      }
    }

    if (candidate.account_id) {
      if (seenAccountIds.has(candidate.account_id)) {
        errors.push(`Duplicate account_id: ${candidate.account_id}.`);
      }
      seenAccountIds.add(candidate.account_id);
    }

    if (candidate.normal_balance && !['debit', 'credit'].includes(candidate.normal_balance)) {
      errors.push(`accounts[${index}].normal_balance must be debit or credit.`);
    }
  }

  for (const accountId of REQUIRED_BASELINE_ACCOUNTS) {
    if (!seenAccountIds.has(accountId)) {
      errors.push(`Required baseline account missing: ${accountId}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function getDocumentCoverageRules() {
  return Object.fromEntries(
    Object.entries(DOCUMENT_COVERAGE_RULES).map(([draftType, rule]) => [draftType, {
      ...rule,
      required_documents: [...(rule.required_documents || [])],
      preferred_documents: [...(rule.preferred_documents || [])],
      risk_flags: [...(rule.risk_flags || [])],
      warnings: [...(rule.warnings || [])],
    }])
  );
}

export function validateDocumentCoverage(draftRecord, documentRefs = [], rules = getDocumentCoverageRules()) {
  if (!isPlainObject(draftRecord)) {
    throw new Error('Draft finance record is required.');
  }

  const rule = rules[draftRecord.draft_type];
  if (!rule) {
    return {
      coverage_status: 'not_required',
      missing_documents: [],
      warnings: [],
      risk_flags: [],
    };
  }

  const availableTypes = new Set((documentRefs || []).map(documentTypeFromRef).filter(Boolean));
  const requiredDocuments = rule.required_documents || [];
  const missingDocuments = requiredDocuments.filter((required) => !availableTypes.has(required));
  const preferredMissing = (rule.preferred_documents || []).filter((preferred) => !availableTypes.has(preferred));
  const warnings = unique([...(rule.warnings || []), ...preferredMissing.map((preferred) => `Preferred document missing: ${preferred}.`)]);
  const riskFlags = unique([...(rule.risk_flags || []), ...(missingDocuments.length ? ['missing_document'] : [])]);

  return {
    coverage_status: missingDocuments.length ? 'incomplete' : 'complete',
    missing_documents: missingDocuments,
    warnings,
    risk_flags: riskFlags,
  };
}

export function validateLedgerApprovalBoundary(reviewItem, draftRecords, options = {}) {
  const errors = [];
  const warnings = [];
  const riskFlags = new Set();
  const documentCoverage = [];

  if (!isPlainObject(reviewItem)) {
    return { ok: false, errors: ['Review queue item is required.'], warnings, risk_flags: [], document_coverage: [] };
  }

  if (reviewItem.review_status !== 'approved_for_ledger_later') {
    errors.push('Review item status must be approved_for_ledger_later.');
  }

  try {
    requireDraftRecords(draftRecords);
  } catch (error) {
    errors.push(error.message);
    return {
      ok: false,
      errors,
      warnings: unique(warnings),
      risk_flags: [],
      document_coverage: documentCoverage,
      live_ledger_write_enabled: false,
    };
  }

  const actorRole = options.actor?.role || options.role;
  const requiredRole = options.approvalRole || reviewItem.assigned_role || 'finance_admin';
  if (!actorRole) {
    errors.push('Approval actor role is required.');
  } else if (![requiredRole, 'owner_root'].includes(actorRole)) {
    errors.push(`Approval actor role must be ${requiredRole} or owner_root.`);
  }

  if (options.enableLiveLedgerWrite === true) {
    errors.push('Live ledger writes are disabled in this phase.');
  }

  const periodStatus = options.period?.status || (options.periodOpen === true ? 'open' : undefined);
  if (periodStatus !== 'open') {
    errors.push('Effective period must be open.');
  }

  const chart = options.chartOfAccounts || getBaselineChartOfAccounts();
  const chartValidation = validateChartOfAccounts(chart);
  if (!chartValidation.ok) {
    errors.push(...chartValidation.errors);
  }
  const accounts = Array.isArray(chart) ? accountById(chart) : new Map();
  const resolvedRiskFlags = new Set(options.resolvedRiskFlags || options.resolved_risk_flags || []);

  for (const draft of draftRecords) {
    if (['rejected', 'superseded'].includes(draft.review_status) || draft.rejection_reason) {
      errors.push(`Draft record ${draft.draft_record_id} cannot be rejected or superseded.`);
    }

    for (const field of ['entity_id', 'fund_id', 'class_id']) {
      if (!draft[field] || /unmapped$/i.test(String(draft[field])) || draft[field] === `${field.replace('_id', '')}_unmapped`) {
        errors.push(`Draft record ${draft.draft_record_id} requires ${field} mapping.`);
      }
    }

    if (!isNonFinancialDraft(draft)) {
      const debitAccount = accountIdForDraft(draft, 'debit', options);
      const creditAccount = accountIdForDraft(draft, 'credit', options);
      if (!debitAccount || !creditAccount || !accounts.has(debitAccount) || !accounts.has(creditAccount)) {
        errors.push(`Draft record ${draft.draft_record_id} requires account mapping.`);
      }

      const calculationRule = options.calculationRuleRefs?.[draft.draft_record_id] ||
        options.calculationRuleRefs?.[draft.draft_type] ||
        draft.calculation_rule_id ||
        draft.calculation_rule_hint;
      if (!calculationRule) {
        errors.push(`Draft record ${draft.draft_record_id} requires calculation rule reference.`);
      }
    }

    const coverage = validateDocumentCoverage(draft, options.documentRefs || options.document_refs || [], options.documentCoverageRules || getDocumentCoverageRules());
    documentCoverage.push({
      draft_record_id: draft.draft_record_id,
      ...coverage,
    });
    warnings.push(...coverage.warnings);
    coverage.risk_flags.forEach((flag) => riskFlags.add(flag));
    if (coverage.coverage_status === 'incomplete' && options.allowDocumentDeferral !== true) {
      errors.push(`Draft record ${draft.draft_record_id} has incomplete document coverage.`);
    }

    for (const flag of draft.risk_flags || []) {
      riskFlags.add(flag);
    }
  }

  const unresolvedHighRiskFlags = [...riskFlags].filter((flag) => !resolvedRiskFlags.has(flag));
  if (unresolvedHighRiskFlags.length && options.allowUnresolvedRiskFlags !== true) {
    errors.push(`Unresolved risk flags remain: ${unresolvedHighRiskFlags.join(', ')}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: unique(warnings),
    risk_flags: [...riskFlags],
    document_coverage: documentCoverage,
    live_ledger_write_enabled: false,
  };
}

export function mapDraftRecordsToProposedLedgerRecords(draftRecords, mappingOptions = {}) {
  requireDraftRecords(draftRecords);

  const proposedRecords = [];
  let sequence = 1;

  for (const draft of draftRecords) {
    const lines = financialLinesForDraft(draft, mappingOptions);
    for (const line of lines) {
      proposedRecords.push(proposedLine(draft, line, mappingOptions, sequence));
      sequence += 1;
    }
  }

  return proposedRecords;
}

export function validateProposedLedgerBalance(proposedRecords) {
  const errors = [];

  if (!Array.isArray(proposedRecords) || proposedRecords.length === 0) {
    return { ok: false, errors: ['Proposed ledger records cannot be empty.'], balance_status: 'invalid' };
  }

  const financialRecords = proposedRecords.filter((record) => record.is_non_financial !== true);
  if (!financialRecords.length) {
    return {
      ok: true,
      errors: [],
      balance_status: 'not_required',
      total_debits: 0,
      total_credits: 0,
      currency: proposedRecords[0].currency || 'USD',
    };
  }

  const currencies = new Set(financialRecords.map((record) => record.currency || 'USD'));
  if (currencies.size !== 1) {
    errors.push('Proposed ledger records must use one currency.');
  }

  const totalDebits = roundMoney(financialRecords.reduce((sum, record) => sum + asNumber(record.debit_amount), 0));
  const totalCredits = roundMoney(financialRecords.reduce((sum, record) => sum + asNumber(record.credit_amount), 0));
  if (totalDebits !== totalCredits) {
    errors.push(`Proposed ledger records are unbalanced: debits ${totalDebits}, credits ${totalCredits}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    balance_status: errors.length ? 'unbalanced' : 'balanced',
    total_debits: totalDebits,
    total_credits: totalCredits,
    currency: [...currencies][0],
  };
}

export function writeProposedLedgerRecords(vaultPathInput, proposedRecords, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureLedgerApprovalDirs(vaultPath);

  if (!Array.isArray(proposedRecords) || proposedRecords.length === 0) {
    throw new Error('At least one proposed ledger record is required.');
  }

  const balance = validateProposedLedgerBalance(proposedRecords);
  if (!balance.ok) {
    throw new Error(`Proposed ledger records rejected: ${balance.errors.join(' ')}`);
  }

  for (const record of proposedRecords) {
    appendJsonLine(proposedLedgerRecordsPath(vaultPath), record);
  }

  const sourceReviewItemIds = unique(proposedRecords.map((record) => record.source_review_item_id));
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'proposed_ledger_records_written',
    target_type: 'proposed_ledger_records',
    target_id: sourceReviewItemIds.join(',') || 'proposed_batch',
    reason: actor.reason || 'Proposed ledger records written; no live ledger commit.',
    metadata: {
      proposed_record_count: proposedRecords.length,
      source_review_item_ids: sourceReviewItemIds,
      balance_status: balance.balance_status,
      live_ledger_write: false,
    },
  });

  return {
    proposed_record_count: proposedRecords.length,
    proposed_records: proposedRecords,
    balance,
    audit_event: auditEvent,
  };
}

export function listProposedLedgerRecords(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let records = readJsonLines(proposedLedgerRecordsPath(vaultPath));

  if (filters.includeHistory !== true) {
    records = latestById(records, 'proposed_ledger_record_id');
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

export function markProposedLedgerDecision(vaultPathInput, proposedRecordIds, decision, actor = {}, reason = '') {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureLedgerApprovalDirs(vaultPath);

  if (!ALLOWED_PROPOSED_DECISIONS.has(decision)) {
    throw new Error(`Invalid proposed ledger decision: ${decision}.`);
  }
  if (!reason || typeof reason !== 'string') {
    throw new Error('Proposed ledger decision reason is required.');
  }

  const ids = Array.isArray(proposedRecordIds) ? proposedRecordIds : [proposedRecordIds];
  if (!ids.length || ids.some((id) => !id || typeof id !== 'string')) {
    throw new Error('At least one proposed ledger record id is required.');
  }

  const existingRecords = listProposedLedgerRecords(vaultPath, { includeHistory: true });
  const latest = latestById(existingRecords, 'proposed_ledger_record_id');
  const latestByRecordId = new Map(latest.map((record) => [record.proposed_ledger_record_id, record]));
  const decidedAt = actor.timestamp || nowIso();
  const updatedRecords = [];

  for (const id of ids) {
    const record = latestByRecordId.get(id);
    if (!record) {
      throw new Error(`Proposed ledger record not found: ${id}.`);
    }

    const updated = {
      ...record,
      previous_approval_status: record.approval_status,
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
    appendJsonLine(proposedLedgerRecordsPath(vaultPath), updated);
    updatedRecords.push(updated);
  }

  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: decidedAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'proposed_ledger_records_decision_marked',
    target_type: 'proposed_ledger_records',
    target_id: ids.join(','),
    reason,
    metadata: {
      decision,
      proposed_record_ids: ids,
      live_ledger_write: false,
    },
  });

  return {
    decision,
    updated_records: updatedRecords,
    audit_event: auditEvent,
  };
}

export function verifyNoLiveLedgerWrites(vaultPathInput) {
  const result = verifyImportNoLiveLedgerWrites(vaultPathInput);
  return {
    ok: result.ok,
    present_paths: result.present_paths,
  };
}
