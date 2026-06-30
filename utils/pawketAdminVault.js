import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const VAULT_SKELETON_VERSION = 'pawket-admin-vault-skeleton-v0';
export const GENESIS_HASH = 'GENESIS';

const VAULT_DIRECTORIES = ['audit', 'events', 'quarantine', 'documents', 'exports', 'manifests', 'meta'];
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

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
    throw new Error('Pawket Admin vault files must not be placed under public/.');
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

function ensureVaultDirs(vaultPath) {
  for (const directory of VAULT_DIRECTORIES) {
    fs.mkdirSync(path.join(vaultPath, directory), { recursive: true });
  }
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

function auditLogPath(vaultPath) {
  return path.join(vaultPath, 'audit', 'audit-events.ndjson');
}

function quarantineIndexPath(vaultPath) {
  return path.join(vaultPath, 'quarantine', 'index.ndjson');
}

function manifestPath(vaultPath, exportId) {
  return path.join(vaultPath, 'manifests', `${safeFileId(exportId, 'export_id')}.json`);
}

function withoutHashField(record, hashField) {
  const { [hashField]: _hash, ...payload } = record;
  return payload;
}

export function computeVaultAuditEventHash(event) {
  return sha256Hex(canonicalize(withoutHashField(event, 'event_hash')));
}

export function computeManifestHash(manifest) {
  return sha256Hex(canonicalize(withoutHashField(manifest, 'manifest_hash')));
}

export function createVaultSkeleton(basePath, options = {}) {
  const vaultPath = assertAllowedVaultPath(basePath);
  ensureVaultDirs(vaultPath);

  const meta = {
    vault_id: options.vault_id || 'pawket_admin_local_vault_skeleton',
    created_at: options.created_at || nowIso(),
    app_version: options.app_version || VAULT_SKELETON_VERSION,
    storage_mode: 'plaintext_skeleton_for_tests_only',
    encryption_status: 'not_implemented_mock_boundary',
    directories: [...VAULT_DIRECTORIES],
    warnings: [
      'This skeleton is not production encryption.',
      'Do not store real finance, customer, document, assistance, tax, Care Credit, or insurance data here.',
      'Do not place Pawket Admin vault files under public/.',
    ],
  };

  fs.writeFileSync(path.join(vaultPath, 'meta', 'vault-skeleton.json'), `${JSON.stringify(meta, null, 2)}\n`);

  return {
    vault_path: vaultPath,
    directories: [...VAULT_DIRECTORIES],
    meta,
  };
}

export function appendAuditEvent(vaultPathInput, event) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureVaultDirs(vaultPath);

  if (!isPlainObject(event)) {
    throw new Error('Audit event must be an object.');
  }

  const existingEvents = readJsonLines(auditLogPath(vaultPath));
  const previousHash = existingEvents.length ? existingEvents[existingEvents.length - 1].event_hash : GENESIS_HASH;
  const metadata = isPlainObject(event.metadata) ? event.metadata : {};
  const payload = event.payload === undefined ? metadata : event.payload;

  const normalized = {
    audit_event_id: event.audit_event_id || event.event_id || `audit_${String(existingEvents.length + 1).padStart(6, '0')}`,
    timestamp: event.timestamp || event.occurred_at || nowIso(),
    actor_id: event.actor_id || event.actor?.actor_id || 'system',
    role: event.role || 'system',
    action: event.action,
    target_type: event.target_type || event.target?.target_type,
    target_id: event.target_id || event.target?.target_id,
    reason: event.reason || '',
    previous_hash: previousHash,
    payload_hash: event.payload_hash || sha256Hex(canonicalize(payload)),
    app_version: event.app_version || VAULT_SKELETON_VERSION,
    metadata,
  };

  for (const field of ['audit_event_id', 'timestamp', 'actor_id', 'role', 'action', 'target_type', 'target_id', 'reason']) {
    if (!normalized[field] || typeof normalized[field] !== 'string') {
      throw new Error(`Audit event ${field} is required.`);
    }
  }

  normalized.event_hash = computeVaultAuditEventHash(normalized);
  appendJsonLine(auditLogPath(vaultPath), normalized);

  return normalized;
}

