# Pawket Admin Commit Evidence Manifests

Status: first manifest model and plaintext test scaffold.

A commit evidence manifest is a hashable snapshot of the evidence state behind a proposed journal entry. It proves what supporting metadata existed at decision time before any future live ledger commit.

## Fields

- `manifest_id`
- `proposed_journal_entry_id`
- `source_proposed_ledger_record_ids`
- `source_draft_record_ids`
- `source_event_ids`
- `source_bundle_ids`
- `required_document_types`
- `linked_document_ids`
- `missing_document_types`
- `deferred_requirements`
- `redaction_warnings`
- `privacy_warnings`
- `coverage_status`
- `manifest_hash`
- `generated_by`
- `generated_at`

## Rules

- Manifests preserve source traceability from proposed journal entry back to proposed ledger records, drafts, staged source events, and connector bundles.
- Manifests include missing and deferred requirements instead of hiding them.
- Manifests include privacy and redaction warnings.
- Manifests are hashable so later changes can be detected.
- Manifests should be attached to proposed journal entries and future live ledger commits.
- Manifests support IRS/accountant, investor, foundation, owner archive, and public impact audit trails.

## Current Code Boundary

`createCommitEvidenceManifest()` creates a metadata snapshot and deterministic hash. `writeCommitEvidenceManifest()` writes it to `manifests/commit-evidence-manifests.ndjson` and appends an audit event.

`utils/pawketAdminDocumentVault.js` can create a commit-gate evidence integration record from the manifest, proposed journal entry, source documents, and export redaction profiles.

This pass does not write live ledger truth, generate tax exports, upload documents, or encrypt blobs.
