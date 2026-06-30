import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  appendAuditEvent,
  createExportManifest,
  createVaultSkeleton,
  listQuarantinedBundles,
  quarantineConnectorBundle,
  validateExportManifest,
  verifyAuditChain,
} from '../utils/pawketAdminVault.js';

const repoRoot = new URL('..', import.meta.url);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot.pathname, relativePath), 'utf8'));
}

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-vault-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_vault',
    created_at: '2026-05-27T12:00:00Z',
  });
  return basePath;
}

function validBundle(overrides = {}) {
  return {
    bundle_id: 'bundle_test_0001',
    schema_version: 'pawket-admin.connector-bundle.v0',
    connector_id: 'connector_petpawket_website_readonly_v0',
    source_node_authority: 'source_node_read_only',
    cursor_start: 'cursor-0001',
    cursor_end: 'cursor-0002',
    payload_hash: '0f1d2c3b4a59687766554433221100ffeeddccbbaa99887766554433221100ff',
    signature: {
      status: 'mock_signature_placeholder',
      key_id: 'connector_key_placeholder',
    },
    record_count: 2,
    events: [
      {
        source_event_id: 'source_event_order_1001',
        event_type: 'order_created',
        idempotency_key: 'petpawket-website:order:1001',
      },
      {
        source_event_id: 'source_event_refund_1001_a',
        event_type: 'refund_created',
        idempotency_key: 'petpawket-website:refund:1001:a',
      },
    ],
    import_policy: {
      can_write_to_vault: false,
      requires_quarantine: true,
      requires_admin_review: true,
      can_request_exports: false,
      can_access_decrypted_documents: false,
    },
    ...overrides,
  };
}

function validManifest(overrides = {}) {
  return {
    export_id: 'export_manifest_accountant_pack_2026_05_test',
    export_profile: 'accountant_pack',
    date_range: {
      start: '2026-05-01',
      end: '2026-05-31',
    },
    entity_scope: ['ent_petpawket'],
    fund_scope: ['fund_operating'],
    field_allowlist: ['entity_id', 'period_id', 'account_id', 'category', 'net_amount', 'currency', 'source_document_id'],
    redaction_rules: ['redact_private_story_fields', 'redact_assistance_narratives', 'mask_customer_contact'],
    created_by: {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
    },
    purpose: 'Test accountant package manifest.',
    created_at: '2026-05-27T12:05:00Z',
    ...overrides,
  };
}

test('creates the Pawket Admin vault directory skeleton', () => {
  const vaultPath = makeTempVault();

  for (const directory of ['audit', 'events', 'quarantine', 'documents', 'exports', 'manifests', 'meta']) {
    assert.equal(fs.existsSync(path.join(vaultPath, directory)), true, `${directory} should exist`);
  }

  const meta = JSON.parse(fs.readFileSync(path.join(vaultPath, 'meta', 'vault-skeleton.json'), 'utf8'));
  assert.equal(meta.storage_mode, 'plaintext_skeleton_for_tests_only');
  assert.equal(meta.encryption_status, 'not_implemented_mock_boundary');
});

test('appends audit events and verifies the audit chain', () => {
  const vaultPath = makeTempVault();

  appendAuditEvent(vaultPath, {
    audit_event_id: 'audit_test_0001',
    timestamp: '2026-05-27T12:01:00Z',
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    action: 'vault_test_write',
    target_type: 'vault',
    target_id: 'test_vault',
    reason: 'Test first audit write.',
    metadata: { test: 1 },
  });

  appendAuditEvent(vaultPath, {
    audit_event_id: 'audit_test_0002',
    timestamp: '2026-05-27T12:02:00Z',
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    action: 'vault_test_write',
    target_type: 'vault',
    target_id: 'test_vault',
    reason: 'Test second audit write.',
    metadata: { test: 2 },
  });

  const result = verifyAuditChain(vaultPath);
  assert.equal(result.ok, true);
  assert.equal(result.events_count, 2);
  assert.deepEqual(result.errors, []);
});

