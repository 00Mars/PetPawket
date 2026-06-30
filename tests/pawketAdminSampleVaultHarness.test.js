import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalize } from '../utils/pawketAdminSecurity.js';
import {
  buildSampleVaultPreviewInput,
  buildSampleVaultRecords,
  getSampleVaultHarnessPolicy,
  getSampleVaultPath,
  getSampleVaultRecordPlan,
  runSampleVaultPreviewSmokeTest,
  validateSampleVaultPreviewOutput,
  validateSampleVaultRecords,
  verifySampleVaultContainsNoRealData,
  verifySampleVaultCreatesNoExports,
  verifySampleVaultCreatesNoPublicFiles,
  verifySampleVaultPathSafe,
} from '../utils/pawketAdminSampleVaultHarness.js';

function tempDir(prefix = 'pawket-admin-sample-vault-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function smokeOutput() {
  return runSampleVaultPreviewSmokeTest();
}

test('sample vault harness policy loads with production disabled', () => {
  const policy = getSampleVaultHarnessPolicy();

  assert.equal(policy.demo, true);
  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.final_exports_enabled, false);
  assert.equal(policy.default_sample_vault_path.endsWith(path.join('data', 'finance', 'security', 'sample-vault')), true);
});

test('sample vault record plan includes all major pipeline areas', () => {
  const plan = getSampleVaultRecordPlan();
  const keys = plan.map((item) => item.collection_key);

  for (const key of [
    'quarantine',
    'staged_source_events',
    'draft_finance_records',
    'review_queue',
    'proposed_ledger_records',
    'proposed_journal_entries',
    'evidence_manifests',
    'commit_gate_evidence_integration_records',
    'test_only_immutable_ledger_entries',
    'report_manifests',
    'export_intents',
    'preview_packages',
    'report_review_items',
    'report_review_decisions',
    'redaction_review_outcomes',
    'report_reviewer_notes',
  ]) {
    assert.ok(keys.includes(key), `missing ${key}`);
  }
  assert.ok(plan.every((item) => item.required === true && item.demo_only === true));
});

test('sample vault records are deterministic', () => {
  const first = buildSampleVaultRecords();
  const second = buildSampleVaultRecords();

  assert.equal(canonicalize(first), canonicalize(second));
});

test('sample vault records validate as demo non-production read-only local-only', () => {
  const records = buildSampleVaultRecords();
  const validation = validateSampleVaultRecords(records);

  assert.equal(validation.ok, true);
  for (const collection of Object.values(records)) {
    for (const record of collection) {
      assert.equal(record.demo, true);
      assert.equal(record.production_enabled, false);
      assert.equal(record.read_only, true);
      assert.equal(record.local_only, true);
      assert.equal(record.source_mode, 'sample_vault_non_production');
      assert.equal(record.final_export_status, 'disabled');
    }
  }
});

test('sample vault records contain no raw document content', () => {
  const records = buildSampleVaultRecords();

  assert.equal(validateSampleVaultRecords(records).ok, true);
  const invalid = {
    ...records,
    quarantine: [{
      ...records.quarantine[0],
      raw_document_content: 'PRIVATE DOCUMENT BODY',
    }],
  };

  assert.equal(validateSampleVaultRecords(invalid).ok, false);
});

test('sample vault records contain no realistic private person/customer/donor/vendor data', () => {
  const records = buildSampleVaultRecords();
  const verification = verifySampleVaultContainsNoRealData(records);

  assert.equal(verification.ok, true);
  const invalid = {
    ...records,
    quarantine: [{
      ...records.quarantine[0],
      contact: 'person@example.com',
    }],
  };

  assert.equal(verifySampleVaultContainsNoRealData(invalid).ok, false);
});

test('sample vault path resolves to the default non-public fixture path', () => {
  const policy = getSampleVaultHarnessPolicy();
  const samplePath = getSampleVaultPath({}, policy);
  const verification = verifySampleVaultPathSafe(samplePath, policy);

  assert.equal(samplePath, path.resolve(policy.default_sample_vault_path));
  assert.equal(verification.ok, true);
});

