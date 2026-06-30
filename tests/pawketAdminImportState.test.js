import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalize, sha256Hex } from '../utils/pawketAdminSecurity.js';
import {
  createVaultSkeleton,
  quarantineConnectorBundle,
  verifyAuditChain,
} from '../utils/pawketAdminVault.js';
import {
  getAllowedImportTransitions,
  listStagedSourceEvents,
  rejectConnectorBundle,
  stageConnectorBundle,
  transitionImportState,
  validateConnectorBundleForStaging,
  verifyNoLiveLedgerWrites,
} from '../utils/pawketAdminImportState.js';

function makeTempVault() {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'pawket-admin-import-'));
  createVaultSkeleton(basePath, {
    vault_id: 'test_import_vault',
    created_at: '2026-05-27T13:00:00Z',
  });
  return basePath;
}

function eventPayloadHash(payload) {
  return sha256Hex(canonicalize(payload));
}

function validBundle(overrides = {}) {
  const orderPayload = {
    gross_amount: 68,
    currency: 'USD',
    source_record_id: 'order_1001',
  };
  const refundPayload = {
    refund_amount: 8,
    currency: 'USD',
    source_record_id: 'refund_1001_a',
  };

  return {
    bundle_id: 'bundle_import_test_0001',
    schema_version: 'pawket-admin.connector-bundle.v0',
    connector_id: 'connector_petpawket_website_readonly_v0',
    source_node_authority: 'source_node_read_only',
    generated_at: '2026-05-27T13:00:00Z',
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
        event_id: 'source_event_order_1001',
        event_type: 'order.created',
        occurred_at: '2026-05-27T13:01:00Z',
        source_record_id: 'order_1001',
        idempotency_key: 'petpawket-website:order:1001',
        payload_hash: eventPayloadHash(orderPayload),
        payload: orderPayload,
      },
      {
        event_id: 'source_event_refund_1001_a',
        event_type: 'refund.issued',
        occurred_at: '2026-05-27T13:02:00Z',
        source_record_id: 'refund_1001_a',
        idempotency_key: 'petpawket-website:refund:1001:a',
        payload_hash: eventPayloadHash(refundPayload),
        payload: refundPayload,
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

test('allowed import transition succeeds', () => {
  const transitions = getAllowedImportTransitions();
  assert.deepEqual(transitions.received, ['quarantined', 'rejected', 'import_failed']);

  const result = transitionImportState(
    { bundle_id: 'bundle_import_test_0001', import_state: 'received' },
    'quarantined',
    {
      timestamp: '2026-05-27T13:03:00Z',
      actor_id: 'connector_petpawket_website_readonly_v0',
      role: 'connector_node',
      reason: 'Connector bundle received and moved to quarantine.',
    }
  );

  assert.equal(result.import_state, 'quarantined');
  assert.equal(result.previous_state, 'received');
  assert.equal(result.state_history.length, 1);
});

test('invalid import transition is rejected', () => {
  assert.throws(
    () => transitionImportState({ bundle_id: 'bundle_import_test_0001', import_state: 'quarantined' }, 'staged'),
    /invalid import state transition from quarantined to staged/i
  );
});

test('valid connector bundle passes staging validation', () => {
  const validation = validateConnectorBundleForStaging(validBundle());
  assert.equal(validation.ok, true, validation.errors.join(', '));
  assert.deepEqual(validation.errors, []);
});

test('missing required connector bundle field is rejected', () => {
  const bundle = validBundle();
  delete bundle.generated_at;

  const validation = validateConnectorBundleForStaging(bundle);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /generated_at is required/i);
});

test('duplicate idempotency keys inside a bundle are rejected', () => {
  const bundle = validBundle({
    events: [
      validBundle().events[0],
      {
        ...validBundle().events[1],
        idempotency_key: 'petpawket-website:order:1001',
      },
    ],
  });

  const validation = validateConnectorBundleForStaging(bundle);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /duplicates petpawket-website:order:1001/i);
});

test('unsupported event type is rejected by default', () => {
  const bundle = validBundle({
    events: [
      {
        ...validBundle().events[0],
        event_type: 'ledger.write',
      },
    ],
    record_count: 1,
  });

  const validation = validateConnectorBundleForStaging(bundle);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /unsupported: ledger\.write/i);
});

test('valid quarantined bundle stages source events only', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  quarantineConnectorBundle(vaultPath, bundle);

  const result = stageConnectorBundle(vaultPath, bundle, {
    actor: { actor_id: 'finance_admin_example', role: 'finance_admin' },
    created_at: '2026-05-27T13:05:00Z',
  });

  assert.equal(result.import_state, 'staged');
  assert.equal(result.staged_event_count, 2);
  assert.equal(result.staged_events[0].source_bundle_id, bundle.bundle_id);
  assert.equal(result.staged_events[0].source_event_id, 'source_event_order_1001');
  assert.equal(result.staged_events[0].idempotency_key, 'petpawket-website:order:1001');
  assert.equal(result.staged_events[0].validation_status, 'validated_for_staging');
  assert.equal(result.staged_events[0].staging_status, 'staged');

  const liveLedgerCheck = verifyNoLiveLedgerWrites(vaultPath);
  assert.equal(liveLedgerCheck.ok, true);
  assert.deepEqual(liveLedgerCheck.present_paths, []);
});

