import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeAuditEventHash,
  detectDuplicateIdempotencyKeys,
  validateConnectorBundleShape,
  validateExportProfile,
  verifyAuditHashChain,
} from '../utils/pawketAdminSecurity.js';

const repoRoot = new URL('..', import.meta.url);

function readJson(relativePath) {
  const filePath = path.join(repoRoot.pathname, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function withAuditHashes(events) {
  let previousHash = 'GENESIS';

  return events.map((input) => {
    const event = { ...input, previous_hash: previousHash };
    event.event_hash = computeAuditEventHash(event);
    previousHash = event.event_hash;
    return event;
  });
}

test('verifies a valid Pawket Admin audit hash chain', () => {
  const events = withAuditHashes([
    {
      event_id: 'audit_test_1',
      event_type: 'vault_initialized',
      occurred_at: '2026-05-26T18:00:00Z',
      actor: { actor_type: 'owner_root', actor_id: 'owner_root_example' },
      role: 'owner_root',
      permission: 'vault.full_archive',
      target: { target_type: 'vault', target_id: 'vault_example' },
      action: 'initialize_trust_kernel',
      reason: 'Test event.',
      source: 'test',
      metadata: {},
    },
    {
      event_id: 'audit_test_2',
      event_type: 'connector_bundle_quarantined',
      occurred_at: '2026-05-26T18:31:00Z',
      actor: { actor_type: 'system', actor_id: 'pawket_admin_import_guard' },
      role: 'system',
      permission: 'connector.import',
      target: { target_type: 'connector_bundle', target_id: 'bundle_example' },
      action: 'quarantine_before_review',
      reason: 'Test quarantine event.',
      source: 'test',
      metadata: {},
    },
  ]);

  const result = verifyAuditHashChain(events);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('detects tampering in a Pawket Admin audit hash chain', () => {
  const events = withAuditHashes([
    {
      event_id: 'audit_test_1',
      event_type: 'vault_initialized',
      occurred_at: '2026-05-26T18:00:00Z',
      actor: { actor_type: 'owner_root', actor_id: 'owner_root_example' },
      role: 'owner_root',
      permission: 'vault.full_archive',
      target: { target_type: 'vault', target_id: 'vault_example' },
      action: 'initialize_trust_kernel',
      reason: 'Original reason.',
      source: 'test',
      metadata: {},
    },
  ]);

  events[0].reason = 'Silently edited reason.';

  const result = verifyAuditHashChain(events);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /event_hash does not match/i);
});

test('verifies the audit events fixture hash chain', () => {
  const { events } = readJson('data/finance/security/audit-events.example.json');
  const result = verifyAuditHashChain(events);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('validates the connector bundle fixture shape', () => {
  const bundle = readJson('data/finance/security/connector-bundle.example.json');
  const result = validateConnectorBundleShape(bundle);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test('detects duplicate connector idempotency keys', () => {
  const bundle = readJson('data/finance/security/connector-bundle.example.json');
  const duplicateKeys = detectDuplicateIdempotencyKeys([
    bundle,
    { ...bundle, bundle_id: 'connector_bundle_duplicate_example' },
  ]);

  assert.deepEqual(duplicateKeys, [bundle.idempotency_key]);
});

test('rejects connector bundles that can write to the vault', () => {
  const bundle = readJson('data/finance/security/connector-bundle.example.json');
  const result = validateConnectorBundleShape({
    ...bundle,
    import_policy: {
      ...bundle.import_policy,
      can_write_to_vault: true,
    },
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /can_write_to_vault must be false/i);
});

test('validates export profile fixtures', () => {
  const { profiles } = readJson('data/finance/security/export-profiles.example.json');

  for (const profile of profiles) {
    const result = validateExportProfile(profile);
    assert.equal(result.ok, true, `${profile.profile_key}: ${result.errors.join(', ')}`);
  }
});

test('rejects unsafe export field allowlists', () => {
  const { profiles } = readJson('data/finance/security/export-profiles.example.json');
  const publicProfile = profiles.find((profile) => profile.profile_key === 'public_impact_report');
  const result = validateExportProfile({
    ...publicProfile,
    field_allowlist: [...publicProfile.field_allowlist, 'private_story_raw'],
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /public export cannot include private_story_raw/i);
});
