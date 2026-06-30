import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent } from './pawketAdminVault.js';
import { getDocumentCoverageRules } from './pawketAdminLedgerApproval.js';

export const EVIDENCE_VERSION = 'pawket-admin-evidence-v0';

const SUPPORTED_HASH_ALGORITHMS = new Set(['sha256', 'sha512']);
const SHA_HEX_BY_ALGORITHM = {
  sha256: /^[a-f0-9]{64}$/,
  sha512: /^[a-f0-9]{128}$/,
};

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

const EVIDENCE_STATUSES = new Set([
  'not_required',
  'missing',
  'partial',
  'complete',
  'deferred_approved',
  'rejected',
  'privacy_blocked',
  'redaction_required',
]);

const DEFERRAL_STATUSES = new Set(['approved', 'pending_review', 'revoked', 'expired']);

const LINK_TARGET_TYPES = new Set([
  'staged_event',
  'draft_finance_record',
  'review_item',
  'proposed_ledger_record',
  'proposed_journal_entry',
  'proposed_correction_adjustment',
  'export_manifest',
  'assistance_application',
  'donation',
  'pawket_pal',
  'story_submission',
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

const DOCUMENT_TYPES = Object.freeze({
  order_source: { default_privacy_class: 'financial_sensitive', default_retention_class: 'finance_source' },
  payment_processor_record: { default_privacy_class: 'financial_sensitive', default_retention_class: 'finance_source' },
  refund_record: { default_privacy_class: 'financial_sensitive', default_retention_class: 'finance_source' },
  receipt: { default_privacy_class: 'financial_sensitive', default_retention_class: 'tax_support' },
  invoice: { default_privacy_class: 'financial_sensitive', default_retention_class: 'tax_support' },
  supplier_invoice: { default_privacy_class: 'financial_sensitive', default_retention_class: 'tax_support' },
  shipping_label: { default_privacy_class: 'customer_sensitive', default_retention_class: 'operations_source' },
  bank_statement: { default_privacy_class: 'financial_sensitive', default_retention_class: 'tax_support' },
  donor_record: { default_privacy_class: 'donor_sensitive', default_retention_class: 'foundation_support' },
  donor_acknowledgment: { default_privacy_class: 'donor_sensitive', default_retention_class: 'foundation_support' },
  donation_platform_record: { default_privacy_class: 'donor_sensitive', default_retention_class: 'foundation_support' },
  charm_assistance_application: { default_privacy_class: 'assistance_sensitive', default_retention_class: 'foundation_sensitive' },
  charm_assistance_award: { default_privacy_class: 'assistance_sensitive', default_retention_class: 'foundation_sensitive' },
  charm_assistance_payment_proof: { default_privacy_class: 'assistance_sensitive', default_retention_class: 'foundation_sensitive' },
  cherish_program_record: { default_privacy_class: 'minor_or_family_sensitive', default_retention_class: 'foundation_sensitive' },
  restricted_fund_document: { default_privacy_class: 'financial_sensitive', default_retention_class: 'foundation_support' },
  contract: { default_privacy_class: 'legal_confidential', default_retention_class: 'legal_support' },
  creator_rights_assignment: { default_privacy_class: 'legal_confidential', default_retention_class: 'legal_support' },
  insurance_referral_partner_record: { default_privacy_class: 'partner_confidential', default_retention_class: 'partner_support' },
  care_credit_rule_record: { default_privacy_class: 'financial_sensitive', default_retention_class: 'program_rule' },
  calculation_rule_record: { default_privacy_class: 'financial_sensitive', default_retention_class: 'program_rule' },
  pawket_pal_story_consent: { default_privacy_class: 'story_sensitive', default_retention_class: 'privacy_consent' },
  pawket_pal_asset_record: { default_privacy_class: 'story_sensitive', default_retention_class: 'asset_support' },
  public_impact_proof: { default_privacy_class: 'public', default_retention_class: 'impact_support' },
  export_manifest: { default_privacy_class: 'internal', default_retention_class: 'export_support' },
  other: { default_privacy_class: 'internal', default_retention_class: 'general_support' },
});

const REQUIREMENT_TO_DOCUMENT_TYPES = Object.freeze({
  order_source_evidence: ['order_source'],
  payment_source_evidence: ['payment_processor_record'],
  refund_source_evidence: ['refund_record'],
  donor_source_evidence: ['donor_record'],
  donor_acknowledgment_review: ['donor_acknowledgment'],
  pledge_rule_source_evidence: ['calculation_rule_record'],
  care_credit_rule_source_evidence: ['care_credit_rule_record'],
  customer_account_reference: ['order_source'],
  source_order_or_campaign: ['order_source'],
  transfer_status_reference: ['restricted_fund_document'],
  original_order_reference: ['order_source'],
  reward_source_evidence: ['order_source'],
  inventory_source_evidence: ['supplier_invoice'],
  subscription_source_evidence: ['order_source'],
  receipt_or_invoice: ['receipt', 'invoice'],
  consent_privacy_review_reference: ['pawket_pal_story_consent'],
  story_asset_heartcode_source_reference: ['pawket_pal_asset_record'],
  ip_rights_review_reference: ['creator_rights_assignment'],
});

const JOURNAL_REQUIREMENTS = Object.freeze({
  sale: ['order_source'],
  payment: ['payment_processor_record'],
  refund: ['refund_record'],
  donation: ['donor_record'],
  pledge: ['calculation_rule_record'],
  care_credit_liability: ['care_credit_rule_record'],
  reward_cost: ['order_source'],
  subscription: ['order_source'],
  packet_sale: ['order_source'],
  pack_sale: ['order_source'],
  impact_nonfinancial: ['pawket_pal_story_consent'],
  asset_review_nonfinancial: ['pawket_pal_asset_record'],
  adjustment: ['calculation_rule_record'],
  correction: ['calculation_rule_record'],
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
    throw new Error('Pawket Admin evidence files must not be placed under public/.');
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

function sourceDocumentMetadataPath(vaultPath) {
  return path.join(vaultPath, 'documents', 'source-document-metadata.ndjson');
}

function evidenceDeferralsPath(vaultPath) {
  return path.join(vaultPath, 'documents', 'evidence-deferrals.ndjson');
}

function commitEvidenceManifestsPath(vaultPath) {
  return path.join(vaultPath, 'manifests', 'commit-evidence-manifests.ndjson');
}

function ensureEvidenceDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'documents'), { recursive: true });
  fs.mkdirSync(path.join(vaultPath, 'manifests'), { recursive: true });
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function latestById(records, idField) {
  const latest = new Map();
  for (const record of records) {
    latest.set(record[idField], record);
  }
  return [...latest.values()];
}

function hasRawDocumentContentFields(record, trail = []) {
  if (Array.isArray(record)) {
    return record.some((item, index) => hasRawDocumentContentFields(item, [...trail, String(index)]));
  }

  if (!isPlainObject(record)) {
    return false;
  }

  return Object.entries(record).some(([key, value]) => (
    RAW_DOCUMENT_CONTENT_FIELDS.has(key) || hasRawDocumentContentFields(value, [...trail, key])
  ));
}

function assertNoRawDocumentContent(record) {
  if (hasRawDocumentContentFields(record)) {
    throw new Error('Raw document content must not be stored in source document metadata.');
  }
}

function documentDefaultRedactionState(privacyClass) {
  if (privacyClass === 'public') {
    return 'public_safe';
  }
  if (privacyClass === 'internal') {
    return 'none_required';
  }
  return 'pending_review';
}

function normalizeLink(link) {
  if (!isPlainObject(link)) {
    throw new Error('Document link must be an object.');
  }

  const targetType = link.target_type || link.record_type;
  const targetId = link.target_id || link.record_id;
  if (!LINK_TARGET_TYPES.has(targetType)) {
    throw new Error(`Unsupported link target_type: ${targetType}.`);
  }
  if (!targetId || typeof targetId !== 'string') {
    throw new Error('Document link target_id is required.');
  }

  return {
    target_type: targetType,
    target_id: targetId,
    relationship: link.relationship || 'supporting_evidence',
    linked_at: link.linked_at || nowIso(),
  };
}

function normalizeLinks(links = []) {
  if (!Array.isArray(links)) {
    throw new Error('linked_record_ids must be an array.');
  }
  return links.map(normalizeLink);
}

function documentLinkKey(link) {
  return `${link.target_type}:${link.target_id}:${link.relationship || 'supporting_evidence'}`;
}

function targetIdentity(target) {
  if (!isPlainObject(target)) {
    return null;
  }

  const pairs = [
    ['proposed_journal_entry', 'proposed_journal_entry_id'],
    ['proposed_ledger_record', 'proposed_ledger_record_id'],
    ['draft_finance_record', 'draft_record_id'],
    ['review_item', 'review_item_id'],
    ['staged_event', 'staged_event_id'],
    ['proposed_correction_adjustment', 'proposed_correction_adjustment_id'],
    ['export_manifest', 'manifest_id'],
    ['assistance_application', 'assistance_application_id'],
    ['donation', 'donation_id'],
    ['pawket_pal', 'pawket_pal_id'],
    ['story_submission', 'story_submission_id'],
  ];

  for (const [target_type, field] of pairs) {
    if (target[field]) {
      return { target_type, target_id: target[field] };
    }
  }

  if (target.target_type && target.target_id) {
    return { target_type: target.target_type, target_id: target.target_id };
  }

  return null;
}

function documentLinksTarget(document, target) {
  const identity = targetIdentity(target);
  const targetDocumentLinks = new Set(target?.document_links || target?.linked_document_ids || []);

  if (targetDocumentLinks.has(document.document_id)) {
    return true;
  }

  if (!identity) {
    return targetDocumentLinks.size === 0;
  }

  return (document.linked_record_ids || []).some((link) => (
    link.target_type === identity.target_type && link.target_id === identity.target_id
  ));
}

function mapRequirementToDocumentTypes(requirement) {
  if (DOCUMENT_TYPES[requirement]) {
    return [requirement];
  }
  return REQUIREMENT_TO_DOCUMENT_TYPES[requirement] || [];
}

function normalizeDocumentRequirements(requirements = []) {
  const mapped = [];
  for (const requirement of requirements) {
    mapped.push(...mapRequirementToDocumentTypes(requirement));
  }
  return unique(mapped);
}

function isDeferralActive(deferral, target, missingRequirement, validationDate = nowIso()) {
  if (!isPlainObject(deferral) || deferral.status !== 'approved') {
    return false;
  }

  const identity = targetIdentity(target);
  if (!identity || deferral.target_type !== identity.target_type || deferral.target_id !== identity.target_id) {
    return false;
  }

  const coversRequirement = deferral.missing_requirement === missingRequirement ||
    mapRequirementToDocumentTypes(deferral.missing_requirement).includes(missingRequirement);
  if (!coversRequirement) {
    return false;
  }

  if (deferral.expires_at && Date.parse(deferral.expires_at) <= Date.parse(validationDate)) {
    return false;
  }

  return true;
}

function isDocumentUsable(document) {
  return document.evidence_status === 'complete' && document.redaction_state !== 'blocked';
}

function isSensitivePrivacyClass(privacyClass) {
  return !['public', 'internal'].includes(privacyClass);
}

function privacyWarningForDocument(document) {
  if (document.redaction_state === 'blocked') {
    return `Document ${document.document_id} is privacy blocked.`;
  }
  if (['export_restricted', 'private_internal_only'].includes(document.redaction_state)) {
    return `Document ${document.document_id} is ${document.redaction_state}.`;
  }
  if (isSensitivePrivacyClass(document.privacy_class)) {
    return `Document ${document.document_id} is ${document.privacy_class}.`;
  }
  return null;
}

function redactionWarningForDocument(document) {
  if (['pending_review', 'redaction_required', 'export_restricted', 'private_internal_only', 'blocked'].includes(document.redaction_state)) {
    return `Document ${document.document_id} redaction_state is ${document.redaction_state}.`;
  }
  return null;
}

function computeRecordHash(record, hashField) {
  const { [hashField]: _hash, ...payload } = record;
  return sha256Hex(canonicalize(payload));
}

export function getSupportedDocumentTypes() {
  return Object.fromEntries(
    Object.entries(DOCUMENT_TYPES).map(([document_type, config]) => [document_type, { document_type, ...config }])
  );
}

export function calculateDocumentHash(bufferOrString, algorithm = 'sha256') {
  if (!SUPPORTED_HASH_ALGORITHMS.has(algorithm)) {
    throw new Error(`Unsupported hash algorithm: ${algorithm}.`);
  }

  const input = Buffer.isBuffer(bufferOrString) ? bufferOrString : String(bufferOrString);
  return crypto.createHash(algorithm).update(input).digest('hex');
}

export function validateSourceDocumentMetadata(document) {
  const errors = [];

  if (!isPlainObject(document)) {
    return { ok: false, errors: ['Source document metadata must be an object.'] };
  }

  if (hasRawDocumentContentFields(document)) {
    errors.push('Source document metadata must not include raw document content fields.');
  }

  for (const field of ['document_id', 'document_type', 'privacy_class', 'retention_class', 'evidence_status']) {
    if (!document[field] || typeof document[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (!document.document_title && !document.file_name) {
    errors.push('document_title or file_name is required.');
  }

  if (document.document_type && !DOCUMENT_TYPES[document.document_type]) {
    errors.push(`Unsupported document_type: ${document.document_type}.`);
  }

  if (document.privacy_class && !PRIVACY_CLASSES.has(document.privacy_class)) {
    errors.push(`Unsupported privacy_class: ${document.privacy_class}.`);
  }

  if (document.redaction_state && !REDACTION_STATES.has(document.redaction_state)) {
    errors.push(`Unsupported redaction_state: ${document.redaction_state}.`);
  }

  if (!document.redaction_state) {
    errors.push('redaction_state is required.');
  }

  if (document.evidence_status && !EVIDENCE_STATUSES.has(document.evidence_status)) {
    errors.push(`Unsupported evidence_status: ${document.evidence_status}.`);
  }

  if (document.file_hash) {
    if (!document.hash_algorithm) {
      errors.push('hash_algorithm is required when file_hash is provided.');
    } else if (!SUPPORTED_HASH_ALGORITHMS.has(document.hash_algorithm)) {
      errors.push(`Unsupported hash_algorithm: ${document.hash_algorithm}.`);
    } else if (!SHA_HEX_BY_ALGORITHM[document.hash_algorithm].test(document.file_hash)) {
      errors.push(`file_hash must be a ${document.hash_algorithm} hex string.`);
    }
  }

  if (document.file_size_bytes !== undefined && (!Number.isInteger(document.file_size_bytes) || document.file_size_bytes < 0)) {
    errors.push('file_size_bytes must be a non-negative integer.');
  }

  if (document.file_name && (document.file_name.includes('/') || document.file_name.includes('\\'))) {
    errors.push('file_name must not include a path.');
  }

  if (document.blob_ref_placeholder && /(^|[/\\])public([/\\]|$)/i.test(document.blob_ref_placeholder)) {
    errors.push('blob_ref_placeholder must not point under public/.');
  }

  if (document.linked_record_ids) {
    try {
      normalizeLinks(document.linked_record_ids);
    } catch (error) {
      errors.push(error.message);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function createSourceDocumentMetadata(input, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error('Source document metadata input is required.');
  }
  assertNoRawDocumentContent(input);

  if (options.vaultPath) {
    assertAllowedVaultPath(options.vaultPath);
  }
  if (input.local_path) {
    assertAllowedVaultPath(input.local_path);
  }

  const createdAt = input.created_at || options.created_at || nowIso();
  const updatedAt = input.updated_at || createdAt;
  const documentType = input.document_type;
  const defaults = DOCUMENT_TYPES[documentType] || {};

  const identityPayload = {
    document_type: documentType,
    document_title: input.document_title || input.file_name,
    source_system: input.source_system || '',
    source_record_id: input.source_record_id || '',
    file_hash: input.file_hash || '',
  };

  const document = {
    document_id: input.document_id || `doc_${sha256Hex(canonicalize(identityPayload)).slice(0, 16)}`,
    document_type: documentType,
    document_title: input.document_title || input.file_name,
    source_system: input.source_system || '',
    source_record_id: input.source_record_id || '',
    entity_id: input.entity_id || '',
    fund_id: input.fund_id || '',
    class_id: input.class_id || '',
    related_customer_ref: input.related_customer_ref || null,
    related_vendor_ref: input.related_vendor_ref || null,
    related_order_ref: input.related_order_ref || null,
    related_payment_ref: input.related_payment_ref || null,
    related_donation_ref: input.related_donation_ref || null,
    related_assistance_ref: input.related_assistance_ref || null,
    related_story_ref: input.related_story_ref || null,
    related_pawket_pal_ref: input.related_pawket_pal_ref || null,
    file_name: input.file_name || '',
    file_mime_type: input.file_mime_type || '',
    file_size_bytes: input.file_size_bytes,
    file_hash: input.file_hash || '',
    blob_ref_placeholder: input.blob_ref_placeholder || '',
    hash_algorithm: input.file_hash ? (input.hash_algorithm || 'sha256') : (input.hash_algorithm || ''),
    document_date: input.document_date || '',
    received_at: input.received_at || createdAt,
    uploaded_by: input.uploaded_by || options.uploaded_by || '',
    retention_class: input.retention_class || defaults.default_retention_class || '',
    privacy_class: input.privacy_class || defaults.default_privacy_class || '',
    redaction_state: input.redaction_state || documentDefaultRedactionState(input.privacy_class || defaults.default_privacy_class),
    evidence_status: input.evidence_status || '',
    export_allowlist_tags: unique(input.export_allowlist_tags || []),
    linked_record_ids: normalizeLinks(input.linked_record_ids || []),
    notes: input.notes || '',
    created_at: createdAt,
    updated_at: updatedAt,
    evidence_version: EVIDENCE_VERSION,
  };

  const validation = validateSourceDocumentMetadata(document);
  if (!validation.ok) {
    throw new Error(`Invalid source document metadata: ${validation.errors.join(' ')}`);
  }

  return document;
}

export function linkDocumentToRecord(document, link) {
  const validation = validateSourceDocumentMetadata(document);
  if (!validation.ok) {
    throw new Error(`Invalid source document metadata: ${validation.errors.join(' ')}`);
  }

  const normalizedLink = normalizeLink(link);
  const existingLinks = normalizeLinks(document.linked_record_ids || []);
  const linksByKey = new Map(existingLinks.map((candidate) => [documentLinkKey(candidate), candidate]));
  linksByKey.set(documentLinkKey(normalizedLink), normalizedLink);

  return {
    ...document,
    linked_record_ids: [...linksByKey.values()],
    updated_at: link.linked_at || nowIso(),
  };
}

export function getEvidenceRequirementsForTarget(target, rules = getDocumentCoverageRules()) {
  if (!isPlainObject(target)) {
    throw new Error('Evidence target is required.');
  }

  if (Array.isArray(target.required_document_types) && target.required_document_types.length) {
    return normalizeDocumentRequirements(target.required_document_types);
  }

  const explicitRequirements = [
    ...(target.document_requirements || []),
    ...(target.required_documents || []),
  ];
  if (explicitRequirements.length) {
    return normalizeDocumentRequirements(explicitRequirements);
  }

  if (target.draft_type && rules[target.draft_type]) {
    return normalizeDocumentRequirements(rules[target.draft_type].required_documents || []);
  }

  if (target.journal_type && JOURNAL_REQUIREMENTS[target.journal_type]) {
    return normalizeDocumentRequirements(JOURNAL_REQUIREMENTS[target.journal_type]);
  }

  if (target.is_non_financial && target.source_event_ids?.some((eventId) => /story/i.test(eventId))) {
    return ['pawket_pal_story_consent'];
  }

  return [];
}

export function evaluateEvidenceCoverage(target, documents = [], rules = getDocumentCoverageRules(), deferrals = [], options = {}) {
  if (!Array.isArray(documents)) {
    throw new Error('documents must be an array.');
  }
  if (!Array.isArray(deferrals)) {
    throw new Error('deferrals must be an array.');
  }

  const requiredDocumentTypes = getEvidenceRequirementsForTarget(target, rules);
  const linkedDocuments = documents.filter((document) => documentLinksTarget(document, target));
  const linkedDocumentIds = unique(linkedDocuments.map((document) => document.document_id));
  const missingDocumentTypes = [];
  const deferredRequirements = [];
  const rejectedDocumentIds = [];
  const privacyWarnings = [];
  const redactionWarnings = [];
  const riskFlags = new Set();

  if (!requiredDocumentTypes.length) {
    return {
      coverage_status: 'not_required',
      required_document_types: [],
      linked_document_ids: linkedDocumentIds,
      missing_document_types: [],
      deferred_requirements: [],
      rejected_document_ids: [],
      privacy_warnings: [],
      redaction_warnings: [],
      risk_flags: [],
    };
  }

  for (const document of linkedDocuments) {
    const privacyWarning = privacyWarningForDocument(document);
    const redactionWarning = redactionWarningForDocument(document);
    if (privacyWarning) {
      privacyWarnings.push(privacyWarning);
      riskFlags.add('privacy_review_needed');
    }
    if (redactionWarning) {
      redactionWarnings.push(redactionWarning);
      riskFlags.add('redaction_required');
    }
  }

  for (const requiredType of requiredDocumentTypes) {
    const candidateDocuments = linkedDocuments.filter((document) => document.document_type === requiredType);
    const rejected = candidateDocuments.filter((document) => document.evidence_status === 'rejected');
    rejectedDocumentIds.push(...rejected.map((document) => document.document_id));

    const usable = candidateDocuments.filter(isDocumentUsable);
    if (usable.length) {
      continue;
    }

    const activeDeferral = deferrals.find((deferral) => (
      isDeferralActive(deferral, target, requiredType, options.validationDate || nowIso())
    ));
    if (activeDeferral) {
      deferredRequirements.push(activeDeferral);
      riskFlags.add('evidence_deferral');
      continue;
    }

    missingDocumentTypes.push(requiredType);
    riskFlags.add('missing_document');
  }

  let coverageStatus = 'complete';
  if (linkedDocuments.some((document) => document.redaction_state === 'blocked')) {
    coverageStatus = 'privacy_blocked';
    riskFlags.add('privacy_blocked');
  } else if (missingDocumentTypes.length && rejectedDocumentIds.length) {
    coverageStatus = 'rejected';
    riskFlags.add('rejected_evidence');
  } else if (missingDocumentTypes.length) {
    coverageStatus = (linkedDocumentIds.length || deferredRequirements.length) ? 'partial' : 'missing';
  } else if (redactionWarnings.length) {
    coverageStatus = 'redaction_required';
  } else if (deferredRequirements.length) {
    coverageStatus = 'deferred_approved';
  }

  return {
    coverage_status: coverageStatus,
    required_document_types: requiredDocumentTypes,
    linked_document_ids: linkedDocumentIds,
    missing_document_types: unique(missingDocumentTypes),
    deferred_requirements: deferredRequirements,
    rejected_document_ids: unique(rejectedDocumentIds),
    privacy_warnings: unique(privacyWarnings),
    redaction_warnings: unique(redactionWarnings),
    risk_flags: unique([...riskFlags]),
  };
}

export function createEvidenceDeferral(input, actor = {}) {
  if (!isPlainObject(input)) {
    throw new Error('Evidence deferral input is required.');
  }

  const approvedBy = input.approved_by || actor.actor_id;
  const approverRole = input.approver_role || actor.role;
  const approvedAt = input.approved_at || actor.timestamp || nowIso();
  const payloadForId = {
    target_type: input.target_type,
    target_id: input.target_id,
    missing_requirement: input.missing_requirement,
    approved_by: approvedBy,
    approved_at: approvedAt,
  };

  const deferral = {
    deferral_id: input.deferral_id || `deferral_${sha256Hex(canonicalize(payloadForId)).slice(0, 16)}`,
    target_type: input.target_type,
    target_id: input.target_id,
    missing_requirement: input.missing_requirement,
    reason: input.reason,
    approved_by: approvedBy,
    approver_role: approverRole,
    approved_at: approvedAt,
    expires_at: input.expires_at || '',
    review_due_at: input.review_due_at || '',
    risk_flags: unique(input.risk_flags || []),
    replacement_document_expected: input.replacement_document_expected || '',
    audit_event_id: input.audit_event_id || '',
    status: input.status || 'approved',
    evidence_version: EVIDENCE_VERSION,
  };

  const validation = validateEvidenceDeferral(deferral);
  if (!validation.ok) {
    throw new Error(`Invalid evidence deferral: ${validation.errors.join(' ')}`);
  }

  return {
    ...deferral,
    audit_event_payload: {
      action: 'evidence_deferral_created',
      target_type: deferral.target_type,
      target_id: deferral.target_id,
      reason: deferral.reason,
      metadata: {
        deferral_id: deferral.deferral_id,
        missing_requirement: deferral.missing_requirement,
        status: deferral.status,
      },
    },
  };
}

export function validateEvidenceDeferral(deferral, options = {}) {
  const errors = [];

  if (!isPlainObject(deferral)) {
    return { ok: false, errors: ['Evidence deferral must be an object.'] };
  }

  for (const field of ['target_type', 'target_id', 'missing_requirement', 'reason', 'approved_by', 'approver_role', 'status']) {
    if (!deferral[field] || typeof deferral[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (deferral.target_type && !LINK_TARGET_TYPES.has(deferral.target_type)) {
    errors.push(`Unsupported deferral target_type: ${deferral.target_type}.`);
  }

  if (deferral.status && !DEFERRAL_STATUSES.has(deferral.status)) {
    errors.push(`Unsupported deferral status: ${deferral.status}.`);
  }

  const validationDate = options.validationDate || options.validation_date;
  if (validationDate && deferral.expires_at && Date.parse(deferral.expires_at) <= Date.parse(validationDate)) {
    errors.push('Evidence deferral is expired.');
  }

  return { ok: errors.length === 0, errors };
}

export function createCommitEvidenceManifest(proposedJournalEntry, documents = [], coverageResult, actor = {}) {
  if (!isPlainObject(proposedJournalEntry)) {
    throw new Error('Proposed journal entry is required.');
  }
  if (!isPlainObject(coverageResult)) {
    throw new Error('Coverage result is required.');
  }

  const generatedAt = actor.timestamp || nowIso();
  const manifest = {
    manifest_id: `commit_evidence_${safeFileId(proposedJournalEntry.proposed_journal_entry_id || 'unassigned', 'proposed_journal_entry_id')}`,
    proposed_journal_entry_id: proposedJournalEntry.proposed_journal_entry_id,
    source_proposed_ledger_record_ids: unique(proposedJournalEntry.source_proposed_ledger_record_ids || []),
    source_draft_record_ids: unique(proposedJournalEntry.source_draft_record_ids || []),
    source_event_ids: unique(proposedJournalEntry.source_event_ids || []),
    source_bundle_ids: unique(proposedJournalEntry.source_bundle_ids || []),
    required_document_types: unique(coverageResult.required_document_types || []),
    linked_document_ids: unique(coverageResult.linked_document_ids || documents.map((document) => document.document_id)),
    missing_document_types: unique(coverageResult.missing_document_types || []),
    deferred_requirements: coverageResult.deferred_requirements || [],
    redaction_warnings: unique(coverageResult.redaction_warnings || []),
    privacy_warnings: unique(coverageResult.privacy_warnings || []),
    coverage_status: coverageResult.coverage_status,
    generated_by: actor.actor_id || 'system',
    generated_role: actor.role || 'system',
    generated_at: generatedAt,
    evidence_version: EVIDENCE_VERSION,
  };

  manifest.manifest_hash = computeRecordHash(manifest, 'manifest_hash');
  return manifest;
}

export function writeSourceDocumentMetadata(vaultPathInput, document, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureEvidenceDirs(vaultPath);
  const validation = validateSourceDocumentMetadata(document);
  if (!validation.ok) {
    throw new Error(`Invalid source document metadata: ${validation.errors.join(' ')}`);
  }

  appendJsonLine(sourceDocumentMetadataPath(vaultPath), document);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || nowIso(),
    actor_id: actor.actor_id || document.uploaded_by || 'system',
    role: actor.role || 'system',
    action: 'source_document_metadata_written',
    target_type: 'source_document',
    target_id: document.document_id,
    reason: actor.reason || 'Source document metadata written without raw document content.',
    metadata: {
      document_type: document.document_type,
      privacy_class: document.privacy_class,
      evidence_status: document.evidence_status,
      raw_document_content_stored: false,
    },
  });

  return { document, audit_event: auditEvent };
}

export function writeEvidenceDeferral(vaultPathInput, deferral, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureEvidenceDirs(vaultPath);
  const validation = validateEvidenceDeferral(deferral);
  if (!validation.ok) {
    throw new Error(`Invalid evidence deferral: ${validation.errors.join(' ')}`);
  }

  appendJsonLine(evidenceDeferralsPath(vaultPath), deferral);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || deferral.approved_at || nowIso(),
    actor_id: actor.actor_id || deferral.approved_by || 'system',
    role: actor.role || deferral.approver_role || 'system',
    action: 'evidence_deferral_written',
    target_type: deferral.target_type,
    target_id: deferral.target_id,
    reason: deferral.reason,
    metadata: {
      deferral_id: deferral.deferral_id,
      missing_requirement: deferral.missing_requirement,
      status: deferral.status,
      removes_original_requirement: false,
    },
  });

  return {
    deferral: {
      ...deferral,
      audit_event_id: deferral.audit_event_id || auditEvent.audit_event_id,
    },
    audit_event: auditEvent,
  };
}

export function writeCommitEvidenceManifest(vaultPathInput, manifest, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureEvidenceDirs(vaultPath);
  if (!isPlainObject(manifest) || !manifest.manifest_id || !manifest.manifest_hash) {
    throw new Error('Commit evidence manifest with manifest_id and manifest_hash is required.');
  }

  appendJsonLine(commitEvidenceManifestsPath(vaultPath), manifest);
  const auditEvent = appendAuditEvent(vaultPath, {
    timestamp: actor.timestamp || manifest.generated_at || nowIso(),
    actor_id: actor.actor_id || manifest.generated_by || 'system',
    role: actor.role || manifest.generated_role || 'system',
    action: 'commit_evidence_manifest_written',
    target_type: 'commit_evidence_manifest',
    target_id: manifest.manifest_id,
    reason: actor.reason || 'Commit evidence manifest written for proposed journal entry.',
    metadata: {
      proposed_journal_entry_id: manifest.proposed_journal_entry_id,
      coverage_status: manifest.coverage_status,
      manifest_hash: manifest.manifest_hash,
      live_ledger_write: false,
    },
  });

  return { manifest, audit_event: auditEvent };
}

export function listSourceDocuments(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const records = filters.includeHistory
    ? readJsonLines(sourceDocumentMetadataPath(vaultPath))
    : latestById(readJsonLines(sourceDocumentMetadataPath(vaultPath)), 'document_id');

  return records.filter((document) => {
    if (filters.document_type && document.document_type !== filters.document_type) {
      return false;
    }
    if (filters.privacy_class && document.privacy_class !== filters.privacy_class) {
      return false;
    }
    if (filters.redaction_state && document.redaction_state !== filters.redaction_state) {
      return false;
    }
    if (filters.evidence_status && document.evidence_status !== filters.evidence_status) {
      return false;
    }
    if (filters.entity_id && document.entity_id !== filters.entity_id) {
      return false;
    }
    if (filters.fund_id && document.fund_id !== filters.fund_id) {
      return false;
    }
    if (filters.class_id && document.class_id !== filters.class_id) {
      return false;
    }
    if (filters.target_type || filters.target_id) {
      return (document.linked_record_ids || []).some((link) => (
        (!filters.target_type || link.target_type === filters.target_type) &&
        (!filters.target_id || link.target_id === filters.target_id)
      ));
    }
    return true;
  });
}

export function verifyNoRawDocumentContentStored(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const presentPaths = [];
  const inspectRoots = [
    path.join(vaultPath, 'documents'),
    path.join(vaultPath, 'manifests'),
  ];

  const inspectFile = (filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const field of RAW_DOCUMENT_CONTENT_FIELDS) {
      if (raw.includes(`"${field}"`)) {
        presentPaths.push(filePath);
        return;
      }
    }
  };

  const walk = (candidatePath) => {
    if (!fs.existsSync(candidatePath)) {
      return;
    }

    const stat = fs.statSync(candidatePath);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(candidatePath)) {
        walk(path.join(candidatePath, child));
      }
      return;
    }

    if (/\.(json|ndjson)$/i.test(candidatePath)) {
      inspectFile(candidatePath);
    }
  };

  for (const root of inspectRoots) {
    walk(root);
  }

  return {
    ok: presentPaths.length === 0,
    present_paths: unique(presentPaths),
  };
}

export function verifyNoPublicPathUsage(vaultPathInput) {
  assertAllowedVaultPath(vaultPathInput);
  return { ok: true, present_paths: [] };
}
