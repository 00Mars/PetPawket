import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import { verifyNoOfficialLiveLedgerWrites } from '../utils/pawketAdminJournalCommitGate.js';
import {
  calculateDocumentHash,
  createCommitEvidenceManifest,
  createSourceDocumentMetadata,
  evaluateEvidenceCoverage,
  linkDocumentToRecord,
} from '../utils/pawketAdminEvidence.js';
import {
  assignRetentionClass,
  createBlobReference,
  createCommitGateEvidenceIntegrationRecord,
  createDocumentVaultIngestionRecord,
  detectDuplicateDocuments,
  getDocumentIngestionPolicy,
  getDocumentVaultStoragePolicy,
  getExportRedactionProfiles,
  getRetentionSchedule,
  transitionDocumentIngestionState,
  validateBlobReference,
  validateCommitGateEvidenceIntegration,
  validateDocumentAgainstExportProfile,
  verifyNoPublicPathUsage,
  verifyNoRawDocumentContentStored,
  writeCommitGateEvidenceIntegrationRecord,
  writeDocumentVaultIngestionRecord,
} from '../utils/pawketAdminDocumentVault.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-document-vault-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_document_vault',
    created_at: '2026-05-28T14:00:00Z',
  });
  return basePath;
}

function proposedJournalEntry(overrides = {}) {
  return {
    proposed_journal_entry_id: 'pje_sale_0001',
    source_proposed_ledger_record_ids: ['proposed_sales_debit_0001', 'proposed_sales_credit_0001'],
    source_review_item_ids: ['review_order_sales_0001'],
    source_draft_record_ids: ['draft_order_sales_0001'],
    source_event_ids: ['source_event_order_created_0001'],
    source_bundle_ids: ['bundle_import_test_0001'],
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    effective_period: '2026-05',
    transaction_date: '2026-05-28',
    description: 'Proposed sale journal entry.',
    journal_type: 'sale',
    currency: 'USD',
    total_debits: 60,
    total_credits: 60,
    balance_status: 'balanced',
    document_coverage_status: 'complete',
    approval_status: 'approved_for_commit_gate',
    commit_status: 'not_committed',
    risk_flags: [],
    created_by: 'finance_admin_example',
    created_at: '2026-05-28T14:00:00Z',
    updated_at: '2026-05-28T14:00:00Z',
    ...overrides,
  };
}

function orderDocument(overrides = {}) {
  return createSourceDocumentMetadata({
    document_id: 'doc_order_1001',
    document_type: 'order_source',
    document_title: 'Order 1001 source evidence',
    source_system: 'petpawket_website_connector',
    source_record_id: 'source_event_order_created_0001',
    entity_id: 'ent_petpawket',
    fund_id: 'fund_operating',
    class_id: 'class_commerce',
    related_order_ref: 'order_1001',
    file_name: 'order-1001-source.json',
    file_mime_type: 'application/json',
    file_size_bytes: 128,
    file_hash: calculateDocumentHash('order-1001-source'),
    hash_algorithm: 'sha256',
    document_date: '2026-05-28',
    received_at: '2026-05-28T14:00:00Z',
    uploaded_by: 'connector_petpawket_website_readonly_v0',
    retention_class: 'accounting_support',
    privacy_class: 'financial_sensitive',
    redaction_state: 'none_required',
    evidence_status: 'complete',
    created_at: '2026-05-28T14:00:00Z',
    updated_at: '2026-05-28T14:00:00Z',
    ...overrides,
  });
}

function publicImpactDocument(overrides = {}) {
  return createSourceDocumentMetadata({
    document_id: 'doc_public_impact_0001',
    document_type: 'public_impact_proof',
    document_title: 'Public-safe impact proof',
    source_system: 'pawket_admin_manual_review',
    source_record_id: 'impact_claim_0001',
    file_name: 'impact-proof-0001.json',
    file_mime_type: 'application/json',
    file_size_bytes: 80,
    file_hash: calculateDocumentHash('public-impact-proof'),
    hash_algorithm: 'sha256',
    document_date: '2026-05-28',
    uploaded_by: 'finance_admin_example',
    retention_class: 'public_impact_proof',
    privacy_class: 'public',
    redaction_state: 'public_safe',
    evidence_status: 'complete',
    created_at: '2026-05-28T14:05:00Z',
    updated_at: '2026-05-28T14:05:00Z',
    ...overrides,
  });
}

function blobReference(overrides = {}) {
  return createBlobReference({
    blob_ref_id: 'blobref_doc_order_1001',
    document_id: 'doc_order_1001',
    storage_provider: 'local_metadata_only',
    vault_relative_path: 'documents/2026/05',
    encrypted_blob_name: 'doc_order_1001.enc',
    blob_hash: calculateDocumentHash('encrypted-placeholder-bytes'),
    plaintext_hash_if_allowed_placeholder: '',
    encryption_status: 'metadata_only',
    encryption_algorithm_placeholder: '',
    key_id_placeholder: '',
    blob_size_bytes: 256,
    content_type: 'application/json',
    storage_status: 'reference_created',
    retention_class: 'accounting_support',
    privacy_class: 'financial_sensitive',
    created_at: '2026-05-28T14:00:00Z',
    updated_at: '2026-05-28T14:00:00Z',
    ...overrides,
  });
}

