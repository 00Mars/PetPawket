import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import {
  validateSourceDocumentMetadata,
  verifyNoPublicPathUsage as verifyEvidenceNoPublicPathUsage,
  verifyNoRawDocumentContentStored as verifyEvidenceNoRawDocumentContentStored,
} from './pawketAdminEvidence.js';

export const DOCUMENT_VAULT_VERSION = 'pawket-admin-document-vault-v0';

const ALLOWED_STORAGE_PROVIDERS = new Set([
  'local_metadata_only',
  'local_encrypted_vault',
  'encrypted_backup',
  'external_encrypted_archive',
]);

const ENCRYPTION_STATUSES = new Set([
  'metadata_only',
  'encryption_pending',
  'encrypted',
  'rotation_required',
  'quarantined',
  'destroyed',
]);

const STORAGE_STATUSES = new Set([
  'declared',
  'reference_created',
  'available',
  'missing',
  'quarantined',
  'rotation_required',
  'destroyed',
]);

const PRIVACY_CLASSES = new Set([
  'public',
  'internal',
  'financial_sensitive',
  'donor_sensitive',
  'customer_sensitive',
  'assistance_sensitive',
  'medical_adjacent_sensitive',
  'story_sensitive',
  'minor_or_family_sensitive',
  'partner_confidential',
  'legal_confidential',
]);

const REDACTION_STATES = new Set([
  'none_required',
  'pending_review',
  'redaction_required',
  'redacted',
  'export_restricted',
  'private_internal_only',
  'public_safe',
  'blocked',
]);

const RAW_DOCUMENT_CONTENT_FIELDS = new Set([
  'raw_content',
  'rawDocumentContent',
  'file_contents',
  'file_content',
  'content_buffer',
  'document_blob',
  'blob_content',
  'raw_blob',
  'document_body',
]);

const INGESTION_STATES = Object.freeze([
  'declared',
  'metadata_validated',
  'duplicate_checked',
  'privacy_classified',
  'retention_assigned',
  'redaction_checked',
  'blob_reference_created',
  'evidence_linked',
  'manifest_eligible',
  'rejected',
  'quarantined',
]);

const INGESTION_TRANSITIONS = Object.freeze({
  declared: ['metadata_validated', 'rejected', 'quarantined'],
  metadata_validated: ['duplicate_checked', 'rejected', 'quarantined'],
  duplicate_checked: ['privacy_classified', 'rejected', 'quarantined'],
  privacy_classified: ['retention_assigned', 'rejected', 'quarantined'],
  retention_assigned: ['redaction_checked', 'rejected', 'quarantined'],
  redaction_checked: ['blob_reference_created', 'rejected', 'quarantined'],
  blob_reference_created: ['evidence_linked', 'rejected', 'quarantined'],
  evidence_linked: ['manifest_eligible', 'rejected', 'quarantined'],
  manifest_eligible: ['rejected', 'quarantined'],
  quarantined: ['metadata_validated', 'rejected'],
  rejected: [],
});

const RETENTION_SCHEDULE = Object.freeze({
  tax_support: {
    retention_class: 'tax_support',
    description: 'Tax support documents such as receipts, invoices, processor reports, and bank evidence.',
    default_minimum_years_placeholder: 'requires_tax_accounting_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Production period requires accounting and tax review.',
  },
  accounting_support: {
    retention_class: 'accounting_support',
    description: 'Order, payment, refund, and accounting source evidence.',
    default_minimum_years_placeholder: 'requires_accounting_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Supports management reports and future ledger traceability.',
  },
  donor_support: {
    retention_class: 'donor_support',
    description: 'Donor records, acknowledgments, and donation-platform evidence.',
    default_minimum_years_placeholder: 'requires_charity_tax_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Donor privacy and charity reporting rules apply.',
  },
  foundation_program_support: {
    retention_class: 'foundation_program_support',
    description: 'Foundation program records that are not assistance-sensitive.',
    default_minimum_years_placeholder: 'requires_foundation_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'CHARM and CHERISH program context may still require privacy review.',
  },
  assistance_sensitive: {
    retention_class: 'assistance_sensitive',
    description: 'CHARM/CHERISH assistance application, award, payment, and hardship evidence.',
    default_minimum_years_placeholder: 'requires_legal_privacy_charity_review',
    review_frequency: 'semiannual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: false,
    notes: 'Sensitive assistance context should not appear in public or investor exports.',
  },
  legal_contract: {
    retention_class: 'legal_contract',
    description: 'Contracts and other legal records.',
    default_minimum_years_placeholder: 'requires_legal_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Legal hold overrides all destruction policy.',
  },
  creator_ip_rights: {
    retention_class: 'creator_ip_rights',
    description: 'Creator rights, IP assignment, Pawket Pal asset, and story-rights support.',
    default_minimum_years_placeholder: 'requires_legal_ip_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: false,
    notes: 'Public use depends on rights and consent review.',
  },
  customer_support: {
    retention_class: 'customer_support',
    description: 'Customer support and operational evidence.',
    default_minimum_years_placeholder: 'requires_privacy_review',
    review_frequency: 'annual',
    destruction_allowed: true,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: false,
    notes: 'Customer privacy review required before export.',
  },
  story_consent: {
    retention_class: 'story_consent',
    description: 'Story consent and privacy records.',
    default_minimum_years_placeholder: 'requires_privacy_legal_review',
    review_frequency: 'semiannual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: false,
    notes: 'Consent proof is sensitive and must not expose private stories.',
  },
  public_impact_proof: {
    retention_class: 'public_impact_proof',
    description: 'Public-safe impact proof and aggregated support evidence.',
    default_minimum_years_placeholder: 'requires_impact_reporting_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Only public-safe or redacted records should use this class.',
  },
  temporary_import: {
    retention_class: 'temporary_import',
    description: 'Temporary import evidence awaiting validation.',
    default_minimum_years_placeholder: 'short_term_requires_policy',
    review_frequency: 'monthly',
    destruction_allowed: true,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: false,
    notes: 'Must be promoted, rejected, or quarantined before reporting.',
  },
  export_manifest: {
    retention_class: 'export_manifest',
    description: 'Export and commit evidence manifests.',
    default_minimum_years_placeholder: 'requires_accounting_security_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Manifest hashes preserve report/export proof.',
  },
  audit_support: {
    retention_class: 'audit_support',
    description: 'Audit support records and integrity metadata.',
    default_minimum_years_placeholder: 'requires_audit_review',
    review_frequency: 'annual',
    destruction_allowed: false,
    destruction_requires_approval: true,
    legal_hold_supported: true,
    export_allowed: true,
    notes: 'Audit trail integrity takes priority.',
  },
});