test('sample vault path rejects public directory usage', () => {
  const publicPath = path.join(os.tmpdir(), 'public', 'pawket-admin-sample-vault');
  const verification = verifySampleVaultPathSafe(publicPath);

  assert.equal(verification.ok, false);
  assert.match(verification.errors.join(' '), /public/i);
});

test('sample vault path rejects export or official report artifact locations', () => {
  const exportPath = tempDir('pawket-admin-final-export-');
  const verification = verifySampleVaultPathSafe(exportPath);

  assert.equal(verification.ok, false);
  assert.match(verification.errors.join(' '), /export|report|balance|production/i);
});

test('buildSampleVaultPreviewInput preserves all sample collections', () => {
  const records = buildSampleVaultRecords();
  const input = buildSampleVaultPreviewInput(records);

  assert.equal(input.demo, true);
  assert.equal(input.source_mode, 'sample_vault_non_production');
  assert.ok(input.preview_input_hash);
  assert.equal(input.proposed_ledger_records.length, 3);
  assert.equal(input.report_review_decisions.length, 1);
});

test('preview smoke test uses the existing operator preview runner', () => {
  const output = smokeOutput();

  assert.equal(output.ok, true);
  assert.equal(output.runner_used, 'pawket-admin-operator-preview-runner-v0');
  assert.equal(output.runner_result.preview.runner_version, 'pawket-admin-operator-preview-runner-v0');
});

test('preview smoke output includes the non-production banner', () => {
  const output = smokeOutput();

  assert.match(output.stdout_text, /PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION/);
  assert.equal(validateSampleVaultPreviewOutput(output).ok, true);
});

test('preview smoke output surfaces missing evidence and unresolved risk', () => {
  const output = smokeOutput();
  const attentionText = output.attention_messages.join(' ');

  assert.ok(output.attention_types.includes('missing_evidence'));
  assert.ok(output.attention_types.includes('unresolved_risk'));
  assert.match(attentionText, /order_source/);
  assert.match(attentionText, /sample_unresolved_risk|missing_document/);
});

test('preview smoke output surfaces report review rejection', () => {
  const output = smokeOutput();
  const attentionText = output.attention_messages.join(' ');

  assert.ok(output.attention_types.includes('rejected_report_review'));
  assert.match(attentionText, /public impact preview remains blocked/i);
});

test('preview smoke output surfaces privacy and redaction blockers', () => {
  const output = smokeOutput();
  const attentionText = output.attention_messages.join(' ');

  assert.ok(output.attention_types.includes('privacy_blocker'));
  assert.ok(output.attention_types.includes('redaction_blocker'));
  assert.match(attentionText, /privacy/i);
  assert.match(attentionText, /redaction/i);
});

test('preview smoke output confirms disabled production gates', () => {
  const output = smokeOutput();

  assert.ok(output.attention_types.includes('disabled_production_gate'));
  assert.match(output.stdout_text, /Production Gates Disabled|Disabled Production Gates/);
});

test('sample vault creates no final exports official reports or official balances', () => {
  const policy = getSampleVaultHarnessPolicy();
  const verification = verifySampleVaultCreatesNoExports(policy.default_sample_vault_path, policy);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
});

test('sample vault creates no public files', () => {
  const policy = getSampleVaultHarnessPolicy();
  const verification = verifySampleVaultCreatesNoPublicFiles(policy.default_sample_vault_path, policy);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
});

test('export artifacts are rejected by the sample vault verifier', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'reports', 'official-report.pdf'), 'not a real export');

  const verification = verifySampleVaultCreatesNoExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('public files are rejected by the sample vault public verifier', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'public', 'leak.ndjson'), '{}\n');

  const verification = verifySampleVaultCreatesNoPublicFiles(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});
