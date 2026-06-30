# Pawket Admin Local Vault Skeleton

Last updated: 2026-05-29

Status: first local file-backed skeleton. This is not production encrypted storage.

## Purpose

The local vault skeleton proves the first Pawket Admin trust-kernel behaviors without building UI, live connectors, real finance calculations, production cryptography, or website endpoints.

The skeleton supports:

- Vault directory creation.
- Append-only audited writes.
- Audit hash-chain verification.
- Quarantine-only connector imports.
- Export manifest records.
- Export manifest validation against configured profiles.
- Staged source-event records.
- Draft finance record records.
- Review queue records.
- Proposed ledger records.
- Proposed journal entries.
- Test-only commit artifacts.
- Proposed correction and adjustment records.
- Source document metadata records.
- Evidence deferral records.
- Commit evidence manifest records.
- Document vault ingestion records.
- Commit-gate evidence integration records.
- Disabled production commit records.
- Test-only immutable ledger entries.
- Proposed ledger correction records.

It does not support:

- Real encryption.
- Real key management.
- Live ledger writes from connectors.
- Real source document blobs or uploads.
- Real exports.
- Real accounting, tax, Care Credit, CHARM assistance, insurance, or customer records.
- Final journal entries or live ledger commits.
- Production immutable ledger store writes.

## Directory Layout

`createVaultSkeleton(basePath)` creates:

- `audit/`
- `events/`
- `quarantine/`
- `documents/`
- `exports/`
- `manifests/`
- `meta/`

The helper rejects paths that contain a `public` path segment. Pawket Admin vault files must not be placed under the customer website.

## Event Log Store

Planned file/table:

- `events/events.ndjson`

Current status:

- Reserved for future reviewed source events and local internal events.
- Connectors do not write here in this pass.

Current phase-specific files:

- `events/staged-source-events.ndjson`
- `events/draft-finance-records.ndjson`
- `events/review-queue.ndjson`
- `events/proposed-ledger-records.ndjson`
- `events/proposed-journal-entries.ndjson`
- `events/test-ledger-commits.ndjson`
- `events/proposed-corrections-adjustments.ndjson`
- `events/disabled-production-commit-records.ndjson`
- `events/test-immutable-ledger-entries.ndjson`
- `events/proposed-ledger-correction-records.ndjson`
- `documents/source-document-metadata.ndjson`
- `documents/evidence-deferrals.ndjson`
- `documents/document-vault-ingestion.ndjson`
- `manifests/commit-evidence-manifests.ndjson`
- `manifests/commit-gate-evidence-integration.ndjson`

These files are plaintext test skeletons. Staged events are source evidence, drafts are interpretations, review items are human-review state, proposed ledger records are pre-ledger records, proposed journal entries are grouped accounting proposals, test commits and test immutable ledger entries are validation artifacts, disabled production commit records document blocked production commit attempts, proposed corrections/adjustments are pre-commit correction records, and document/evidence/vault-interface files are metadata-only support records. None of them are final accounting truth.

Future boundary:

- Events should be encrypted at rest before production.
- Source events should move from quarantine only after validation and review.
- Reviewed event writes should produce audit events.
- Final ledger commits should use a separate live ledger store with explicit commit permission, period checks, balance checks, document coverage, and audit events.

## Audit Log Store

Current file:

- `audit/audit-events.ndjson`

Each event includes:

- `audit_event_id`
- `timestamp`
- `actor_id`
- `role`
- `action`
- `target_type`
- `target_id`
- `reason`
- `previous_hash`
- `payload_hash`
- `event_hash`
- `app_version`

Hash behavior:

- First event uses `previous_hash: "GENESIS"`.
- Later events use the prior event hash.
- `payload_hash` hashes event payload or metadata.
- `event_hash` hashes the canonical audit event excluding `event_hash`.
- Verification detects changed, reordered, removed, or malformed events.

This is tamper-evidence only, not production cryptography.

## Quarantine Store

Current files:

- `quarantine/index.ndjson`
- `quarantine/<bundle_id>.json`

Connector bundles enter quarantine only. They do not write ledger truth.

Required bundle fields:

- `bundle_id`
- `schema_version`
- `connector_id`
- `cursor_start`
- `cursor_end`
- `payload_hash`
- `signature` or `hmac`
- `record_count`
- `events[].idempotency_key`

Rejected conditions:

- Missing required field.
- Duplicate idempotency key inside the bundle.
- Duplicate idempotency key already quarantined.
- Connector claims write access.
- Connector claims export access.
- Connector claims decrypted document access.

Future boundary:

- Payload decryption and signature/HMAC verification must happen before import approval.
- Quarantine should remain encrypted at rest before production.

## Document Metadata Store

Current/reserved directory:

- `documents/`

Current metadata-only files:

