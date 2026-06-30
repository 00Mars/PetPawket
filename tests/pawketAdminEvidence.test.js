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
  createEvidenceDeferral,
  createSourceDocumentMetadata,
  evaluateEvidenceCoverage,
  getSupportedDocumentTypes,
  linkDocumentToRecord,
  listSourceDocuments,
  validateEvidenceDeferral,
  validateSourceDocumentMetadata,
  verifyNoPublicPathUsage,
  verifyNoRawDocumentContentStored,
  writeCommitEvidenceManifest,
  writeEvidenceDeferral,
  writeSourceDocumentMetadata,
} from '../utils/pawketAdminEvidence.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-evidence-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_evidence_vault',
    created_at: '2026-05-28T12:00:00Z',
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
    created_at: '2026-05-28T12:00:00Z',
    updated_at: '2026-05-28T12:00:00Z',
    ...overrides,
  };
}

function orderDocument(overrides = {}) {
  return createSourceDocumentMetadata({
    document_id: 'doc_order_1001',
    document_type: 'order_source',
    document_title: 'Order 1001 source event bundle receipt',
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
    received_at: '2026-05-28T12:00:00Z',
    uploaded_by: 'connector_petpawket_website_readonly_v0',
    retention_class: 'finance_source',
    privacy_class: 'financial_sensitive',
    redaction_state: 'none_required',
    evidence_status: 'complete',
    export_allowlist_tags: ['accountant_pack'],
    created_at: '2026-05-28T12:00:00Z',
    updated_at: '2026-05-28T12:00:00Z',
    ...overrides,
  });
}

test('supported document types load', () => {
  const types = getSupportedDocumentTypes();

  assert.ok(types.order_source);
  assert.ok(types.charm_assistance_application);
  assert.ok(types.pawket_pal_story_consent);
  assert.equal(types.public_impact_proof.default_privacy_class, 'public');
});

test('source document metadata validates', () => {
  const document = orderDocument();
  const validation = validateSourceDocumentMetadata(document);

  assert.equal(validation.ok, true, validation.errors.join('\n'));
  assert.equal(document.blob_ref_placeholder, '');
});

test('invalid document type is rejected', () => {
  assert.throws(
    () => orderDocument({ document_type: 'raw_secret_upload' }),
    /unsupported document_type/i
  );
});

test('invalid privacy class is rejected', () => {
  assert.throws(
    () => orderDocument({ privacy_class: 'everyone_can_export' }),
    /unsupported privacy_class/i
  );
});

test('document hash is deterministic', () => {
  const first = calculateDocumentHash('same document bytes');
  const second = calculateDocumentHash('same document bytes');
  const different = calculateDocumentHash('different document bytes');

  assert.equal(first, second);
  assert.notEqual(first, different);
});

test('document links preserve existing links and avoid duplicates', () => {
  const linkedOnce = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: 'pje_sale_0001',
    linked_at: '2026-05-28T12:05:00Z',
  });
  const linkedTwice = linkDocumentToRecord(linkedOnce, {
    target_type: 'proposed_journal_entry',
    target_id: 'pje_sale_0001',
    linked_at: '2026-05-28T12:06:00Z',
  });

  assert.equal(linkedTwice.linked_record_ids.length, 1);
  assert.equal(linkedTwice.linked_record_ids[0].target_id, 'pje_sale_0001');
});

test('coverage is complete when required document exists', () => {
  const target = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
    linked_at: '2026-05-28T12:05:00Z',
  });

  const coverage = evaluateEvidenceCoverage(target, [document]);

  assert.equal(coverage.coverage_status, 'complete');
  assert.deepEqual(coverage.required_document_types, ['order_source']);
  assert.deepEqual(coverage.missing_document_types, []);
});

test('coverage is missing when required document is absent', () => {
  const coverage = evaluateEvidenceCoverage(proposedJournalEntry(), []);

  assert.equal(coverage.coverage_status, 'missing');
  assert.deepEqual(coverage.missing_document_types, ['order_source']);
  assert.equal(coverage.risk_flags.includes('missing_document'), true);
});

test('deferral changes coverage to deferred approved', () => {
  const target = proposedJournalEntry();
  const deferral = createEvidenceDeferral({
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
    missing_requirement: 'order_source',
    reason: 'Payment processor export is delayed, order source will be attached before reporting.',
    expires_at: '2026-06-30T00:00:00Z',
    status: 'approved',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:10:00Z',
  });

  const coverage = evaluateEvidenceCoverage(target, [], undefined, [deferral], {
    validationDate: '2026-05-28T12:11:00Z',
  });

  assert.equal(coverage.coverage_status, 'deferred_approved');
  assert.equal(coverage.deferred_requirements.length, 1);
  assert.equal(coverage.risk_flags.includes('evidence_deferral'), true);
});

