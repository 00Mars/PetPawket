# Pawket Admin Document Vault Interface

Status: production interface design and metadata-only test scaffold. No production encryption, upload UI, OCR, or raw document storage is implemented.

The document vault interface defines how Pawket Admin will eventually connect source document metadata to encrypted document blobs. The current implementation stores metadata and blob-reference placeholders only.

## Layers

- `document metadata layer`: document identity, type, privacy class, retention class, evidence status, file hash, source system, source record, and record links.
- `encrypted blob reference layer`: placeholder describing where a future encrypted blob would live.
- `future blob encryption boundary`: production encryption, key management, recovery, rotation, backup, restore, and destruction policy are not implemented.

## Blob Reference Shape

- `blob_ref_id`
- `document_id`
- `storage_provider`
- `vault_relative_path`
- `encrypted_blob_name`
- `blob_hash`
- `plaintext_hash_if_allowed_placeholder`
- `encryption_status`
- `encryption_algorithm_placeholder`
- `key_id_placeholder`
- `created_at`
- `updated_at`
- `blob_size_bytes`
- `content_type`
- `storage_status`
- `retention_class`
- `privacy_class`

## Encryption Status Values

- `metadata_only`
- `encryption_pending`
- `encrypted`
- `rotation_required`
- `quarantined`
- `destroyed`

## Storage Policy

Blob references must use vault-relative paths. Absolute paths, traversal, and `public/` path segments are rejected.

Current allowed storage providers:

- `local_metadata_only`
- `local_encrypted_vault`
- `encrypted_backup`
- `external_encrypted_archive`

`local_metadata_only` is the only current behavior. It does not mean raw blobs are stored.

## Hash And Identity

Document metadata may carry a file hash. Blob references may carry a blob hash. Hashes help prove identity and detect duplicates, but they do not replace encryption, access control, or legal retention policy.

File identity should combine:

- document id
- source system
- source record id
- document type
- file hash or blob hash
- document date
- file size

## Duplicate Detection

Duplicate detection should flag:

- matching `file_hash`
- matching `blob_hash`
- matching document title + file size + document date

Duplicates are warnings for review, not silent deletes. If a duplicate is confirmed, that decision must be audited.

## Relationships

Source document metadata links documents to staged events, draft finance records, review items, proposed ledger records, proposed journal entries, correction/adjustment proposals, exports, assistance records, donations, Pawket Pals, and story submissions.

Commit evidence manifests link proposed journal entries to source document metadata, missing evidence, approved deferrals, redaction warnings, privacy warnings, and source IDs.

## Current Code Boundary

`utils/pawketAdminDocumentVault.js` creates blob-reference metadata, validates storage policy, detects duplicate metadata, models ingestion states, assigns retention classes, validates export redaction profiles, writes ingestion records, and writes commit-gate evidence integration records.

It does not store raw document content, encrypt blobs, upload files, run OCR, create exports, or write live ledger truth.
