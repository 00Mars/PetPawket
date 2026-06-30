import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createVaultSkeleton, verifyAuditChain } from '../utils/pawketAdminVault.js';
import { createReportManifest } from '../utils/pawketAdminReportingReadModel.js';
import {
  createExportIntentRecord,
  createPreviewPackageRecord,
  getReportPackageGatePolicy,
  listExportIntentRecords,
  listPreviewPackageRecords,
  validateExportIntentRecord,
  validateReportPackageApproval,
  verifyNoFinalExportFiles,
  verifyNoPublicPathUsage,
  writeExportIntentRecord,
  writePreviewPackageRecord,
} from '../utils/pawketAdminReportPackageGate.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-report-package-gate-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_report_package_gate_vault',
    created_at: '2026-05-29T12:00:00Z',
  });
  return basePath;
}

function manifest(overrides = {}) {
  return createReportManifest({
    report_manifest_id: 'rmanifest_internal_0001',
    report_type: 'internal_management_preview',
    source_mode: 'proposed',
    period: '2026-05',
    entity_scope: ['ent_petpawket'],
    fund_scope: ['fund_operating'],
    class_scope: ['class_commerce'],
    included_record_ids: ['pje_sale_0001'],
    evidence_manifest_ids: ['cem_pje_sale_0001'],
    required_redaction_profile: 'owner_full_internal',
    privacy_warnings: [],
    missing_evidence_warnings: [],
    generated_by: 'finance_admin_example',
    generated_at: '2026-05-29T12:00:00Z',
    ...overrides,
  });
}

function request(overrides = {}) {
  return {
    requested_by: 'finance_admin_example',
    requested_at: '2026-05-29T12:05:00Z',
    intended_recipient_type: 'internal_management',
    required_redaction_profile: 'owner_full_internal',
    ...overrides,
  };
}

function ownerRoot(overrides = {}) {
  return {
    actor_id: 'owner_root_example',
    role: 'owner_root',
    timestamp: '2026-05-29T12:10:00Z',
    ...overrides,
  };
}

test('package gate policy loads with final exports disabled', () => {
  const policy = getReportPackageGatePolicy();

  assert.equal(policy.final_exports_enabled, false);
  assert.equal(policy.production_reports_enabled, false);
  assert.ok(policy.allowed_preview_report_types.includes('public_impact_preview'));
  assert.ok(policy.allowed_source_modes.includes('proposed'));
  assert.ok(policy.forbidden_export_file_extensions.includes('.pdf'));
});

test('export intent requires manifest id report type source mode period requester and redaction profile', () => {
  assert.throws(
    () => createExportIntentRecord({}, {}),
    /report_manifest_id is required.*requested_report_type is required.*source_mode is required.*period is required.*requested_by is required.*intended_recipient_type is required.*required_redaction_profile is required/i
  );
});

test('invalid report type is rejected', () => {
  assert.throws(
    () => createExportIntentRecord(manifest(), request({ requested_report_type: 'irs_final_export' })),
    /requested_report_type irs_final_export is not allowed/i
  );
});

test('production source mode is rejected', () => {
  assert.throws(
    () => createExportIntentRecord(manifest(), request({ source_mode: 'production' })),
    /source_mode production is not allowed/i
  );
});

test('public impact intent blocks private donor customer assistance story data', () => {
  const publicManifest = manifest({
    report_manifest_id: 'rmanifest_public_0001',
    report_type: 'public_impact_preview',
    required_redaction_profile: 'public_impact_report',
    privacy_warnings: ['private donor and assistance story context present'],
  });

  assert.throws(
    () => createExportIntentRecord(publicManifest, request({
      requested_report_type: 'public_impact_preview',
      intended_recipient_type: 'public',
      required_redaction_profile: 'public_impact_report',
    })),
    /public impact preview cannot include private donor\/customer\/assistance\/story\/medical-adjacent data/i
  );
});

test('accountant preview allows controlled sensitive metadata profile', () => {
  const accountantManifest = manifest({
    report_manifest_id: 'rmanifest_accountant_0001',
    report_type: 'accountant_pack_preview',
    required_redaction_profile: 'accountant_pack',
  });
  const intent = createExportIntentRecord(accountantManifest, request({
    requested_report_type: 'accountant_pack_preview',
    intended_recipient_type: 'accountant',
    required_redaction_profile: 'accountant_pack',
    included_privacy_classes: ['financial_sensitive'],
  }));

  assert.equal(validateExportIntentRecord(intent).ok, true);
  assert.equal(intent.required_redaction_profile, 'accountant_pack');
});