export function verifyAuditChain(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const events = readJsonLines(auditLogPath(vaultPath));
  const errors = [];
  const seenIds = new Set();
  let expectedPreviousHash = GENESIS_HASH;
  let lastHash = null;

  events.forEach((event, index) => {
    const label = `audit[${index}]`;

    if (!isPlainObject(event)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (!event.audit_event_id) {
      errors.push(`${label}.audit_event_id is required.`);
    } else if (seenIds.has(event.audit_event_id)) {
      errors.push(`${label}.audit_event_id duplicates ${event.audit_event_id}.`);
    } else {
      seenIds.add(event.audit_event_id);
    }

    if (event.previous_hash !== expectedPreviousHash) {
      errors.push(`${label}.previous_hash must equal ${expectedPreviousHash}.`);
    }

    if (!SHA256_HEX_RE.test(String(event.event_hash || ''))) {
      errors.push(`${label}.event_hash must be a sha256 hex string.`);
    } else {
      const computedHash = computeVaultAuditEventHash(event);
      if (event.event_hash !== computedHash) {
        errors.push(`${label}.event_hash does not match canonical event content.`);
      }
    }

    if (SHA256_HEX_RE.test(String(event.event_hash || ''))) {
      expectedPreviousHash = event.event_hash;
      lastHash = event.event_hash;
    }
  });

  return {
    ok: errors.length === 0,
    errors,
    events_count: events.length,
    last_hash: lastHash,
  };
}

function validateConnectorBundleForQuarantine(bundle, existingRecords = []) {
  const errors = [];

  if (!isPlainObject(bundle)) {
    return { ok: false, errors: ['Connector bundle must be an object.'] };
  }

  for (const field of ['bundle_id', 'schema_version', 'connector_id', 'cursor_start', 'cursor_end', 'payload_hash']) {
    if (!bundle[field] || typeof bundle[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (!isPlainObject(bundle.signature) && !isPlainObject(bundle.hmac)) {
    errors.push('signature or hmac placeholder is required.');
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
      if (!event || typeof event.idempotency_key !== 'string' || !event.idempotency_key) {
        errors.push(`events[${index}].idempotency_key is required.`);
        continue;
      }
      if (keysInBundle.has(event.idempotency_key)) {
        errors.push(`events[${index}].idempotency_key duplicates ${event.idempotency_key}.`);
      }
      keysInBundle.add(event.idempotency_key);
    }
  }

  if (bundle.source_node_authority && bundle.source_node_authority !== 'source_node_read_only') {
    errors.push('source_node_authority must be source_node_read_only when provided.');
  }

  if (isPlainObject(bundle.import_policy)) {
    if (bundle.import_policy.can_write_to_vault !== false) {
      errors.push('import_policy.can_write_to_vault must be false.');
    }
    if (bundle.import_policy.can_request_exports !== false) {
      errors.push('import_policy.can_request_exports must be false.');
    }
    if (bundle.import_policy.can_access_decrypted_documents !== false) {
      errors.push('import_policy.can_access_decrypted_documents must be false.');
    }
  }

  const existingKeys = new Set(existingRecords.flatMap((record) => record.idempotency_keys || []));
  for (const event of bundle.events || []) {
    if (event?.idempotency_key && existingKeys.has(event.idempotency_key)) {
      errors.push(`idempotency_key already quarantined: ${event.idempotency_key}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function quarantineConnectorBundle(vaultPathInput, bundle) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureVaultDirs(vaultPath);

  const existingRecords = listQuarantinedBundles(vaultPath);
  const validation = validateConnectorBundleForQuarantine(bundle, existingRecords);
  if (!validation.ok) {
    throw new Error(`Connector bundle rejected: ${validation.errors.join(' ')}`);
  }

  const quarantineId = safeFileId(bundle.bundle_id, 'bundle_id');
  const idempotencyKeys = bundle.events.map((event) => event.idempotency_key);
  const receivedAt = bundle.received_at || nowIso();
  const record = {
    quarantine_id: quarantineId,
    bundle_id: bundle.bundle_id,
    schema_version: bundle.schema_version,
    connector_id: bundle.connector_id,
    cursor_start: bundle.cursor_start,
    cursor_end: bundle.cursor_end,
    payload_hash: bundle.payload_hash,
    signature_status: bundle.signature?.status || bundle.hmac?.status || 'placeholder_present',
    record_count: bundle.record_count,
    idempotency_keys: idempotencyKeys,
    status: 'quarantined',
    received_at: receivedAt,
    bundle_hash: sha256Hex(canonicalize(bundle)),
    validation_status: 'shape_validated_quarantine_only',
  };

  const bundlePath = path.join(vaultPath, 'quarantine', `${quarantineId}.json`);
  if (fs.existsSync(bundlePath)) {
    throw new Error(`Connector bundle already quarantined: ${bundle.bundle_id}.`);
  }

  fs.writeFileSync(bundlePath, `${JSON.stringify(record, null, 2)}\n`);
  appendJsonLine(quarantineIndexPath(vaultPath), record);

  appendAuditEvent(vaultPath, {
    audit_event_id: `audit_quarantine_${quarantineId}`,
    timestamp: receivedAt,
    actor_id: bundle.connector_id,
    role: 'connector_node',
    action: 'connector_bundle_quarantined',
    target_type: 'connector_bundle',
    target_id: bundle.bundle_id,
    reason: 'Connector bundle stored in quarantine only.',
    metadata: {
      connector_id: bundle.connector_id,
      schema_version: bundle.schema_version,
      cursor_start: bundle.cursor_start,
      cursor_end: bundle.cursor_end,
      payload_hash: bundle.payload_hash,
      record_count: bundle.record_count,
    },
  });

  return record;
}

export function listQuarantinedBundles(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  return readJsonLines(quarantineIndexPath(vaultPath));
}

export function validateExportManifest(manifest, exportProfiles) {
  const errors = [];

  if (!isPlainObject(manifest)) {
    return { ok: false, errors: ['Export manifest must be an object.'] };
  }

  const profiles = Array.isArray(exportProfiles) ? exportProfiles : exportProfiles?.profiles;
  if (!Array.isArray(profiles)) {
    return { ok: false, errors: ['Export profiles must be an array or an object with profiles.'] };
  }

  for (const field of ['export_id', 'export_profile', 'purpose']) {
    if (!manifest[field] || typeof manifest[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  for (const field of ['date_range', 'created_by']) {
    if (!isPlainObject(manifest[field])) {
      errors.push(`${field} is required.`);
    }
  }

  for (const field of ['entity_scope', 'fund_scope', 'field_allowlist', 'redaction_rules']) {
    if (!Array.isArray(manifest[field])) {
      errors.push(`${field} must be an array.`);
    }
  }

  const profile = profiles.find((candidate) => (
    candidate.profile_key === manifest.export_profile ||
    candidate.profile_id === manifest.export_profile
  ));

  if (!profile) {
    errors.push(`Unknown export profile: ${manifest.export_profile}.`);
  } else {
    const allowedFields = new Set(profile.field_allowlist || []);
    for (const field of manifest.field_allowlist || []) {
      if (!allowedFields.has(field)) {
        errors.push(`Field ${field} is not allowed for export profile ${profile.profile_key}.`);
      }
    }

    const allowedRedactions = new Set(profile.redaction_rules || []);
    for (const rule of manifest.redaction_rules || []) {
      if (!allowedRedactions.has(rule)) {
        errors.push(`Redaction rule ${rule} is not allowed for export profile ${profile.profile_key}.`);
      }
    }

    const role = manifest.created_by?.role;
    if (role && Array.isArray(profile.allowed_roles) && !profile.allowed_roles.includes(role)) {
      errors.push(`Role ${role} is not allowed for export profile ${profile.profile_key}.`);
    }
  }

  if (manifest.manifest_hash) {
    const computedHash = computeManifestHash(manifest);
    if (manifest.manifest_hash !== computedHash) {
      errors.push('manifest_hash does not match canonical manifest content.');
    }
  }

  return { ok: errors.length === 0, errors, profile };
}

export function createExportManifest(vaultPathInput, manifest) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  ensureVaultDirs(vaultPath);

  if (!isPlainObject(manifest)) {
    throw new Error('Export manifest must be an object.');
  }

  for (const field of ['export_id', 'export_profile', 'date_range', 'entity_scope', 'fund_scope', 'field_allowlist', 'redaction_rules', 'created_by', 'purpose']) {
    if (manifest[field] === undefined || manifest[field] === null) {
      throw new Error(`Export manifest ${field} is required.`);
    }
  }

  const createdAt = manifest.created_at || nowIso();
  const normalized = {
    export_id: manifest.export_id,
    export_profile: manifest.export_profile,
    date_range: manifest.date_range,
    entity_scope: manifest.entity_scope,
    fund_scope: manifest.fund_scope,
    field_allowlist: manifest.field_allowlist,
    redaction_rules: manifest.redaction_rules,
    created_by: manifest.created_by,
    purpose: manifest.purpose,
    created_at: createdAt,
    manifest_hash: manifest.manifest_hash || '',
  };

  normalized.manifest_hash = computeManifestHash(normalized);

  const filePath = manifestPath(vaultPath, normalized.export_id);
  if (fs.existsSync(filePath)) {
    throw new Error(`Export manifest already exists: ${normalized.export_id}.`);
  }

  fs.writeFileSync(filePath, `${JSON.stringify(normalized, null, 2)}\n`);

  appendAuditEvent(vaultPath, {
    audit_event_id: `audit_export_manifest_${safeFileId(normalized.export_id, 'export_id')}`,
    timestamp: createdAt,
    actor_id: normalized.created_by.actor_id || 'unknown_admin',
    role: normalized.created_by.role || 'unknown_role',
    action: 'export_manifest_created',
    target_type: 'export_manifest',
    target_id: normalized.export_id,
    reason: normalized.purpose,
    metadata: {
      export_profile: normalized.export_profile,
      manifest_hash: normalized.manifest_hash,
      date_range: normalized.date_range,
      entity_scope: normalized.entity_scope,
      fund_scope: normalized.fund_scope,
    },
  });

  return normalized;
}