const LEGACY_RETENTION_ALIASES = Object.freeze({
  finance_source: 'accounting_support',
  operations_source: 'customer_support',
  foundation_support: 'foundation_program_support',
  foundation_sensitive: 'assistance_sensitive',
  legal_support: 'legal_contract',
  partner_support: 'legal_contract',
  program_rule: 'accounting_support',
  privacy_consent: 'story_consent',
  asset_support: 'creator_ip_rights',
  impact_support: 'public_impact_proof',
  general_support: 'accounting_support',
});

const DOCUMENT_TYPE_RETENTION = Object.freeze({
  order_source: 'accounting_support',
  payment_processor_record: 'accounting_support',
  refund_record: 'accounting_support',
  receipt: 'tax_support',
  invoice: 'tax_support',
  supplier_invoice: 'tax_support',
  shipping_label: 'customer_support',
  bank_statement: 'tax_support',
  donor_record: 'donor_support',
  donor_acknowledgment: 'donor_support',
  donation_platform_record: 'donor_support',
  charm_assistance_application: 'assistance_sensitive',
  charm_assistance_award: 'assistance_sensitive',
  charm_assistance_payment_proof: 'assistance_sensitive',
  cherish_program_record: 'assistance_sensitive',
  restricted_fund_document: 'foundation_program_support',
  contract: 'legal_contract',
  creator_rights_assignment: 'creator_ip_rights',
  insurance_referral_partner_record: 'legal_contract',
  care_credit_rule_record: 'accounting_support',
  calculation_rule_record: 'accounting_support',
  pawket_pal_story_consent: 'story_consent',
  pawket_pal_asset_record: 'creator_ip_rights',
  public_impact_proof: 'public_impact_proof',
  export_manifest: 'export_manifest',
  other: 'temporary_import',
});