test('list staged source events preserves source ids and supports filters', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  quarantineConnectorBundle(vaultPath, bundle);
  stageConnectorBundle(vaultPath, bundle);

  const allEvents = listStagedSourceEvents(vaultPath);
  assert.equal(allEvents.length, 2);

  const refunds = listStagedSourceEvents(vaultPath, {
    connector_id: 'connector_petpawket_website_readonly_v0',
    event_type: 'refund.issued',
    source_bundle_id: 'bundle_import_test_0001',
    validation_status: 'validated_for_staging',
    staging_status: 'staged',
  });

  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].source_event_id, 'source_event_refund_1001_a');
  assert.equal(refunds[0].idempotency_key, 'petpawket-website:refund:1001:a');
});

test('duplicate already-staged idempotency key is rejected', () => {
  const vaultPath = makeTempVault();
  const stagedFile = path.join(vaultPath, 'events', 'staged-source-events.ndjson');
  fs.appendFileSync(stagedFile, `${JSON.stringify({
    staged_event_id: 'staged_existing_order_1001',
    source_bundle_id: 'existing_bundle',
    source_event_id: 'existing_source_event',
    connector_id: 'connector_petpawket_website_readonly_v0',
    event_type: 'order.created',
    occurred_at: '2026-05-27T12:59:00Z',
    source_record_id: 'order_1001',
    idempotency_key: 'petpawket-website:order:1001',
    payload_hash: 'existing_payload_hash',
    normalized_preview: {},
    validation_status: 'validated_for_staging',
    staging_status: 'staged',
    rejection_reason: null,
    created_at: '2026-05-27T13:00:00Z',
  })}\n`);

  const bundle = validBundle({
    bundle_id: 'bundle_import_test_duplicate_staged',
    events: [validBundle().events[0]],
    record_count: 1,
  });
  quarantineConnectorBundle(vaultPath, bundle);

  assert.throws(
    () => stageConnectorBundle(vaultPath, bundle),
    /idempotency_key already staged: petpawket-website:order:1001/i
  );
});

test('reject connector bundle preserves rejection reason and evidence', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  quarantineConnectorBundle(vaultPath, bundle);

  const rejection = rejectConnectorBundle(
    vaultPath,
    bundle.bundle_id,
    'Payload hash mismatch during staging review.',
    {
      actor_id: 'finance_admin_example',
      role: 'finance_admin',
      timestamp: '2026-05-27T13:06:00Z',
    }
  );

  assert.equal(rejection.status, 'rejected');
  assert.equal(rejection.rejection_reason, 'Payload hash mismatch during staging review.');
  assert.equal(fs.existsSync(path.join(vaultPath, 'quarantine', `${bundle.bundle_id}.json`)), true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'quarantine', `${bundle.bundle_id}.rejection.json`)), true);
});

test('staging writes an audit event and preserves hash-chain continuity', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  quarantineConnectorBundle(vaultPath, bundle);
  stageConnectorBundle(vaultPath, bundle, {
    actor: { actor_id: 'finance_admin_example', role: 'finance_admin' },
    created_at: '2026-05-27T13:05:00Z',
  });

  const verification = verifyAuditChain(vaultPath);
  assert.equal(verification.ok, true, verification.errors.join('\n'));
  assert.equal(verification.events_count, 2);

  const auditFile = path.join(vaultPath, 'audit', 'audit-events.ndjson');
  const auditEvents = fs.readFileSync(auditFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(auditEvents[1].action, 'connector_bundle_staged');
  assert.equal(auditEvents[1].metadata.live_ledger_write, false);
});

test('staging does not create live ledger records', () => {
  const vaultPath = makeTempVault();
  const bundle = validBundle();
  quarantineConnectorBundle(vaultPath, bundle);
  stageConnectorBundle(vaultPath, bundle);

  const liveLedgerCheck = verifyNoLiveLedgerWrites(vaultPath);
  assert.equal(liveLedgerCheck.ok, true);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'live-ledger.ndjson')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'events', 'finance-transactions.ndjson')), false);
  assert.equal(fs.existsSync(path.join(vaultPath, 'ledger')), false);
});

test('Pawket Admin import-state files cannot be placed under public', () => {
  const publicPath = path.join(os.tmpdir(), 'pawket-admin-import-public-test', 'public', 'finance');

  assert.throws(
    () => listStagedSourceEvents(publicPath),
    /must not be placed under public/i
  );
});
