import { createHash } from 'node:crypto';

const GENESIS_HASH = 'GENESIS';
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

const ALWAYS_FORBIDDEN_EXPORT_FIELDS = new Set([
  'vault_key_material',
  'raw_secret',
  'plaintext_private_key',
  'connector_hmac_secret',
  'recovery_key_plaintext',
  'payment_full_card_number',
  'ssn_tax_id',
]);

const PUBLIC_FORBIDDEN_EXPORT_FIELDS = new Set([
  'customer_id',
  'customer_email',
  'private_story_raw',
  'private_pet_profile',
  'medical_details',
  'hardship_notes',
  'assistance_narrative',
  'insurance_policy_data',
  'decrypted_document_content',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function sha256Hex(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function computeAuditEventHash(event) {
  if (!isPlainObject(event)) {
    throw new TypeError('Audit event must be an object.');
  }

  const { event_hash: _eventHash, ...hashPayload } = event;
  return sha256Hex(canonicalize(hashPayload));
}

export function verifyAuditHashChain(events, options = {}) {
  const genesisHash = options.genesisHash || GENESIS_HASH;
  const errors = [];

  if (!Array.isArray(events)) {
    return { ok: false, errors: ['Audit events must be an array.'], last_hash: null };
  }

  const seenEventIds = new Set();
  let expectedPreviousHash = genesisHash;
  let lastHash = null;

  events.forEach((event, index) => {
    const label = `events[${index}]`;

    if (!isPlainObject(event)) {
      errors.push(`${label} must be an object.`);
      return;
    }

    if (!event.event_id) {
      errors.push(`${label}.event_id is required.`);
    } else if (seenEventIds.has(event.event_id)) {
      errors.push(`${label}.event_id duplicates ${event.event_id}.`);
    } else {
      seenEventIds.add(event.event_id);
    }

    if (event.previous_hash !== expectedPreviousHash) {
      errors.push(`${label}.previous_hash must equal ${expectedPreviousHash}.`);
    }

    if (!SHA256_HEX_RE.test(String(event.event_hash || ''))) {
      errors.push(`${label}.event_hash must be a sha256 hex string.`);
    } else {
      const computedHash = computeAuditEventHash(event);
      if (event.event_hash !== computedHash) {
        errors.push(`${label}.event_hash does not match canonical event content.`);
      }
    }

    if (SHA256_HEX_RE.test(String(event.event_hash || ''))) {
      expectedPreviousHash = event.event_hash;
      lastHash = event.event_hash;
    }
  });

  return { ok: errors.length === 0, errors, last_hash: lastHash };
}

export function detectDuplicateIdempotencyKeys(bundles) {
  if (!Array.isArray(bundles)) {
    return [];
  }

  const seen = new Set();
  const duplicates = new Set();

  for (const bundle of bundles) {
    const key = bundle && bundle.idempotency_key;
    if (!key) {
      continue;
    }
    if (seen.has(key)) {
      duplicates.add(key);
    } else {
      seen.add(key);
    }
  }

  return [...duplicates];
}

export function validateConnectorBundleShape(bundle, options = {}) {
  const errors = [];
  const seenIdempotencyKeys = options.seenIdempotencyKeys;

  if (!isPlainObject(bundle)) {
    return { ok: false, errors: ['Connector bundle must be an object.'] };
  }

  const requiredStrings = [
    'bundle_id',
    'schema_version',
    'connector_id',
    'connector_type',
    'source_node_authority',
    'generated_at',
    'idempotency_key',
    'payload_hash',
  ];

  for (const field of requiredStrings) {
    if (!bundle[field] || typeof bundle[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (bundle.source_node_authority !== 'source_node_read_only') {
    errors.push('source_node_authority must be source_node_read_only.');
  }

  if (!isPlainObject(bundle.cursor)) {
    errors.push('cursor is required.');
  } else {
    for (const field of ['previous', 'next', 'source_high_watermark']) {
      if (!bundle.cursor[field]) {
        errors.push(`cursor.${field} is required.`);
      }
    }
    if (!Number.isInteger(bundle.cursor.event_count) || bundle.cursor.event_count < 0) {
      errors.push('cursor.event_count must be a non-negative integer.');
    }
  }

  if (!isPlainObject(bundle.encryption)) {
    errors.push('encryption is required.');
  } else {
    if (!bundle.encryption.key_id) {
      errors.push('encryption.key_id is required.');
    }
    if (!bundle.encryption.encrypted_payload_ref && !bundle.encryption.encrypted_payload) {
      errors.push('encryption must include encrypted_payload_ref or encrypted_payload.');
    }
  }

  if (!isPlainObject(bundle.signature)) {
    errors.push('signature is required.');
  } else {
    if (!bundle.signature.key_id) {
      errors.push('signature.key_id is required.');
    }
    if (!Array.isArray(bundle.signature.signed_fields) || bundle.signature.signed_fields.length === 0) {
      errors.push('signature.signed_fields must be a non-empty array.');
    }
  }

  if (!isPlainObject(bundle.import_policy)) {
    errors.push('import_policy is required.');
  } else {
    if (bundle.import_policy.can_write_to_vault !== false) {
      errors.push('import_policy.can_write_to_vault must be false.');
    }
    if (bundle.import_policy.requires_quarantine !== true) {
      errors.push('import_policy.requires_quarantine must be true.');
    }
    if (bundle.import_policy.can_request_exports !== false) {
      errors.push('import_policy.can_request_exports must be false.');
    }
    if (bundle.import_policy.can_access_decrypted_documents !== false) {
      errors.push('import_policy.can_access_decrypted_documents must be false.');
    }
  }

  if (seenIdempotencyKeys instanceof Set && bundle.idempotency_key) {
    if (seenIdempotencyKeys.has(bundle.idempotency_key)) {
      errors.push(`idempotency_key duplicates ${bundle.idempotency_key}.`);
    } else {
      seenIdempotencyKeys.add(bundle.idempotency_key);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateExportProfile(profile) {
  const errors = [];

  if (!isPlainObject(profile)) {
    return { ok: false, errors: ['Export profile must be an object.'] };
  }

  for (const field of ['profile_id', 'profile_key', 'version', 'label', 'export_type']) {
    if (!profile[field] || typeof profile[field] !== 'string') {
      errors.push(`${field} is required.`);
    }
  }

  if (!Array.isArray(profile.allowed_roles) || profile.allowed_roles.length === 0) {
    errors.push('allowed_roles must be a non-empty array.');
  }

  if (!Array.isArray(profile.field_allowlist) || profile.field_allowlist.length === 0) {
    errors.push('field_allowlist must be a non-empty array.');
  } else {
    if (profile.field_allowlist.includes('*')) {
      errors.push('field_allowlist cannot include wildcard *.');
    }

    for (const field of profile.field_allowlist) {
      if (ALWAYS_FORBIDDEN_EXPORT_FIELDS.has(field)) {
        errors.push(`field_allowlist cannot include ${field}.`);
      }
      if (profile.public_visibility === true && PUBLIC_FORBIDDEN_EXPORT_FIELDS.has(field)) {
        errors.push(`public export cannot include ${field}.`);
      }
    }
  }

  if (!Array.isArray(profile.redaction_rules) || profile.redaction_rules.length === 0) {
    errors.push('redaction_rules must be a non-empty array.');
  }

  if (profile.manifest_required !== true) {
    errors.push('manifest_required must be true.');
  }

  if (profile.export_hash_required !== true) {
    errors.push('export_hash_required must be true.');
  }

  if (profile.audit_event_required !== true) {
    errors.push('audit_event_required must be true.');
  }

  return { ok: errors.length === 0, errors };
}
