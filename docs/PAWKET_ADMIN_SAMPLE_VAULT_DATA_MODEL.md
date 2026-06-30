# Pawket Admin Sample Vault Data Model

Status: fixture-only sample model.

The sample vault mirrors the operator preview runner's local file map with one or a few fake NDJSON records per pipeline area:

- `quarantine/index.ndjson`
- `events/staged-source-events.ndjson`
- `events/draft-finance-records.ndjson`
- `events/review-queue.ndjson`
- `events/proposed-ledger-records.ndjson`
- `events/proposed-journal-entries.ndjson`
- `manifests/commit-evidence-manifests.ndjson`
- `manifests/commit-gate-evidence-integration.ndjson`
- `events/test-immutable-ledger-entries.ndjson`
- `manifests/report-manifests.ndjson`
- `manifests/export-intent-records.ndjson`
- `manifests/report-preview-packages.ndjson`
- `manifests/report-review-queue.ndjson`
- `manifests/report-review-decisions.ndjson`
- `manifests/report-preview-supersessions.ndjson`
- `manifests/redaction-review-outcomes.ndjson`
- `manifests/report-reviewer-notes.ndjson`

## Required Labels

Each sample record must include `demo: true`, `production_enabled: false`, `read_only: true`, `local_only: true`, disabled official balance/report/export status, `source_mode: sample_vault_non_production`, no raw document content, no mutation actions, and no export actions.

The data is intentionally fake and must not include real customer, donor, vendor, person, medical, payment, tax, bank, assistance, pet-owner, or raw document content.