function completeManifest(documents = []) {
  const target = proposedJournalEntry();
  const linkedDocuments = documents.length ? documents : [
    linkDocumentToRecord(orderDocument(), {
      target_type: 'proposed_journal_entry',
      target_id: target.proposed_journal_entry_id,
    }),
  ];
  const coverage = evaluateEvidenceCoverage(target, linkedDocuments);
  return createCommitEvidenceManifest(target, linkedDocuments, coverage, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:10:00Z',
  });
}

test('storage policy loads', () => {
  const policy = getDocumentVaultStoragePolicy();

  assert.equal(policy.metadata_only_current_phase, true);
  assert.equal(policy.production_encryption_implemented, false);
  assert.ok(policy.supported_encryption_statuses.includes('metadata_only'));
  assert.ok(policy.allowed_storage_providers.includes('local_metadata_only'));
});

test('blob reference validates', () => {
  const ref = blobReference();
  const validation = validateBlobReference(ref);

  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.equal(ref.encryption_status, 'metadata_only');
});

test('blob reference rejects public path', () => {
  assert.throws(
    () => blobReference({ vault_relative_path: 'public/documents' }),
    /public/i
  );
});

test('blob reference rejects unsupported encryption status', () => {
  assert.throws(
    () => blobReference({ encryption_status: 'plaintext_uploaded' }),
    /unsupported encryption_status/i
  );
});

test('duplicate detection by hash works', () => {
  const sharedHash = calculateDocumentHash('same-file');
  const first = orderDocument({ document_id: 'doc_dup_1', file_hash: sharedHash });
  const second = orderDocument({ document_id: 'doc_dup_2', file_hash: sharedHash });
  const third = orderDocument({ document_id: 'doc_unique', file_hash: calculateDocumentHash('unique-file') });

  const result = detectDuplicateDocuments([first, second, third], { includeMetadataMatch: false });

  assert.equal(result.duplicate_groups.length >= 1, true);
  assert.equal(result.duplicate_groups[0].document_ids.includes('doc_dup_1'), true);
  assert.equal(result.duplicate_groups[0].document_ids.includes('doc_dup_2'), true);
  assert.deepEqual(result.unique_documents.map((document) => document.document_id), ['doc_unique']);
});

test('ingestion policy transitions valid path', () => {
  const policy = getDocumentIngestionPolicy();
  assert.ok(policy.states.includes('manifest_eligible'));

  let record = { ingestion_id: 'ingest_doc_order_1001', ingestion_state: 'declared' };
  for (const state of ['metadata_validated', 'duplicate_checked', 'privacy_classified', 'retention_assigned', 'redaction_checked', 'blob_reference_created', 'evidence_linked', 'manifest_eligible']) {
    record = transitionDocumentIngestionState(record, state, {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
      timestamp: '2026-05-28T14:15:00Z',
      reason: `Advance to ${state}.`,
    });
  }

  assert.equal(record.ingestion_state, 'manifest_eligible');
  assert.equal(record.transition_history.length, 8);
});

test('invalid ingestion transition is rejected', () => {
  assert.throws(
    () => transitionDocumentIngestionState({ ingestion_id: 'ingest_1', ingestion_state: 'declared' }, 'manifest_eligible'),
    /invalid document ingestion transition/i
  );
});

test('retention class assigned for donor support story and legal docs', () => {
  const donor = assignRetentionClass(orderDocument({ document_type: 'donor_record', retention_class: 'donor_support', privacy_class: 'donor_sensitive' }));
  const story = assignRetentionClass(orderDocument({ document_type: 'pawket_pal_story_consent', retention_class: 'story_consent', privacy_class: 'story_sensitive' }));
  const legal = assignRetentionClass(orderDocument({ document_type: 'creator_rights_assignment', retention_class: 'creator_ip_rights', privacy_class: 'legal_confidential' }));
  const schedule = getRetentionSchedule();

  assert.equal(donor.retention_class, 'donor_support');
  assert.equal(story.retention_class, 'story_consent');
  assert.equal(legal.retention_class, 'creator_ip_rights');
  assert.equal(donor.review_required.includes('tax'), true);
  assert.ok(schedule.legal_contract);
});

test('export profile blocks sensitive private doc for public impact report', () => {
  const profiles = getExportRedactionProfiles();
  const result = validateDocumentAgainstExportProfile(orderDocument({
    privacy_class: 'donor_sensitive',
    document_type: 'donor_record',
    redaction_state: 'none_required',
  }), profiles.public_impact_report);

  assert.equal(result.allowed, false);
  assert.match(result.blockers.join('\n'), /public impact reports cannot include private/i);
});

test('export profile allows public safe proof for public impact report', () => {
  const result = validateDocumentAgainstExportProfile(publicImpactDocument(), getExportRedactionProfiles().public_impact_report);

  assert.equal(result.allowed, true, result.blockers.join('\n'));
  assert.equal(result.redaction_required, false);
});