test('detects audit log tampering', () => {
  const vaultPath = makeTempVault();
  appendAuditEvent(vaultPath, {
    audit_event_id: 'audit_test_0001',
    timestamp: '2026-05-27T12:01:00Z',
    actor_id: 'finance_admin_example',
    role: 'finance_admin',
    action: 'vault_test_write',
    target_type: 'vault',
    target_id: 'test_vault',
    reason: 'Original reason.',
  });

  const auditFile = path.join(vaultPath, 'audit', 'audit-events.ndjson');
  const [line] = fs.readFileSync(auditFile, 'utf8').trim().split('\n');
  const event = JSON.parse(line);
  event.reason = 'Tampered reason.';
  fs.writeFileSync(auditFile, `${JSON.stringify(event)}\n`);

  const result = verifyAuditChain(vaultPath);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /event_hash does not match/i);
});

test('quarantines connector bundles without writing ledger events', () => {
  const vaultPath = makeTempVault();
  const record = quarantineConnectorBundle(vaultPath, validBundle());

  assert.equal(record.status, 'quarantined');
  assert.equal(record.record_count, 2);
  assert.deepEqual(record.idempotency_keys, ['petpawket-website:order:1001', 'petpawket-website:refund:1001:a']);
  assert.equal(listQuarantinedBundles(vaultPath).length, 1);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'events.ndjson')), false);
  assert.equal(verifyAuditChain(vaultPath).ok, true);
});

test('rejects duplicate idempotency keys across quarantined bundles', () => {
  const vaultPath = makeTempVault();
  quarantineConnectorBundle(vaultPath, validBundle());

  assert.throws(
    () => quarantineConnectorBundle(vaultPath, validBundle({
      bundle_id: 'bundle_test_0002',
      events: [
        {
          source_event_id: 'source_event_order_1001_duplicate',
          event_type: 'order_created',
          idempotency_key: 'petpawket-website:order:1001',
        },
      ],
      record_count: 1,
    })),
    /already quarantined/i
  );
});

test('rejects duplicate idempotency keys inside one connector bundle', () => {
  const vaultPath = makeTempVault();

  assert.throws(
    () => quarantineConnectorBundle(vaultPath, validBundle({
      events: [
        {
          source_event_id: 'source_event_order_1001',
          event_type: 'order_created',
          idempotency_key: 'petpawket-website:order:1001',
        },
        {
          source_event_id: 'source_event_order_1001_duplicate',
          event_type: 'order_created',
          idempotency_key: 'petpawket-website:order:1001',
        },
      ],
      record_count: 2,
    })),
    /duplicates petpawket-website:order:1001/i
  );
});

test('rejects connector bundles missing required fields', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  delete bundle.payload_hash;

  assert.throws(
    () => quarantineConnectorBundle(vaultPath, bundle),
    /payload_hash is required/i
  );
});

test('validates and creates an export manifest', () => {
  const vaultPath = makeTempVault();
  const exportProfiles = readJson('data/finance/security/export-profiles.example.json');
  const manifest = validManifest();

  const validation = validateExportManifest(manifest, exportProfiles);
  assert.equal(validation.ok, true, validation.errors.join(', '));

  const created = createExportManifest(vaultPath, manifest);
  assert.match(created.manifest_hash, /^[a-f0-9]{64}$/);
  assert.equal(fs.existsSync(path.join(vaultPath, 'manifests', `${manifest.export_id}.json`)), true);
  assert.equal(verifyAuditChain(vaultPath).ok, true);
});

test('rejects export fields outside the profile allowlist', () => {
  const exportProfiles = readJson('data/finance/security/export-profiles.example.json');
  const validation = validateExportManifest(validManifest({
    field_allowlist: ['entity_id', 'private_story_raw'],
  }), exportProfiles);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /private_story_raw/i);
});

test('rejects Pawket Admin vault paths under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-vault-public-test', 'public', 'finance');

  assert.throws(
    () => createVaultSkeleton(publicPath),
    /must not be placed under public/i
  );
});