- `documents/source-document-metadata.ndjson`
- `documents/evidence-deferrals.ndjson`
- `documents/document-vault-ingestion.ndjson`

Records track:

- `document_id`
- `document_type`
- `source_system`
- `file_name`
- `file_hash`
- `blob_ref_placeholder`
- `blob_ref_id`
- `vault_relative_path`
- `encrypted_blob_name`
- `linked_record_ids`
- `privacy_class`
- `redaction_state`
- `evidence_status`
- `retention_class`
- `created_by`
- `created_at`
- `audit_event_ids`

No raw receipts, invoices, donor acknowledgments, contracts, processor reports, bank records, assistance files, story files, or encrypted blobs are stored in this pass.

## Export Manifest Store

Current files:

- `manifests/<export_id>.json`
- `manifests/commit-evidence-manifests.ndjson`
- `manifests/commit-gate-evidence-integration.ndjson`

Each manifest should include:

- `export_id`
- `export_profile`
- `date_range`
- `entity_scope`
- `fund_scope`
- `field_allowlist`
- `redaction_rules`
- `created_by`
- `purpose`
- `manifest_hash`

`validateExportManifest(manifest, exportProfiles)` confirms the export profile exists and that fields are inside the profile allowlist.

Creating an export manifest is audited. The skeleton does not produce export files.

Creating a commit evidence manifest is audited. The manifest is a hashable evidence snapshot for a proposed journal entry and is not a live ledger commit.

Creating a commit-gate evidence integration record is audited. The integration record summarizes evidence blockers and warnings for the final commit gate and is not a live ledger commit.

## Future Encrypted Storage Boundary

Before production:

- Replace plaintext JSON/NDJSON with encrypted local storage.
- Encrypt source documents.
- Encrypt quarantine records.
- Encrypt export artifacts.
- Protect metadata that reveals sensitive relationships.
- Decide whether audit event payloads are encrypted, partially redacted, or split into public integrity metadata plus encrypted detail.

## Future Key Management Boundary

Before production:

- Define master key strategy.
- Define unlock secret handling.
- Define recovery key flow.
- Define key rotation.
- Define connector signing/HMAC key lifecycle.
- Define lost-device and role-revocation behavior.
- Confirm no raw key material enters repo, logs, exports, or backups.

## Recovery And Backup Placeholder Rules

This pass does not create backups.

Future backups must:

- Be encrypted before leaving the device.
- Include a backup manifest.
- Include a backup hash.
- Exclude plaintext keys.
- Create audit events when created or restored.
- Have a tested recovery procedure.

## Current Implementation Files

- `utils/pawketAdminVault.js`
- `tests/pawketAdminVault.test.js`
- `data/finance/security/vault-skeleton.example.json`
- `utils/pawketAdminImportState.js`
- `tests/pawketAdminImportState.test.js`
- `data/finance/security/import-state-machine.example.json`
- `data/finance/security/staged-source-events.example.json`
- `data/finance/security/invalid-connector-bundles.example.json`
- `utils/pawketAdminNormalization.js`
- `tests/pawketAdminNormalization.test.js`
- `data/finance/security/normalization-queue.example.json`
- `data/finance/security/draft-finance-records.example.json`
- `data/finance/security/review-queue.example.json`
- `utils/pawketAdminLedgerApproval.js`
- `tests/pawketAdminLedgerApproval.test.js`
- `data/finance/security/chart-of-accounts.example.json`
- `data/finance/security/proposed-ledger-records.example.json`
- `data/finance/security/ledger-approval-boundary.example.json`
- `data/finance/security/period-close.example.json`
- `data/finance/security/document-coverage-rules.example.json`
- `utils/pawketAdminJournalCommitGate.js`
- `tests/pawketAdminJournalCommitGate.test.js`
- `data/finance/security/proposed-journal-entries.example.json`
- `data/finance/security/final-commit-gate.example.json`
- `data/finance/security/ledger-commit-model.example.json`
- `data/finance/security/correction-adjustment-model.example.json`
- `utils/pawketAdminEvidence.js`
- `tests/pawketAdminEvidence.test.js`
- `data/finance/security/source-documents.example.json`
- `data/finance/security/evidence-coverage.example.json`
- `data/finance/security/document-redaction-privacy.example.json`
- `data/finance/security/evidence-deferrals.example.json`
- `data/finance/security/commit-evidence-manifests.example.json`
- `utils/pawketAdminDocumentVault.js`
- `tests/pawketAdminDocumentVault.test.js`
- `data/finance/security/document-vault-interface.example.json`
- `data/finance/security/document-ingestion-policy.example.json`
- `data/finance/security/document-retention-schedule.example.json`
- `data/finance/security/export-redaction-profiles.example.json`
- `data/finance/security/commit-gate-evidence-integration.example.json`

These files are development scaffolding only. They are not a production vault.