const EXPORT_REDACTION_PROFILES = Object.freeze({
  owner_full_internal: {
    profile_id: 'owner_full_internal',
    allowed_privacy_classes: [...PRIVACY_CLASSES],
    excluded_privacy_classes: [],
    required_redaction_states: [...REDACTION_STATES],
    allowed_document_types: ['*'],
    excluded_document_types: [],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: true,
    requires_approval_role: 'owner_root',
    export_risk_flags: ['owner_archive_contains_sensitive_data'],
  },
  accountant_pack: {
    profile_id: 'accountant_pack',
    allowed_privacy_classes: ['internal', 'financial_sensitive', 'customer_sensitive', 'legal_confidential'],
    excluded_privacy_classes: ['donor_sensitive', 'assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive'],
    required_redaction_states: ['none_required', 'redacted', 'public_safe'],
    allowed_document_types: [
      'order_source',
      'payment_processor_record',
      'refund_record',
      'receipt',
      'invoice',
      'supplier_invoice',
      'shipping_label',
      'bank_statement',
      'restricted_fund_document',
      'contract',
      'care_credit_rule_record',
      'calculation_rule_record',
      'export_manifest',
    ],
    excluded_document_types: ['charm_assistance_application', 'charm_assistance_award', 'charm_assistance_payment_proof', 'pawket_pal_story_consent'],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: true,
    requires_approval_role: 'finance_admin',
    export_risk_flags: ['accountant_pack_sensitive_financial_data'],
  },
  irs_support_pack: {
    profile_id: 'irs_support_pack',
    allowed_privacy_classes: ['internal', 'financial_sensitive', 'legal_confidential'],
    excluded_privacy_classes: ['donor_sensitive', 'assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive'],
    required_redaction_states: ['none_required', 'redacted', 'public_safe'],
    allowed_document_types: ['receipt', 'invoice', 'supplier_invoice', 'bank_statement', 'payment_processor_record', 'refund_record', 'order_source', 'export_manifest'],
    excluded_document_types: ['pawket_pal_story_consent', 'charm_assistance_application', 'charm_assistance_award'],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: true,
    requires_approval_role: 'finance_admin',
    export_risk_flags: ['tax_support_sensitive_financial_data'],
  },
  investor_summary: {
    profile_id: 'investor_summary',
    allowed_privacy_classes: ['public', 'internal'],
    excluded_privacy_classes: ['financial_sensitive', 'donor_sensitive', 'customer_sensitive', 'assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive', 'partner_confidential', 'legal_confidential'],
    required_redaction_states: ['redacted', 'public_safe', 'none_required'],
    allowed_document_types: ['public_impact_proof', 'export_manifest', 'other'],
    excluded_document_types: ['donor_record', 'charm_assistance_application', 'pawket_pal_story_consent'],
    aggregate_only_fields: ['revenue', 'margin', 'subscription_growth', 'impact_metrics'],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'finance_admin',
    export_risk_flags: ['aggregate_only_investor_summary'],
  },
  foundation_board_pack: {
    profile_id: 'foundation_board_pack',
    allowed_privacy_classes: ['public', 'internal', 'donor_sensitive', 'assistance_sensitive', 'financial_sensitive'],
    excluded_privacy_classes: ['medical_adjacent_sensitive', 'minor_or_family_sensitive', 'story_sensitive'],
    required_redaction_states: ['none_required', 'redacted', 'public_safe', 'private_internal_only'],
    allowed_document_types: ['donor_record', 'donor_acknowledgment', 'donation_platform_record', 'restricted_fund_document', 'charm_assistance_award', 'charm_assistance_payment_proof', 'cherish_program_record', 'public_impact_proof', 'export_manifest'],
    excluded_document_types: ['pawket_pal_story_consent', 'insurance_referral_partner_record'],
    aggregate_only_fields: ['assistance_outcomes', 'program_metrics'],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'foundation_admin',
    export_risk_flags: ['foundation_sensitive_review_required'],
  },
  donor_acknowledgment_pack: {
    profile_id: 'donor_acknowledgment_pack',
    allowed_privacy_classes: ['internal', 'donor_sensitive', 'financial_sensitive'],
    excluded_privacy_classes: ['assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive'],
    required_redaction_states: ['none_required', 'redacted'],
    allowed_document_types: ['donor_record', 'donor_acknowledgment', 'donation_platform_record', 'restricted_fund_document'],
    excluded_document_types: ['charm_assistance_application', 'pawket_pal_story_consent'],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'foundation_admin',
    export_risk_flags: ['donor_privacy_review_required'],
  },
  public_impact_report: {
    profile_id: 'public_impact_report',
    allowed_privacy_classes: ['public'],
    excluded_privacy_classes: ['internal', 'financial_sensitive', 'donor_sensitive', 'customer_sensitive', 'assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive', 'partner_confidential', 'legal_confidential'],
    required_redaction_states: ['public_safe', 'redacted'],
    allowed_document_types: ['public_impact_proof', 'export_manifest'],
    excluded_document_types: ['donor_record', 'donor_acknowledgment', 'charm_assistance_application', 'charm_assistance_award', 'charm_assistance_payment_proof', 'pawket_pal_story_consent', 'pawket_pal_asset_record'],
    aggregate_only_fields: ['dollars_donated', 'animals_helped', 'shelters_supported', 'families_supported'],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'owner_root',
    export_risk_flags: ['public_privacy_review_required'],
  },
  connector_debug: {
    profile_id: 'connector_debug',
    allowed_privacy_classes: ['internal', 'financial_sensitive'],
    excluded_privacy_classes: ['donor_sensitive', 'customer_sensitive', 'assistance_sensitive', 'medical_adjacent_sensitive', 'story_sensitive', 'minor_or_family_sensitive', 'partner_confidential', 'legal_confidential'],
    required_redaction_states: ['none_required', 'redacted'],
    allowed_document_types: ['order_source', 'payment_processor_record', 'refund_record', 'export_manifest'],
    excluded_document_types: ['donor_record', 'charm_assistance_application', 'pawket_pal_story_consent'],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'finance_admin',
    export_risk_flags: ['connector_debug_no_raw_documents'],
  },
  security_audit_pack: {
    profile_id: 'security_audit_pack',
    allowed_privacy_classes: [...PRIVACY_CLASSES],
    excluded_privacy_classes: [],
    required_redaction_states: [...REDACTION_STATES],
    allowed_document_types: ['*'],
    excluded_document_types: [],
    aggregate_only_fields: [],
    document_metadata_allowed: true,
    blob_access_allowed: false,
    requires_approval_role: 'owner_root',
    export_risk_flags: ['security_audit_metadata_only'],
  },
});

const SHA_HASH_RE = /^[a-f0-9]{64}$|^[a-f0-9]{128}$/;

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
    throw new Error('Pawket Admin document vault files must not be placed under public/.');
  }

  return resolved;
}

function assertSafeVaultRelativePath(relativePath, fieldName) {
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error(`${fieldName} is required.`);
  }
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:[\\/]/.test(relativePath)) {
    throw new Error(`${fieldName} must be vault-relative.`);
  }

  const normalized = path.posix.normalize(relativePath.replaceAll('\\', '/'));
  const segments = normalized.split('/').filter(Boolean);
  if (normalized.startsWith('../') || normalized === '..' || segments.includes('..')) {
    throw new Error(`${fieldName} cannot contain traversal.`);
  }
  if (segments.includes('public')) {
    throw new Error(`${fieldName} must not point under public/.`);
  }

  return normalized === '.' ? '' : normalized;
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

function ensureDocumentVaultDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'documents'), { recursive: true });
  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
}

function ingestionRecordsPath(vaultPath) {
  return path.join(vaultPath, 'documents', 'document-vault-ingestion.ndjson');
}

function integrationRecordsPath(vaultPath) {
  return path.join(vaultPath, 'manifests', 'commit-gate-evidence-integration.ndjson');
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function hasRawDocumentContentFields(record) {
  if (Array.isArray(record)) {
    return record.some((item) => hasRawDocumentContentFields(item));
  }
  if (!isPlainObject(record)) {
    return false;
  }
  return Object.entries(record).some(([key, value]) => (
    RAW_DOCUMENT_CONTENT_FIELDS.has(key) || hasRawDocumentContentFields(value)
  ));
}

function assertNoRawDocumentContent(record) {
  if (hasRawDocumentContentFields(record)) {
    throw new Error('Raw document content must not be stored in document vault metadata.');
  }
}

function canonicalHash(record, hashField) {
  const { [hashField]: _hash, ...payload } = record;
  return sha256Hex(canonicalize(payload));
}

function retentionClassExists(retentionClass) {
  return Boolean(RETENTION_SCHEDULE[retentionClass] || LEGACY_RETENTION_ALIASES[retentionClass]);
}

function normalizeRetentionClass(retentionClass) {
  return RETENTION_SCHEDULE[retentionClass] ? retentionClass : LEGACY_RETENTION_ALIASES[retentionClass];
}

function recordId(record, index) {
  return record.document_id || record.blob_ref_id || record.id || `record_${index + 1}`;
}

function documentTypesAllowed(documentType, profile) {
  const allowed = profile.allowed_document_types || [];
  const excluded = profile.excluded_document_types || [];
  if (excluded.includes(documentType)) {
    return false;
  }
  return allowed.includes('*') || allowed.includes(documentType);
}

export function getDocumentVaultStoragePolicy() {
  return {
    allowed_storage_providers: [...ALLOWED_STORAGE_PROVIDERS],
    forbidden_paths: ['public/', '../', '/absolute/path'],
    public_path_rejection: true,
    metadata_only_current_phase: true,
    encrypted_blob_future_boundary: true,
    supported_encryption_statuses: [...ENCRYPTION_STATUSES],
    supported_storage_statuses: [...STORAGE_STATUSES],
    raw_document_content_allowed: false,
    production_encryption_implemented: false,
  };
}

export function createBlobReference(input, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error('Blob reference input is required.');
  }
  assertNoRawDocumentContent(input);

  const createdAt = input.created_at || options.created_at || nowIso();
  const identityPayload = {
    document_id: input.document_id,
    storage_provider: input.storage_provider,
    vault_relative_path: input.vault_relative_path,
    encrypted_blob_name: input.encrypted_blob_name,
    blob_hash: input.blob_hash || '',
  };

  const blobRef = {
    blob_ref_id: input.blob_ref_id || `blobref_${sha256Hex(canonicalize(identityPayload)).slice(0, 16)}`,
    document_id: input.document_id,
    storage_provider: input.storage_provider,
    vault_relative_path: input.vault_relative_path,
    encrypted_blob_name: input.encrypted_blob_name,
    blob_hash: input.blob_hash || '',
    plaintext_hash_if_allowed_placeholder: input.plaintext_hash_if_allowed_placeholder || '',
    encryption_status: input.encryption_status || 'metadata_only',
    encryption_algorithm_placeholder: input.encryption_algorithm_placeholder || '',
    key_id_placeholder: input.key_id_placeholder || '',
    created_at: createdAt,
    updated_at: input.updated_at || createdAt,
    blob_size_bytes: input.blob_size_bytes ?? 0,
    content_type: input.content_type || '',
    storage_status: input.storage_status || 'reference_created',
    retention_class: input.retention_class,
    privacy_class: input.privacy_class,
    document_vault_version: DOCUMENT_VAULT_VERSION,
  };

  const validation = validateBlobReference(blobRef, options.policy || getDocumentVaultStoragePolicy());
  if (!validation.ok) {
    throw new Error(`Invalid blob reference: ${validation.errors.join(' ')}`);
  }

  return {
    ...blobRef,
    vault_relative_path: assertSafeVaultRelativePath(blobRef.vault_relative_path, 'vault_relative_path'),
    encrypted_blob_name: safeFileId(blobRef.encrypted_blob_name, 'encrypted_blob_name'),
  };
}

