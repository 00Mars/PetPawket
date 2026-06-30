# Pawket Admin Desktop Contract Inspection Failure Modes

Status: safe error behavior for contract inspection.

## Failure Triggers

The inspection runner must fail closed when:

- the vault path is missing, unsafe, under `public/`, or points at export/report/balance/snapshot artifacts
- local NDJSON records are malformed
- the desktop contract smoke runner cannot build or validate the contract
- inspection snapshot validation fails
- guardrail baseline comparison fails
- a required disabled production gate is missing
- mutation, export, connector, upload, public route, packaged app, or runtime snapshot persistence state is enabled
- official balance/report/export status is anything other than `disabled`
- raw document content appears in a snapshot, report, or result

## Error Output

Validation and usage errors may be printed to stderr. Successful inspection output must print only the report text to stdout.

## Exit Codes

Unsafe states, malformed local records, guardrail mismatches, validation failures, public paths, export artifacts, or attempted runtime snapshot persistence return a nonzero result.

Help mode is safe and does not read or write the vault.
