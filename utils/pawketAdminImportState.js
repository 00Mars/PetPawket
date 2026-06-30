import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import { appendAuditEvent, listQuarantinedBundles } from './pawketAdminVault.js';

export const IMPORT_STATE_VERSION = 'pawket-admin-import-state-v0';

export const SUPPORTED_IMPORT_EVENT_TYPES = new Set([
  'order.created',
  'payment.received',
  'refund.issued',
  'subscription.created',
  'subscription.cancelled',
  'pawket_packet.purchased',
  'pawket_pick.selected',
  'donation.created',
  'care_credit.planned',
  'charm_pledge.created',
  'story.submitted',
  'pawket_pal.created',
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  received: ['quarantined', 'rejected', 'import_failed'],
  quarantined: ['schema_validated', 'rejected', 'import_failed'],
  schema_validated: ['signature_pending', 'rejected', 'import_failed'],
  signature_pending: ['signature_verified_mock', 'rejected', 'import_failed'],
  signature_verified_mock: ['payload_hash_verified', 'rejected', 'import_failed'],
  payload_hash_verified: ['idempotency_checked', 'rejected', 'import_failed'],
  idempotency_checked: ['staged', 'rejected', 'import_failed'],
  staged: ['superseded'],
  rejected: [],
  superseded: [],
  import_failed: [],
});

const ACTIVE_STATES = new Set([
  'received',
  'quarantined',
  'schema_validated',
  'signature_pending',
  'signature_verified_mock',
  'payload_hash_verified',
  'idempotency_checked',
]);

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
    throw new Error('Pawket Admin import state files must not be placed under public/.');
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

function stagedEventsPath(vaultPath) {
  return path.join(vaultPath, 'events', 'staged-source-events.ndjson');
}

function importStatesPath(vaultPath) {
  return path.join(vaultPath, 'events', 'import-state-transitions.ndjson');
}

function rejectedBundlesPath(vaultPath) {
  return path.join(vaultPath, 'quarantine', 'rejections.ndjson');
}

function ensureImportDirs(vaultPath) {
  fs.mkdirSync(path.join(vaultPath, 'events'), { recursive: true });
  fs.mkdirSync(path.join(vaultPath, 'quarantine'), { recursive: true });
}

function getBundleId(bundle) {
  return bundle?.bundle_id || bundle?.source_bundle_id;
}

function getExistingStagedIdempotencyKeys(vaultPath) {
  return new Set(readJsonLines(stagedEventsPath(vaultPath)).map((event) => event.idempotency_key).filter(Boolean));
}

function getQuarantineRecord(vaultPath, bundleId) {
  return listQuarantinedBundles(vaultPath).find((record) => record.bundle_id === bundleId);
}

function normalizePayloadPreview(payload) {
  if (!isPlainObject(payload)) {
    return {};
  }

  const preview = {};
  for (const key of ['gross_amount', 'net_amount', 'refund_amount', 'amount', 'currency', 'source_record_id', 'sku', 'subscription_id']) {
    if (payload[key] !== undefined) {
      preview[key] = payload[key];
    }
  }

  return preview;
}

export function getAllowedImportTransitions() {
  return Object.fromEntries(
    Object.entries(ALLOWED_TRANSITIONS).map(([state, nextStates]) => [state, [...nextStates]])
  );
}

export function transitionImportState(record, nextState, context = {}) {
  if (!isPlainObject(record)) {
    throw new Error('Import state record must be an object.');
  }

  const currentState = record.state || record.import_state || 'received';
  const allowedNextStates = ALLOWED_TRANSITIONS[currentState];
  if (!allowedNextStates) {
    throw new Error(`Unknown import state: ${currentState}.`);
  }

  if (!allowedNextStates.includes(nextState)) {
    throw new Error(`Invalid import state transition from ${currentState} to ${nextState}.`);
  }

  const transitionedAt = context.timestamp || nowIso();
  const transition = {
    from_state: currentState,
    to_state: nextState,
    transitioned_at: transitionedAt,
    actor_id: context.actor_id || context.actor?.actor_id || 'system',
    role: context.role || context.actor?.role || 'system',
    reason: context.reason || '',
    validation_errors: context.validation_errors || [],
  };

  return {
    ...record,
    state: nextState,
    import_state: nextState,
    previous_state: currentState,
    updated_at: transitionedAt,
    transition_version: IMPORT_STATE_VERSION,
    state_history: [...(record.state_history || []), transition],
  };
}