export function validateBlobReference(blobRef, policy = getDocumentVaultStoragePolicy()) {
  const errors = [];

  if (!isPlainObject(blobRef)) {
    return { ok: false, errors: ['Blob reference must be an object.'] };
  }

  if (hasRawDocumentContentFields(blobRef)) {
    errors.push('Blob reference must not include raw document content fields.');
  }

  for (const field of ['blob_ref_id', 'document_id', 'storage_provider', 'vault_relative_path', 'encrypted_blob_name', 'privacy_class', 'retention_class', 'encryption_status', 'storage_status']) {
    if (!blobRef[field] || typeof blobRef[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (blobRef.storage_provider && !(policy.allowed_storage_providers || []).includes(blobRef.storage_provider)) {
    errors.push(`Unsupported storage_provider: ${blobRef.storage_provider}.`);
  }

  if (blobRef.vault_relative_path) {
    try {
      assertSafeVaultRelativePath(blobRef.vault_relative_path, 'vault_relative_path');
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (blobRef.encrypted_blob_name) {
    try {
      safeFileId(blobRef.encrypted_blob_name, 'encrypted_blob_name');
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (blobRef.encryption_status && !(policy.supported_encryption_statuses || []).includes(blobRef.encryption_status)) {
    errors.push(`Unsupported encryption_status: ${blobRef.encryption_status}.`);
  }

  if (blobRef.storage_status && !(policy.supported_storage_statuses || []).includes(blobRef.storage_status)) {
    errors.push(`Unsupported storage_status: ${blobRef.storage_status}.`);
  }

  if (blobRef.privacy_class && !PRIVACY_CLASSES.has(blobRef.privacy_class)) {
    errors.push(`Unsupported privacy_class: ${blobRef.privacy_class}.`);
  }

  if (blobRef.retention_class && !retentionClassExists(blobRef.retention_class)) {
    errors.push(`Unsupported retention_class: ${blobRef.retention_class}.`);
  }

  if (blobRef.blob_size_bytes !== undefined && (!Number.isInteger(blobRef.blob_size_bytes) || blobRef.blob_size_bytes < 0)) {
    errors.push('blob_size_bytes must be a non-negative integer.');
  }

  if ((blobRef.blob_size_bytes || 0) > 0 && !blobRef.blob_hash) {
    errors.push('blob_hash is required when blob_size_bytes is greater than 0.');
  }

  if (blobRef.blob_hash && !SHA_HASH_RE.test(blobRef.blob_hash)) {
    errors.push('blob_hash must be a sha256 or sha512 hex string.');
  }

  return { ok: errors.length === 0, errors };
}

export function detectDuplicateDocuments(documents, options = {}) {
  if (!Array.isArray(documents)) {
    throw new Error('documents must be an array.');
  }

  const buckets = new Map();
  const addBucket = (matchType, matchValue, document, index) => {
    if (!matchValue) {
      return;
    }
    const key = `${matchType}:${String(matchValue).toLowerCase()}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        match_type: matchType,
        match_value: matchValue,
        documents: [],
      });
    }
    buckets.get(key).documents.push(document);
    buckets.get(key).document_ids = buckets.get(key).documents.map((candidate, candidateIndex) => recordId(candidate, candidateIndex));
  };

  documents.forEach((document, index) => {
    addBucket('file_hash', document.file_hash, document, index);
    addBucket('blob_hash', document.blob_hash || document.blob_reference?.blob_hash, document, index);
    if (options.includeMetadataMatch !== false) {
      const title = String(document.document_title || '').trim().toLowerCase();
      const size = document.file_size_bytes ?? document.blob_size_bytes;
      const date = document.document_date || '';
      if (title && size !== undefined && date) {
        addBucket('title_size_date', `${title}|${size}|${date}`, document, index);
      }
    }
  });

  const duplicateGroups = [...buckets.values()]
    .filter((bucket) => bucket.documents.length > 1)
    .map((bucket) => ({
      match_type: bucket.match_type,
      match_value: bucket.match_value,
      document_ids: bucket.documents.map((document, index) => recordId(document, index)),
      count: bucket.documents.length,
    }));

  const duplicateIds = new Set(duplicateGroups.flatMap((group) => group.document_ids));
  const uniqueDocuments = documents.filter((document, index) => !duplicateIds.has(recordId(document, index)));

  return {
    duplicate_groups: duplicateGroups,
    unique_documents: uniqueDocuments,
    warnings: duplicateGroups.map((group) => `Possible duplicate documents by ${group.match_type}: ${group.document_ids.join(', ')}.`),
  };
}

export function getDocumentIngestionPolicy() {
  return {
    states: [...INGESTION_STATES],
    transitions: Object.fromEntries(Object.entries(INGESTION_TRANSITIONS).map(([state, nextStates]) => [state, [...nextStates]])),
    rules: [
      'No raw document content may be written in this phase.',
      'Metadata may be written after validation.',
      'Test hashes may be calculated from provided strings or buffers for proof tests only.',
      'Duplicate hashes should flag possible duplicates.',
      'Sensitive document types require explicit privacy classes.',
      'Public impact proof must be public_safe or redacted before public export eligibility.',
    ],
  };
}

export function transitionDocumentIngestionState(record, nextState, context = {}) {
  if (!isPlainObject(record)) {
    throw new Error('Document ingestion record is required.');
  }
  if (!INGESTION_STATES.includes(nextState)) {
    throw new Error(`Unsupported document ingestion state: ${nextState}.`);
  }

  const currentState = record.ingestion_state || record.status || 'declared';
  const allowedNextStates = INGESTION_TRANSITIONS[currentState] || [];
  if (!allowedNextStates.includes(nextState)) {
    throw new Error(`Invalid document ingestion transition from ${currentState} to ${nextState}.`);
  }

  const transitionedAt = context.timestamp || nowIso();
  const transition = {
    from_state: currentState,
    to_state: nextState,
    actor_id: context.actor_id || context.actor?.actor_id || 'system',
    role: context.role || context.actor?.role || 'system',
    reason: context.reason || '',
    transitioned_at: transitionedAt,
  };

  return {
    ...record,
    previous_ingestion_state: currentState,
    ingestion_state: nextState,
    transition_history: [...(record.transition_history || []), transition],
    updated_at: transitionedAt,
  };
}

export function getRetentionSchedule() {
  return Object.fromEntries(
    Object.entries(RETENTION_SCHEDULE).map(([retentionClass, policy]) => [retentionClass, { ...policy }])
  );
}

export function assignRetentionClass(documentMetadata, options = {}) {
  if (!isPlainObject(documentMetadata)) {
    throw new Error('Document metadata is required.');
  }

  const existingClass = documentMetadata.retention_class;
  const assignedClass = options.retention_class || DOCUMENT_TYPE_RETENTION[documentMetadata.document_type] || normalizeRetentionClass(existingClass) || 'temporary_import';
  const policy = RETENTION_SCHEDULE[assignedClass];
  if (!policy) {
    throw new Error(`Unsupported retention_class: ${assignedClass}.`);
  }

  const reviewRequired = new Set();
  if (['tax_support', 'accounting_support'].includes(assignedClass)) {
    reviewRequired.add('accounting');
  }
  if (['tax_support', 'donor_support'].includes(assignedClass)) {
    reviewRequired.add('tax');
  }
  if (['legal_contract', 'creator_ip_rights', 'story_consent', 'assistance_sensitive'].includes(assignedClass)) {
    reviewRequired.add('legal');
  }
  if (['story_consent', 'assistance_sensitive', 'customer_support'].includes(assignedClass) || documentMetadata.privacy_class !== 'public') {
    reviewRequired.add('privacy');
  }
  if (['donor_support', 'foundation_program_support', 'assistance_sensitive'].includes(assignedClass)) {
    reviewRequired.add('foundation');
  }

  return {
    retention_class: assignedClass,
    policy: { ...policy },
    review_required: [...reviewRequired],
    warnings: policy.default_minimum_years_placeholder.includes('requires') ? ['Retention period requires production review.'] : [],
    document_metadata: {
      ...documentMetadata,
      retention_class: assignedClass,
    },
  };
}

export function getExportRedactionProfiles() {
  return Object.fromEntries(
    Object.entries(EXPORT_REDACTION_PROFILES).map(([profileId, profile]) => [profileId, {
      ...profile,
      allowed_privacy_classes: [...profile.allowed_privacy_classes],
      excluded_privacy_classes: [...profile.excluded_privacy_classes],
      required_redaction_states: [...profile.required_redaction_states],
      allowed_document_types: [...profile.allowed_document_types],
      excluded_document_types: [...profile.excluded_document_types],
      aggregate_only_fields: [...profile.aggregate_only_fields],
      export_risk_flags: [...profile.export_risk_flags],
    }])
  );
}

export function validateDocumentAgainstExportProfile(documentMetadata, profileInput, options = {}) {
  if (!isPlainObject(documentMetadata)) {
    throw new Error('Document metadata is required.');
  }

  const profile = typeof profileInput === 'string'
    ? getExportRedactionProfiles()[profileInput]
    : profileInput;
  if (!isPlainObject(profile)) {
    throw new Error('Export redaction profile is required.');
  }

  const blockers = [];
  const warnings = [];
  let redactionRequired = false;

  if (!profile.document_metadata_allowed) {
    blockers.push('Document metadata is not allowed for this export profile.');
  }

  if (!profile.allowed_privacy_classes.includes(documentMetadata.privacy_class)) {
    blockers.push(`Privacy class ${documentMetadata.privacy_class} is not allowed for ${profile.profile_id}.`);
  }

  if (profile.excluded_privacy_classes.includes(documentMetadata.privacy_class)) {
    blockers.push(`Privacy class ${documentMetadata.privacy_class} is excluded for ${profile.profile_id}.`);
  }

  if (!profile.required_redaction_states.includes(documentMetadata.redaction_state)) {
    blockers.push(`Redaction state ${documentMetadata.redaction_state} is not allowed for ${profile.profile_id}.`);
    redactionRequired = true;
  }

  if (!documentTypesAllowed(documentMetadata.document_type, profile)) {
    blockers.push(`Document type ${documentMetadata.document_type} is not allowed for ${profile.profile_id}.`);
  }

  if ((options.requestBlobAccess || options.includeBlobAccess) && !profile.blob_access_allowed) {
    blockers.push(`Blob access is not allowed for ${profile.profile_id}.`);
  }

  if (profile.profile_id === 'public_impact_report' && documentMetadata.privacy_class !== 'public') {
    blockers.push('Public impact reports cannot include private donor/customer/assistance/story/medical-adjacent data.');
  }

  if (profile.aggregate_only_fields.length) {
    warnings.push(`Profile ${profile.profile_id} is aggregate-only for: ${profile.aggregate_only_fields.join(', ')}.`);
  }

  return {
    allowed: blockers.length === 0,
    blockers: unique(blockers),
    warnings: unique(warnings),
    redaction_required: redactionRequired,
    profile_id: profile.profile_id,
    blob_access_allowed: profile.blob_access_allowed === true,
  };
}

export function createDocumentVaultIngestionRecord(documentMetadata, blobRef, actor = {}) {
  assertNoRawDocumentContent({ documentMetadata, blobRef });
  const documentValidation = validateSourceDocumentMetadata(documentMetadata);
  if (!documentValidation.ok) {
    throw new Error(`Invalid source document metadata: ${documentValidation.errors.join(' ')}`);
  }

  const blobValidation = validateBlobReference(blobRef);
  if (!blobValidation.ok) {
    throw new Error(`Invalid blob reference: ${blobValidation.errors.join(' ')}`);
  }

  if (documentMetadata.document_id !== blobRef.document_id) {
    throw new Error('Document metadata and blob reference document_id must match.');
  }

  const createdAt = actor.timestamp || nowIso();
  const record = {
    ingestion_id: `ingest_${safeFileId(documentMetadata.document_id, 'document_id')}_${sha256Hex(canonicalize(blobRef)).slice(0, 10)}`,
    document_id: documentMetadata.document_id,
    blob_ref_id: blobRef.blob_ref_id,
    document_type: documentMetadata.document_type,
    privacy_class: documentMetadata.privacy_class,
    retention_class: normalizeRetentionClass(documentMetadata.retention_class) || documentMetadata.retention_class,
    ingestion_state: 'blob_reference_created',
    source_system: documentMetadata.source_system || '',
    source_record_id: documentMetadata.source_record_id || '',
    file_hash: documentMetadata.file_hash || '',
    blob_hash: blobRef.blob_hash || '',
    storage_provider: blobRef.storage_provider,
    storage_status: blobRef.storage_status,
    encryption_status: blobRef.encryption_status,
    actor: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
    raw_document_content_stored: false,
    created_at: createdAt,
    updated_at: createdAt,
    document_vault_version: DOCUMENT_VAULT_VERSION,
  };

  return record;
}

export function writeDocumentVaultIngestionRecord(vaultPathInput, record, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureDocumentVaultDirs(vaultPath);
  assertNoRawDocumentContent(record);

  if (!isPlainObject(record) || !record.ingestion_id || !record.document_id || !record.blob_ref_id) {
    throw new Error('Document vault ingestion record with ingestion_id, document_id, and blob_ref_id is required.');
  }

  appendJsonLine(ingestionRecordsPath(vaultPath), record);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || record.actor?.actor_id || 'system',
    role: actor.role || record.actor?.role || 'system',
    action: 'document_vault_ingestion_record_written',
    target_type: 'document_vault_ingestion',
    target_id: record.ingestion_id,
    reason: actor.reason || 'Document vault ingestion metadata written without raw document content.',
    metadata: {
      document_id: record.document_id,
      blob_ref_id: record.blob_ref_id,
      ingestion_state: record.ingestion_state,
      raw_document_content_stored: false,
    },
  });

  return { ingestion_record: record, audit_event: auditEvent };
}

export function createCommitGateEvidenceIntegrationRecord(proposedJournalEntry, evidenceManifest, documents = [], exportProfiles = getExportRedactionProfiles(), actor = {}) {
  if (!isPlainObject(proposedJournalEntry)) {
    throw new Error('Proposed journal entry is required.');
  }
  if (!isPlainObject(evidenceManifest)) {
    throw new Error('Evidence manifest is required.');
  }
  assertNoRawDocumentContent({ documents });

  const profiles = Array.isArray(exportProfiles)
    ? Object.fromEntries(exportProfiles.map((profile) => [profile.profile_id, profile]))
    : exportProfiles;
  const exportProfileResults = [];
  const exportProfileWarnings = [];
  const exportProfileBlockers = [];

  for (const profile of Object.values(profiles || {})) {
    if (!isPlainObject(profile)) {
      continue;
    }
    const documentResults = documents.map((document) => validateDocumentAgainstExportProfile(document, profile));
    const blocked = documentResults.filter((result) => !result.allowed);
    const warnings = documentResults.flatMap((result) => result.warnings || []);
    exportProfileResults.push({
      profile_id: profile.profile_id,
      allowed_document_count: documentResults.filter((result) => result.allowed).length,
      blocked_document_count: blocked.length,
      blockers: unique(blocked.flatMap((result) => result.blockers)),
      warnings: unique(warnings),
    });
    exportProfileWarnings.push(...warnings);
    exportProfileBlockers.push(...blocked.flatMap((result) => result.blockers.map((blocker) => `${profile.profile_id}: ${blocker}`)));
  }

  const missingDocumentTypes = unique(evidenceManifest.missing_document_types || []);
  const approvedDeferrals = evidenceManifest.deferred_requirements || [];
  const redactionWarnings = unique(evidenceManifest.redaction_warnings || []);
  const privacyWarnings = unique(evidenceManifest.privacy_warnings || []);
  const commitBlockers = [];
  const commitWarnings = [];

  if (missingDocumentTypes.length && !approvedDeferrals.length) {
    commitBlockers.push(`Missing evidence without approved deferral: ${missingDocumentTypes.join(', ')}.`);
  }

  if (['missing', 'partial', 'rejected', 'privacy_blocked'].includes(evidenceManifest.coverage_status)) {
    commitBlockers.push(`Coverage status ${evidenceManifest.coverage_status} is not commit-ready.`);
  }

  if (evidenceManifest.coverage_status === 'redaction_required' || redactionWarnings.length) {
    commitBlockers.push('Redaction warnings must be resolved or explicitly approved before commit/export.');
  }

  if (approvedDeferrals.length) {
    commitWarnings.push('Approved evidence deferrals remain attached to the manifest.');
  }
  if (privacyWarnings.length) {
    commitWarnings.push('Privacy warnings require purpose-specific review.');
  }
  if (exportProfileBlockers.length) {
    commitWarnings.push('One or more export profiles would block included evidence.');
  }

  const createdAt = actor.timestamp || nowIso();
  const record = {
    integration_id: `commit_gate_evidence_${safeFileId(proposedJournalEntry.proposed_journal_entry_id || evidenceManifest.proposed_journal_entry_id, 'proposed_journal_entry_id')}`,
    proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id || evidenceManifest.proposed_journal_entry_id,
    evidence_manifest_id: evidenceManifest.manifest_id,
    manifest_hash: evidenceManifest.manifest_hash,
    coverage_status: evidenceManifest.coverage_status,
    source_proposed_ledger_record_ids: unique(evidenceManifest.source_proposed_ledger_record_ids || proposedJournalEntry.source_proposed_ledger_record_ids || []),
    source_draft_record_ids: unique(evidenceManifest.source_draft_record_ids || proposedJournalEntry.source_draft_record_ids || []),
    source_event_ids: unique(evidenceManifest.source_event_ids || proposedJournalEntry.source_event_ids || []),
    source_bundle_ids: unique(evidenceManifest.source_bundle_ids || proposedJournalEntry.source_bundle_ids || []),
    linked_document_ids: unique(evidenceManifest.linked_document_ids || []),
    missing_document_types: missingDocumentTypes,
    approved_deferrals: approvedDeferrals,
    privacy_warnings: privacyWarnings,
    redaction_warnings: redactionWarnings,
    export_profile_results: exportProfileResults,
    export_profile_warnings: unique(exportProfileWarnings),
    export_profile_blockers: unique(exportProfileBlockers),
    commit_blockers: unique(commitBlockers),
    commit_warnings: unique(commitWarnings),
    created_by: actor.actor_id || 'system',
    created_role: actor.role || 'system',
    created_at: createdAt,
    updated_at: createdAt,
    live_ledger_write: false,
    document_vault_version: DOCUMENT_VAULT_VERSION,
  };

  record.integration_hash = canonicalHash(record, 'integration_hash');
  return record;
}

export function validateCommitGateEvidenceIntegration(record, options = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(record)) {
    return { ok: false, errors: ['Commit-gate evidence integration record must be an object.'], warnings };
  }

  for (const field of ['integration_id', 'proposed_journal_entry_id', 'evidence_manifest_id', 'manifest_hash', 'coverage_status']) {
    if (!record[field] || typeof record[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (record.manifest_hash && !SHA_HASH_RE.test(record.manifest_hash)) {
    errors.push('manifest_hash must be a sha256 or sha512 hex string.');
  }

  for (const field of ['source_proposed_ledger_record_ids', 'source_draft_record_ids', 'source_event_ids', 'source_bundle_ids']) {
    if (!Array.isArray(record[field]) || record[field].length === 0) {
      errors.push(`${field} must include at least one source id.`);
    }
  }

  if ((record.missing_document_types || []).length && !(record.approved_deferrals || []).length && options.allowMissingEvidence !== true) {
    errors.push('Missing evidence must be absent or covered by approved deferrals.');
  }

  if ((record.commit_blockers || []).length && options.allowCommitBlockers !== true) {
    errors.push(...record.commit_blockers);
  }

  if ((record.privacy_warnings || []).length) {
    warnings.push('Privacy warnings are present and must remain visible to the commit gate.');
  }
  if ((record.redaction_warnings || []).length) {
    warnings.push('Redaction warnings are present and must remain visible to the commit gate.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings: unique(warnings) };
}

export function writeCommitGateEvidenceIntegrationRecord(vaultPathInput, record, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureDocumentVaultDirs(vaultPath);
  const validation = validateCommitGateEvidenceIntegration(record, { allowCommitBlockers: true, allowMissingEvidence: true });
  if (!validation.ok) {
    throw new Error(`Invalid commit-gate evidence integration record: ${validation.errors.join(' ')}`);
  }

  appendJsonLine(integrationRecordsPath(vaultPath), record);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || record.created_by || 'system',
    role: actor.role || record.created_role || 'system',
    action: 'commit_gate_evidence_integration_written',
    target_type: 'commit_gate_evidence_integration',
    target_id: record.integration_id,
    reason: actor.reason || 'Commit-gate evidence integration metadata written.',
    metadata: {
      proposed_journal_entry_id: record.proposed_journal_entry_id,
      evidence_manifest_id: record.evidence_manifest_id,
      manifest_hash: record.manifest_hash,
      coverage_status: record.coverage_status,
      live_ledger_write: false,
    },
  });

  return { integration_record: record, audit_event: auditEvent };
}

export function verifyNoRawDocumentContentStored(vaultPathInput) {
  return verifyEvidenceNoRawDocumentContentStored(vaultPathInput);
}

export function verifyNoPublicPathUsage(vaultPathInput) {
  return verifyEvidenceNoPublicPathUsage(vaultPathInput);
}
