# Pawket Admin Document Ingestion Policy

Status: metadata-only lifecycle model. No real document upload or raw file storage is implemented.

Document ingestion is the path from a declared document to manifest-eligible evidence. In this phase, ingestion records tie source metadata to blob-reference placeholders only.

## Lifecycle States

- `declared`
- `metadata_validated`
- `duplicate_checked`
- `privacy_classified`
- `retention_assigned`
- `redaction_checked`
- `blob_reference_created`
- `evidence_linked`
- `manifest_eligible`
- `rejected`
- `quarantined`

## Rules

- No raw content is written in this phase.
- Metadata may be written after validation.
- Hashes may be calculated from provided test strings or buffers for test/proof behavior only.
- Duplicate hashes should flag possible duplicates.
- Sensitive document types require privacy class.
- CHARM and CHERISH assistance documents default to sensitive classes.
- Donor records default to `donor_sensitive`.
- Story and Pawket Pal consent records default to `story_sensitive` or `customer_sensitive`.
- Creator rights assignments default to `legal_confidential` or internal legal review.
- Public impact proof must be `public_safe` or `redacted` before public export eligibility.

## Current Code Boundary

`transitionDocumentIngestionState()` validates allowed transitions and preserves transition history. `createDocumentVaultIngestionRecord()` ties source metadata, a blob reference, and actor metadata together without storing raw content.

No upload UI, OCR, encrypted blob creation, network connector, tax export, or live ledger commit exists in this layer.