export function validateConnectorBundleForStaging(bundle, options = {}) {
  const errors = [];

  if (!isPlainObject(bundle)) {
    return { ok: false, errors: ['Connector bundle must be an object.'] };
  }

  for (const field of ['bundle_id', 'schema_version', 'connector_id', 'generated_at', 'cursor_start', 'cursor_end', 'payload_hash']) {
    if (!bundle[field] || typeof bundle[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  const allowedSchemaVersions = options.allowedSchemaVersions || ['pawket-admin.connector-bundle.v0'];
  if (bundle.schema_version && !allowedSchemaVersions.includes(bundle.schema_version)) {
    errors.push(`Unsupported schema_version: ${bundle.schema_version}.`);
  }

  if (!isPlainObject(bundle.signature) && !isPlainObject(bundle.hmac)) {
    errors.push('signature or hmac placeholder is required.');
  }

  if (options.expectedPayloadHash && bundle.payload_hash !== options.expectedPayloadHash) {
    errors.push('payload_hash does not match expected hash.');
  }

  if (!Number.isInteger(bundle.record_count) || bundle.record_count < 0) {
    errors.push('record_count must be a non-negative integer.');
  }

  if (!Array.isArray(bundle.events)) {
    errors.push('events must be an array.');
  } else {
    if (Number.isInteger(bundle.record_count) && bundle.record_count !== bundle.events.length) {
      errors.push('record_count must match events.length.');
    }

    const keysInBundle = new Set();
    for (const [index, event] of bundle.events.entries()) {
      if (!isPlainObject(event)) {
        errors.push(`events[${index}] must be an object.`);
        continue;
      }

      for (const field of ['event_id', 'event_type', 'occurred_at', 'source_record_id', 'idempotency_key']) {
        if (!event[field] || typeof event[field] !== 'string') {
          errors.push(`events[${index}].${field} is required.`);
        }
      }

      if (event.payload === undefined) {
        errors.push(`events[${index}].payload is required.`);
      }

      if (event.idempotency_key) {
        if (keysInBundle.has(event.idempotency_key)) {
          errors.push(`events[${index}].idempotency_key duplicates ${event.idempotency_key}.`);
        }
        keysInBundle.add(event.idempotency_key);
      }

      if (
        event.event_type &&
        !SUPPORTED_IMPORT_EVENT_TYPES.has(event.event_type) &&
        options.allowUnsupportedEventTypes !== true
      ) {
        errors.push(`events[${index}].event_type is unsupported: ${event.event_type}.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function stageConnectorBundle(vaultPathInput, bundle, options = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureImportDirs(vaultPath);

  const validation = validateConnectorBundleForStaging(bundle, options);
  if (!validation.ok) {
    throw new Error(`Connector bundle staging rejected: ${validation.errors.join(' ')}`);
  }

  const bundleId = safeFileId(bundle.bundle_id, 'bundle_id');
  const quarantineRecord = getQuarantineRecord(vaultPath, bundle.bundle_id);
  if (!quarantineRecord) {
    throw new Error(`Connector bundle must be quarantined before staging: ${bundle.bundle_id}.`);
  }

  const stagedKeys = getExistingStagedIdempotencyKeys(vaultPath);
  for (const event of bundle.events) {
    if (stagedKeys.has(event.idempotency_key)) {
      throw new Error(`idempotency_key already staged: ${event.idempotency_key}.`);
    }
  }

  const createdAt = options.created_at || nowIso();
  const stagedRecords = bundle.events.map((event, index) => {
    const eventFileSafeId = safeFileId(event.event_id, `events[${index}].event_id`);
    const payloadHash = event.payload_hash || sha256Hex(canonicalize(event.payload));
    return {
      staged_event_id: `staged_${bundleId}_${eventFileSafeId}`,
      source_bundle_id: bundle.bundle_id,
      source_event_id: event.event_id,
      connector_id: bundle.connector_id,
      event_type: event.event_type,
      occurred_at: event.occurred_at,
      source_record_id: event.source_record_id,
      idempotency_key: event.idempotency_key,
      payload_hash: payloadHash,
      normalized_preview: event.normalized_preview || normalizePayloadPreview(event.payload),
      validation_status: 'validated_for_staging',
      staging_status: 'staged',
      rejection_reason: null,
      created_at: createdAt,
    };
  });

  for (const record of stagedRecords) {
    appendJsonLine(stagedEventsPath(vaultPath), record);
  }

  const importState = transitionImportState(
    {
      bundle_id: bundle.bundle_id,
      state: 'idempotency_checked',
      import_state: 'idempotency_checked',
      state_history: [],
    },
    'staged',
    {
      timestamp: createdAt,
      actor: options.actor || { actor_id: 'system', role: 'system' },
      reason: options.reason || 'Validated connector bundle staged as source events only.',
    }
  );
  appendJsonLine(importStatesPath(vaultPath), importState);

  appendAuditEvent(vaultPath, {
    audit_event_id: `audit_stage_${bundleId}`,
    timestamp: createdAt,
    actor_id: options.actor?.actor_id || 'system',
    role: options.actor?.role || 'system',
    action: 'connector_bundle_staged',
    target_type: 'connector_bundle',
    target_id: bundle.bundle_id,
    reason: options.reason || 'Connector bundle staged as source events only; no live ledger write.',
    metadata: {
      connector_id: bundle.connector_id,
      staged_event_count: stagedRecords.length,
      source_bundle_id: bundle.bundle_id,
      live_ledger_write: false,
      quarantine_id: quarantineRecord.quarantine_id,
    },
  });

  return {
    bundle_id: bundle.bundle_id,
    import_state: 'staged',
    staged_event_count: stagedRecords.length,
    staged_events: stagedRecords,
  };
}

export function listStagedSourceEvents(vaultPathInput, filters = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  let events = readJsonLines(stagedEventsPath(vaultPath));

  for (const [field, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    events = events.filter((event) => event[field] === value);
  }

  return events;
}

export function rejectConnectorBundle(vaultPathInput, bundleIdInput, reason, actor = {}) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureImportDirs(vaultPath);

  const bundleId = safeFileId(bundleIdInput, 'bundleId');
  const quarantineRecord = getQuarantineRecord(vaultPath, bundleIdInput);
  if (!quarantineRecord) {
    throw new Error(`Connector bundle is not quarantined: ${bundleIdInput}.`);
  }

  if (!reason || typeof reason !== 'string') {
    throw new Error('Rejection reason is required.');
  }

  const rejectedAt = actor.timestamp || nowIso();
  const rejection = {
    bundle_id: bundleIdInput,
    quarantine_id: quarantineRecord.quarantine_id,
    connector_id: quarantineRecord.connector_id,
    previous_status: quarantineRecord.status,
    status: 'rejected',
    rejection_reason: reason,
    rejected_at: rejectedAt,
    rejected_by: {
      actor_id: actor.actor_id || 'system',
      role: actor.role || 'system',
    },
  };

  fs.writeFileSync(path.join(vaultPath, 'quarantine', `${bundleId}.rejection.json`), `${JSON.stringify(rejection, null, 2)}\n`);
  appendJsonLine(rejectedBundlesPath(vaultPath), rejection);

  const importState = transitionImportState(
    {
      bundle_id: bundleIdInput,
      state: 'quarantined',
      import_state: 'quarantined',
      state_history: [],
    },
    'rejected',
    {
      timestamp: rejectedAt,
      actor,
      reason,
    }
  );
  appendJsonLine(importStatesPath(vaultPath), importState);

  appendAuditEvent(vaultPath, {
    audit_event_id: `audit_reject_${bundleId}`,
    timestamp: rejectedAt,
    actor_id: actor.actor_id || 'system',
    role: actor.role || 'system',
    action: 'connector_bundle_rejected',
    target_type: 'connector_bundle',
    target_id: bundleIdInput,
    reason,
    metadata: {
      connector_id: quarantineRecord.connector_id,
      quarantine_id: quarantineRecord.quarantine_id,
      evidence_preserved: true,
    },
  });

  return rejection;
}

export function verifyNoLiveLedgerWrites(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const liveLedgerPaths = [
    path.join(vaultPath, 'events', 'live-ledger.ndjson'),
    path.join(vaultPath, 'events', 'finance-transactions.ndjson'),
    path.join(vaultPath, 'events', 'journal-entries.ndjson'),
    path.join(vaultPath, 'ledger'),
    path.join(vaultPath, 'journal'),
  ];

  const presentPaths = liveLedgerPaths.filter((candidatePath) => fs.existsSync(candidatePath));

  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
  };
}

export function getSupportedImportEventTypes() {
  return [...SUPPORTED_IMPORT_EVENT_TYPES];
}