test('expired or invalid deferral is rejected', () => {
  const deferral = createEvidenceDeferral({
    target_type: 'proposed_journal_entry',
    target_id: 'pje_sale_0001',
    missing_requirement: 'order_source',
    reason: 'Temporary exception.',
    expires_at: '2026-05-01T00:00:00Z',
    status: 'approved',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  assert.equal(validateEvidenceDeferral(deferral, { validationDate: '2026-05-28T12:00:00Z' }).ok, false);
  assert.throws(
    () => createEvidenceDeferral({
      target_type: 'proposed_journal_entry',
      target_id: 'pje_sale_0001',
      missing_requirement: 'order_source',
      status: 'approved',
    }, { actor_id: 'finance_admin_example', role: 'finance_admin' }),
    /reason is required/i
  );
});

test('privacy and redaction warnings are produced for sensitive private docs', () => {
  const target = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument({
    document_id: 'doc_order_sensitive_1001',
    redaction_state: 'redaction_required',
    privacy_class: 'customer_sensitive',
  }), {
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
  });

  const coverage = evaluateEvidenceCoverage(target, [document]);

  assert.equal(coverage.coverage_status, 'redaction_required');
  assert.equal(coverage.privacy_warnings.length > 0, true);
  assert.equal(coverage.redaction_warnings.length > 0, true);
});

test('commit evidence manifest preserves source IDs', () => {
  const target = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
  });
  const coverage = evaluateEvidenceCoverage(target, [document]);
  const manifest = createCommitEvidenceManifest(target, [document], coverage, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:20:00Z',
  });

  assert.deepEqual(manifest.source_proposed_ledger_record_ids, target.source_proposed_ledger_record_ids);
  assert.deepEqual(manifest.source_draft_record_ids, target.source_draft_record_ids);
  assert.deepEqual(manifest.source_event_ids, target.source_event_ids);
  assert.deepEqual(manifest.source_bundle_ids, target.source_bundle_ids);
  assert.equal(manifest.coverage_status, 'complete');
});

test('manifest hash is deterministic for the same manifest content', () => {
  const target = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
  });
  const coverage = evaluateEvidenceCoverage(target, [document]);
  const actor = {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:20:00Z',
  };

  const first = createCommitEvidenceManifest(target, [document], coverage, actor);
  const second = createCommitEvidenceManifest(target, [document], coverage, actor);

  assert.equal(first.manifest_hash, second.manifest_hash);
});

test('source document metadata writes to documents metadata only', () => {
  const vaultPath = makeTempVault();
  const document = orderDocument();
  const result = writeSourceDocumentMetadata(vaultPath, document, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:30:00Z',
  });

  assert.equal(result.document.document_id, 'doc_order_1001');
  assert.equal(fs.existsSync(path.join(vaultPath, 'documents', 'source-document-metadata.ndjson')), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'documents', 'doc_order_1001')), false);
  assert.equal(listSourceDocuments(vaultPath, { document_type: 'order_source' }).length, 1);
});

test('evidence deferral writes and appends audit event', () => {
  const vaultPath = makeTempVault();
  const deferral = createEvidenceDeferral({
    target_type: 'proposed_journal_entry',
    target_id: 'pje_sale_0001',
    missing_requirement: 'order_source',
    reason: 'Temporary source evidence delay.',
    expires_at: '2026-06-30T00:00:00Z',
    status: 'approved',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:35:00Z',
  });

  const result = writeEvidenceDeferral(vaultPath, deferral, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:35:00Z',
  });

  assert.equal(result.deferral.status, 'approved');
  assert.equal(fs.existsSync(path.join(vaultPath, 'documents', 'evidence-deferrals.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('commit evidence manifest writes and appends audit event', () => {
  const vaultPath = makeTempVault();
  const target = proposedJournalEntry();
  const document = linkDocumentToRecord(orderDocument(), {
    target_type: 'proposed_journal_entry',
    target_id: target.proposed_journal_entry_id,
  });
  const coverage = evaluateEvidenceCoverage(target, [document]);
  const manifest = createCommitEvidenceManifest(target, [document], coverage, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:40:00Z',
  });

  const result = writeCommitEvidenceManifest(vaultPath, manifest, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    timestamp: '2026-05-28T12:40:00Z',
  });

  assert.equal(result.manifest.manifest_id, 'commit_evidence_pje_sale_0001');
  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'commit-evidence-manifests.ndjson')), true);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('raw document content is not stored', () => {
  const vaultPath = makeTempVault();

  assert.throws(
    () => createSourceDocumentMetadata({
      document_type: 'receipt',
      document_title: 'Receipt with raw body',
      privacy_class: 'financial_sensitive',
      retention_class: 'tax_support',
      evidence_status: 'complete',
      raw_content: 'do not store this',
    }),
    /raw document content/i
  );

  writeSourceDocumentMetadata(vaultPath, orderDocument());
  assert.equal(verifyNoRawDocumentContentStored(vaultPath).ok, true);
});

test('evidence operations do not create live ledger writes', () => {
  const vaultPath = makeTempVault();
  writeSourceDocumentMetadata(vaultPath, orderDocument());
  writeEvidenceDeferral(vaultPath, createEvidenceDeferral({
    target_type: 'proposed_journal_entry',
    target_id: 'pje_sale_0001',
    missing_requirement: 'order_source',
    reason: 'Temporary source evidence delay.',
    status: 'approved',
  }, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  }));

  const check = verifyNoOfficialLiveLedgerWrites(vaultPath);
  assert.equal(check.ok, true);
  assert.deepEqual(check.present_paths, []);
});

test('Pawket Admin evidence files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-evidence-public-test', 'public', 'finance');

  assert.throws(
    () => listSourceDocuments(publicPath),
    /must not be placed under public/i
  );
  assert.throws(
    () => createSourceDocumentMetadata({
      document_type: 'order_source',
      document_title: 'Unsafe public path',
      local_path: publicPath,
      privacy_class: 'financial_sensitive',
      retention_class: 'finance_source',
      evidence_status: 'complete',
    }),
    /must not be placed under public/i
  );
  assert.equal(verifyNoPublicPathUsage(path.join(os.tmpdir(), 'pawket-admin-evidence-safe')).ok, true);
});