test('accountant pack allows financial sensitive metadata with controlled profile', () => {
  const result = validateDocumentAgainstExportProfile(orderDocument(), getExportRedactionProfiles().accountant_pack);

  assert.equal(result.allowed, true, result.blockers.join('\n'));
  assert.equal(result.blob_access_allowed, true);
});

test('document vault ingestion record does not store raw content', () => {
  const record = createDocumentVaultIngestionRecord(orderDocument(), blobReference(), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:20:00Z',
  });

  assert.equal(record.raw_document_content_stored, false);
  assert.equal(record.document_id, 'doc_order_1001');
  assert.equal(record.blob_ref_id, 'blobref_doc_order_1001');
  assert.throws(
    () => createBlobReference({
      document_id: 'doc_bad',
      storage_provider: 'local_metadata_only',
      vault_relative_path: 'documents',
      encrypted_blob_name: 'doc_bad.enc',
      privacy_class: 'financial_sensitive',
      retention_class: 'accounting_support',
      raw_content: 'nope',
    }),
    /raw document content/i
  );
});

test('ingestion write appends audit event', () => {
  const vaultPath = makeTempVault();
  const record = createDocumentVaultIngestionRecord(orderDocument(), blobReference(), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:20:00Z',
  });

  writeDocumentVaultIngestionRecord(vaultPath, record, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:21:00Z',
  });

  assert.equal(fs.existsSync(path.join(vaultPath, 'documents', 'document-vault-ingestion.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('commit gate evidence integration flags missing evidence', () => {
  const entry = proposedJournalEntry();
  const manifest = createCommitEvidenceManifest(entry, [], evaluateEvidenceCoverage(entry, []), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:30:00Z',
  });
  const integration = createCommitGateEvidenceIntegrationRecord(entry, manifest, [], {}, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  assert.equal(integration.commit_blockers.length > 0, true);
  assert.equal(validateCommitGateEvidenceIntegration(integration).ok, false);
});

test('commit gate evidence integration accepts complete evidence', () => {
  const entry = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: entry.proposed_journal_entry_id,
  });
  const manifest = completeManifest([document]);
  const integration = createCommitGateEvidenceIntegrationRecord(entry, manifest, [document], {}, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });
  const validation = validateCommitGateEvidenceIntegration(integration);

  assert.equal(integration.coverage_status, 'complete');
  assert.equal(integration.commit_blockers.length, 0);
  assert.equal(validation.ok, true, validation.errors.join('\n'));
});

test('redaction and privacy blockers are preserved', () => {
  const entry = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument({
    document_id: 'doc_sensitive_redaction',
    privacy_class: 'customer_sensitive',
    redaction_state: 'redaction_required',
  }), {
    target_type: 'proposed_journal_entry',
    target_id: entry.proposed_journal_entry_id,
  });
  const coverage = evaluateEvidenceCoverage(entry, [document]);
  const manifest = createCommitEvidenceManifest(entry, [document], coverage, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:35:00Z',
  });

  const integration = createCommitGateEvidenceIntegrationRecord(entry, manifest, [document], getExportRedactionProfiles(), {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  assert.equal(integration.privacy_warnings.length > 0, true);
  assert.equal(integration.redaction_warnings.length > 0, true);
  assert.match(integration.commit_blockers.join('\n'), /redaction/i);
});

test('integration write appends audit event', () => {
  const vaultPath = makeTempVault();
  const entry = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: entry.proposed_journal_entry_id,
  });
  const integration = createCommitGateEvidenceIntegrationRecord(entry, completeManifest([document]), [document], {}, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:40:00Z',
  });

  writeCommitGateEvidenceIntegrationRecord(vaultPath, integration, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T14:41:00Z',
  });

  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'commit-gate-evidence-integration.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('no raw document content is stored', () => {
  const vaultPath = makeTempVault();
  const record = createDocumentVaultIngestionRecord(orderDocument(), blobReference());
  writeDocumentVaultIngestionRecord(vaultPath, record);

  assert.equal(verifyNoRawDocumentContentStored(vaultPath).ok, true);
});

test('document vault operations do not create live ledger writes', () => {
  const vaultPath = makeTempVault();
  const record = createDocumentVaultIngestionRecord(orderDocument(), blobReference());
  writeDocumentVaultIngestionRecord(vaultPath, record);

  const liveLedgerCheck = verifyNoOfficialLiveLedgerWrites(vaultPath);
  assert.equal(liveLedgerCheck.ok, true);
  assert.deepEqual(liveLedgerCheck.present_paths, []);
});

test('Pawket Admin document vault files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-document-vault-public-test', 'public', 'finance');

  assert.throws(
    () => writeDocumentVaultIngestionRecord(publicPath, createDocumentVaultIngestionRecord(orderDocument(), blobReference())),
    /must not be placed under public/i
  );
  assert.throws(
    () => verifyNoPublicPathUsage(publicPath),
    /must not be placed under public/i
  );
});
