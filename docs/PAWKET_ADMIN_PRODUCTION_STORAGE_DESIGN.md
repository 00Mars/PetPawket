# Pawket Admin Production Storage Design

Last updated: 2026-05-27

Status: production storage design target. No production encryption, production database, key manager, backup system, or desktop shell is implemented in this pass.

## Purpose

Pawket Admin should become the local-first encrypted finance authority for Pet Pawket.

The public website remains a source node only. It must never own, edit, export, decrypt, or serve full finance truth.

The current file-backed vault skeleton is plaintext test scaffolding. It is not a production vault and must not store real finance, customer, tax, source-document, CHARM assistance, Care Credit, insurance-adjacent, private story, medical, hardship, or document data.

## Production Target

Production Pawket Admin should use a local-first encrypted vault with:

- Structured encrypted database for finance records, source events, staging records, report runs, calculation rules, permissions, period closes, export manifests, and audit indexes.
- Encrypted blob/document store for receipts, invoices, contracts, donor acknowledgments, processor reports, source exports, generated reports, and backup bundles.
- Append-only audit/event storage with hash-chain verification.
- Export manifest storage linked to export hashes and audit events.
- Encrypted backups with restore manifests.
- Recovery key model.
- Key rotation model.
- Local-only default behavior.
- No public website finance authority.
- No plaintext sensitive finance storage in production.

## Storage Approach Options

### A. Encrypted File/Event Store

Description:

- Store records as encrypted files or encrypted append-only logs.
- Use hashes and manifests to link records.
- Store documents as encrypted blobs.

Strengths:

- Simple local-first mental model.
- Easy append-only event history.
- Easy backup by copying encrypted files.
- Good fit for source evidence and audit artifacts.

Risks:

- Querying and reporting can become slow or complex.
- Index consistency requires careful design.
- Concurrent writes and crash recovery need extra work.
- Schema migrations can become harder over time.

Best use:

- Audit logs.
- Source bundles.
- Source documents.
- Export packages.
- Backup bundles.

### B. Encrypted SQLite-Style Database

Description:

- Store structured records in an encrypted local database.
- Use database transactions for consistency.
- Store audit/event tables and indexes in the same local vault boundary.

Strengths:

- Better structured querying.
- Better reporting.
- Better indexes for reconciliation, periods, accounts, funds, and staged events.
- Easier migration and validation workflows.

Risks:

- Requires a vetted encryption approach and storage engine decision.
- Large binary documents are better kept outside the main database.
- Backups and key rotation require careful handling.

Best use:

- Source event staging.
- Reviewed finance records.
- Account/fund/class metadata.
- Period closes.
- Export manifest index.
- Calculation rules.

### C. Hybrid Encrypted Database And Encrypted Blob Store

Description:

- Store structured records in an encrypted local database.
- Store large documents, exports, and backups as encrypted blobs.
- Link everything with ids, hashes, manifests, and audit events.

Strengths:

- Best balance for Pawket Admin.
- Keeps reporting/querying practical.
- Keeps large documents out of structured tables.
- Makes document-level hashes and duplicate detection straightforward.
- Allows append-only audit/event tables plus blob manifests.

Risks:

- More moving parts than a pure file store.
- Requires a clear key hierarchy.
- Requires backup/restore design that captures database and blobs consistently.

Recommendation:

Use the hybrid architecture in phases.

## Recommended Phased Hybrid Architecture

Phase 1: plaintext development skeleton, current state.

- Directory layout.
- Append-only audit events.
- Quarantine-only connector records.
- Staged source events.
- Export manifests.
- No real data.

Phase 2: encrypted local database design.

- Define encrypted database engine.
- Define migration strategy.
- Define structured tables for audit, quarantine, staged source events, documents metadata, export manifests, period state, and rules.
- Keep source documents as separate encrypted blobs.

Phase 3: encrypted blob store.

- Encrypt source documents, report outputs, export packages, and backups.
- Store blob hash, encrypted blob ref, document metadata, redaction status, duplicate state, retention class, and audit event ids.

Phase 4: backup and recovery.

- Encrypted backup package.
- Backup manifest.
- Restore verification.
- Recovery key flow.
- Backup creation and restore audit events.

Phase 5: production connector trust.

- Real connector signing or HMAC verification.
- Payload encryption.
- Key rotation.
- Replay detection.
- Cursor continuity enforcement.

## Key Hierarchy Target

Production design should separate:

- Vault master key.
- Database encryption key.
- Blob encryption keys.
- Backup encryption key.
- Connector verification keys.
- Recovery key material.
- Export package encryption keys, if used.

No raw key material should appear in:

- Repo files.
- Logs.
- Exports.
- Connector bundles.
- Public website files.
- Plaintext backups.

## Restore Model

Restore should:

- Require Owner Root or recovery flow.
- Verify backup manifest hash.
- Verify encrypted blob inventory.
- Verify audit/event continuity.
- Restore database and blob store consistently.
- Record a restore audit event.
- Preserve original audit chain history rather than rewriting it.

## Recovery Key Model

Recovery key design needs security review.

Baseline expectations:

- Created only by Owner Root.
- Displayed or exported through a controlled flow.
- Never stored in plaintext in the repo or backup.
- Use creates a high-severity audit event.
- Recovery does not bypass role restrictions after unlock.

## Key Rotation Model

Key rotation should support:

- Lost device.
- Role revocation.
- Suspected compromise.
- Scheduled security policy updates.
- Connector key revocation.

Rotation should:

- Preserve prior audit verification.
- Re-encrypt active vault material as needed.
- Record old and new key ids without exposing key material.
- Create audit events.
- Require Owner Root or approved high-trust workflow.

## Local-Only Default

Pawket Admin should default to local-only operation.

No cloud sync, external backup, connector polling, or remote export destination should be assumed until explicitly reviewed and approved.

## Production Blockers

Before production:

- Choose encrypted database/storage approach.
- Choose cryptographic primitives and libraries.
- Define platform key storage.
- Define backup/restore.
- Define recovery key handling.
- Define connector key lifecycle.
- Threat-model export destinations.
- Review accounting, tax, charity, privacy, insurance, and consumer-protection obligations.
