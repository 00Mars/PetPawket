# Pawket Admin Encrypted Vault

Last updated: 2026-05-26

Status: design baseline. No production vault, encryption routine, key derivation, secure enclave integration, or backup system is implemented in this pass.

## Purpose

The Pawket Admin vault is the local-first encrypted home for full finance truth.

It should store:

- Finance source events.
- Reviewed transactions and ledger records.
- Source documents.
- Report runs.
- Export manifests.
- Audit events.
- Calculation rule versions.
- Period close state.
- Decision memory.
- Promise and impact proof records.
- Connector import bundles and quarantine state.

The public website must not store this full vault and must not serve finance truth from `public/`.

## Local-First Vault

The desktop app should be useful as the primary finance authority even when source systems are unavailable.

Local-first does not mean unmanaged or unprotected. It means:

- Local encrypted storage is the primary trusted record.
- Connector imports are pulled into the vault after validation.
- Reports are generated from reviewed vault records.
- Exports are explicit artifacts with manifests and audit events.
- Backups are encrypted before they leave the local device.

## Encryption At Rest

All high-value vault data should be encrypted at rest, including:

- Ledger records.
- Source-event inbox.
- Audit log payloads where appropriate.
- Source documents.
- Report exports.
- Export manifests.
- Local backups.
- Connector quarantine bundles.

The security review should choose exact algorithms, key derivation, hardware storage, and backup strategy. Do not implement final cryptography from these docs alone.

## Document Vault

The document vault should store encrypted source evidence:

- Receipts.
- Vendor invoices.
- Donor acknowledgments.
- Contracts.
- Payment processor reports.
- Shopify or commerce exports.
- Bank statements.
- Board or owner decisions.
- Insurance partner agreements, if approved later.
- CHARM or CHERISH source evidence, if approved later.

Each document record should include:

- `document_id`
- `document_type`
- `source_system`
- `original_filename`
- `file_hash`
- `encrypted_blob_ref`
- `linked_transaction_ids`
- `linked_report_run_ids`
- `linked_export_ids`
- `redaction_status`
- `duplicate_of_document_id`
- `retention_class`
- `created_by`
- `created_at`
- `audit_event_ids`

Private story, medical, hardship, assistance, insurance, and memorial details should not be pulled into the document vault unless the approved data-boundary and privacy model explicitly allows it.

## Backups

Backups must be encrypted before storage or transfer.

Backup planning should define:

- Backup file format.
- Backup encryption keys.
- Backup manifest.
- Backup hash.
- Backup creation audit event.
- Backup restore audit event.
- Recovery test cadence.
- Storage location policy.
- Retention and deletion policy.

Backups must not contain raw secrets, plaintext keys, or unencrypted source documents.

## Key Lifecycle

Key lifecycle must be reviewed before implementation.

Required planning areas:

- Vault master key strategy.
- Admin unlock secret handling.
- Key derivation parameters.
- Device binding or hardware-backed storage, if used.
- Recovery key creation.
- Recovery key storage guidance.
- Key rotation.
- Key revocation.
- Emergency access policy.
- Lost device policy.
- Failed unlock rate limits.
- Audit events for key operations.

## Recovery Key Concept

The recovery key exists to prevent permanent loss of the local finance vault.

Baseline constraints:

- Recovery key creation should require Owner Root.
- Recovery key use should create a high-severity audit event.
- Recovery key display should be one-time or tightly controlled.
- Recovery key storage instructions need legal and security review.
- Recovery should not silently bypass audit or role permissions.

## Key Rotation Concept

Key rotation should be possible when:

- A role is revoked.
- A device is lost.
- A secret may be compromised.
- Security policy changes.
- Owner Root requests scheduled rotation.

Rotation should:

- Preserve historical audit verification.
- Re-encrypt current vault material as required.
- Record prior and new key ids without exposing key material.
- Create audit events.
- Require explicit approval for high-risk roles.

## Raw Secrets

Never commit:

- Vault keys.
- Recovery keys.
- HMAC secrets.
- Connector private keys.
- OAuth secrets.
- Admin passwords.
- Plaintext backup files.
- Real finance records.
- Real documents.

Example files may use fake ids and placeholder key refs only.

## Legal And Security Review Warning

This document is a technical baseline, not a security certification.

Before implementation:

- Perform threat modeling.
- Review local storage approach.
- Review key derivation and encryption choices.
- Review device loss and recovery.
- Review export obligations.
- Review accounting and tax retention requirements.
- Review privacy boundaries for private pet, story, assistance, insurance, and medical data.
