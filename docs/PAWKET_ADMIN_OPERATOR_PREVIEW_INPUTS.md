# Pawket Admin Operator Preview Inputs

Status: local-only preview input contract.

The operator preview runner accepts a Pawket Admin vault path from:

- CLI argv: `--vault <path>`
- CLI argv: `--vault=<path>`
- environment: `PAWKET_ADMIN_VAULT_PATH`
- environment: `PAWKET_ADMIN_OPERATOR_VAULT_PATH`
- environment: `PAWKET_ADMIN_OPERATOR_PREVIEW_VAULT_PATH`

`--help` and `-h` are safe help modes. Help mode must not read or write the vault.

## Vault Record Sources

The runner reads known local NDJSON metadata sources when present:

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
- `events/disabled-production-commit-records.ndjson`
- `documents/source-document-metadata.ndjson`
- `documents/evidence-deferrals.ndjson`

Missing files are allowed and read as empty. Malformed local records fail safely with a nonzero result.

## Rejected Inputs

- Missing vault path.
- Nonexistent vault path.
- Non-directory vault path.
- Paths under any `public/` segment.
- Malformed NDJSON records.
- Vaults containing forbidden export/report/balance artifacts.