test('investor preview requires sanitized aggregate profile', () => {
  const investorManifest = manifest({
    report_manifest_id: 'rmanifest_investor_0001',
    report_type: 'investor_summary_preview',
    required_redaction_profile: 'owner_full_internal',
  });

  assert.throws(
    () => createExportIntentRecord(investorManifest, request({
      requested_report_type: 'investor_summary_preview',
      intended_recipient_type: 'investor',
      required_redaction_profile: 'owner_full_internal',
    })),
    /investor_summary_preview requires redaction profile investor_summary/i
  );
});

test('approval role policy rejects unauthorized role', () => {
  const publicManifest = manifest({
    report_manifest_id: 'rmanifest_public_0002',
    report_type: 'public_impact_preview',
    required_redaction_profile: 'public_impact_report',
  });
  const intent = createExportIntentRecord(publicManifest, request({
    requested_report_type: 'public_impact_preview',
    intended_recipient_type: 'public',
    required_redaction_profile: 'public_impact_report',
  }));
  const approval = validateReportPackageApproval(intent, {
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
  });

  assert.equal(approval.approved_for_preview_package, false);
  assert.match(approval.blockers.join('\n'), /not allowed to approve public_impact_preview/i);
});

test('Owner Root can approve preview package but final export remains disabled', () => {
  const intent = createExportIntentRecord(manifest(), request());
  const approval = validateReportPackageApproval(intent, ownerRoot());

  assert.equal(approval.approved_for_preview_package, true);
  assert.equal(approval.final_export_status, 'disabled');
});

test('preview package record is non-production', () => {
  const intent = createExportIntentRecord(manifest(), request());
  const approval = validateReportPackageApproval(intent, ownerRoot());
  const packageRecord = createPreviewPackageRecord(intent, approval, ownerRoot());

  assert.equal(packageRecord.production_status, 'preview_only');
  assert.equal(packageRecord.final_export_status, 'disabled');
  assert.equal(packageRecord.final_export_created, false);
  assert.equal(packageRecord.raw_document_content_included, false);
  assert.deepEqual(packageRecord.files_created, []);
});

test('preview package hash is deterministic', () => {
  const intent = createExportIntentRecord(manifest(), request());
  const approval = validateReportPackageApproval(intent, ownerRoot());
  const first = createPreviewPackageRecord(intent, approval, ownerRoot());
  const second = createPreviewPackageRecord(intent, approval, ownerRoot());

  assert.equal(first.package_hash, second.package_hash);
});

test('writing export intent appends audit event', () => {
  const vaultPath = makeTempVault();
  const intent = createExportIntentRecord(manifest(), request());
  writeExportIntentRecord(vaultPath, intent, ownerRoot());

  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'export-intent-records.ndjson')), true);
  assert.equal(listExportIntentRecords(vaultPath, { requested_report_type: 'internal_management_preview' }).length, 1);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('writing preview package appends audit event', () => {
  const vaultPath = makeTempVault();
  const intent = createExportIntentRecord(manifest(), request());
  const approval = validateReportPackageApproval(intent, ownerRoot());
  const packageRecord = createPreviewPackageRecord(intent, approval, ownerRoot());
  writePreviewPackageRecord(vaultPath, packageRecord, ownerRoot());

  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', 'report-preview-packages.ndjson')), true);
  assert.equal(listPreviewPackageRecords(vaultPath, { report_type: 'internal_management_preview' }).length, 1);
  assert.equal(verifyAuditChain(vaultPath).events_count, 1);
});

test('no PDF CSV XLSX or ZIP files are created', () => {
  const vaultPath = makeTempVault();
  const intent = createExportIntentRecord(manifest(), request());
  const approval = validateReportPackageApproval(intent, ownerRoot());
  writeExportIntentRecord(vaultPath, intent, ownerRoot());
  writePreviewPackageRecord(vaultPath, createPreviewPackageRecord(intent, approval, ownerRoot()), ownerRoot());

  const result = verifyNoFinalExportFiles(vaultPath);
  assert.equal(result.ok, true);
  assert.deepEqual(result.present_paths, []);
});

test('official exports are detected when present', () => {
  const vaultPath = makeTempVault();
  const officialPath = path.join(vaultPath, 'exports', 'irs-export', 'final.csv');
  fs.mkdirSync(path.dirname(officialPath), { recursive: true });
  fs.writeFileSync(officialPath, 'not allowed\n');

  const result = verifyNoFinalExportFiles(vaultPath);
  assert.equal(result.ok, false);
  assert.equal(result.present_paths.length, 1);
});

test('Pawket Admin report package gate files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-report-package-public-test', 'public', 'finance');
  const intent = createExportIntentRecord(manifest(), request());

  assert.throws(
    () => writeExportIntentRecord(publicPath, intent, ownerRoot()),
    /must not be placed under public/i
  );
  assert.throws(
    () => verifyNoPublicPathUsage(publicPath),
    /must not be placed under public/i
  );
});
